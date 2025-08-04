import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Copy,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  History,
  Info,
  QrCode,
  Send,
  TrendingUp,
  Upload,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg from "react-native-svg";

interface Token {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  change24h: number;
  icon: string;
  image: string;
}

interface Transaction {
  id: number;
  type: string;
  token: string;
  amount: number;
  usdValue: number;
  recipient?: string;
  sender?: string;
  hash: string;
  date: string;
  status: string;
}

export default function CryptoWallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"overview" | "swap" | "history">(
    "overview"
  );
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [fromToken, setFromToken] = useState("cUSD");
  const [toToken, setToToken] = useState("USDC");
  const [swapAmount, setSwapAmount] = useState("");

  //celo logo
  const celoLogo = require("@/assets/images/celoLogo.jpg");

  // Mock wallet data
  const walletData = {
    address: "0x742d35Cc6Cd3C9C4F6a8b1E2d9F7A5B3C8e4D1f6",
    balances: [
      {
        symbol: "cUSD",
        name: "Celo Dollar",
        amount: 1250.0,
        usdValue: 1250.0,
        change24h: 0.01,
        icon: "💎",
        image: require("@/assets/images/cusd.jpg"),
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        amount: 1250.0,
        usdValue: 1250.0,
        change24h: 0.01,
        icon: "💎",
        image: require("@/assets/images/usdclogo.png"),
      },
    ] as Token[],
    totalUsdValue: 5922.67,
    recentTransactions: [
      {
        id: 1,
        type: "send",
        token: "cUSD",
        amount: 1250.0,
        usdValue: 1250.0,
        recipient: "0x1234...5678",
        hash: "0xabcd1234",
        date: "2024-07-25T10:30:00Z",
        status: "completed",
      },
      {
        id: 2,
        type: "receive",
        token: "cUSD",
        amount: 500,
        usdValue: 500.0,
        sender: "0x9876...4321",
        hash: "0xefgh5678",
        date: "2024-07-24T15:45:00Z",
        status: "completed",
      },
      {
        id: 3,
        type: "deposit",
        token: "cUSD",
        amount: 10000,
        usdValue: 1250.0,
        hash: "0xijkl9012",
        date: "2024-07-24T09:15:00Z",
        status: "pending",
      },
    ] as Transaction[],
  };

  const handleSwap = () => {
    if (!swapAmount) {
      Alert.alert("Error", "Please enter an amount to swap");
      return;
    }

    // TODO: Implement swapping functionality
    Alert.alert("Swap tokens", "Swapping...");
  };

  const handleReceive = () => {
    router.push("/wallet/receive-crypto");
  };

  const handleDeposit = () => {
    Alert.alert("Deposit crypto", "Onramp functionality here...");
  };

  const switchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const copyAddress = () => {
    // TODO: Implement copy to clipboard
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

  const getSwapRate = (): string => {
    const fromTokenData = walletData.balances.find(
      (t) => t.symbol === fromToken
    );
    const toTokenData = walletData.balances.find((t) => t.symbol === toToken);

    if (fromTokenData && toTokenData) {
      const rate =
        fromTokenData.usdValue /
        fromTokenData.amount /
        (toTokenData.usdValue / toTokenData.amount);
      return rate.toFixed(6);
    }
    return "0.000000";
  };

  const getEstimatedOutput = (): string => {
    if (!swapAmount) return "0.00";
    const rate = parseFloat(getSwapRate());
    return (parseFloat(swapAmount) * rate).toFixed(6);
  };

  const TabButton = ({
    tabKey,
    title,
    isActive,
  }: {
    tabKey: "overview" | "swap" | "history";
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
      className={`flex-1 items-center py-5 px-3 rounded-2xl ${bgColor} ${textColor}`}
      style={styles.actionButton}
    >
      <View className="bg-white p-3 rounded-full mb-2 shadow-sm">
        {icon}
      </View>
      <Text className={`text-sm font-semibold ${textColor}`}>{title}</Text>
    </TouchableOpacity>
  );

  const TokenCard = ({ token }: { token: Token }) => (
    <View className="bg-white p-5 rounded-2xl shadow-sm mb-4" style={styles.card}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="relative mr-4">
            <Image
              source={token.image || celoLogo}
              className="w-12 h-12 rounded-full"
              resizeMode="cover"
            />
            <View className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full items-center justify-center border-2 border-white">
              <Svg
                viewBox="0 0 2500 2500"
                width={12}
                height={12}
              >
                <circle fill="#FCFF52" cx="1250" cy="1250" r="1250" />
                <path
                  fill="#000000"
                  d="M1949.3,546.2H550.7v1407.7h1398.7v-491.4h-232.1c-80,179.3-260.1,304.1-466.2,304.1
                c-284.1,0-514.2-233.6-514.2-517.5c0-284,230.1-515.6,514.2-515.6c210.1,0,390.2,128.9,470.2,312.1h228.1V546.2z"
                />
              </Svg>
            </View>
          </View>

          <View>
            <Text className="text-gray-900 font-semibold text-lg">{token.symbol}</Text>
            <Text className="text-sm text-gray-500">{token.name}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-gray-900 font-bold text-lg">
            {token.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}{" "}
            {token.symbol}
          </Text>
          <Text className="text-lg text-gray-700 font-medium mb-1">
            {formatCurrency(token.usdValue)}
          </Text>
          <View
            className={`px-3 py-1 rounded-full ${
              token.change24h >= 0 ? "bg-emerald-100" : "bg-red-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                token.change24h >= 0 ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {token.change24h >= 0 ? "↗" : "↘"} {Math.abs(token.change24h)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const TransactionCard = ({ tx }: { tx: Transaction }) => (
    <View className="bg-white p-5 rounded-2xl shadow-sm mb-4" style={styles.card}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
            style={{
              backgroundColor: `${getTransactionIconColor(tx.type)}15`,
            }}
          >
            {getTransactionIcon(tx.type)}
          </View>
          <View>
            <Text className="text-gray-900 font-semibold text-lg capitalize">
              {tx.type} {tx.token}
            </Text>
            <Text className="text-sm text-gray-500">
              {tx.type === "send"
                ? `To: ${tx.recipient}`
                : tx.type === "receive"
                ? `From: ${tx.sender}`
                : "Network: Ethereum"}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-lg ${getTransactionTextColor(tx.type)}`}>
            {tx.type === "send" ? "-" : "+"}
            {tx.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}{" "}
            {tx.token}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-400 font-medium">{formatDate(tx.date)}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert("Transaction Details", `Hash: ${tx.hash}`)}
          className="px-3 py-1 bg-blue-50 rounded-full"
        >
          <Text className="text-xs text-blue-600 font-medium">View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
    className="flex-1 bg-emerald-600"
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ paddingTop: insets.top }}
  >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-gray-50"
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#059669", "#10b981"]}
          className="px-6 pb-6 pt-4"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Total Balance */}
          <View className="items-center mb-2">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg text-white/90 mr-2">Total Balance</Text>
              <TouchableOpacity
                onPress={() => setBalanceVisible(!balanceVisible)}
                className="p-1 rounded-full"
                activeOpacity={0.7}
              >
                {balanceVisible ? (
                  <Eye size={16} color="rgba(255,255,255,0.8)" />
                ) : (
                  <EyeOff size={16} color="rgba(255,255,255,0.8)" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-4xl text-white font-bold mb-3">
              {balanceVisible
                ? formatCurrency(walletData.totalUsdValue)
                : "••••••"}
            </Text>
            <View className="flex-row items-center mb-6">
              <TrendingUp size={14} color="#a7f3d0" />
              <Text className="text-emerald-100 text-sm ml-1">
                +2.34% (24h)
              </Text>
            </View>

            {/* Wallet Address */}
            <View className="bg-white/10 rounded-xl p-4 w-full">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-emerald-100 text-xs mb-1">
                    Wallet Address
                  </Text>
                  <Text className="text-white text-sm font-mono">
                    {walletData.address.slice(0, 8)}...
                    {walletData.address.slice(-6)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={copyAddress}
                  className="p-2 rounded-full bg-white/20"
                  activeOpacity={0.7}
                >
                  <Copy size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View className="px-6 py-4 -mt-6">
          <View
            className="bg-white rounded-2xl p-5 shadow-md"
            style={styles.card}
          >
            <View className="flex-row gap-4">
              <ActionButton
                onPress={() => router.push("/wallet/send-crypto")}
                icon={<Send size={20} color="#059669" />}
                title="Send"
                bgColor="bg-emerald-50"
                textColor="text-emerald-700"
              />
              <ActionButton
                onPress={handleReceive}
                icon={<QrCode size={20} color="#2563eb" />}
                title="Receive"
                bgColor="bg-blue-50"
                textColor="text-blue-700"
              />
              <ActionButton
                onPress={handleDeposit}
                icon={<Download size={20} color="#15803d" />}
                title="Deposit"
                bgColor="bg-green-50"
                textColor="text-green-700"
              />
              <ActionButton
                onPress={() => router.push("/wallet/withdrawal-crypto")}
                icon={<Upload size={20} color="#c2410c" />}
                title="Withdraw"
                bgColor="bg-orange-50"
                textColor="text-orange-700"
              />
            </View>
          </View>
        </View>

        {/* Tabs */}
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
              tabKey="swap"
              title="Swap"
              isActive={activeTab === "swap"}
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

          {/* Swap Tab */}
          {activeTab === "swap" && (
            <View>
              <Text className="text-2xl font-bold text-gray-900 mb-6">
                Swap Tokens
              </Text>
              <View className="bg-white p-6 rounded-2xl shadow-sm" style={styles.card}>
                {/* From Token */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2 font-semibold">From</Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1 mr-4">
                        <Image
                          source={
                            walletData.balances.find((t) => t.symbol === fromToken)
                              ?.image || require("@/assets/images/cusd.jpg")
                          }
                          className="w-8 h-8 rounded-full mr-3"
                          resizeMode="cover"
                        />
                        <View className="flex-1">
                          <Picker
                            selectedValue={fromToken}
                            onValueChange={setFromToken}
                            style={{ height: 50, width: 120 }}
                            itemStyle={{ color: "black" }}
                          >
                            {walletData.balances.map((token) => (
                              <Picker.Item
                                key={token.symbol}
                                label={token.symbol}
                                value={token.symbol}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      <TextInput
                        value={swapAmount}
                        onChangeText={setSwapAmount}
                        placeholder="0.00"
                        keyboardType="numeric"
                        className="text-right text-lg font-medium w-32 p-2"
                        style={styles.input}
                      />
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">
                        {
                          walletData.balances.find(
                            (t) => t.symbol === fromToken
                          )?.name
                        }
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const balance = walletData.balances.find(
                            (t) => t.symbol === fromToken
                          )?.amount;
                          if (balance) setSwapAmount(balance.toString());
                        }}
                      >
                        <Text className="text-sm text-blue-600">
                          Balance:{" "}
                          {walletData.balances.find(
                            (t) => t.symbol === fromToken
                          )?.amount || 0}{" "}
                          {fromToken}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Swap Button */}
                <View className="items-center mb-4 -mt-2 -mb-2 z-10">
                  <TouchableOpacity
                    onPress={switchTokens}
                    className="w-12 h-12 border-2 border-white rounded-full items-center justify-center bg-emerald-600 shadow-lg"
                    activeOpacity={0.7}
                    style={styles.swapButton}
                  >
                    <ArrowUpDown size={20} color="white" />
                  </TouchableOpacity>
                </View>

                {/* To Token */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2 font-semibold">To</Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1 mr-4">
                        <Image
                          source={
                            walletData.balances.find((t) => t.symbol === toToken)
                              ?.image || require("@/assets/images/usdclogo.png")
                          }
                          className="w-8 h-8 rounded-full mr-3"
                          resizeMode="cover"
                        />
                        <View className="flex-1">
                          <Picker
                            selectedValue={toToken}
                            onValueChange={setToToken}
                            style={{ height: 50, width: 120 }}
                            itemStyle={{ color: "black" }}
                          >
                            {walletData.balances.map((token) => (
                              <Picker.Item
                                key={token.symbol}
                                label={token.symbol}
                                value={token.symbol}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                      <Text className="text-right text-lg font-medium text-gray-600 w-32 p-2">
                        {getEstimatedOutput()}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">
                        {
                          walletData.balances.find((t) => t.symbol === toToken)
                            ?.name
                        }
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Balance:{" "}
                        {walletData.balances.find((t) => t.symbol === toToken)
                          ?.amount || 0}{" "}
                        {toToken}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Exchange Rate */}
                <View className="bg-emerald-50 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-emerald-800">Exchange Rate</Text>
                    <Text className="text-sm font-medium text-emerald-900">
                      1 {fromToken} = {getSwapRate()} {toToken}
                    </Text>
                  </View>
                </View>

                {/* Transaction Fee */}
                <View className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Info size={16} color="#2563eb" className="mr-2" />
                      <Text className="text-sm text-blue-800">
                        Estimated network fee: ~$2.50
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSwap}
                  disabled={!swapAmount || fromToken === toToken}
                  className={`w-full py-5 rounded-2xl ${
                    !swapAmount || fromToken === toToken
                      ? "bg-gray-300"
                      : "bg-emerald-600"
                  } shadow-md`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-center font-bold text-lg ${
                      !swapAmount || fromToken === toToken
                        ? "text-gray-500"
                        : "text-white"
                    }`}
                  >
                    Review Swap
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transaction History Tab */}
          {activeTab === "history" && (
            <View>
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-2xl font-bold text-gray-900">
                  Recent Transactions
                </Text>
                <TouchableOpacity className="px-4 py-2 bg-blue-50 rounded-full">
                  <Text className="text-sm text-blue-600 font-semibold">View All</Text>
                </TouchableOpacity>
              </View>

              {walletData.recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} />
              ))}

              {walletData.recentTransactions.length === 0 && (
                <View className="bg-white p-10 rounded-2xl items-center justify-center shadow-sm" style={styles.card}>
                  <History size={64} color="#9ca3af" className="mb-6" />
                  <Text className="text-gray-900 font-bold text-xl mb-3">
                    No Transactions Yet
                  </Text>
                  <Text className="text-gray-500 text-base text-center leading-6">
                    Your transaction history will appear here when you make your first transaction
                  </Text>
                </View>
              )}
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
  swapButton: {
    shadowColor: "#059669",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
});