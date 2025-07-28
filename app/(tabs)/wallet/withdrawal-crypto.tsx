import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  DollarSign,
  Info,
  QrCode,
  Wallet,
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

export default function WithdrawCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<"bank" | "crypto">(
    "bank"
  );
  const [selectedToken, setSelectedToken] = useState("cUSD");
  const [amount, setAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: 2.456, icon: "⟠" },
    { symbol: "cUSD", name: "USD Coin", balance: 1250.0, icon: "💎" },
    { symbol: "cKES", name: "Kenyan Shilling", balance: 45000, icon: "🇰🇪" },
  ];

  const withdrawMethods = [
    {
      id: "bank",
      title: "Bank Account",
      subtitle: "Free • 1-3 business days",
      icon: <DollarSign size={20} color="#059669" />,
    },
    {
      id: "crypto",
      title: "External Wallet",
      subtitle: "Network fees apply • 10-30 minutes",
      icon: <Wallet size={20} color="#2563eb" />,
    },
  ];

  const handleWithdraw = () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }

    if (selectedMethod === "bank" && !bankAccount.trim()) {
      Alert.alert("Error", "Please enter bank account details");
      return;
    }

    if (selectedMethod === "crypto" && !walletAddress.trim()) {
      Alert.alert("Error", "Please enter wallet address");
      return;
    }

    Alert.alert("Withdraw Crypto", "Withdrawing...");

    // TODO: Implement offramping functionality

    // onNavigate("payment", {
    //   type: "crypto-withdraw",
    //   method: selectedMethod,
    //   token: selectedToken,
    //   amount: parseFloat(amount),
    //   destination: selectedMethod === "bank" ? bankAccount : walletAddress,
    // });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-emerald-600"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="px-6">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg text-white font-medium">
            Withdraw Crypto
          </Text>
          <View className="w-10" />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-gray-50"
      >
        <View className="px-6 py-6 gap-6">
          {/* Select Token */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Select Token to Withdraw
            </Text>
            <View className="gap-2">
              {tokens.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  onPress={() => setSelectedToken(token.symbol)}
                  className={`flex-row items-center justify-between p-3 rounded-lg border ${
                    selectedToken === token.symbol
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-3 border border-gray-200">
                      <Text className="text-sm">{token.icon}</Text>
                    </View>
                    <View>
                      <Text className="text-gray-900 font-medium">
                        {token.symbol}
                      </Text>
                      <Text className="text-xs text-gray-600">
                        Balance:{" "}
                        {token.symbol === "cKES"
                          ? `${token.balance.toLocaleString()}`
                          : `${token.balance}`}{" "}
                        {token.symbol}
                      </Text>
                    </View>
                  </View>
                  {selectedToken === token.symbol && (
                    <Check size={16} color="#ea580c" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Withdrawal Amount
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-3 py-3 text-lg font-medium text-center mb-3"
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">
                Available:{" "}
                {tokens.find((t) => t.symbol === selectedToken)?.balance}{" "}
                {selectedToken}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setAmount(
                    tokens
                      .find((t) => t.symbol === selectedToken)
                      ?.balance.toString() || ""
                  )
                }
                className="bg-emerald-100 px-3 py-1 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-emerald-700 text-sm font-medium">
                  Max
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Withdrawal Method */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Withdrawal Method
            </Text>
            <View className="gap-3">
              {withdrawMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id as any)}
                  className={`flex-row items-center justify-between p-3 rounded-lg border ${
                    selectedMethod === method.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-gray-200">
                      {method.icon}
                    </View>
                    <View>
                      <Text className="text-gray-900 font-medium">
                        {method.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {method.subtitle}
                      </Text>
                    </View>
                  </View>
                  {selectedMethod === method.id && (
                    <Check size={16} color="#ea580c" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Destination Details */}
          {selectedMethod === "bank" && (
            <View className="bg-white p-4 rounded-lg border border-gray-200">
              <Text className="text-gray-900 font-medium mb-3">
                Bank Account Details
              </Text>
              <TextInput
                value={bankAccount}
                onChangeText={setBankAccount}
                placeholder="Enter bank account number"
                className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              />
              <Text className="text-xs text-gray-500">
                Funds will be converted to your local currency and deposited to
                this account
              </Text>
            </View>
          )}

          {selectedMethod === "crypto" && (
            <View className="bg-white p-4 rounded-lg border border-gray-200">
              <Text className="text-gray-900 font-medium mb-3">
                Destination Wallet
              </Text>
              <View className="flex-row gap-3">
                <TextInput
                  value={walletAddress}
                  onChangeText={setWalletAddress}
                  placeholder="Enter wallet address"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                  multiline={true}
                  numberOfLines={2}
                />
                <TouchableOpacity
                  className="w-12 h-12 bg-emerald-600 rounded-lg items-center justify-center"
                  activeOpacity={0.7}
                >
                  <QrCode size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Fees Information */}
          <View className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <View className="flex-row items-start">
              <Info size={16} color="#d97706" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-yellow-800 mb-1">
                  Withdrawal Fees
                </Text>
                <Text className="text-xs text-yellow-700">
                  {selectedMethod === "bank"
                    ? "• Bank withdrawals are free\n• Currency conversion fees may apply\n• Processing time: 1-3 business days"
                    : "• Network fees apply (varies by blockchain)\n• Processing time: 10-30 minutes\n• Minimum withdrawal varies by token"}
                </Text>
              </View>
            </View>
          </View>

          {/* Withdraw Button */}
          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={
              !amount.trim() ||
              (selectedMethod === "bank" && !bankAccount.trim()) ||
              (selectedMethod === "crypto" && !walletAddress.trim())
            }
            className={`w-full py-4 rounded-lg ${
              !amount.trim() ||
              (selectedMethod === "bank" && !bankAccount.trim()) ||
              (selectedMethod === "crypto" && !walletAddress.trim())
                ? "bg-gray-300"
                : "bg-emerald-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center font-medium text-lg ${
                !amount.trim() ||
                (selectedMethod === "bank" && !bankAccount.trim()) ||
                (selectedMethod === "crypto" && !walletAddress.trim())
                  ? "text-gray-500"
                  : "text-white"
              }`}
            >
              Review Withdrawal
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
