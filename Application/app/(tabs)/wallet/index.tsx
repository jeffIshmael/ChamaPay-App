import { ResolvedAddress } from "@/components/ResolvedAddress";
import { useAuth } from "@/Contexts/AuthContext";
import { useUserResolver } from "@/hooks/useUserResolver";
import { CurrencyCode } from "@/lib/pretiumService";
import { getUserBalance } from "@/lib/userService";
import { getTheUserTx } from "@/lib/walletServices";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Upload
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withdrawalToMpesaFee } from "@/Utils/transactionFeeUtils";

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
  fiatAmount?: number;
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
  const [theTransaction, setTheTransaction] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const { user, token } = useAuth();
  const { currency } = useCurrencyStore();
  const { formatBalance, formatBalanceParts } = useFormattedBalance();

  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const { isLoading, resolvedName } = useUserResolver();

  const fetchBalances = async () => {
    if (!token) return;
    setIsRefreshingBalance(true);
    try {
      const balances = await getUserBalance(token as string);
      setUserBalance(balances.balance);
    } catch { /* ignored */ } finally {
      setIsRefreshingBalance(false);
    }
  };

  const getTx = async () => {
    if (!token) return;

    setLoadingTransactions(true);
    setTransactionError(null);

    try {
      const result = await getTheUserTx(token, { limit: 5 });

      if (result === null) {
        setTransactionError("Unable to load transaction history");
        setTheTransaction([]);
      } else {
        setTheTransaction(result.transactions);
      }
    } catch (error) {
setTransactionError("Failed to load transactions");
      setTheTransaction([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Refresh all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBalances();
      getTx();
    }, [token])
  );

  // Initial load
  useEffect(() => {
    fetchBalances();
  }, [token]);

  useEffect(() => {
    getTx();
  }, [token]);


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
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalances(), getTx()]);
    setRefreshing(false);
  };

  const openTransactionDetails = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setModalVisible(true);
  };

  const viewOnChain = (hash: string) => {
    // Base explorer URL - adjust if using different chain
    const explorerUrl = `https://basescan.org/tx/${hash}`;
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
            {tx.isPretiumTx ? (
              <Text className="text-xs text-gray-500 mt-1">
                {tx.type === "deposited"
                  ? `From: ${tx.sender || "M-PESA"}`
                  : `To: ${tx.recipient || "M-PESA"}`}
              </Text>
            ) : (
              <ResolvedAddress
                address={tx.type === "sent" || tx.type === "withdrew"  ? tx.recipient : tx.sender}
                type={tx.type === "sent" || tx.type === "withdrew" ? "recipient" : "sender"}
                fallback={tx.type === "sent" || tx.type === "withdrew" || tx.type === "received" ? "Unknown" : tx.type === "received" ? "Unknown" : "On-chain transaction"}
                textClassName="text-xs text-gray-500 mt-1"
                showPrefix={true}
              />
            )}
          </View>
        </View>

        <View className="items-end ml-2">
          <Text
            className={`font-bold text-base ${getTransactionTextColor(tx.type)}`}
          >
            {tx.type === "sent" || tx.type === "withdrew" ? "-" : "+"}
            {currency === "KES" && tx.fiatAmount 
              ? ` ${tx.fiatAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`
              : formatBalance(tx.amount)}
          </Text>
          {currency === "KES" && (
            <Text className="text-[10px] text-gray-400">
              ({parseFloat(tx.amount).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })} USDC)
            </Text>
          )}
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
        return "#f56c6cff"; // Red
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
            <View className="p-6" style={{ borderColor: headerColor, borderWidth: 2, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{
                    backgroundColor: headerColor,
                  }}
                >
                  {getTransactionIcon(selectedTransaction.type, true)}
                </View>
                {selectedTransaction.isPretiumTx && (
                  <View className="bg-white/20 px-3 py-1 rounded-full mb-2">
                    <Text className="text-white text-xs font-semibold">
                      M-PESA Transaction
                    </Text>
                  </View>
                )}
                <Text className="text-2xl font-bold mb-1 capitalize" style={{ color: headerColor }}>
                  {selectedTransaction.type}
                </Text>
                <Text className={`text-3xl font-extrabold`} style={{ color: headerColor }}>
                  {`${selectedTransaction.type === "sent" || selectedTransaction.type === "withdrew" ? "-" : "+"}${
                    currency === "KES" && selectedTransaction.fiatAmount
                      ? ` ${selectedTransaction.fiatAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES`
                      : ` ${formatBalance(selectedTransaction.amount)}`
                  }`}
                </Text>
                {currency === "KES" && (
                  <Text className="text-white/70 text-sm font-medium mt-1">
                    ({parseFloat(selectedTransaction.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })} USDC)
                  </Text>
                )}
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
                      <TouchableOpacity 
                        onPress={() => {
                          Clipboard.setStringAsync(selectedTransaction.recipient!);
                          Alert.alert("Copied", "Recipient address copied to clipboard");
                        }}
                        className="bg-gray-50 p-3 rounded-lg flex-row items-center justify-between"
                      >
                        <ResolvedAddress
                          address={selectedTransaction.recipient}
                          type="recipient"
                          showPrefix={false}
                          textClassName="text-gray-900 font-mono text-sm"
                        />
                        <Copy size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  )}

                {(selectedTransaction.type === "received" ||
                  selectedTransaction.type === "deposited") &&
                  selectedTransaction.sender && (
                    <View className="py-3 border-b border-gray-100">
                      <Text className="text-gray-600 font-medium mb-2">
                        From
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          Clipboard.setStringAsync(selectedTransaction.sender!);
                          Alert.alert("Copied", "Sender address copied to clipboard");
                        }}
                        className="bg-gray-50 p-3 rounded-lg flex-row items-center justify-between"
                      >
                        <ResolvedAddress
                          address={selectedTransaction.sender}
                          type="sender"
                          showPrefix={false}
                          textClassName="text-gray-900 font-mono text-sm"
                        />
                        <Copy size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  )}

                {/* Breakdown for M-PESA Withdrawals */}
                {selectedTransaction.isPretiumTx && selectedTransaction.type === "withdrew" && selectedTransaction.fiatAmount ? (
                  <View className="py-3 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium mb-3">Withdrawal Breakdown</Text>
                    <View className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-500">Total Amount</Text>
                        <Text className="text-sm font-semibold text-gray-900">
                          {selectedTransaction.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-500">Processing Fee</Text>
                        <Text className="text-sm font-semibold text-amber-600">
                          - {withdrawalToMpesaFee(selectedTransaction.fiatAmount).toFixed(2)} KES
                        </Text>
                      </View>
                      <View className="w-full h-px bg-gray-200 my-2" />
                      <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-sm font-bold text-gray-900">Received Amount</Text>
                        <Text className="text-sm font-bold text-gray-900">
                          {(selectedTransaction.fiatAmount - withdrawalToMpesaFee(selectedTransaction.fiatAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Receipt Number (for Pretium) or Transaction Hash */}
                {selectedTransaction.isPretiumTx &&
                  selectedTransaction.receiptNumber ? (
                  <View className="py-3">
                    <Text className="text-gray-600 font-medium mb-2">
                      M-PESA Receipt Number
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(selectedTransaction.receiptNumber!);
                        Alert.alert("Copied", "M-PESA Receipt Number copied to clipboard");
                      }}
                      className="bg-purple-50 p-3 rounded-lg border border-purple-200 flex-row items-center justify-between"
                    >
                      <Text className="text-purple-900 font-mono text-sm font-semibold">
                        {selectedTransaction.receiptNumber}
                      </Text>
                      <Copy size={16} color="#7e22ce" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="py-3">
                    <Text className="text-gray-600 font-medium mb-2">
                      Transaction Hash
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(selectedTransaction.hash);
                        Alert.alert("Copied", "Transaction hash copied to clipboard");
                      }}
                      className="bg-gray-50 p-3 rounded-lg flex-row items-center justify-between"
                    >
                      <Text
                        className="text-gray-900 font-mono text-xs flex-1 mr-2"
                        numberOfLines={2}
                        ellipsizeMode="middle"
                      >
                        {selectedTransaction.hash}
                      </Text>
                      <Copy size={16} color="#9ca3af" />
                    </TouchableOpacity>
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

  const getTransactionIcon = (type: string, useWhite: boolean = false) => {
    const iconProps = { size: 20, color: useWhite ? "white" : getTransactionIconColor(type) };
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
        <StatusBar style="light" />

        <View className="flex-1 bg-gray-50">
          {/* Card Section */}
          <View
            className="px-4 bg-downy-600 rounded-b-3xl"
            style={{ paddingTop: insets.top + 24 }}
          >
            {/* Balance Card */}
            <View
              className="rounded-3xl p-6 mb-6 border border-downy-500 relative overflow-hidden"
              style={[styles.balanceCard, {
                backgroundColor: '#1a6b6b',
              }]}
            >
              {/* Logo Background */}
              <View className="absolute inset-0 items-center justify-center">
                <Image
                  source={require("@/assets/images/chamapay-logo.png")}
                  style={{
                    width: '80%',
                    height: '80%',
                    opacity: 0.07,
                  }}
                  resizeMode="contain"
                />
              </View>

              {/* Decorative circles in background */}
              <View className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full" />
              <View className="absolute -right-5 top-20 w-24 h-24 bg-white/10 rounded-full" />
              <View className="absolute right-10 -bottom-5 w-20 h-20 bg-white/10 rounded-full" />

              <View>
                <Text className="text-white/80 text-xs font-semibold tracking-wide mb-3">
                  YOUR BALANCE
                </Text>

                <View className="mb-8">
                  <View className="flex-row items-center justify-between w-full pr-4">
                    <View>
                      {isRefreshingBalance && !refreshing ? (
                        <View className="flex-row items-baseline">
                          <View className="bg-white/20 h-14 w-40 rounded-lg animate-pulse" />
                        </View>
                      ) : (
                        <View className="flex-row items-baseline">
                          <Text className="text-5xl text-white font-bold tracking-tight">
                            {balanceVisible && userBalance
                              ? formatBalanceParts(userBalance).whole
                              : "---"}
                          </Text>
                          <Text className="text-5xl text-white font-medium">
                            .{balanceVisible && userBalance
                              ? formatBalanceParts(userBalance).decimal
                              : "00"}
                          </Text>
                          <Text className="text-lg text-white/90 ml-1 font-medium">
                            {formatBalanceParts(userBalance).symbol}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-6">
                      <TouchableOpacity onPress={fetchBalances} className="p-1">
                        <RefreshCw size={20} color="rgba(255, 255, 255, 0.8)" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)} className="p-1">
                        {balanceVisible ? (
                          <EyeOff size={20} color="rgba(255, 255, 255, 0.8)" />
                        ) : (
                          <Eye size={20} color="rgba(255, 255, 255, 0.8)" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {balanceVisible && currency === "KES" && (
                    isRefreshingBalance && !refreshing ? (
                      <View className="bg-white/20 h-4 w-24 rounded-lg mt-2 animate-pulse" />
                    ) : (
                      <Text className="text-white/60 text-sm mt-2">
                        ≈ {balanceVisible && userBalance ? usdcBalance : "----"} USDC
                      </Text>
                    )
                  )}
                </View>

                {/* Card details and logo */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white/80 text-base font-mono tracking-widest">
                      {user?.smartAddress?.slice(0, 4) || "****"} **** {user?.smartAddress?.slice(-4) || "****"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (user?.smartAddress) {
                          Clipboard.setStringAsync(user.smartAddress);
                          // ToastAndroid.show("Wallet address copied to clipboard", ToastAndroid.SHORT);
                        }
                      }}
                      activeOpacity={0.7}
                      className="p-1"
                    >
                      <Copy size={16} color="rgba(255, 255, 255, 0.8)" />
                    </TouchableOpacity>
                  </View>

                  {/* QR Code Receive Button */}
                  <TouchableOpacity
                    onPress={() => setReceiveModalVisible(true)}
                    activeOpacity={0.7}
                    className="p-2 bg-white/20 rounded-full"
                  >
                    <QrCode size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2 mb-6">
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/wallet/deposit-crypto",
                    params: {
                      USDCBalance: usdcBalance,
                    },
                  })
                }
                className="flex-1 bg-white py-3.5 rounded-xl shadow-sm"
                activeOpacity={0.8}
              >
                <View className="items-center justify-center gap-1">
                  <Plus size={20} color="#1c8584" />
                  <Text className="text-downy-600 font-semibold text-xs">
                    Deposit Funds
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
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
                className="flex-1 bg-white py-3.5 rounded-xl shadow-sm"
                activeOpacity={0.8}
              >
                <View className="items-center justify-center gap-1">
                  <Send size={20} color="#1c8584" />
                  <Text className="text-downy-600 font-semibold text-xs">
                    Send Funds
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/wallet/withdrawal-crypto",
                    params: {
                      USDCBalance: usdcBalance,
                      totalBalance: usdcBalance,
                      address: user?.smartAddress,
                    },
                  })
                }
                className="flex-1 bg-white py-3.5 rounded-xl shadow-sm"
                activeOpacity={0.8}
              >
                <View className="items-center justify-center gap-1">
                  <Upload size={20} color="#1c8584" />
                  <Text className="text-downy-600 font-semibold text-xs">
                    Withdraw Funds
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction History Section */}
          <View className="flex-1 px-6 mt-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold text-gray-900">
                Recent Activity
              </Text>
              {theTransaction.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/wallet/all-transactions")}
                  className="underline"
                  activeOpacity={0.8}
                >
                  <Text className="text-downy-600 text-md font-semibold">
                    View All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="h-px bg-gray-200 mb-4" />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 96 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#1c8584"
                  colors={["#1c8584"]}
                />
              }
            >
              {/* Loading State */}
            {loadingTransactions && !refreshing && <LoadingState />}

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
              theTransaction.length === 0 && (
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

            {/* Transactions List - Show only first 3 */}
            {!loadingTransactions &&
              !transactionError &&
              theTransaction.length > 0 && (
                <View>
                  {theTransaction.map((item) => (
                    <TransactionCard key={`${item.id}-${item.date}`} tx={item} />
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal />

      {/* Receive Modal */}
      <Modal
        visible={receiveModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReceiveModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white rounded-3xl w-full p-6 items-center shadow-lg">
            <Text className="text-xl font-bold text-gray-900 mb-2">Receive USDC</Text>
            <Text className="text-sm text-gray-500 mb-6 text-center">
              Send only USDC on the Base network to this address.
            </Text>
            
            <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <QRCode
                value={user?.smartAddress || ""}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>

            <View className="w-full bg-gray-50 rounded-xl p-4 mb-6 flex-row items-center justify-between border border-gray-200">
              <Text className="text-gray-600 font-mono flex-1 mr-2" numberOfLines={1} ellipsizeMode="middle">
                {user?.smartAddress}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (user?.smartAddress) {
                    Clipboard.setStringAsync(user.smartAddress);
                  }
                }}
                className="bg-downy-100 p-2 rounded-lg"
              >
                <Copy size={20} color="#10b981" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setReceiveModalVisible(false)}
              className="w-full bg-downy-600 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-lg">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "transparent",
  },
  balanceCard: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
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