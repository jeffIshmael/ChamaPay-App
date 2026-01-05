import { JoinedChama } from "@/constants/mockData";
import {
  chain,
  chamapayContract,
  client,
  usdcContract,
} from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import {
  addMemberToChama,
  getChamaBySlug,
  searchUsers,
  transformChamaData,
} from "@/lib/chamaService";
import { generateChamaShareUrl } from "@/lib/encryption";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Share,
  Share2,
  Shield,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  prepareContractCall,
  sendTransaction,
  toUnits,
  toWei,
  waitForReceipt,
} from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import ChamaDetailsLoader from "@/components/ChamaDetailsLoader";
import { requestToJoin } from "@/lib/userService";

export default function ChamaDetails() {
  const { slug } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [chama, setChama] = useState<JoinedChama>();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showCollateralModal, setShowCollateralModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUsername, setShareUsername] = useState("");
  const [shareSearchResults, setShareSearchResults] = useState<
    Array<{
      id: number;
      userName: string;
      email: string;
      address: string;
      profileImageUrl: string | null;
    }>
  >([]);
  const [isShareSearching, setIsShareSearching] = useState(false);
  const [showShareSearchResults, setShowShareSearchResults] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<{
    id: number;
    userName: string;
    email: string;
    address: string;
    profileImageUrl: string | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "terms">(
    "overview"
  );
  const [progressPercentage, setProgressPercentage] = useState<number>();
  const { token, user } = useAuth();
  const activeAccount = useActiveAccount();

  useEffect(() => {
    // Check auth on mount
    if (!token) {
      Alert.alert("Error", "Please login to continue");
      router.replace("/(auth)/login");
      return;
    }
  }, [token]);

  useEffect(() => {
    const fetchChama = async () => {
      if (!token || !user) return;

      setIsLoading(true);
      try {
        const response = await getChamaBySlug(slug as string, token);
        if (response.success && response.chama) {
          const transformedChama = transformChamaData(
            response.chama,
            user?.address
          );
          console.log("the transformed chama", transformedChama);
          setChama(transformedChama);
          setProgressPercentage(
            (transformedChama.totalMembers / transformedChama.maxMembers) * 100
          );
        } else {
          // Handle case where chama is not found
          setChama(undefined);
        }
      } catch (error) {
        console.error("Error fetching chama:", error);
        Alert.alert("Error", "Failed to load chama details. Please try again.");
        setChama(undefined);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChama();
  }, [slug, token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMemberCount = (chama: any): number => {
    return chama.totalMembers;
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyLink = () => {
    if (!chama) return;
    const link = generateChamaShareUrl(chama.slug);
    console.log("the link", link);
    // In a real app, you'd use Clipboard.setString(link)
    Alert.alert("Link Copied", "Chama link has been copied to clipboard!");
    setShowShareModal(false);
  };

  // Search users for sharing with debouncing
  useEffect(() => {
    const searchForShareUsers = async () => {
      if (!shareUsername.trim() || shareUsername.trim().length < 2) {
        setShareSearchResults([]);
        setShowShareSearchResults(false);
        return;
      }

      setIsShareSearching(true);
      try {
        const result = await searchUsers(shareUsername.trim());
        if (result.success && result.users) {
          setShareSearchResults(result.users);
          setShowShareSearchResults(true);
        } else {
          setShareSearchResults([]);
          setShowShareSearchResults(false);
        }
      } catch (error) {
        console.error("Error searching users for sharing:", error);
        setShareSearchResults([]);
        setShowShareSearchResults(false);
      } finally {
        setIsShareSearching(false);
      }
    };

    const timeoutId = setTimeout(searchForShareUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [shareUsername]);

  const handleShareUserSelect = (user: typeof selectedShareUser) => {
    setSelectedShareUser(user);
    setShareUsername(user?.userName || "");
    setShowShareSearchResults(false);
  };

  const shareToUser = () => {
    if (!selectedShareUser) {
      Alert.alert("Error", "Please select a user from the search results");
      return;
    }
    // In a real app, you'd implement the sharing logic here
    Alert.alert("Shared", `Chama shared with @${selectedShareUser.userName}`);
    setShareUsername("");
    setSelectedShareUser(null);
    setShowShareModal(false);
  };

  const handleProceedJoin = async () => {
    if (isJoining) return; // Prevent double-clicks

    try {
      if (!token) {
        Alert.alert("Error", "Please login to continue");
        return;
      }
      if (!chama || !user) {
        Alert.alert("Error", "Chama not found");
        return;
      }

      if (!activeAccount) {
        Alert.alert("Error", "Oops!! You are not connected to a wallet.");
        return;
      }

      setIsJoining(true);

      // collateral amount in wei
      const collateralAmountInWei = toUnits(
        chama.collateralAmount.toString(),
        6
      );
      const blockchainId = BigInt(Number(chama.blockchainId));

      // Approve transaction since we will use a function that will transferFrom the user's wallet to the chama's wallet
      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: {
          inputs: [
            {
              internalType: "address",
              name: "spender",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
          ],
          name: "approve",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        params: [chamapayContract.address, collateralAmountInWei],
      });
      const { transactionHash: approveTransactionHash } = await sendTransaction(
        {
          account: activeAccount,
          transaction: approveTransaction,
        }
      );
      const approveTransactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: approveTransactionHash,
      });

      if (!approveTransactionReceipt) {
        Alert.alert(
          "Error",
          "Failed to approve transaction. Please try again."
        );
        setIsJoining(false);
        return;
      }

      console.log("now running the function");

      // join chama transaction
      const joinChamaTransaction = prepareContractCall({
        contract: chamapayContract,
        method: {
          inputs: [
            {
              internalType: "uint256",
              name: "_chamaId",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "_amount",
              type: "uint256",
            },
          ],
          name: "addPublicMember",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        params: [blockchainId, collateralAmountInWei],
      });
      const { transactionHash: joinChamaTransactionHash } =
        await sendTransaction({
          account: activeAccount,
          transaction: joinChamaTransaction,
        });
      const joinChamaTransactionReceipt = await waitForReceipt({
        client: client,
        chain: chain,
        transactionHash: joinChamaTransactionHash,
      });

      if (!joinChamaTransactionReceipt) {
        Alert.alert("Error", "Failed to join chama. Please try again.");
        setIsJoining(false);
        return;
      }

      // Lets update the backend
      const response = await addMemberToChama(
        chama.id,
        true,
        user.id,
        chama.collateralAmount.toString(),
        joinChamaTransactionHash,
        token
      );

      if (!response.success) {
        Alert.alert("Error", response.error);
        setIsJoining(false);
        return;
      }

      Alert.alert("Success", `You are now a member of ${chama.name}`);
      setShowCollateralModal(false);
      router.replace(`/(tabs)/[joined-chama-details]/${chama.slug}`);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to join chama. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleRequestToJoinChama = async () => {
    if (isJoining) return; // Prevent double-clicks

    try {
      if (!token) {
        Alert.alert("Error", "Please login to continue.");
        return;
      }

      if (!chama || !user) {
        Alert.alert("Error", "Chama not found");
        return;
      }

      setIsJoining(true);

      const result = await requestToJoin(chama.id, token);
      if (!result.success) {
        Alert.alert("Error", "Request not sent.");
        return;
      }

      Alert.alert(
        "Success",
        "Request sent to admin. Please wait for approval."
      );
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Error",
        "Failed to request to join chama. Please try again."
      );
    } finally {
      setIsJoining(false);
    }
  };
  const handleJoinChama = async () => {
    if (!chama) {
      Alert.alert("Error", "Chama not found");
      return;
    }
    if (!chama.isPublic) {
      handleRequestToJoinChama();
    } else {
      setShowCollateralModal(true);
    }
  };

  const TabButton = ({
    id,
    title,
    active,
  }: {
    id: "overview" | "schedule" | "terms";
    title: string;
    active: boolean;
  }) => (
    <TouchableOpacity
      className={`flex-1 py-3 px-4 items-center justify-center rounded-xl ${
        active ? "bg-emerald-600 shadow-sm" : "bg-transparent"
      }`}
      onPress={() => setActiveTab(id)}
      activeOpacity={0.7}
    >
      <Text
        className={`text-sm font-semibold ${
          active ? "text-white" : "text-gray-600"
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const InfoCard = ({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: string;
  }) => (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center">
          <Text className="text-2xl">{icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 font-medium mb-1">
            {label}
          </Text>
          <Text className="text-base font-bold text-gray-900">{value}</Text>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <View className="gap-5">
      {/* How it Works */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <View className="flex-row items-center gap-3 mb-6">
          <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 items-center justify-center shadow-sm">
            <Text className="text-2xl">💡</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">How it Works</Text>
        </View>

        {chama && (
          <View className="gap-5">
            {[
              chama.isPublic
                ? {
                    step: "1",
                    title: "Join & Lock Collateral",
                    description: `Lock ${chama.collateralAmount} cUSD as collateral to serve as security in case of default.`,
                    icon: "🔒",
                    bgColor: "bg-emerald-50",
                    borderColor: "border-emerald-100",
                  }
                : {
                    step: "1",
                    title: "Request to Join",
                    description:
                      "Send a request to the admin to join the chama. Once approved, you'll be added to the chama.",
                    icon: "📝",
                    bgColor: "bg-emerald-50",
                    borderColor: "border-emerald-100",
                  },
              {
                step: "2",
                title: "Monthly Contributions",
                description: `Contribute ${chama.contribution} USDC every month on schedule`,
                icon: "💰",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-100",
              },
              {
                step: "3",
                title: "Receive Payout",
                description:
                  "Get the total pool when it's your turn in the rotation",
                icon: "🎯",
                bgColor: "bg-purple-50",
                borderColor: "border-purple-100",
              },
            ].map((item, index) => (
              <View
                key={index}
                className={`flex-row items-start gap-4 ${item.bgColor} ${item.borderColor} border rounded-2xl p-4`}
              >
                <View className="w-14 h-14 bg-white rounded-2xl items-center justify-center shadow-sm flex-shrink-0">
                  <Text className="text-2xl">{item.icon}</Text>
                </View>
                <View className="flex-1 pt-1">
                  <Text className="font-bold text-gray-900 mb-1.5 text-base">
                    {item.title}
                  </Text>
                  <Text className="text-gray-600 text-sm leading-5">
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Admin Terms */}
      {chama && chama.adminTerms.length > 0 && (
        <View className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-sm border border-amber-200 p-6">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="w-12 h-12 rounded-2xl bg-white shadow-sm items-center justify-center">
              <Text className="text-2xl">📋</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">
              Admin Requirements
            </Text>
          </View>
          <View className="gap-3">
            {(Array.isArray(chama.adminTerms)
              ? chama.adminTerms
              : JSON.parse(chama.adminTerms)
            ).map((term: string, index: number) => (
              <View
                key={index}
                className="flex-row items-start gap-3 bg-white/60 rounded-xl p-3"
              >
                <CheckCircle2
                  size={18}
                  color="#f59e0b"
                  className="flex-shrink-0 mt-0.5"
                />
                <Text className="text-gray-700 flex-1 text-sm leading-5">
                  {term}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Financial Summary */}
      <View className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          Financial Summary
        </Text>

        {chama && (
          <View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-600 text-sm">
                Monthly Contribution
              </Text>
              <Text className="font-semibold text-gray-900">
                {chama.contribution} {chama.currency}
              </Text>
            </View>

            {chama.isPublic && (
              <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                <Text className="text-gray-600 text-sm">
                  Total Pool (when full)
                </Text>
                <Text className="font-semibold text-gray-900">
                  {chama.totalContributions} {chama.currency}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-600 text-sm">Frequency</Text>
              <Text className="font-semibold text-gray-900">
                {chama?.frequency}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-3">
              <Text className="text-gray-600 text-sm">Collateral Required</Text>
              <Text className="font-semibold text-gray-900">
                {!chama.isPublic ? "N/A" : `${chama.collateralAmount} USDC`}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderTerms = () => (
    <View className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <Text className="text-xl font-bold text-gray-900 mb-5">
        Terms & Conditions
      </Text>

      <View className="gap-5">
        {[
          {
            title: "Participation Rules",
            icon: "👥",
            color: "emerald",
            items: [
              "Must contribute on time every month",
              "Collateral will be locked until cycle completion",
            ],
          },
          {
            title: "Default Protection",
            icon: "🛡️",
            color: "blue",
            items: [
              "Smart contracts ensure automatic execution",
              "Collateral covers missed contributions",
              "Automatic refunds if members default",
              "Transparent blockchain record of all transactions",
            ],
          },
          {
            title: "Exit Policy",
            icon: "🚪",
            color: "amber",
            items: [
              "Can exit before chama starts or after cycle completion.",
              "Full collateral and balance is refunded when exiting.",
            ],
          },
        ].map((section, index) => (
          <View
            key={index}
            className={`bg-${section.color}-50 rounded-2xl border border-${section.color}-100 p-4`}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-xl">{section.icon}</Text>
              <Text className="font-bold text-gray-900 text-base">
                {section.title}
              </Text>
            </View>
            <View className="gap-2">
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} className="flex-row items-start gap-2">
                  <View
                    className={`w-1.5 h-1.5 rounded-full bg-${section.color}-500 flex-shrink-0 mt-2`}
                  />
                  <Text className="text-sm text-gray-700 flex-1 leading-5">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Early return if no token
  if (!token) {
    return null;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {isLoading ? (
        <ChamaDetailsLoader />
      ) : !chama ? (
        <SafeAreaView
          className="flex-1 items-center justify-center px-6"
          style={{ paddingTop: insets.top }}
        >
          <Text className="text-6xl mb-4">🔍</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Chama Not Found
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            The chama you're looking for doesn't exist
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/discover-chamas")}
            className="bg-emerald-600 py-3 px-6 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold">Back to Discover</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        <View className="flex-1">
          {/* Status Bar Background Color Extension */}
          <View
            className="absolute top-0 left-0 right-0 bg-downy-800 z-10"
            style={{ height: insets.top }}
          />

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Dark Header */}
            <View
              className="bg-downy-800 pt-4 pb-8 px-6 shadow-lg rounded-b-2xl"
              style={{ paddingTop: insets.top + 16 }}
            >
              {/* Back Button and Share Button */}
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/discover-chamas")}
                  className="w-10 h-10 bg-white/30 rounded-full items-center justify-center"
                  activeOpacity={0.8}
                >
                  <ArrowLeft size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  className="w-10 h-10 bg-white/30 rounded-full items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Share2 size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Title & Description */}
              <View className="flex-row items-center gap-3 mb-3">
                <Text className="text-3xl font-bold text-white flex-1">
                  {chama.name}
                </Text>
                <View
                  className={`px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                    chama.isPublic ? "bg-emerald-500/30" : "bg-gray-500/30"
                  }`}
                >
                  <Text className="text-base">
                    {chama.isPublic ? "🌍" : "🔒"}
                  </Text>
                  <Text className="text-sm text-white font-semibold">
                    {chama.isPublic ? "Public" : "Private"}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-200 text-base leading-6 mb-6">
                {chama.description}
              </Text>

              {/* Meta Info Pills */}
              <View className="flex-row flex-wrap gap-2 mb-6">
                <View className="flex-row items-center gap-2 bg-white/30 rounded-full px-4 py-2">
                  <Clock size={16} color="white" />
                  <Text className="text-sm text-white font-semibold">
                    {chama?.frequency}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 bg-white/30 rounded-full px-4 py-2">
                  <Calendar size={16} color="white" />
                  <Text className="text-sm text-white font-semibold">
                    {new Date(chama?.contributionDueDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                    ,{" "}
                    {new Date(chama?.contributionDueDate).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit", hour12: false }
                    )}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2  px-4 py-2">
                  <Star
                    size={16}
                    color="#fbbf24"
                    fill="#fbbf24"
                    fillOpacity={0.2}
                  />
                  <Text className="text-sm text-yellow-300 font-semibold">
                    {chama.rating}{" "}
                    <Text className="text-xs text-gray-400">
                      ({chama.raterCount ?? 0} ratings)
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Member Progress */}
              <View className="bg-white/20 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <Users size={18} color="white" />
                    <Text className="text-white font-semibold">Members</Text>
                  </View>
                  <Text className="text-white font-bold text-lg">
                    {chama?.totalMembers}/{chama?.maxMembers}
                  </Text>
                </View>
                {progressPercentage !== undefined && (
                  <View className="w-full bg-white/30 rounded-full h-2.5">
                    <View
                      className="bg-white h-2.5 rounded-full shadow-sm"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </View>
                )}
              </View>

              {/* Key Stats Cards */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white rounded-2xl p-4 shadow-md">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Wallet size={18} color="#10b981" />
                    <Text className="text-gray-600 text-xs font-medium">
                      {chama.frequency}
                    </Text>
                  </View>
                  <Text className="font-bold text-gray-900 text-lg">
                    {chama.contribution} {chama.currency}
                  </Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 shadow-md">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Shield size={18} color="#10b981" />
                    <Text className="text-gray-600 text-xs font-medium">
                      Collateral Required
                    </Text>
                  </View>
                  <Text className="font-bold text-gray-900 text-lg">
                    {chama.isPublic
                      ? `${chama.collateralAmount} ${chama.currency}`
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Content Area */}
            <View className="px-6 py-6">
              {/* Tabs */}
              <View className="bg-gray-100 rounded-2xl p-1.5 mb-6 flex-row">
                <TabButton
                  id="overview"
                  title="Overview"
                  active={activeTab === "overview"}
                />
                <TabButton
                  id="terms"
                  title="Terms"
                  active={activeTab === "terms"}
                />
              </View>
              {/* Tab Content */}
              {activeTab === "overview" && renderOverview()}
              {activeTab === "terms" && renderTerms()}

              {/* Inline Join Button (not fixed) */}
              <View className="mt-6">
                {!chama.canJoin ? (
                  // Show disabled state with explanation when user can't join
                  <View className="w-full bg-gray-100 border-2 border-gray-200 rounded-2xl p-6">
                    <View className="items-center mb-4">
                      <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                        <Text className="text-3xl">⏰</Text>
                      </View>
                      <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                        Joining Not Available
                      </Text>
                      <Text className="text-gray-600 text-center text-sm leading-6">
                        This chama has already made a payout for the current
                        cycle. Please check back after the next contribution
                        cycle begins.
                      </Text>
                    </View>

                    {/* Info Box */}
                    <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <View className="flex-row items-start gap-3">
                        <Text className="text-lg">ℹ️</Text>
                        <View className="flex-1">
                          <Text className="text-amber-800 font-semibold text-sm mb-1">
                            Why can't I join now?
                          </Text>
                          <Text className="text-amber-700 text-xs leading-5">
                            To maintain fairness, new members can only join
                            before the payout phase of each contribution cycle.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Original join button when canJoin is true
                  <TouchableOpacity
                    onPress={handleJoinChama}
                    disabled={isJoining}
                    className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-3 shadow-md ${
                      isJoining ? "bg-gray-400" : "bg-emerald-600"
                    }`}
                    activeOpacity={0.85}
                  >
                    {isJoining && (
                      <ActivityIndicator size="small" color="white" />
                    )}
                    <Text className="text-white font-bold text-lg">
                      {isJoining
                        ? chama.isPublic
                          ? "Joining..."
                          : "Sending Request..."
                        : chama.isPublic
                          ? "Join Chama"
                          : "Request to Join Chama"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Enhanced Modal */}
      <Modal
        visible={showCollateralModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isJoining && setShowCollateralModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full items-center justify-center mb-4 shadow-sm">
                <Text className="text-4xl">🔐</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Lock Collateral
              </Text>
              <Text className="text-gray-600 text-center text-base leading-6">
                Lock {chama?.collateralAmount} {chama?.currency} as collateral
                to cater for default.
              </Text>
            </View>

            <View className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 mb-5 border border-emerald-200">
              <Text className="text-sm text-emerald-700 font-medium mb-2">
                Amount Required
              </Text>
              <Text className="text-3xl font-bold text-emerald-900">
                {chama ? chama.collateralAmount : "0"} {chama?.currency}
              </Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4 mb-5">
              <View className="gap-3">
                <Text className="text-gray-700 text-sm leading-5">
                  What is the purpose of collateral?
                </Text>
                {[
                  {
                    icon: "✅",
                    text: "It serves as security for the chama in case of default.",
                  },
                  {
                    icon: "🔄",
                    text: "It is fully refundable upon completion.",
                  },
                  {
                    icon: "🛡️",
                    text: "It protects all members from defaults.",
                  },
                ].map((item, index) => (
                  <View key={index} className="flex-row items-start gap-3">
                    <Text className="text-lg">{item.icon}</Text>
                    <Text className="text-gray-700 flex-1 text-sm leading-5">
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="gap-3 flex-row">
              <TouchableOpacity
                onPress={() => setShowCollateralModal(false)}
                disabled={isJoining}
                className={`flex-1 py-4 rounded-xl ${
                  isJoining ? "bg-gray-200" : "bg-gray-100"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`font-bold text-center text-base ${
                    isJoining ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProceedJoin}
                disabled={isJoining}
                className={`flex-1 py-4 rounded-xl shadow-lg flex-row items-center justify-center gap-2 ${
                  isJoining ? "bg-emerald-400" : "bg-emerald-600"
                }`}
                activeOpacity={0.8}
              >
                {isJoining && <ActivityIndicator size="small" color="white" />}
                <Text className="text-white font-bold text-center text-base">
                  {isJoining ? "Processing..." : "Continue"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full items-center justify-center mb-3 shadow-sm">
                <Share size={28} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                Share Chama
              </Text>
              <Text className="text-gray-500 text-center text-sm">
                Invite others to join this chama
              </Text>
            </View>

            <View className="gap-4">
              {/* Quick Copy Link Button */}
              <TouchableOpacity
                onPress={copyLink}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex-row items-center gap-3"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 bg-emerald-100 rounded-xl items-center justify-center">
                  <Text className="text-2xl">🔗</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-base">
                    Copy Invite Link
                  </Text>
                  <Text className="text-gray-600 text-sm mt-0.5">
                    Share via any platform
                  </Text>
                </View>
                <View className="bg-emerald-600 rounded-lg px-3 py-1.5">
                  <Text className="text-white font-semibold text-xs">Copy</Text>
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-gray-400 text-xs font-medium">OR</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* Share to Specific User */}
              <View className="bg-sky-100 border border-emerald-200 rounded-2xl p-5">
                {/* Section Header */}
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm">
                    <Text className="text-xl">👤</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-bold text-gray-900">
                      Send to ChamaPay User
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Enter their username
                    </Text>
                  </View>
                </View>

                {/* Input Field */}
                <View className="mb-3 relative">
                  <View className="flex-row items-center bg-white border border-emerald-300 rounded-xl px-4 py-3.5">
                    <Text className="text-lg font-semibold text-emerald-600 mr-2">
                      @
                    </Text>
                    <TextInput
                      value={shareUsername}
                      onChangeText={(text) => {
                        setShareUsername(text);
                        setSelectedShareUser(null);
                      }}
                      placeholder="username"
                      className="flex-1 text-gray-900 font-medium"
                      placeholderTextColor="#9CA3AF"
                      onFocus={() => {
                        if (shareSearchResults.length > 0) {
                          setShowShareSearchResults(true);
                        }
                      }}
                    />
                    {isShareSearching && (
                      <ActivityIndicator size="small" color="#10b981" />
                    )}
                  </View>

                  {/* Search Results Dropdown */}
                  {showShareSearchResults && shareSearchResults.length > 0 && (
                    <View className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-emerald-200 shadow-lg z-50 max-h-48">
                      <ScrollView>
                        {shareSearchResults.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            onPress={() => handleShareUserSelect(user)}
                            className="flex-row items-center p-3 border-b border-gray-100 last:border-b-0"
                            activeOpacity={0.7}
                          >
                            <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
                              {user.profileImageUrl ? (
                                <Image
                                  source={{ uri: user.profileImageUrl }}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <User size={20} color="#10b981" />
                              )}
                            </View>
                            <View className="flex-1">
                              <Text className="font-semibold text-gray-900">
                                @{user.userName}
                              </Text>
                              <Text className="text-xs text-gray-400 font-mono">
                                {user.address.slice(0, 6)}...
                                {user.address.slice(-4)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* User Not Found Message */}
                  {shareUsername.trim().length >= 2 &&
                    !isShareSearching &&
                    shareSearchResults.length === 0 && (
                      <View className="absolute top-full left-0 right-0 mt-1 bg-red-50 border border-red-200 rounded-xl p-3 z-50">
                        <Text className="text-red-600 text-sm font-medium text-center">
                          User not found
                        </Text>
                      </View>
                    )}
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  onPress={shareToUser}
                  disabled={!selectedShareUser}
                  activeOpacity={0.7}
                  className={`py-3.5 rounded-xl flex-row items-center justify-center shadow-lg ${
                    selectedShareUser ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <Text
                    className={`font-bold text-base ${
                      selectedShareUser ? "text-white" : "text-gray-500"
                    }`}
                  >
                    Send Invite
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowShareModal(false)}
              className="mt-6 bg-gray-300 py-3.5 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold text-center text-base">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
