import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  History,
  QrCode,
  Send,
  Upload,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { shortenAddress } from "thirdweb/utils";
import { AllBalances, getAllBalances } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import { getTheUserTx } from "@/lib/walletServices";
import { getExchangeRate } from "@/lib/pretiumService";
import { CurrencyCode } from "@/lib/pretiumService";

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
}

interface Quote {
  currencyCode: CurrencyCode;
  exchangeRate: { buying_rate: number; selling_rate: number };
  success: boolean;
}

export default function CryptoWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview"
  );
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [userBalance, setUserBalance] = useState<AllBalances | null>(null);
  const [theTransaction, setTheTransaction] = useState<Transaction[] | null>(
    null
  );
  const [theExhangeQuote, setTheExchangeQuote] = useState<Quote | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const wallet = useActiveWallet();
  const activeAccount = useActiveAccount();
  const { user, token } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = async () => {
    if (wallet && activeAccount) {
      const balances = await getAllBalances(
        activeAccount.address as `0x${string}`
      );
      console.log("the balances", balances);
      setUserBalance(balances);
    }
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

  const fetchRate = async () => {
    const rate = await getExchangeRate("KES");
    setTheExchangeQuote(rate);
  };

  // Refresh all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - refreshing data");
      fetchBalances();
      getTx();
      fetchRate();
    }, [wallet, activeAccount, token])
  );

  // Initial load
  useEffect(() => {
    fetchBalances();
  }, [wallet, activeAccount]);

  useEffect(() => {
    getTx();
  }, [token]);

  useEffect(() => {
    fetchRate();
  }, []);

  const groupTransactionsByDate = (
    transactions: Transaction[]
  ): { [key: string]: Transaction[] } => {
    if (!transactions || transactions.length === 0) return {};

    return transactions.reduce(
      (groups, tx) => {
        const date = new Date(tx.date);
        const dateKey = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
        return groups;
      },
      {} as { [key: string]: Transaction[] }
    );
  };

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

  const celoLogo = require("@/assets/images/celoLogo.jpg");

  const usdcBalance = parseFloat(userBalance?.USDC.displayValue || "0");

  const walletData = {
    address: activeAccount?.address,
    balances: [
      {
        symbol: userBalance?.USDC.symbol || "USDC",
        name: userBalance?.USDC.name || "USD Coin",
        amount: parseFloat(userBalance?.USDC.displayValue || "0"),
        usdValue: parseFloat(userBalance?.USDC.displayValue || "0"),
        change24h: 0.01,
        icon: "💎",
        image: require("@/assets/images/usdclogo.png"),
      },
    ],
    totalUsdValue: parseFloat(userBalance?.USDC.displayValue || "0"),
    recentTransactions: theTransaction as Transaction[],
  };

  const ActionButton = ({
    onPress,
    icon,
    title,
    bgColor,
    textColor,
  }: {
    onPress: () => void;
    icon: React.ReactNode;
    title: string;
    bgColor: string;
    textColor: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 items-center py-3 px-1 rounded-2xl ${bgColor} ${textColor}`}
      style={styles.actionButton}
    >
      <View className="bg-white p-3 rounded-full mb-2 shadow-sm">{icon}</View>
      <Text className={`text-sm font-semibold ${textColor}`}>{title}</Text>
    </TouchableOpacity>
  );

  const TokenCard = ({ token }: { token: (typeof walletData.balances)[0] }) => (
    <View
      className="bg-white p-5 rounded-2xl shadow-sm mb-4"
      style={styles.card}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="relative mr-4">
            <Image
              source={token.image || celoLogo}
              className="w-12 h-12 rounded-full"
              resizeMode="cover"
            />
            <View className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full items-center justify-center border-2 border-white">
              <Svg viewBox="0 0 2500 2500" width={12} height={12}>
                <Circle fill="#FCFF52" cx="1250" cy="1250" r="1250" />
                <Path
                  fill="#000000"
                  d="M1949.3,546.2H550.7v1407.7h1398.7v-491.4h-232.1c-80,179.3-260.1,304.1-466.2,304.1
                c-284.1,0-514.2-233.6-514.2-517.5c0-284,230.1-515.6,514.2-515.6c210.1,0,390.2,128.9,470.2,312.1h228.1V546.2z"
                />
              </Svg>
            </View>
          </View>

          <View>
            <Text className="text-gray-900 font-semibold text-lg">
              {token.symbol}
            </Text>
            <Text className="text-sm text-gray-500">{token.name}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-gray-900 font-bold text-lg">
            {token.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {token.symbol}
          </Text>
          <Text className="text-lg text-gray-500 font-medium mb-1">
            {formatCurrency(token.usdValue)}
          </Text>
        </View>
      </View>
    </View>
  );

  const TransactionCard = ({ tx }: { tx: Transaction }) => (
    <View className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100">
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
            <Text className="text-gray-900 font-semibold text-base capitalize">
              {tx.type} {tx.token}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {tx.type === "send"
                ? `To: ${tx.recipient || "Unknown"}`
                : tx.type === "receive"
                  ? `From: ${tx.sender || "Unknown"}`
                  : "On-chain transaction"}
            </Text>
          </View>
        </View>

        <View className="items-end ml-2">
          <Text
            className={`font-bold text-base ${getTransactionTextColor(tx.type)}`}
          >
            {tx.type === "send" ? "-" : "+"}
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

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            "Transaction Details",
            `Hash: ${tx.hash}\nStatus: ${tx.status}\nDate: ${formatDate(
              tx.date
            )}`
          );
        }}
        className="mt-3 pt-3 border-t border-gray-100"
      >
        <Text className="text-xs text-blue-600 font-medium">View Details</Text>
      </TouchableOpacity>
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
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    const iconProps = { size: 16, color: getTransactionIconColor(type) };
    switch (type) {
      case "send":
        return <ArrowUpRight {...iconProps} />;
      case "receive":
        return <ArrowDownRight {...iconProps} />;
      case "deposit":
        return <Download {...iconProps} />;
      case "withdraw":
        return <Upload {...iconProps} />;
      default:
        return <DollarSign {...iconProps} />;
    }
  };

  const getTransactionIconColor = (type: string): string => {
    switch (type) {
      case "send":
        return "#dc2626";
      case "receive":
        return "#059669";
      case "deposit":
        return "#2563eb";
      case "withdraw":
        return "#ea580c";
      default:
        return "#6b7280";
    }
  };

  const getTransactionTextColor = (type: string): string => {
    switch (type) {
      case "send":
        return "text-red-600";
      case "receive":
        return "text-emerald-600";
      case "deposit":
        return "text-blue-600";
      case "withdraw":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const TabButton = ({
    tabKey,
    title,
    isActive,
  }: {
    tabKey: "overview" | "history";
    title: string;
    isActive: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tabKey)}
      className={`flex-1 py-3.5 px-4 rounded-xl ${
        isActive ? "bg-emerald-600 shadow-sm" : "bg-transparent"
      }`}
    >
      <Text
        className={`text-center font-semibold ${
          isActive ? "text-white" : "text-gray-600"
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 64}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
            colors={["#059669"]}
          />
        }
      >
        {/* Header */}
        <View
          className="bg-downy-800 px-6 pb-8 rounded-b-3xl shadow-md"
          style={{ paddingTop: insets.top + 24 }}
        >
          {/* USDC Balance */}
          <View className="mb- items-center">
            <View className="flex-row items-center gap-4 mb-4">
              <Text className="text-2xl text-emerald-100">Total Balance</Text>
              {/* <TouchableOpacity
                onPress={() => setBalanceVisible(!balanceVisible)}
                className="p-2 rounded-full bg-white/20"
                activeOpacity={0.7}
              >
                {balanceVisible ? (
                  <Eye size={20} color="white" />
                ) : (
                  <EyeOff size={20} color="white" />
                )}
              </TouchableOpacity> */}
            </View>

            <View className="items-center mb-3">
              <View className="flex-row items-baseline justify-center mb-1">
                <Text className="text-5xl text-white font-extrabold tracking-tight">
                  {balanceVisible
                    ? usdcBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "••••••"}
                </Text>
                {balanceVisible && (
                  <Text className="text-3xl ml-2 text-white font-bold tracking-tight">
                    USDC
                  </Text>
                )}
              </View>

              {balanceVisible && (
                <Text className="text-emerald-100 text-lg font-semibold">
                  ≈ {formatCurrency(usdcBalance)}
                </Text>
              )}
            </View>
          </View>

          {/* Wallet Address Card */}
          <View className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-8 w-full border border-white/20 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-emerald-100 text-xs mb-1">
                  Wallet Address
                </Text>
                <Text
                  className="text-white text-sm font-mono"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {activeAccount?.address
                    ? shortenAddress(activeAccount.address)
                    : "0x0000000000000000000000"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={copyAddress}
                className="p-2 rounded-full bg-emerald-500/80 shadow-md"
                activeOpacity={0.7}
              >
                <Copy size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4 -mt-10">
          <View
            className="bg-white rounded-2xl p-5 shadow-md"
            style={styles.card}
          >
            <View className="flex-row gap-4">
              <ActionButton
                onPress={() =>
                  router.push({
                    pathname: "/wallet/send-crypto",
                    params: {
                      USDCBalance: usdcBalance,
                      totalBalance: usdcBalance,
                      address: activeAccount?.address,
                    },
                  })
                }
                icon={<Send size={20} color="#059669" />}
                title="Send"
                bgColor="bg-emerald-50"
                textColor="text-emerald-700"
              />
              <ActionButton
                onPress={() => router.push("/wallet/receive-crypto")}
                icon={<QrCode size={20} color="#2563eb" />}
                title="Receive"
                bgColor="bg-blue-50"
                textColor="text-blue-700"
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
                icon={<Download size={20} color="#15803d" />}
                title="Deposit"
                bgColor="bg-green-50"
                textColor="text-green-700"
              />
              <ActionButton
                onPress={() =>
                  router.push({
                    pathname: "/wallet/withdrawal-crypto",
                    params: {
                      USDCBalance: usdcBalance,
                      totalBalance: usdcBalance,
                      address: activeAccount?.address,
                      currencyCode: theExhangeQuote?.currencyCode,
                      offramp: theExhangeQuote?.exchangeRate.buying_rate,
                    },
                  })
                }
                icon={<Upload size={20} color="#c2410c" />}
                title="Withdraw"
                bgColor="bg-orange-50"
                textColor="text-orange-700"
              />
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View className="px-6 pb-8">
          {/* Tab Headers */}
          <View
            className="flex-row bg-white rounded-2xl p-1.5 mb-6 gap-1.5 shadow-sm"
            style={styles.card}
          >
            <TabButton
              tabKey="overview"
              title="Assets"
              isActive={activeTab === "overview"}
            />
            <TabButton
              tabKey="history"
              title="History"
              isActive={activeTab === "history"}
            />
          </View>

          {/* Assets/Overview Tab */}
          {activeTab === "overview" && (
            <View>
              <Text className="text-2xl font-bold text-gray-900 mb-6">
                My Assets
              </Text>
              {walletData.balances.map((token) => (
                <TokenCard key={token.symbol} token={token} />
              ))}
            </View>
          )}

          {activeTab === "history" && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-2xl font-bold text-gray-900">
                  Transaction History
                </Text>
              </View>

              {loadingTransactions && (
                <View className="bg-white p-8 rounded-xl items-center justify-center shadow-sm">
                  <Text className="text-gray-600 font-medium">
                    Loading transactions...
                  </Text>
                </View>
              )}

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
                  <View className=" p-10 items-center justify-center ">
                    <History size={48} color="#9ca3af" className="mb-4" />
                    <Text className="text-gray-900 font-bold text-lg mb-2">
                      No Transactions Yet
                    </Text>
                    <Text className="text-gray-500 text-sm text-center leading-5">
                      Your transaction history will appear here when you make
                      your first transaction
                    </Text>
                  </View>
                )}

              {/* Transactions List - Grouped by Date */}
              {!loadingTransactions &&
                !transactionError &&
                theTransaction &&
                theTransaction.length > 0 && (
                  <View>
                    {Object.entries(
                      groupTransactionsByDate(theTransaction)
                    ).map(([dateKey, dayTransactions]) => (
                      <View key={dateKey} className="mb-6">
                        <Text className="text-sm font-semibold text-gray-600 mb-3 px-1">
                          {dateKey}
                        </Text>

                        {dayTransactions.map((tx) => (
                          <TransactionCard
                            key={`${tx.id}-${tx.date}`}
                            tx={tx}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}

              {/* Spacing at bottom */}
              <View style={{ height: insets.bottom + 24 }} />
            </View>
          )}
        </View>
      </ScrollView>
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
  actionButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
});