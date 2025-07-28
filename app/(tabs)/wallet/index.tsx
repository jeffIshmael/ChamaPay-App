import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Token {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  change24h: number;
  icon: string;
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
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("cUSD");
  const [swapAmount, setSwapAmount] = useState("");

  // Mock wallet data
  const walletData = {
    address: "0x742d35Cc6Cd3C9C4F6a8b1E2d9F7A5B3C8e4D1f6",
    balances: [
      {
        symbol: "ETH",
        name: "Ethereum",
        amount: 2.456,
        usdValue: 4325.67,
        change24h: 5.23,
        icon: "⟠",
      },
      {
        symbol: "cUSD",
        name: "USD Coin",
        amount: 1250.0,
        usdValue: 1250.0,
        change24h: 0.01,
        icon: "💎",
      },
      {
        symbol: "cKES",
        name: "Kenyan Shilling",
        amount: 45000,
        usdValue: 347.0,
        change24h: -0.15,
        icon: "🇰🇪",
      },
    ] as Token[],
    totalUsdValue: 5922.67,
    recentTransactions: [
      {
        id: 1,
        type: "send",
        token: "ETH",
        amount: 0.125,
        usdValue: 287.5,
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
        token: "cKES",
        amount: 10000,
        usdValue: 77.0,
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

  const switchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
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
      className={`flex-1 py-3 px-4 rounded-lg ${
        isActive ? "bg-emerald-600" : "bg-gray-100"
      }`}
    >
      <Text
        className={`text-center font-medium ${
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
      className={`flex-1 items-center py-3 px-2 rounded-lg border ${bgColor} ${textColor}`}
    >
      {icon}
      <Text className={`text-xs mt-1 ${textColor}`}>{title}</Text>
    </TouchableOpacity>
  );

  const TokenCard = ({ token }: { token: Token }) => (
    <View className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
            <Text className="text-lg">{token.icon}</Text>
          </View>
          <View>
            <Text className="text-gray-900 font-medium">{token.symbol}</Text>
            <Text className="text-sm text-gray-600">{token.name}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-gray-900 font-medium">
            {token.symbol === "cKES"
              ? `${token.amount.toLocaleString()} ${token.symbol}`
              : `${token.amount} ${token.symbol}`}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-600 mr-2">
              {formatCurrency(token.usdValue)}
            </Text>
            <Text
              className={`text-xs ${
                token.change24h >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {token.change24h >= 0 ? "+" : ""}
              {token.change24h}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const TransactionCard = ({ tx }: { tx: Transaction }) => (
    <View className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
            {getTransactionIcon(tx.type)}
          </View>
          <View>
            <Text className="text-gray-900 font-medium capitalize">
              {tx.type} {tx.token}
            </Text>
            <Text className="text-sm text-gray-600">
              {tx.type === "send"
                ? `To: ${tx.recipient}`
                : tx.type === "receive"
                  ? `From: ${tx.sender}`
                  : "Network: Ethereum"}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-medium ${getTransactionTextColor(tx.type)}`}>
            {tx.type === "send" ? "-" : "+"}
            {tx.token === "cKES"
              ? `${tx.amount.toLocaleString()} ${tx.token}`
              : `${tx.amount} ${tx.token}`}
          </Text>
          <View
            className={`px-2 py-1 rounded-full ${
              tx.status === "completed" ? "bg-emerald-100" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs ${
                tx.status === "completed" ? "text-emerald-700" : "text-gray-700"
              }`}
            >
              {tx.status}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500">{formatDate(tx.date)}</Text>
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-500 mr-1">Hash:</Text>
          <View className="bg-gray-100 px-2 py-1 rounded">
            <Text className="text-xs text-gray-700 font-mono">{tx.hash}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 "
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View
          className="bg-emerald-600 px-6 pb-6"
        >
          <View className="flex-row items-center justify-center mb-4">
            <Text className="text-xl text-white font-medium">Wallet</Text>
          </View>

          {/* Total Balance */}
          <View className="items-center">
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl text-white mr-2">Total Balance</Text>
              <TouchableOpacity
                onPress={() => setBalanceVisible(!balanceVisible)}
                className="p-1 rounded-full"
                activeOpacity={0.7}
              >
                {balanceVisible ? (
                  <Eye size={16} color="white" />
                ) : (
                  <EyeOff size={16} color="white" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-3xl text-white mb-2">
              {balanceVisible
                ? formatCurrency(walletData.totalUsdValue)
                : "••••••"}
            </Text>
            <View className="flex-row items-center">
              <TrendingUp size={14} color="#a7f3d0" />
              <Text className="text-emerald-200 text-sm ml-1">
                +2.34% (24h)
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row gap-3">
            <ActionButton
              onPress={() => router.push("/wallet/send-crypto")}
              icon={<Send size={20} color="#047857" />}
              title="Send"
              bgColor="bg-emerald-50 border-emerald-200"
              textColor="text-emerald-700"
            />
            <ActionButton
              onPress={handleReceive}
              icon={<QrCode size={20} color="#1d4ed8" />}
              title="Receive"
              bgColor="bg-blue-50 border-blue-200"
              textColor="text-blue-700"
            />
            {/* TODO: Set up onramp functionality for Deposit. It currently navigates to Receiving crypto screen */}
            <ActionButton
              onPress={() => router.push("/wallet/receive-crypto")}
              icon={<Download size={20} color="#15803d" />}
              title="Deposit"
              bgColor="bg-green-50 border-green-200"
              textColor="text-green-700"
            />
            <ActionButton
              onPress={() => router.push("/wallet/withdrawal-crypto")}
              icon={<Upload size={20} color="#c2410c" />}
              title="Withdraw"
              bgColor="bg-orange-50 border-orange-200"
              textColor="text-orange-700"
            />
          </View>
        </View>

        {/* Tabs */}
        <View className="px-6 py-4">
          {/* Tab Headers */}
          <View className="flex-row bg-white rounded-lg p-1 mb-4 gap-1">
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
            <View className="pb-8">
              {walletData.balances.map((token) => (
                <TokenCard key={token.symbol} token={token} />
              ))}
            </View>
          )}

          {/* Swap Tab */}
          {activeTab === "swap" && (
            <View className="pb-8">
              <View className="bg-white p-4 rounded-lg border border-gray-200">
                <Text className="text-gray-900 font-medium mb-4">
                  Swap Tokens
                </Text>

                {/* From Token */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2">From</Text>
                  <View className="bg-gray-50 border border-gray-200  rounded-lg p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1 mr-4 ">
                        <Picker
                          selectedValue={fromToken}
                          onValueChange={setFromToken}
                          style={{ height: 50, width: 150 }}
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
                      <TextInput
                        value={swapAmount}
                        onChangeText={setSwapAmount}
                        placeholder="0.00"
                        keyboardType="numeric"
                        className="text-right text-lg font-medium w-32 p-2"
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
                      <Text className="text-sm text-gray-600">
                        Balance:{" "}
                        {walletData.balances.find((t) => t.symbol === fromToken)
                          ?.amount || 0}{" "}
                        {fromToken}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Swap Button */}
                <View className="items-center mb-4">
                  <TouchableOpacity
                    onPress={switchTokens}
                    className="w-10 h-10 border border-gray-300 rounded-full items-center justify-center bg-white"
                    activeOpacity={0.7}
                  >
                    <ArrowUpDown size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* To Token */}
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2">To</Text>
                  <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1 mr-4">
                        <Picker
                          selectedValue={toToken}
                          onValueChange={setToToken}
                          style={{ height: 50, width: 150 }}
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
                <View className="bg-blue-50 rounded-lg p-3 mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-blue-800">Exchange Rate</Text>
                    <Text className="text-sm font-medium text-blue-900">
                      1 {fromToken} = {getSwapRate()} {toToken}
                    </Text>
                  </View>
                </View>

                {/* Transaction Fee */}
                <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Info size={16} color="#2563eb" />
                      <View className="ml-3 flex-1">
                        <Text className="text-sm text-blue-800">
                          Network Fee
                        </Text>
                        <Text className="text-xs text-blue-700">
                          ~$2.50 (Standard)
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="px-3 py-1 rounded"
                      activeOpacity={0.7}
                    >
                      <Text className="text-xs text-blue-600">Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSwap}
                  disabled={!swapAmount || fromToken === toToken}
                  className={`w-full py-3 rounded-lg ${
                    !swapAmount || fromToken === toToken
                      ? "bg-gray-300"
                      : "bg-emerald-600"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-center font-medium ${
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
            <View className="pb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 font-medium">
                  Recent Transactions
                </Text>
              </View>

              {walletData.recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} />
              ))}

              {walletData.recentTransactions.length === 0 && (
                <View className="bg-white p-8 rounded-lg border border-gray-200 items-center">
                  <History size={48} color="#9ca3af" />
                  <Text className="text-gray-900 font-medium mt-4 mb-2">
                    No Transactions Yet
                  </Text>
                  <Text className="text-gray-600 text-sm text-center">
                    Your transaction history will appear here
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
