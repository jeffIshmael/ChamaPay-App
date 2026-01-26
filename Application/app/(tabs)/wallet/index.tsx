import { AllBalances, getAllBalances } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import { CurrencyCode } from "@/lib/pretiumService";
import { getUserBalance } from "@/lib/userService";
import { getTheUserTx } from "@/lib/walletServices";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Download,
  ExternalLink,
  History,
  QrCode,
  Send,
  Upload
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

interface Transaction {
  id: number;
  type: string;
  token: string;
  amount: string;
  recipient?: string;
  sender?: string;
  hash: string;
  date: string;
  status: string;
  isPretiumTx?: boolean;
  receiptNumber?: string;
}
export interface Quote {
  currencyCode: CurrencyCode;
  exchangeRate: { buying_rate: number; selling_rate: number };
  success: boolean;
}

export default function CryptoWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [theTransaction, setTheTransaction] = useState<Transaction[] | null>(
    null
  );
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user, token } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = async () => {
    const balances = await getUserBalance(token as string);
    setUserBalance(balances.balance);
  };

  const getTx = async () => {
    if (!token) return;

    setLoadingTransactions(true);
    setTransactionError(null);

    try {
      const theTxs = await getTheUserTx(token);

      if (theTxs === null) {
        setTransactionError("Unable to load transaction history");
        setTheTransaction([]);
      } else {
        setTheTransaction(theTxs);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactionError("Failed to load transactions");
      setTheTransaction([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();
  const theExhangeQuote = rates["KES"]?.data || null;

  const fetchRate = async () => {
    await globalFetchRate("KES");
  };

  // Refresh all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - refreshing data");
      fetchBalances();
      getTx();
      fetchRate();
    }, [token])
  );

  // Initial load
  useEffect(() => {
    fetchBalances();
  }, [token]);

  useEffect(() => {
    getTx();
  }, [token]);

  useEffect(() => {
    fetchRate();
  }, []);

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalances(), getTx(), fetchRate()]);
    setRefreshing(false);
  };

  const openTransactionDetails = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setModalVisible(true);
  };

  const viewOnChain = (hash: string) => {
    // Celo explorer URL - adjust if using different chain
    const explorerUrl = `https://celoscan.io/tx/${hash}`;
    Linking.openURL(explorerUrl);
  };

  const usdcBalance = parseFloat(userBalance || "0").toFixed(3);

  const ActionButton = ({
    onPress,
    icon,
    title,
    gradient,
  }: {
    onPress: () => void;
    icon: React.ReactNode;
    title: string;
    gradient: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="items-center flex-1"
      activeOpacity={0.7}
    >
      <View
        className={`w-14 h-14 rounded-2xl items-center justify-center mb-2 bg-transparent`}
        style={styles.actionButtonIcon}
      >
        {icon}
      </View>
      <Text className="text-white text-xs font-medium">{title}</Text>
    </TouchableOpacity>
  );

  const TransactionCard = ({ tx }: { tx: Transaction }) => (
    <TouchableOpacity
      onPress={() => openTransactionDetails(tx)}
      className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-4"
            style={{
              backgroundColor: `${getTransactionIconColor(tx.type)}20`,
            }}
          >
            {getTransactionIcon(tx.type)}
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-gray-900 font-semibold text-base capitalize">
                {tx.type}
              </Text>
              {tx.isPretiumTx && (
                <View className="bg-purple-100 px-1 py-0.5 rounded-full">
                  <Text className="text-purple-700 text-xs font-semibold">
                    M-PESA
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-gray-500 mt-1">
              {tx.isPretiumTx
                ? tx.type === "deposited"
                  ? `From: ${tx.sender || "M-PESA"}`
                  : `To: ${tx.recipient || "M-PESA"}`
                : tx.type === "sent"
                  ? `To: ${tx.recipient || "Unknown"}`
                  : tx.type === "received"
                    ? `From: ${tx.sender || "Unknown"}`
                    : "On-chain transaction"}
            </Text>
          </View>
        </View>

        <View className="items-end ml-2">
          <Text
            className={`font-bold text-base ${getTransactionTextColor(tx.type)}`}
          >
            {tx.type === "sent" || tx.type === "withdrew" ? "-" : "+"}
            {parseFloat(tx.amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            {tx.token}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            {getRelativeTime(tx.date)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getModalHeaderColor = (type: string, isPretiumTx?: boolean): string => {
    if (isPretiumTx) {
      return "#9333ea"; // Purple for M-PESA
    }
    switch (type) {
      case "sent":
        return "#ef4444"; // Red
      case "received":
        return "#10b981"; // Emerald
      case "deposited":
        return "#3b82f6"; // Blue
      case "withdrew":
        return "#f97316"; // Orange
      default:
        return "#6b7280"; // Gray
    }
  };

  const TransactionDetailsModal = () => {
    if (!selectedTransaction) return null;

    const headerColor = getModalHeaderColor(
      selectedTransaction.type,
      selectedTransaction.isPretiumTx
    );

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          className="flex-1 bg-black/50 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
            style={styles.modalCard}
          >
            {/* Header */}
            <View className="p-6" style={{ backgroundColor: headerColor }}>
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {getTransactionIcon(selectedTransaction.type)}
                </View>
                {selectedTransaction.isPretiumTx && (
                  <View className="bg-white/20 px-3 py-1 rounded-full mb-2">
                    <Text className="text-white text-xs font-semibold">
                      M-PESA Transaction
                    </Text>
                  </View>
                )}
                <Text className="text-white text-2xl font-bold mb-1 capitalize">
                  {selectedTransaction.type}
                </Text>
                <Text className="text-white text-3xl font-extrabold">
                  {selectedTransaction.type === "sent" ||
                    selectedTransaction.type === "withdrew"
                    ? "-"
                    : "+"}
                  {parseFloat(selectedTransaction.amount).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    }
                  )}{" "}
                  {selectedTransaction.token}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View className="p-6">
              <View className="space-y-4">
                {/* Status */}
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Status</Text>
                  <View
                    className={`${selectedTransaction.isPretiumTx ? "bg-purple-100" : "bg-emerald-100"} px-3 py-1 rounded-full`}
                  >
                    <Text
                      className={`${selectedTransaction.isPretiumTx ? "text-purple-700" : "text-emerald-700"} font-semibold text-sm capitalize`}
                    >
                      {selectedTransaction.status}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Date</Text>
                  <Text className="text-gray-900 font-semibold">
                    {formatDate(selectedTransaction.date)}
                  </Text>
                </View>

                {/* To/From */}
                {(selectedTransaction.type === "sent" ||
                  selectedTransaction.type === "withdrew") &&
                  selectedTransaction.recipient && (
                    <View className="py-3 border-b border-gray-100">
                      <Text className="text-gray-600 font-medium mb-2">To</Text>
                      <View className="bg-gray-50 p-3 rounded-lg">
                        <Text className="text-gray-900 font-mono text-sm">
                          {selectedTransaction.recipient}
                        </Text>
                      </View>
                    </View>
                  )}

                {(selectedTransaction.type === "received" ||
                  selectedTransaction.type === "deposited") &&
                  selectedTransaction.sender && (
                    <View className="py-3 border-b border-gray-100">
                      <Text className="text-gray-600 font-medium mb-2">
                        From
                      </Text>
                      <View className="bg-gray-50 p-3 rounded-lg">
                        <Text className="text-gray-900 font-mono text-sm">
                          {selectedTransaction.sender}
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Receipt Number (for Pretium) or Transaction Hash */}
                {selectedTransaction.isPretiumTx &&
                  selectedTransaction.receiptNumber ? (
                  <View className="py-3">
                    <Text className="text-gray-600 font-medium mb-2">
                      M-PESA Receipt Number
                    </Text>
                    <View className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <Text className="text-purple-900 font-mono text-sm font-semibold">
                        {selectedTransaction.receiptNumber}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="py-3">
                    <Text className="text-gray-600 font-medium mb-2">
                      Transaction Hash
                    </Text>
                    <View className="bg-gray-50 p-3 rounded-lg">
                      <Text
                        className="text-gray-900 font-mono text-xs"
                        numberOfLines={2}
                        ellipsizeMode="middle"
                      >
                        {selectedTransaction.hash}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="mt-6 space-y-3">
                {!selectedTransaction.isPretiumTx &&
                  selectedTransaction.hash !== "N/A" && (
                    <TouchableOpacity
                      onPress={() => viewOnChain(selectedTransaction.hash)}
                      className="bg-emerald-600 py-4 rounded-xl flex-row items-center justify-center"
                      activeOpacity={0.8}
                    >
                      <ExternalLink size={20} color="white" />
                      <Text className="text-white font-bold text-base ml-2">
                        View on Chain
                      </Text>
                    </TouchableOpacity>
                  )}

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="bg-gray-200 py-4 rounded-xl mt-3"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 font-bold text-base text-center">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const LoadingState = () => (
    <View className="bg-transparent p-8  items-center justify-center ">
      <View className="mb-4">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    </View>
  );

  const copyAddress = () => {
    Alert.alert("Copied", "Wallet address copied to clipboard");
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    const iconProps = { size: 20, color: getTransactionIconColor(type) };
    switch (type) {
      case "sent":
        return <ArrowUpRight {...iconProps} />;
      case "received":
        return <ArrowDownRight {...iconProps} />;
      case "deposited":
        return <Download {...iconProps} />;
      case "withdrew":
        return <Upload {...iconProps} />;
      default:
        return <DollarSign {...iconProps} />;
    }
  };

  const getTransactionIconColor = (type: string): string => {
    switch (type) {
      case "sent":
        return "#dc2626";
      case "received":
        return "#059669";
      case "deposited":
        return "#2563eb";
      case "withdrew":
        return "#ea580c";
      default:
        return "#6b7280";
    }
  };

  const getTransactionTextColor = (type: string): string => {
    switch (type) {
      case "sent":
        return "text-red-600";
      case "received":
        return "text-emerald-600";
      case "deposited":
        return "text-blue-600";
      case "withdrew":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 64}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header - Fixed */}
        <View
          className="bg-downy-800 px-6 pb-8 rounded-b-3xl"
          style={[styles.headerShadow, { paddingTop: insets.top + 24 }]}
        >
          {/* Balance Section */}
          <View className="mb-6 items-center">
            <View className="flex-row items-center gap-4 mb-4">
              <Text className="text-lg text-emerald-100 font-medium">Available Balance</Text>
            </View>

            <View className="items-center mb-2">
              <View className="flex-row items-baseline justify-center mb-1">
                <Text className="text-5xl text-white font-extrabold tracking-tight">
                  {balanceVisible && theExhangeQuote?.exchangeRate.selling_rate && userBalance
                    ? (Number(userBalance) * theExhangeQuote?.exchangeRate.selling_rate).toFixed(2)
                    : "---"}
                </Text>

                <Text className="text-2xl ml-2 text-white/90 font-semibold tracking-tight">
                  {theExhangeQuote?.currencyCode}
                </Text>
              </View>

              {balanceVisible && (
                <Text className="text-emerald-100 text-base font-medium">
                  ≈{" "}
                  {balanceVisible && userBalance
                    ? usdcBalance
                    : "----"} USDC
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons - Inside Header */}
          <View className="flex-row justify-between px-4">
            <ActionButton
              onPress={() =>
                router.push({
                  pathname: "/wallet/send-crypto",
                  params: {
                    USDCBalance: usdcBalance,
                    totalBalance: usdcBalance,
                    address: user?.smartAddress,
                  },
                })
              }
              icon={<Send size={22} color="white" />}
              title="Send"
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <ActionButton
              onPress={() => router.push("/wallet/receive-crypto")}
              icon={<QrCode size={22} color="white" />}
              title="Receive"
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <ActionButton
              onPress={() =>
                router.push({
                  pathname: "/wallet/deposit-crypto",
                  params: {
                    currencyCode: theExhangeQuote?.currencyCode,
                    onramp: theExhangeQuote?.exchangeRate.selling_rate,
                    USDCBalance: usdcBalance,
                  },
                })
              }
              icon={<Download size={22} color="white" className="bg-transparent" />}
              title="Deposit"
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <ActionButton
              onPress={() =>
                router.push({
                  pathname: "/wallet/withdrawal-crypto",
                  params: {
                    USDCBalance: usdcBalance,
                    totalBalance: usdcBalance,
                    address: user?.smartAddress,
                    currencyCode: theExhangeQuote?.currencyCode,
                    offramp: theExhangeQuote?.exchangeRate.buying_rate,
                  },
                })
              }
              icon={<Upload size={22} color="white" />}
              title="Withdraw"
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            />
          </View>
        </View>

        {/* Transaction History Section */}
        <View className="flex-1 px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-gray-900">
              Recent Activity
            </Text>
            {theTransaction && theTransaction.length > 3 && (
              <TouchableOpacity
                onPress={() => router.push("/wallet/all-transactions")}
                className="px-4 py-2 rounded-full"
                activeOpacity={0.8}
              >
                <Text className="text-downy-600 text-sm font-semibold">
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loading State */}
          {loadingTransactions && <LoadingState />}

          {/* Error State */}
          {transactionError && !loadingTransactions && (
            <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
              <Text className="text-red-700 font-medium text-sm">
                {transactionError}
              </Text>
              <TouchableOpacity
                onPress={() => onRefresh()}
                className="mt-2 bg-red-100 px-3 py-1 rounded-md self-start"
              >
                <Text className="text-red-700 font-semibold text-xs">
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!loadingTransactions &&
            !transactionError &&
            (!theTransaction || theTransaction.length === 0) && (
              <View className="p-10 items-center justify-center">
                <History size={48} color="#9ca3af" className="mb-4" />
                <Text className="text-gray-900 font-bold text-lg mb-2">
                  No Transactions Yet
                </Text>
                <Text className="text-gray-500 text-sm text-center leading-5">
                  Your transaction history will appear here when you make your
                  first transaction
                </Text>
              </View>
            )}

          {/* Transactions List - Show only first 3, scrollable */}
          {!loadingTransactions &&
            !transactionError &&
            theTransaction &&
            theTransaction.length > 0 && (
              <FlatList
                data={theTransaction.slice(0, 3)}
                renderItem={({ item }) => <TransactionCard tx={item} />}
                keyExtractor={(item) => `${item.id}-${item.date}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#059669"
                    colors={["#059669"]}
                  />
                }
              />
            )}
        </View>
      </View>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonIcon: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  modalCard: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
});
