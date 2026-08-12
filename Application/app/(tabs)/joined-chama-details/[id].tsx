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
import USDCPay from "@/components/USDCPay";
import { JoinedChama } from "@/constants/mockData";
import { getAllBalances } from "@/constants/viem";
import { useAuth } from "@/Contexts/AuthContext";
import {
  getChamaBySlug,
  markMessagesReadApi,
  searchUsers,
  transformChamaData,
  addMemberToChama,
  updateChamaDetails
} from "@/lib/chamaService";
import { generateChamaShareUrl } from "@/lib/encryption";
import { shareChamaLink } from "@/lib/userService";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { serverUrl } from "@/constants/serverUrl";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { formatTimeRemaining } from "@/Utils/helperFunctions";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Share, Share2, User, UserPlus, Edit3, Calendar, Clock, LogOut, CheckCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatUnits } from "viem";

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(
    tab ? tab : "overview"
  );
  const insets = useSafeAreaInsets();
  const [paymentAmount, setPaymentAmount] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [chama, setChama] = useState<JoinedChama | null>(null);
  const { currency } = useCurrencyStore();
  const { platformRate: kesRate } = useFormattedBalance();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUSDCPaymentModal, setShowUSDCPaymentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUsername, setShareUsername] = useState("");
  const [shareSearchResults, setShareSearchResults] = useState<
    Array<{
      id: number;
      userName: string;
      email: string;
      smartAddress: string;
      profileImageUrl: string | null;
    }>
  >([]);
  const [isShareSearching, setIsShareSearching] = useState(false);
  const [showShareSearchResults, setShowShareSearchResults] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<{
    id: number;
    userName: string;
    email: string;
    smartAddress: string;
    profileImageUrl: string | null;
  } | null>(null);
  const [myBalance, setMyBalance] = useState<bigint[] | undefined>();
  const [memberBalances, setMemberBalances] = useState<
    readonly [readonly string[], readonly (readonly bigint[])[]] | null
  >(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [myWalletBalance, setMyWalletBalance] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<
    Array<{
      id: number;
      userName: string;
      email: string;
      smartAddress: string;
      profileImageUrl: string | null;
    }>
  >([]);
  const [isAddMemberSearching, setIsAddMemberSearching] = useState(false);
  const [showAddMemberSearchResults, setShowAddMemberSearchResults] = useState(false);
  const [selectedAddMemberUser, setSelectedAddMemberUser] = useState<{
    id: number;
    userName: string;
    email: string;
    smartAddress: string;
    profileImageUrl: string | null;
  } | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Recipient Modal State
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ userId: number; userName: string } | null>(null);

  // Leave Chama State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingChama, setIsLeavingChama] = useState(false);

  // Edit Chama State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    amount: "",
    amountKES: "",
    duration: "",
    cycle: "",
    round: "",
  });
  const [isEditKESMode, setIsEditKESMode] = useState(false);
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);
  const [showPayTimePicker, setShowPayTimePicker] = useState(false);
  const [selectedPayDate, setSelectedPayDate] = useState(new Date());
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  const openEditModal = () => {
    if (chama) {
      const isKES = user?.location === "KE";
      setIsEditKESMode(isKES);
      
      const usdcAmt = chama.contribution.toString();
      const kesAmt = kesRate > 0 ? (chama.contribution * kesRate).toFixed(2) : "";
      
      setEditFormData({
        name: chama.name,
        amount: usdcAmt,
        amountKES: kesAmt,
        duration: chama.duration.toString(),
        cycle: chama.currentCycle.toString(),
        round: chama.currentRound.toString(),
      });
      setSelectedPayDate(new Date(chama.contributionDueDate));
      setShowEditModal(true);
    }
  };

  const hasEditDetailsChanged = () => {
    if (!chama) return false;
    const initialName = chama.name;
    const initialDuration = chama.duration.toString();
    const initialCycle = chama.currentCycle.toString();
    const initialRound = chama.currentRound.toString();
    const initialAmount = chama.contribution.toString();
    const initialPayDate = new Date(chama.contributionDueDate).getTime();
    
    return (
      editFormData.name !== initialName ||
      editFormData.amount !== initialAmount ||
      editFormData.duration !== initialDuration ||
      editFormData.cycle !== initialCycle ||
      editFormData.round !== initialRound ||
      selectedPayDate.getTime() !== initialPayDate
    );
  };

  const handleEditAmountKESChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setEditFormData((prev) => {
          const usdcValue = text && kesRate > 0 ? (parseFloat(text) / kesRate).toFixed(3) : "";
          return { ...prev, amountKES: text, amount: usdcValue };
        });
      }
    }
  };

  const handleEditAmountUSDCChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setEditFormData((prev) => {
          const kesValue = text && kesRate > 0 ? (parseFloat(text) * kesRate).toFixed(2) : "";
          return { ...prev, amount: text, amountKES: kesValue };
        });
      }
    }
  };

  const handleUpdateDetails = async () => {
    if (!chama) return;
    if (!user || !token) {
      Alert.alert("Error", "Please refresh page");
      return;
    }
    
    // validate
    if (!editFormData.name || !editFormData.amount || !editFormData.duration || !editFormData.cycle || !editFormData.round) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setIsUpdatingDetails(true);
    try {
      const result = await updateChamaDetails(
        Number(chama.id),
        editFormData.name,
        editFormData.amount,
        Number(editFormData.duration),
        Number(editFormData.cycle),
        Number(editFormData.round),
        selectedPayDate.getTime(),
        token
      );
      if (result.success) {
        if (Platform.OS === "android") {
          ToastAndroid.show("Chama details updated successfully", ToastAndroid.LONG);
        } else {
          Alert.alert("Success", "Chama details updated successfully");
        }
        setShowEditModal(false);
        fetchChama();
      } else {
        Alert.alert("Error", result.error || "Failed to update chama details");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const isAdmin = chama?.members.find((m) => m.id === user?.id)?.role === "Admin";

  const fetchChama = async () => {
    if (!token || !user) {
      Alert.alert("Error", "Please login to continue");
      return;
    }
    setIsLoading(true);
    const response = await getChamaBySlug(id as string, token);
    if (response.success && response.chama) {
      const transformedChama = transformChamaData(
        response.chama,
        user?.smartAddress
      );
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
        } catch { /* ignored */ }
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
        } catch { /* ignored */ }
      }

      // get my chama balance
      const balanceToUse = currentMyBalance;
      const firstBalance = Array.isArray(balanceToUse)
        ? balanceToUse[0]
        : balanceToUse;
      const myChamaBalance = Number(formatUnits(firstBalance || BigInt(0), 6));
      // Set payment amount for the payment modal
      const remainingAmount =
        Number(transformedChama?.contribution) - myChamaBalance;
      setPaymentAmount(remainingAmount.toString());
    } else {
      setChama(null);
      if (response.error) {
        Alert.alert("Error", response.error);
      }
    }
    setIsLoading(false);
  };

  const fetchMyWalletBalance = async () => {
    if (!user?.smartAddress) return;
    try {
      const balance = await getAllBalances(user.smartAddress as `0x${string}`);
      setMyWalletBalance(balance);
    } catch (error) {
      console.warn("Failed to fetch wallet balance:", error);
    }
  };

  useEffect(() => {
    fetchChama();
    fetchMyWalletBalance();
  }, [id, token]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id && token) {
        fetchChama();
        fetchMyWalletBalance();
      }
    }, [id, token])
  );

  useEffect(() => {
    if (activeTab === "chat" && chama && token) {
      // Mark as read
      markMessagesReadApi(chama.id, token).then(() => {
        // Optionally update local state to clear badge visually immediately
        setChama(prev => prev ? ({ ...prev, unreadMessages: 0 }) : null);
      });
    }
  }, [activeTab, chama?.id, token]);

  const makePayment = () => {
    // If the user is the only member, skip recipient selection
    if (chama?.members && chama.members.length <= 1) {
      proceedToPayment(null);
    } else {
      setShowRecipientModal(true);
    }
  };

  const proceedToPayment = (recipient: { userId: number; userName: string } | null = null) => {
    setSelectedRecipient(recipient);
    setShowRecipientModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Close payment modal and reload page data
    setShowPaymentModal(false);
    setActiveTab("overview");
    // Invalidate chamas cache
    queryClient.invalidateQueries({ queryKey: ["userChamas"] });
    fetchChama();
  };

  const handlePaymentClose = () => {
    // refetchBalance();
    setShowPaymentModal(false);
  };

  const leaveChama = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveChama = async () => {
    if (!token || !chama) return;
    setIsLeavingChama(true);
    try {
      const response = await fetch(`${serverUrl}/chama/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chamaId: chama.id }),
      });
      const data = await response.json();
      if (data.success) {
        setShowLeaveModal(false);
        setSuccessMessage("Left chama successfully");
        setShowSuccessModal(true);
        // Delay navigating back so the user can read the success message
        setTimeout(() => {
          setShowSuccessModal(false);
          queryClient.invalidateQueries({ queryKey: ["userChamas"] });
          router.back();
        }, 1500);
      } else {
        Alert.alert("Error", data.error || "Failed to leave chama");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLeavingChama(false);
    }
  };

  const handleUSDCPaymentSuccess = (data?: {
    txHash: string;
    message: string;
    amount: string;
  }) => {
    setShowUSDCPaymentModal(false);
    setSuccessMessage(data?.message || "Payment successful!");
    setShowSuccessModal(true);
    setActiveTab("overview");
    // Invalidate chamas cache
    queryClient.invalidateQueries({ queryKey: ["userChamas"] });
    fetchChama();
    fetchMyWalletBalance();
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyLink = () => {
    if (!chama) return;
    const link = generateChamaShareUrl(chama.slug);
    Clipboard.setStringAsync(link);
    setTimeout(() => {
      setShowShareModal(false);
    }, 1000);

  };

  // Search users for sharing with debouncing
  useEffect(() => {
    const searchForShareUsers = async () => {
      if (!shareUsername.trim() || shareUsername.trim().length < 2) {
        setShareSearchResults([]);
        setShowShareSearchResults(false);
        return;
      }

      // Don't search if a user is already selected (prevents search on selection)
      if (selectedShareUser && shareUsername === selectedShareUser.userName) {
        return;
      }

      setIsShareSearching(true);
      try {
        const result = await searchUsers(shareUsername.trim());
        if (result.success && result.users) {
          // Filter out the current user from search results
          const filteredUsers = result.users.filter(
            (searchUser) => searchUser.id !== user?.id
          );
          setShareSearchResults(filteredUsers);
          setShowShareSearchResults(filteredUsers.length > 0);
        } else {
          setShareSearchResults([]);
          setShowShareSearchResults(false);
        }
      } catch (error) {
setShareSearchResults([]);
        setShowShareSearchResults(false);
      } finally {
        setIsShareSearching(false);
      }
    };

    const timeoutId = setTimeout(searchForShareUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [shareUsername, selectedShareUser, user]);

  // Search users for adding members with debouncing
  useEffect(() => {
    const searchForAddMemberUsers = async () => {
      if (!addMemberUsername.trim() || addMemberUsername.trim().length < 2) {
        setAddMemberSearchResults([]);
        setShowAddMemberSearchResults(false);
        return;
      }

      if (selectedAddMemberUser && addMemberUsername === selectedAddMemberUser.userName) {
        return;
      }

      setIsAddMemberSearching(true);
      try {
        const result = await searchUsers(addMemberUsername.trim());
        if (result.success && result.users) {
          // Filter out existing members and the current user
          const existingMemberIds = chama?.members.map(m => m.id) || [];
          const filteredUsers = result.users.filter(
            (searchUser) => searchUser.id !== user?.id && !existingMemberIds.includes(searchUser.id)
          );
          setAddMemberSearchResults(filteredUsers);
          setShowAddMemberSearchResults(filteredUsers.length > 0);
        } else {
          setAddMemberSearchResults([]);
          setShowAddMemberSearchResults(false);
        }
      } catch (error) {
setAddMemberSearchResults([]);
        setShowAddMemberSearchResults(false);
      } finally {
        setIsAddMemberSearching(false);
      }
    };

    const timeoutId = setTimeout(searchForAddMemberUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [addMemberUsername, selectedAddMemberUser, user, chama?.members]);

  const handleAddMemberUserSelect = (user: typeof selectedAddMemberUser) => {
    setSelectedAddMemberUser(user);
    setAddMemberUsername(user?.userName || "");
    setShowAddMemberSearchResults(false);
  };

  const handleAddMember = async () => {
    if (!selectedAddMemberUser || !chama) return;
    if (!user || !token) {
      Alert.alert("Error", "Please refresh page");
      return;
    }
    setIsAddingMember(true);

    try {
      const result = await addMemberToChama(
        Number(chama.id),
        chama.isPublic,
        selectedAddMemberUser.id,
        chama.contribution.toString(),
        token
      );

      if (result.success) {
        if (Platform.OS === "android") {
          ToastAndroid.show(`@${selectedAddMemberUser.userName} added successfully`, ToastAndroid.LONG);
        } else {
          Alert.alert("Success", `@${selectedAddMemberUser.userName} added successfully`);
        }
        setShowAddMemberModal(false);
        setAddMemberUsername("");
        setSelectedAddMemberUser(null);
        fetchChama(); // Refresh data
      } else {
        Alert.alert("Error", result.error || "Failed to add member");
      }
    } catch (error) {
Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsAddingMember(false);
    }
  };

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
      const notificationResult = await shareChamaLink(
        user.userName!,
        selectedShareUser.id,
        chamaSlug,
        token
      );
      if (!notificationResult.success) {
        if (Platform.OS === "android") {
          ToastAndroid.show("Unable to send the link", ToastAndroid.LONG);
        } else {
          Alert.alert("Error", "Unable to send the link");
        }
        return;
      }
      if (Platform.OS === "android") {
        ToastAndroid.show(`Chama shared to @${selectedShareUser.userName}`, ToastAndroid.LONG);
      } else {
        Alert.alert("Success", `Chama shared to @${selectedShareUser.userName}`);
      }
      setSendingLink(false);
      setShareUsername("");
      setSelectedShareUser(null);
      setShowShareModal(false);
    } catch { /* ignored */ } finally {
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
  const lockedBalance = Array.isArray(balanceToUse)
    ? balanceToUse[1]
    : balanceToUse;
  const myContributions = Number(formatUnits(firstBalance || BigInt(0), 6) || 0);
  const myCollateral = Number(formatUnits(lockedBalance || BigInt(0), 6) || 0);
  const remainingAmount = Number(contribution) - Number(myContributions);
  const nextPayoutAmount = chama.nextPayoutAmount || 0;
  const unreadMessages = chama.unreadMessages || 0;
  const isMidPayout = chama.currentRound > 1;

  const renderOverviewTab = () => (
    <ChamaOverviewTab
      myContributions={myContributions}
      contribution={contribution}
      remainingAmount={remainingAmount}
      currentCycle={chama.currentCycle}
      currentRound={chama.currentRound}
      makePayment={makePayment}
      contributionDueDate={chama.contributionDueDate}
      currentTurnMember={chama.currentTurnMember}
      recentTransactions={chama.recentTransactions}
      nextPayoutAmount={nextPayoutAmount}
      nextPayoutDate={chama.nextPayout!}
      leaveChama={leaveChama}
      userAddress={(user?.smartAddress as `0x${string}`) || ""}
      chamaStatus={chama.status}
      chamaPayDate={chama.nextPayout!}
      currency={chama.currency}
      isPublic={chama.isPublic}
      collateralAmount={chama.collateralAmount}
      myCollateral={myCollateral}
      chamaName={chama.name}
      chamaId={Number(chama.id)}
      payoutSchedule={chama.payoutSchedule}
      onRefresh={fetchChama}
      isAdmin={isAdmin}
      isMidPayout={isMidPayout}
    />
  );

  const renderChatTab = () => (
    <ChatTab prevMessages={chama.messages} chamaId={chama.id} />
  );

  const renderScheduleTab = () => (
    <ScheduleTab
      chamaId={Number(chama.id)}
      payoutSchedule={chama.payoutSchedule}
      currentUserAddress={chama.currentTurnMemberAddress}
      chamaStatus={chama.status}
      members={chama.members}
      contributionAmount={chama.contribution}
      totalPayout={chama.nextPayoutAmount}
      currentCycle={chama.currentCycle}
      currentRound={chama.currentRound}
      onRefresh={fetchChama}
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
            <View className="flex-row items-center gap-2">
              {isAdmin && chama.canJoin && (
                <>
                  <TouchableOpacity
                    onPress={openEditModal}
                    className="p-2 rounded-full"
                    activeOpacity={0.7}
                  >
                    <Edit3 size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAddMemberModal(true)}
                    className="p-2 rounded-full"
                    activeOpacity={0.7}
                  >
                    <UserPlus size={20} color="white" />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={handleShare}
                className="p-2 rounded-full"
                activeOpacity={0.7}
              >
                <Share2 size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-emerald-100 text-xs">My Position</Text>
              <Text className="text-lg text-white font-semibold">
                {chama.payoutSchedule.length > 0 ? `#${chama.myPosition}` : "--"}
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
                {chama.payoutSchedule.length > 0
                  ? formatTimeRemaining(chama.myTurnDate)
                  : "--"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-1">
        <View className={`flex-1 pt-4 ${activeTab === "chat" ? "" : "px-6"}`}>
          {/* Tab Navigation */}
          <View
            className={`flex-row bg-gray-100 rounded-lg px-1 py-2 mb-4 ${activeTab === "chat" ? "mx-6" : ""
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
              badge={unreadMessages}
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
          {activeTab === "chat" ? (
            <KeyboardAvoidingView
              className="flex-1"
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
              {renderTabContent()}
            </KeyboardAvoidingView>
          ) : (
            <View className="flex-1">{renderTabContent()}</View>
          )}
        </View>
      </View>

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
          recipient={selectedRecipient}
          onBack={() => {
            setShowPaymentModal(false);
            if (chama?.members && chama.members.length > 1) {
              setShowRecipientModal(true);
            }
          }}
        />
      )}
      {/* Direct USDC Pay Modal for non-KE users */}
      {showUSDCPaymentModal && chama && (
        <USDCPay
          visible={showUSDCPaymentModal}
          onClose={() => setShowUSDCPaymentModal(false)}
          onBack={() => setShowUSDCPaymentModal(false)}
          onSuccess={handleUSDCPaymentSuccess}
          chamaId={Number(chama.id)}
          chamaBlockchainId={Number(chama.blockchainId)}
          USDCBalance={myWalletBalance?.USDC?.displayValue}
          chamaName={chama.name}
          remainingAmount={remainingAmount}
          contributionAmount={Number(paymentAmount)}
          recipient={selectedRecipient}
        />
      )}

      {/* Recipient Selection Modal */}
      {showRecipientModal && (
        <Modal
          visible={showRecipientModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRecipientModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <TouchableOpacity className="absolute inset-0" onPress={() => setShowRecipientModal(false)} />
            <View className="bg-white rounded-t-[30px] p-6 pb-8 min-h-[50%] max-h-[80%]">
              <Text className="text-xl font-semibold mb-5 text-center">Who is this payment for?</Text>
              
              <TouchableOpacity
                onPress={() => proceedToPayment(null)}
                className="py-4 px-5 bg-gray-50 rounded-lg w-full my-2 border border-gray-200 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-downy-100 rounded-full items-center justify-center mr-3">
                    <User size={20} color="#059669" />
                  </View>
                  <Text className="text-lg font-medium text-gray-800">For Me</Text>
                </View>
                <Text className="text-gray-400">➔</Text>
              </TouchableOpacity>

              <Text className="text-sm font-medium text-gray-500 mt-4 mb-2 px-2">Or select a member to pay on their behalf:</Text>

              <ScrollView className="w-full">
                {chama?.members
                  .filter((m) => m.id !== user?.id)
                  .map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => proceedToPayment({ userId: member.id, userName: member.name })}
                      className="flex-row items-center py-3 px-3 bg-white border-b border-gray-100"
                    >
                      {member.profilePicture ? (
                        <Image source={{ uri: member.profilePicture }} className="w-10 h-10 rounded-full mr-3" />
                      ) : (
                        <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3">
                          <Text className="text-lg font-semibold text-gray-500">{member?.name?.charAt(0)?.toUpperCase() || "U"}</Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-800">{member.name}</Text>
                      </View>
                      <Text className="text-gray-400">➔</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowShareModal(false);
          setShareUsername("");
          setIsShareSearching(false);
          setShowShareSearchResults(false);
          setSelectedShareUser(null);
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
          className="flex-1 items-center justify-center bg-black/70 px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
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
                </View>
                <View className="bg-downy-600 rounded-lg px-3 py-1.5">
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
                      Send to a Chamapay user
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Enter their username
                    </Text>
                  </View>
                </View>

                {/* Input Field */}
                <View className="mb-3 relative">
                  <View className="flex-row items-center bg-white border border-emerald-300 rounded-xl px-4 py-2">
                    <Text className="text-lg font-semibold text-emerald-600 mr-3">
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
                      <ScrollView keyboardShouldPersistTaps="handled">
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
                                {user?.smartAddress?.slice(0, 6) || "..."}...
                                {user?.smartAddress?.slice(-4) || "..."}
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
                  onPress={() => shareToUser(chama.slug)}
                  disabled={!selectedShareUser || sendingLink}
                  activeOpacity={0.7}
                  className={`py-3.5 rounded-xl flex-row items-center justify-center shadow-lg ${selectedShareUser && !sendingLink ? "bg-downy-600" : "bg-gray-300"
                    }`}
                >
                  <Text
                    className={`font-bold text-base ${selectedShareUser && !sendingLink ? "text-white" : "text-gray-500"
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
              disabled={sendingLink}
              className="mt-6 bg-gray-300 py-3 rounded-xl border border-gray-500 border-2"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold text-center text-base">
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddMemberModal(false);
          setAddMemberUsername("");
          setIsAddMemberSearching(false);
          setShowAddMemberSearchResults(false);
          setSelectedAddMemberUser(null);
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowAddMemberModal(false)}
          className="flex-1 items-center justify-center bg-black/70 px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-3 shadow-sm">
                <UserPlus size={28} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                Add Member
              </Text>
              <Text className="text-gray-500 text-center text-sm">
                Add a user directly to this chama
              </Text>
            </View>

            <View className="gap-4">
              <View className="bg-sky-50 border border-emerald-200 rounded-2xl p-5">
                {/* Input Field */}
                <View className="mb-3 relative">
                  <View className="flex-row items-center bg-white border border-emerald-300 rounded-xl px-4 py-2">
                    <Text className="text-lg font-semibold text-emerald-600 mr-3">
                      @
                    </Text>
                    <TextInput
                      value={addMemberUsername}
                      onChangeText={(text) => {
                        setAddMemberUsername(text);
                        setSelectedAddMemberUser(null);
                      }}
                      placeholder="username"
                      className="flex-1 text-gray-900 font-medium"
                      placeholderTextColor="#9CA3AF"
                      onFocus={() => {
                        if (addMemberSearchResults.length > 0) {
                          setShowAddMemberSearchResults(true);
                        }
                      }}
                    />
                    {isAddMemberSearching && (
                      <View className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </View>

                  {/* Search Results Dropdown */}
                  {showAddMemberSearchResults && addMemberSearchResults.length > 0 && (
                    <View className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-emerald-200 shadow-lg z-50 max-h-48">
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {addMemberSearchResults.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            onPress={() => handleAddMemberUserSelect(user)}
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
                                {user?.smartAddress?.slice(0, 6) || "..."}...
                                {user?.smartAddress?.slice(-4) || "..."}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* User Not Found Message */}
                  {addMemberUsername.trim().length >= 2 &&
                    !isAddMemberSearching &&
                    addMemberSearchResults.length === 0 && (
                      <View className="absolute top-full left-0 right-0 mt-1 bg-red-50 border border-red-200 rounded-xl p-3 z-50">
                        <Text className="text-red-600 text-sm font-medium text-center">
                          User not found or already a member
                        </Text>
                      </View>
                    )}
                </View>

                {/* Add Button */}
                <TouchableOpacity
                  onPress={handleAddMember}
                  disabled={!selectedAddMemberUser || isAddingMember}
                  activeOpacity={0.7}
                  className={`py-3.5 rounded-xl flex-row items-center justify-center shadow-lg ${selectedAddMemberUser && !isAddingMember ? "bg-downy-600" : "bg-gray-300"
                    }`}
                >
                  <Text
                    className={`font-bold text-base ${selectedAddMemberUser && !isAddingMember ? "text-white" : "text-gray-500"
                      }`}
                  >
                    {isAddingMember ? "Adding..." : "Add to Chama"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowAddMemberModal(false)}
              disabled={isAddingMember}
              className="mt-6 bg-gray-300 py-3 rounded-xl border border-gray-500 border-2"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold text-center text-base">
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-6 shadow-lg w-[85%]">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                <CheckCircle size={32} color="#059669" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">
                Success!
              </Text>
              <Text className="text-gray-600 text-center mb-4">
                {successMessage}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                setActiveTab("overview");
              }}
              className="bg-emerald-600 py-3 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-center text-base">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Leave Chama Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                <LogOut size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">Leave Chama?</Text>
              <Text className="text-gray-600 text-center">
                Are you sure you want to leave this chama? This action will remove you from the payout schedule and cannot be undone.
              </Text>
            </View>
            
            <View className="flex-row gap-4">
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-white"
                onPress={() => setShowLeaveModal(false)}
                disabled={isLeavingChama}
              >
                <Text className="text-center font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-xl bg-red-600 flex-row justify-center items-center"
                onPress={confirmLeaveChama}
                disabled={isLeavingChama}
              >
                {isLeavingChama ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-center font-semibold text-white">Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Details Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl h-[70%]">
              {/* Header */}
              <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-900">Edit Details</Text>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView className="p-6">
                <Text className="text-gray-700 font-medium mb-2">Chama Name</Text>
                <TextInput
                  value={editFormData.name}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, name: text })
                  }
                  placeholder="e.g. My Awesome Chama"
                  className={`border rounded-xl px-4 py-3 mb-4 text-base ${editFormData.name !== chama?.name ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}
                />

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-medium">Amount ({isEditKESMode ? "KES" : "USDC"})</Text>
                  {user?.location === "KE" && (
                    <TouchableOpacity onPress={() => setIsEditKESMode(!isEditKESMode)} className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      <Text className="text-emerald-700 text-[10px] font-bold">Switch to {isEditKESMode ? "USDC" : "KES"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditKESMode ? (
                  <View className={`border rounded-xl px-4 flex-row items-center mb-4 ${editFormData.amountKES !== (kesRate > 0 ? (chama?.contribution! * kesRate).toFixed(2) : "") ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}>
                    <Text className="text-gray-500 font-bold mr-2 text-base">KES</Text>
                    <TextInput
                      value={editFormData.amountKES}
                      onChangeText={handleEditAmountKESChange}
                      placeholder="e.g. 1000"
                      keyboardType="numeric"
                      className="flex-1 text-gray-900 text-base py-3"
                    />
                  </View>
                ) : (
                  <View className={`border rounded-xl px-4 flex-row items-center mb-4 ${editFormData.amount !== chama?.contribution.toString() ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}>
                    <Text className="text-gray-500 font-bold mr-2 text-base">USDC</Text>
                    <TextInput
                      value={editFormData.amount}
                      onChangeText={handleEditAmountUSDCChange}
                      placeholder="e.g. 50"
                      keyboardType="numeric"
                      className="flex-1 text-gray-900 text-base py-3"
                    />
                  </View>
                )}

                <Text className="text-gray-700 font-medium mb-2">Cycle Time (days)</Text>
                <TextInput
                  value={editFormData.duration}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, duration: text })
                  }
                  placeholder="e.g. 7"
                  keyboardType="numeric"
                  className={`border rounded-xl px-4 py-3 mb-4 text-base ${editFormData.duration !== chama?.duration.toString() ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}
                />

                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium mb-2">Current Cycle</Text>
                    <TextInput
                      value={editFormData.cycle}
                      onChangeText={(text) =>
                        setEditFormData({ ...editFormData, cycle: text })
                      }
                      placeholder="e.g. 1"
                      keyboardType="numeric"
                      className={`border rounded-xl px-4 py-3 text-base ${editFormData.cycle !== chama?.currentCycle.toString() ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium mb-2">Current Round</Text>
                    <TextInput
                      value={editFormData.round}
                      onChangeText={(text) =>
                        setEditFormData({ ...editFormData, round: text })
                      }
                      placeholder="e.g. 1"
                      keyboardType="numeric"
                      className={`border rounded-xl px-4 py-3 text-base ${editFormData.round !== chama?.currentRound.toString() ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}
                    />
                  </View>
                </View>

                <Text className="text-gray-700 font-medium mb-2">Pay Date & Time</Text>
                <View className="flex-row gap-4 mb-8">
                  <TouchableOpacity
                    onPress={() => setShowPayDatePicker(true)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="font-medium text-gray-900">{selectedPayDate.toLocaleDateString()}</Text>
                    <Calendar size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowPayTimePicker(true)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="font-medium text-gray-900">{selectedPayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Clock size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'android' ? (
                  <>
                    {showPayDatePicker && (
                      <DateTimePicker
                        value={selectedPayDate}
                        mode="date"
                        display="default"
                        onChange={(event, selected) => {
                          setShowPayDatePicker(false);
                          if (selected) {
                            const newDate = new Date(selectedPayDate);
                            newDate.setFullYear(selected.getFullYear());
                            newDate.setMonth(selected.getMonth());
                            newDate.setDate(selected.getDate());
                            setSelectedPayDate(newDate);
                          }
                        }}
                      />
                    )}
                    {showPayTimePicker && (
                      <DateTimePicker
                        value={selectedPayDate}
                        mode="time"
                        display="default"
                        onChange={(event, selected) => {
                          setShowPayTimePicker(false);
                          if (selected) {
                            const newDate = new Date(selectedPayDate);
                            newDate.setHours(selected.getHours());
                            newDate.setMinutes(selected.getMinutes());
                            setSelectedPayDate(newDate);
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Modal visible={showPayDatePicker} transparent animationType="slide">
                      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
                        <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowPayDatePicker(false)} />
                        <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, margin: 20, width: "90%" }}>
                          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#111827" }}>Select Date</Text>
                          <DateTimePicker
                            value={selectedPayDate}
                            mode="date"
                            display="compact"
                            onChange={(event, selected) => {
                              if (selected) {
                                const newDate = new Date(selectedPayDate);
                                newDate.setFullYear(selected.getFullYear());
                                newDate.setMonth(selected.getMonth());
                                newDate.setDate(selected.getDate());
                                setSelectedPayDate(newDate);
                              }
                            }}
                          />
                          <TouchableOpacity onPress={() => setShowPayDatePicker(false)} style={{ backgroundColor: "#059669", padding: 14, borderRadius: 12, marginTop: 20, alignItems: "center" }}>
                            <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                    <Modal visible={showPayTimePicker} transparent animationType="slide">
                      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
                        <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowPayTimePicker(false)} />
                        <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, margin: 20, width: "90%" }}>
                          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#111827" }}>Select Time</Text>
                          <DateTimePicker
                            value={selectedPayDate}
                            mode="time"
                            display="compact"
                            onChange={(event, selected) => {
                              if (selected) {
                                const newDate = new Date(selectedPayDate);
                                newDate.setHours(selected.getHours());
                                newDate.setMinutes(selected.getMinutes());
                                setSelectedPayDate(newDate);
                              }
                            }}
                          />
                          <TouchableOpacity onPress={() => setShowPayTimePicker(false)} style={{ backgroundColor: "#059669", padding: 14, borderRadius: 12, marginTop: 20, alignItems: "center" }}>
                            <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  </>
                )}
                
                <TouchableOpacity
                  onPress={handleUpdateDetails}
                  disabled={!hasEditDetailsChanged() || isUpdatingDetails}
                  className={`bg-downy-800 py-4 rounded-xl items-center shadow-sm ${
                    (!hasEditDetailsChanged() || isUpdatingDetails) ? "opacity-70" : ""
                  }`}
                >
                  <Text className="text-white font-semibold text-lg">
                    {isUpdatingDetails ? "Updating..." : "Update Details"}
                  </Text>
                </TouchableOpacity>
                <View className="h-10" />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View >
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center p-6 bg-white">
      <Text className="text-red-600 font-semibold mb-2 text-lg">Something went wrong</Text>
      <Text className="text-gray-500 text-center mb-6 px-4">{error.message}</Text>
      <TouchableOpacity onPress={retry} className="bg-emerald-600 px-6 py-3 rounded-xl shadow-sm">
        <Text className="text-white font-medium">Try again</Text>
      </TouchableOpacity>
    </View>
  );
}
