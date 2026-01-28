import ChamaOverviewTab from "@/components/ChamaOverviewTab";
import ChatTab from "@/components/ChatTab";
import {
  ChamaDetailsErrorState,
  ChamaDetailsLoadingState,
} from "@/components/LoadingStates";
import MembersTab from "@/components/MembersTab";
import PaymentModal from "@/components/PaymentModal";
import ScheduleTab from "@/components/ScheduleTab";
import { TabButton } from "@/components/ui/TabButton";
import { JoinedChama } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import {
  getChamaBySlug,
  searchUsers,
  transformChamaData,
} from "@/lib/chamaService";
import { generateChamaShareUrl } from "@/lib/encryption";
import { shareChamaLink } from "@/lib/userService";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { formatTimeRemaining } from "@/Utils/helperFunctions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Share, Share2, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toEther, toTokens } from "thirdweb/utils";

// Loading Skeleton Component
const SkeletonBox = ({
  width = "100%",
  height = 20,
  rounded = "rounded-lg",
}: {
  width?: string | number;
  height?: number;
  rounded?: string;
}) => (
  <View
    className={`bg-gray-200 ${rounded} animate-pulse`}
    style={{
      width: typeof width === "string" ? undefined : width,
      height,
      ...(typeof width === "string" ? {} : {}),
    }}
  />
);

export default function JoinedChamaDetails() {
  const { id, tab } = useLocalSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState(
    tab === "chat" ? "chat" : tab === "schedule" ? "schedule" : "overview"
  );
  const insets = useSafeAreaInsets();
  const [paymentAmount, setPaymentAmount] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [chama, setChama] = useState<JoinedChama | null>(null);
  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
  const [myBalance, setMyBalance] = useState<bigint[] | undefined>();
  const [memberBalances, setMemberBalances] = useState<
    readonly [readonly string[], readonly (readonly bigint[])[]] | null
  >(null);
  const [sendingLink, setSendingLink] = useState(false);

  console.log("the tab", tab, tab ==="chat");


  const fetchChama = async () => {
    if (!token || !user) {
      Alert.alert("Error", "Please login to continue");
      return;
    }
    setIsLoading(true);
    const response = await getChamaBySlug(id as string, token);
    console.log("the response", response);
    if (response.success && response.chama) {
      const transformedChama = transformChamaData(
        response.chama,
        user?.smartAddress
      );
      console.log(transformedChama);
      setChama(transformedChama);

      let currentMyBalance = myBalance;

      // Parse user balance (arrives as string[] from backend)
      if (transformedChama.userChamaBalance) {
        try {
          const balanceStrings =
            transformedChama.userChamaBalance as unknown as string[];
          const balanceBigInts = balanceStrings.map((b) => BigInt(b));
          setMyBalance(balanceBigInts);
          currentMyBalance = balanceBigInts;
        } catch (e) {
          console.error("Error parsing user balances", e);
        }
      }

      // Parse each member balance (arrives as [string[], string[][]] from backend)
      if (transformedChama.eachMemberBalance) {
        try {
          const rawData = transformedChama.eachMemberBalance as unknown as [
            string[],
            string[][]
          ];
          const addresses = rawData[0];
          const balancesStr = rawData[1];
          const balancesBigInt = balancesStr.map((arr) =>
            arr.map((b) => BigInt(b))
          );
          setMemberBalances([addresses, balancesBigInt]);
        } catch (e) {
          console.error("Error parsing member balances", e);
        }
      }

      // get my chama balance
      const balanceToUse = currentMyBalance;
      const firstBalance = Array.isArray(balanceToUse)
        ? balanceToUse[0]
        : balanceToUse;
      const myChamaBalance = toEther(firstBalance || BigInt(0)) || 0;
      // Set payment amount for the payment modal
      const remainingAmount =
        Number(transformedChama?.contribution) - Number(myChamaBalance);
      setPaymentAmount(remainingAmount.toString());
    } else {
      setChama(null);
      if (response.error) {
        Alert.alert("Error", response.error);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChama();
    globalFetchRate("KES");
  }, [id, token]);

  const makePayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Show the payment modal instead of Alert
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Close payment modal and reload page data
    setShowPaymentModal(false);
    // refetchBalance();
    fetchChama();
    // refetchEachMemberBalance();
  };

  const handlePaymentClose = () => {
    // refetchBalance();
    setShowPaymentModal(false);
  };

  const leaveChama = () => {
    Alert.alert("Leave Chama", "Are you sure you want to leave this chama?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          Alert.alert("Success", "Left chama successfully");
          router.back();
        },
      },
    ]);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyLink = () => {
    if (!chama) return;
    const link = generateChamaShareUrl(chama.slug);
    // In a real app, you'd use Clipboard.setString(link)
    console.log("the link", link);
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

  const shareToUser = async (chamaSlug: string) => {
    if (!selectedShareUser) {
      Alert.alert("Error", "Please select a user from the search results");
      return;
    }
    if (!user || !token) {
      Alert.alert("Error", "Please refresh page");
      return;
    }
    setSendingLink(true);

    try {
      console.log(user.userName!, selectedShareUser.id, chamaSlug, token);
      const notificationResult = await shareChamaLink(
        user.userName!,
        selectedShareUser.id,
        chamaSlug,
        token
      );
      if (!notificationResult.success) {
        Alert.alert("Error", "Unable to send the link.");
        return;
      }
      // In a real app, you'd implement the sharing logic here
      Alert.alert("Shared", `Chama shared with @${selectedShareUser.userName}`);
      setSendingLink(false);
      setShareUsername("");
      setSelectedShareUser(null);
      setShowShareModal(false);
    } catch (error) {
      console.error("sharing error", error);
    } finally {
      setSendingLink(false);
    }
  };
  if (isLoading) {
    return <ChamaDetailsLoadingState />;
  }
  if (!chama) {
    return (
      <ChamaDetailsErrorState
        message="Chama not found or you don't have access"
        onRetry={fetchChama}
        onClose={() => router.push("/(tabs)")}
      />
    );
  }

  const contribution = chama.contribution || 0;
  // Handle balance - use individualBalance directly if myBalance is not set yet
  const balanceToUse = myBalance;
  const firstBalance = Array.isArray(balanceToUse)
    ? balanceToUse[0]
    : balanceToUse;
  const myContributions = Number(toTokens(firstBalance || BigInt(0), 6) || 0);
  const remainingAmount = Number(contribution) - Number(myContributions);
  const nextPayoutAmount = chama.nextPayoutAmount || 0;
  const unreadMessages = chama.unreadMessages || 0;

  const renderOverviewTab = () => (
    <ChamaOverviewTab
      myContributions={myContributions}
      contribution={contribution}
      remainingAmount={remainingAmount}
      paymentAmount={paymentAmount}
      setPaymentAmount={setPaymentAmount}
      makePayment={makePayment}
      contributionDueDate={chama.contributionDueDate}
      currentTurnMember={chama.currentTurnMember}
      recentTransactions={chama.recentTransactions}
      nextPayoutAmount={nextPayoutAmount}
      nextPayoutDate={chama.nextPayout!}
      leaveChama={leaveChama}
      userAddress={(user?.address as `0x${string}`) || ""}
      chamaStatus={chama.status}
      chamaStartDate={chama.startDate}
      currency={chama.currency}
      kesRate={kesRate}
    />
  );

  const renderChatTab = () => (
    <ChatTab prevMessages={chama.messages} chamaId={chama.id} />
  );

  const renderScheduleTab = () => (
    <ScheduleTab
      payoutSchedule={chama.payoutSchedule}
      currentUserAddress={chama.currentTurnMemberAddress}
      chamaStatus={chama.status}
      members={chama.members}
      contributionAmount={chama.contribution}
      totalPayout={chama.nextPayoutAmount}
    />
  );

  const renderMembersTab = () => (
    <MembersTab
      members={chama.members}
      eachMemberBalances={memberBalances}
      isPublic={chama.isPublic}
    />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "chat":
        return renderChatTab();
      case "schedule":
        return renderScheduleTab();
      case "members":
        return renderMembersTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className=" bg-downy-800 rounded-b-2xl" style={{
        paddingTop: insets.top,
        paddingBottom: 5,
        paddingHorizontal: 5,
      }}>
        <View className="p-6 pb-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-lg text-white font-medium">
                {chama.name}
              </Text>
              <View
                className={`mt-1 px-2 py-0.5 rounded-full flex-row items-center gap-1 ${chama.isPublic ? "bg-emerald-500/30" : "bg-gray-500/30"
                  }`}
              >
                <Text className="text-xs">{chama.isPublic ? "🌍" : "🔒"}</Text>
                <Text className="text-xs text-white font-semibold">
                  {chama.isPublic ? "Public" : "Private"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleShare}
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <Share2 size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-emerald-100 text-xs">My Position</Text>
              <Text className="text-lg text-white font-semibold">
                {chama.status === "active" ? `#${chama.myPosition}` : "--"}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-emerald-100 text-xs">Next Position</Text>
              <Text className="text-lg text-white font-semibold">
                #{chama.currentTurnMemberPosition}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-emerald-100 text-xs">My Turn in</Text>
              <Text className="text-lg text-white font-semibold">
                {chama.status === "active"
                  ? formatTimeRemaining(chama.myTurnDate)
                  : "--"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className={`flex-1 pt-4 ${activeTab === "chat" ? "" : "px-6"}`}>
          {/* Tab Navigation */}
          <View
            className={`flex-row bg-gray-100 rounded-lg p-1 mb-4 ${activeTab === "chat" ? "mx-6" : ""
              }`}
          >
            <TabButton
              label="Overview"
              value="overview"
              isActive={activeTab === "overview"}
              onPress={() => setActiveTab("overview")}
            />
            <TabButton
              label="Chats"
              value="chat"
              isActive={activeTab === "chat"}
              onPress={() => setActiveTab("chat")}
            // badge={unreadMessages}
            />
            <TabButton
              label="Schedule"
              value="schedule"
              isActive={activeTab === "schedule"}
              onPress={() => setActiveTab("schedule")}
            />
            <TabButton
              label="Members"
              value="members"
              isActive={activeTab === "members"}
              onPress={() => setActiveTab("members")}
            />
          </View>

          {/* Tab Content */}
          <View className="flex-1">{renderTabContent()}</View>
        </View>
      </KeyboardAvoidingView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          chamaId={Number(chama.id)}
          chamaBlockchainId={Number(chama.blockchainId)} // Default blockchain ID since it's not in the interface
          chamaName={chama.name}
          remainingAmount={remainingAmount}
          paymentAmount={Number(paymentAmount)}
        />
      )}

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
                      <View className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </View>

                  {/* Search Results Dropdown */}
                  {showShareSearchResults && shareSearchResults.length > 0 && (
                    <View className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-emerald-200 shadow-lg z-50 max-h-48">
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
                            <Text className="text-sm text-gray-500">
                              {user.email}
                            </Text>
                            <Text className="text-xs text-gray-400 font-mono">
                              {user.address.slice(0, 6)}...
                              {user.address.slice(-4)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
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
                  onPress={() => shareToUser(chama.slug)}
                  disabled={!selectedShareUser || sendingLink}
                  activeOpacity={0.7}
                  className={`py-3.5 rounded-xl flex-row items-center justify-center shadow-lg ${selectedShareUser ? "bg-emerald-600" : "bg-gray-300"
                    }`}
                >
                  <Text
                    className={`font-bold text-base ${selectedShareUser ? "text-white" : "text-gray-500"
                      }`}
                  >
                    {sendingLink ? "Sending..." : "  Send Invite"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowShareModal(false)}
              className="mt-6 bg-gray-500 py-3.5 rounded-xl"
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
