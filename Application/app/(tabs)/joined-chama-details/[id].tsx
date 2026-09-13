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
import { ArrowLeft, Share2, User, UserPlus, Edit3, Calendar, Clock, LogOut, CheckCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  const [activeTab, setActiveTab] = useState("overview");
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
      isMember?: boolean;
    }>
  >([]);
  const [isShareSearching, setIsShareSearching] = useState(false);
  const [showShareSearchResults, setShowShareSearchResults] = useState(false);
  const [shareSearchDoneFor, setShareSearchDoneFor] = useState("");
  const shareSearchReqId = useRef(0);
  const [selectedShareUser, setSelectedShareUser] = useState<{
    id: number;
    userName: string;
    email: string;
    smartAddress: string;
    profileImageUrl: string | null;
    isMember?: boolean;
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
      isMember?: boolean;
    }>
  >([]);
  const [isAddMemberSearching, setIsAddMemberSearching] = useState(false);
  const [showAddMemberSearchResults, setShowAddMemberSearchResults] = useState(false);
  const [addMemberSearchDoneFor, setAddMemberSearchDoneFor] = useState("");
  const addMemberSearchReqId = useRef(0);
  const [selectedAddMemberUser, setSelectedAddMemberUser] = useState<{
    id: number;
    userName: string;
    email: string;
    smartAddress: string;
    profileImageUrl: string | null;
    isMember?: boolean;
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
    setActiveTab("overview");
    fetchChama();
    fetchMyWalletBalance();
  }, [id, token]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setActiveTab("overview");
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

  const [recipientRemainingAmount, setRecipientRemainingAmount] = useState<number>(0);

  const getMemberRemainingAmount = (address: string) => {
    let recBalance = 0;
    if (memberBalances && memberBalances[0] && memberBalances[1]) {
       const index = memberBalances[0].findIndex(a => a.toLowerCase() === address.toLowerCase());
       if (index !== -1) {
          const rawBalances = memberBalances[1][index];
          recBalance = Number(formatUnits(rawBalances[0] || BigInt(0), 6));
       }
    }
    const currentRemaining = Number(chama?.contribution) - recBalance;
    return currentRemaining > 0 ? currentRemaining : 0;
  };

  const proceedToPayment = (recipient: { userId: number; userName: string; address?: string } | null = null) => {
    setSelectedRecipient(recipient);
    setShowRecipientModal(false);

    if (recipient && recipient.address) {
       setRecipientRemainingAmount(getMemberRemainingAmount(recipient.address));
    } else {
       setRecipientRemainingAmount(0);
    }
    
    // If the user's location is KE (Kenya) and it's not a direct USDC flow, default to PaymentModal
    if (user?.location === "KE") {
      setShowPaymentModal(true);
    } else {
      setShowUSDCPaymentModal(true);
    }
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
    const q = shareUsername.trim();

    if (q.length < 2) {
      shareSearchReqId.current += 1;
      setShareSearchResults([]);
      setShowShareSearchResults(false);
      setIsShareSearching(false);
      setShareSearchDoneFor("");
      return;
    }

    if (selectedShareUser && shareUsername === selectedShareUser.userName) {
      setIsShareSearching(false);
      return;
    }

    const reqId = ++shareSearchReqId.current;
    setIsShareSearching(true);
    setShareSearchDoneFor("");
    setShareSearchResults([]);
    setShowShareSearchResults(false);

    const timeoutId = setTimeout(async () => {
      try {
        const result = await searchUsers(q);
        if (reqId !== shareSearchReqId.current) return;

        if (result.success && result.users) {
          const existingMemberIds = chama?.members.map((m) => m.id) || [];
          const filteredUsers = result.users
            .filter((searchUser) => searchUser.id !== user?.id)
            .map((searchUser) => ({
              ...searchUser,
              isMember: existingMemberIds.includes(searchUser.id),
            }));
          setShareSearchResults(filteredUsers);
          setShowShareSearchResults(filteredUsers.length > 0);
        } else {
          setShareSearchResults([]);
          setShowShareSearchResults(false);
        }
        setShareSearchDoneFor(q);
      } catch (error) {
        if (reqId !== shareSearchReqId.current) return;
        setShareSearchResults([]);
        setShowShareSearchResults(false);
        setShareSearchDoneFor(q);
      } finally {
        if (reqId === shareSearchReqId.current) {
          setIsShareSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [shareUsername, selectedShareUser, user, chama?.members]);

  // Search users for adding members with debouncing
  useEffect(() => {
    const q = addMemberUsername.trim();

    if (q.length < 2) {
      addMemberSearchReqId.current += 1;
      setAddMemberSearchResults([]);
      setShowAddMemberSearchResults(false);
      setIsAddMemberSearching(false);
      setAddMemberSearchDoneFor("");
      return;
    }

    if (selectedAddMemberUser && addMemberUsername === selectedAddMemberUser.userName) {
      setIsAddMemberSearching(false);
      return;
    }

    const reqId = ++addMemberSearchReqId.current;
    setIsAddMemberSearching(true);
    setAddMemberSearchDoneFor("");
    setAddMemberSearchResults([]);
    setShowAddMemberSearchResults(false);

    const timeoutId = setTimeout(async () => {
      try {
        const result = await searchUsers(q);
        if (reqId !== addMemberSearchReqId.current) return;

        if (result.success && result.users) {
          const existingMemberIds = chama?.members.map((m) => m.id) || [];
          const filteredUsers = result.users
            .filter((searchUser) => searchUser.id !== user?.id)
            .map((searchUser) => ({
              ...searchUser,
              isMember: existingMemberIds.includes(searchUser.id),
            }));
          setAddMemberSearchResults(filteredUsers);
          setShowAddMemberSearchResults(filteredUsers.length > 0);
        } else {
          setAddMemberSearchResults([]);
          setShowAddMemberSearchResults(false);
        }
        setAddMemberSearchDoneFor(q);
      } catch (error) {
        if (reqId !== addMemberSearchReqId.current) return;
        setAddMemberSearchResults([]);
        setShowAddMemberSearchResults(false);
        setAddMemberSearchDoneFor(q);
      } finally {
        if (reqId === addMemberSearchReqId.current) {
          setIsAddMemberSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addMemberUsername, selectedAddMemberUser, user, chama?.members]);

  const handleAddMemberUserSelect = (user: typeof selectedAddMemberUser) => {
    if (!user || user.isMember) return;
    setSelectedAddMemberUser(user);
    setAddMemberUsername(user.userName || "");
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
    if (!user || user.isMember) return;
    setSelectedShareUser(user);
    setShareUsername(user.userName || "");
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
      contributionAmount={chama.contribution}
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
          remainingAmount={selectedRecipient ? recipientRemainingAmount : remainingAmount}
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
          remainingAmount={selectedRecipient ? recipientRemainingAmount : remainingAmount}
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
                      onPress={() => proceedToPayment({ userId: member.id, userName: member.name, address: member.smartAddress })}
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
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowShareModal(false);
          setShareUsername("");
          setIsShareSearching(false);
          setShowShareSearchResults(false);
          setSelectedShareUser(null);
          setShareSearchResults([]);
          setShareSearchDoneFor("");
        }}
      >
        <Pressable
          onPress={() => {
            setShowShareModal(false);
            setShareUsername("");
            setIsShareSearching(false);
            setShowShareSearchResults(false);
            setSelectedShareUser(null);
            setShareSearchResults([]);
            setShareSearchDoneFor("");
          }}
          className="flex-1 justify-center bg-black/55 px-5"
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white w-full self-center rounded-3xl overflow-hidden"
              style={{ maxWidth: 380 }}
            >
              <View
                className="bg-emerald-50 border-b border-emerald-100"
                style={{ paddingTop: 14, paddingBottom: 16, paddingHorizontal: 20 }}
              >
                <View className="flex-row items-center">
                  <View className="w-11 h-11 rounded-full bg-white items-center justify-center border border-emerald-100">
                    <Share2 size={20} color="#059669" />
                  </View>
                  <View className="flex-1 mr-3" style={{ marginLeft: 10 }}>
                    <Text className="text-lg font-bold text-gray-900 leading-6">
                      Share Chama
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5 leading-4">
                      Invite others to join
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowShareModal(false);
                      setShareUsername("");
                      setIsShareSearching(false);
                      setShowShareSearchResults(false);
                      setSelectedShareUser(null);
                      setShareSearchResults([]);
                      setShareSearchDoneFor("");
                    }}
                    className="w-9 h-9 rounded-full bg-white items-center justify-center border border-emerald-100"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="px-5 pt-4 pb-5">
                <TouchableOpacity
                  onPress={copyLink}
                  className="flex-row items-center rounded-2xl border border-emerald-200 bg-white px-3 py-3"
                  activeOpacity={0.7}
                  style={{ borderWidth: 1.5 }}
                >
                  <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
                    <Ionicons name="link" size={18} color="#059669" />
                  </View>
                  <View className="flex-1 ml-3 mr-3">
                    <Text className="font-semibold text-gray-900 text-sm">
                      Copy invite link
                    </Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Share anywhere
                    </Text>
                  </View>
                  <View className="bg-downy-600 rounded-lg px-3 py-1.5">
                    <Text className="text-white font-semibold text-xs">Copy</Text>
                  </View>
                </TouchableOpacity>

                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-px bg-gray-100" />
                  <Text className="mx-2.5 text-[10px] font-semibold tracking-wide text-gray-400">
                    OR SEND IN-APP
                  </Text>
                  <View className="flex-1 h-px bg-gray-100" />
                </View>

                <Text className="text-xs font-semibold text-gray-600 mb-2">
                  Share to a Chamapay user
                </Text>

                <View
                  className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3"
                  style={{ height: 46 }}
                >
                  <Text className="text-base font-semibold text-emerald-600 mr-1.5">@</Text>
                  <TextInput
                    value={shareUsername}
                    onChangeText={(text) => {
                      setShareUsername(text);
                      setSelectedShareUser(null);
                      setShareSearchDoneFor("");
                      if (text.trim().length >= 2) {
                        setIsShareSearching(true);
                        setShareSearchResults([]);
                        setShowShareSearchResults(false);
                      } else {
                        setIsShareSearching(false);
                        setShareSearchResults([]);
                        setShowShareSearchResults(false);
                      }
                    }}
                    placeholder="username"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1, fontSize: 15, color: "#111827", paddingVertical: 0 }}
                  />
                  {isShareSearching ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : null}
                </View>

                {isShareSearching ? (
                  <View className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#059669" />
                    <Text className="ml-2 text-sm text-gray-500">Searching...</Text>
                  </View>
                ) : null}

                {!isShareSearching &&
                showShareSearchResults &&
                shareSearchResults.length > 0 ? (
                  <View className="mt-2 rounded-xl border border-gray-100 bg-white overflow-hidden max-h-40">
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {shareSearchResults.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          onPress={() => handleShareUserSelect(user)}
                          disabled={!!user.isMember}
                          className={`flex-row items-center px-3 py-2.5 border-b border-gray-50 ${
                            user.isMember ? "bg-slate-50 opacity-70" : ""
                          }`}
                          activeOpacity={user.isMember ? 1 : 0.7}
                        >
                          <View
                            className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${
                              user.isMember ? "bg-slate-200" : "bg-emerald-100"
                            }`}
                          >
                            {user.profileImageUrl ? (
                              <Image
                                source={{ uri: user.profileImageUrl }}
                                className={`w-9 h-9 rounded-full ${user.isMember ? "opacity-50" : ""}`}
                              />
                            ) : (
                              <User size={16} color={user.isMember ? "#94a3b8" : "#059669"} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`font-semibold text-sm ${
                                user.isMember ? "text-slate-400" : "text-gray-900"
                              }`}
                            >
                              @{user.userName}
                            </Text>
                            {user.isMember ? (
                              <Text className="text-[11px] text-slate-400">Already a member</Text>
                            ) : null}
                          </View>
                          {user.isMember ? (
                            <View className="px-2 py-0.5 rounded-full bg-slate-200">
                              <Text className="text-[10px] font-bold text-slate-500 uppercase">
                                Member
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {!isShareSearching &&
                shareUsername.trim().length >= 2 &&
                !selectedShareUser &&
                shareSearchResults.length === 0 &&
                shareSearchDoneFor === shareUsername.trim() ? (
                  <View className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                    <Text className="text-red-600 text-sm font-medium text-center">
                      User not found
                    </Text>
                  </View>
                ) : null}

                {selectedShareUser ? (
                  <View className="mt-2.5 flex-row items-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <User size={14} color="#059669" />
                    <Text className="ml-2 flex-1 font-semibold text-emerald-800 text-sm">
                      @{selectedShareUser.userName}
                    </Text>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => shareToUser(chama.slug)}
                  disabled={!selectedShareUser || sendingLink}
                  activeOpacity={0.7}
                  className={`mt-3 h-11 rounded-xl items-center justify-center ${
                    selectedShareUser && !sendingLink ? "bg-downy-600" : "bg-gray-200"
                  }`}
                >
                  {sendingLink ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      className={`font-bold text-[15px] ${
                        selectedShareUser ? "text-white" : "text-gray-400"
                      }`}
                    >
                      Send Invite
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAddMemberModal(false);
          setAddMemberUsername("");
          setIsAddMemberSearching(false);
          setShowAddMemberSearchResults(false);
          setSelectedAddMemberUser(null);
          setAddMemberSearchResults([]);
          setAddMemberSearchDoneFor("");
        }}
      >
        <Pressable
          onPress={() => {
            setShowAddMemberModal(false);
            setAddMemberUsername("");
            setIsAddMemberSearching(false);
            setShowAddMemberSearchResults(false);
            setSelectedAddMemberUser(null);
            setAddMemberSearchResults([]);
            setAddMemberSearchDoneFor("");
          }}
          className="flex-1 justify-center bg-black/55 px-5"
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white w-full self-center rounded-3xl overflow-hidden"
              style={{ maxWidth: 380 }}
            >
              <View
                className="bg-emerald-50 border-b border-emerald-100"
                style={{ paddingTop: 14, paddingBottom: 16, paddingHorizontal: 20 }}
              >
                <View className="flex-row items-center">
                  <View className="w-11 h-11 rounded-full bg-white items-center justify-center border border-emerald-100">
                    <UserPlus size={20} color="#059669" />
                  </View>
                  <View className="flex-1 mr-3" style={{ marginLeft: 10 }}>
                    <Text className="text-lg font-bold text-gray-900 leading-6">
                      Add Member
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5 leading-4">
                      Already on Chamapay
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddMemberModal(false);
                      setAddMemberUsername("");
                      setIsAddMemberSearching(false);
                      setShowAddMemberSearchResults(false);
                      setSelectedAddMemberUser(null);
                      setAddMemberSearchResults([]);
                      setAddMemberSearchDoneFor("");
                    }}
                    className="w-9 h-9 rounded-full bg-white items-center justify-center border border-emerald-100"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="px-5 pt-4 pb-5">
                <Text className="text-xs font-semibold text-gray-600 mb-2">
                  Search by username
                </Text>

                <View
                  className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3"
                  style={{ height: 46 }}
                >
                  <Text className="text-base font-semibold text-emerald-600 mr-1.5">@</Text>
                  <TextInput
                    value={addMemberUsername}
                    onChangeText={(text) => {
                      setAddMemberUsername(text);
                      setSelectedAddMemberUser(null);
                      setAddMemberSearchDoneFor("");
                      if (text.trim().length >= 2) {
                        setIsAddMemberSearching(true);
                        setAddMemberSearchResults([]);
                        setShowAddMemberSearchResults(false);
                      } else {
                        setIsAddMemberSearching(false);
                        setAddMemberSearchResults([]);
                        setShowAddMemberSearchResults(false);
                      }
                    }}
                    placeholder="username"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1, fontSize: 15, color: "#111827", paddingVertical: 0 }}
                  />
                  {isAddMemberSearching ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : null}
                </View>

                {isAddMemberSearching ? (
                  <View className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#059669" />
                    <Text className="ml-2 text-sm text-gray-500">Searching...</Text>
                  </View>
                ) : null}

                {!isAddMemberSearching &&
                showAddMemberSearchResults &&
                addMemberSearchResults.length > 0 ? (
                  <View className="mt-2 rounded-xl border border-gray-100 bg-white overflow-hidden max-h-40">
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {addMemberSearchResults.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          onPress={() => handleAddMemberUserSelect(user)}
                          disabled={!!user.isMember}
                          className={`flex-row items-center px-3 py-2.5 border-b border-gray-50 ${
                            user.isMember ? "bg-slate-50 opacity-70" : ""
                          }`}
                          activeOpacity={user.isMember ? 1 : 0.7}
                        >
                          <View
                            className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${
                              user.isMember ? "bg-slate-200" : "bg-emerald-100"
                            }`}
                          >
                            {user.profileImageUrl ? (
                              <Image
                                source={{ uri: user.profileImageUrl }}
                                className={`w-9 h-9 rounded-full ${user.isMember ? "opacity-50" : ""}`}
                              />
                            ) : (
                              <User size={16} color={user.isMember ? "#94a3b8" : "#059669"} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`font-semibold text-sm ${
                                user.isMember ? "text-slate-400" : "text-gray-900"
                              }`}
                            >
                              @{user.userName}
                            </Text>
                            {user.isMember ? (
                              <Text className="text-[11px] text-slate-400">Already a member</Text>
                            ) : null}
                          </View>
                          {user.isMember ? (
                            <View className="px-2 py-0.5 rounded-full bg-slate-200">
                              <Text className="text-[10px] font-bold text-slate-500 uppercase">
                                Member
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {!isAddMemberSearching &&
                addMemberUsername.trim().length >= 2 &&
                !selectedAddMemberUser &&
                addMemberSearchResults.length === 0 &&
                addMemberSearchDoneFor === addMemberUsername.trim() ? (
                  <View className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                    <Text className="text-red-600 text-sm font-medium text-center">
                      User not found
                    </Text>
                  </View>
                ) : null}

                {selectedAddMemberUser ? (
                  <View className="mt-2.5 flex-row items-center rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <User size={14} color="#059669" />
                    <Text className="ml-2 flex-1 font-semibold text-emerald-800 text-sm">
                      @{selectedAddMemberUser.userName}
                    </Text>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleAddMember}
                  disabled={!selectedAddMemberUser || isAddingMember}
                  activeOpacity={0.7}
                  className={`mt-3 h-11 rounded-xl items-center justify-center ${
                    selectedAddMemberUser && !isAddingMember ? "bg-downy-600" : "bg-gray-200"
                  }`}
                >
                  {isAddingMember ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      className={`font-bold text-[15px] ${
                        selectedAddMemberUser ? "text-white" : "text-gray-400"
                      }`}
                    >
                      Add to Chama
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
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
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: "78%" }}>
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-gray-300" />
              </View>
              <View className="flex-row justify-between items-center px-5 pb-3 border-b border-gray-100">
                <View>
                  <Text className="text-xl font-bold text-gray-900">Edit Details</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Update chama settings</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  className="w-9 h-9 items-center justify-center bg-gray-100 rounded-full"
                >
                  <Ionicons name="close" size={18} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-5 pt-4" keyboardShouldPersistTaps="handled">
                <Text className="text-gray-700 font-medium mb-2 text-sm">Chama Name</Text>
                <TextInput
                  value={editFormData.name}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, name: text })
                  }
                  placeholder="e.g. My Awesome Chama"
                  className={`border rounded-xl px-4 py-3 mb-4 text-base ${editFormData.name !== chama?.name ? "border-emerald-500 bg-emerald-50" : "bg-gray-50 border-gray-200"}`}
                />

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-medium text-sm">Amount ({isEditKESMode ? "KES" : "USDC"})</Text>
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

                <Text className="text-gray-700 font-medium mb-2 text-sm">Cycle Time (days)</Text>
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
                    <Text className="text-gray-700 font-medium mb-2 text-sm">Current Cycle</Text>
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
                    <Text className="text-gray-700 font-medium mb-2 text-sm">Current Round</Text>
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

                <Text className="text-gray-700 font-medium mb-2 text-sm">Pay Date & Time</Text>
                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    onPress={() => setShowPayDatePicker(true)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="font-medium text-gray-900 text-sm">{selectedPayDate.toLocaleDateString()}</Text>
                    <Calendar size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowPayTimePicker(true)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
                  >
                    <Text className="font-medium text-gray-900 text-sm">{selectedPayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Clock size={18} color="#6b7280" />
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
              </ScrollView>

              <View className="px-5 pt-3 pb-6 border-t border-gray-100 bg-white">
                <TouchableOpacity
                  onPress={handleUpdateDetails}
                  disabled={!hasEditDetailsChanged() || isUpdatingDetails}
                  className={`h-12 rounded-2xl items-center justify-center flex-row ${
                    hasEditDetailsChanged() && !isUpdatingDetails
                      ? "bg-downy-700"
                      : "bg-gray-200"
                  }`}
                >
                  {isUpdatingDetails ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Edit3
                        size={16}
                        color={hasEditDetailsChanged() ? "#fff" : "#9CA3AF"}
                      />
                      <Text
                        className={`ml-2 font-semibold text-base ${
                          hasEditDetailsChanged() ? "text-white" : "text-gray-400"
                        }`}
                      >
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
