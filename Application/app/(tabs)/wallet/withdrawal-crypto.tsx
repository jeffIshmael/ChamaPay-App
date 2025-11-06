import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  DollarSign,
  QrCode,
  Wallet
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  const [showTokenModal, setShowTokenModal] = useState(false);

  const tokens = [
    { 
      symbol: "cUSD", 
      name: "Celo Dollar", 
      balance: 1250.0, 
      image: require("@/assets/images/cusd.jpg") 
    },
    { 
      symbol: "USDC", 
      name: "USD Coin", 
      balance: 1250.0, 
      image: require("@/assets/images/usdclogo.png") 
    },
  ];

  const withdrawMethods = [
    {
      id: "bank",
      title: "Mobile money",
      subtitle: "Free • 1-3 business days",
      icon: <DollarSign size={20} color="#059669" />
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

  const currentToken = tokens.find(t => t.symbol === selectedToken) || tokens[0];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-downy-800 rounded-b-3xl" style={{ paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">
            Withdraw Crypto
          </Text>
          <View className="w-10" />
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          <View className="px-6 py-6 gap-6">
            {/* Select Token */}
            <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-4 text-base">
                Select Token to Withdraw
              </Text>
              <TouchableOpacity
                onPress={() => setShowTokenModal(true)}
                className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex-row items-center justify-between active:bg-emerald-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-white items-center justify-center mr-3 border border-emerald-200">
                    <Image 
                      source={currentToken.image}
                      className="w-10 h-10 rounded-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900">
                      {currentToken.balance} {currentToken.symbol}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-0.5">
                      {currentToken.name}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={20} color="#059669" />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-4 text-base">
                Withdrawal Amount
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold text-center mb-4 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-600 font-medium">
                  Available: {currentToken.balance} {currentToken.symbol}
                </Text>
                <TouchableOpacity
                  onPress={() => setAmount(currentToken.balance.toString())}
                  className="bg-emerald-600 px-4 py-2 rounded-lg active:bg-emerald-700"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-sm font-semibold">
                    Max
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Withdrawal Method */}
            <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-4 text-base">
                Withdrawal Method
              </Text>
              <View className="gap-3">
                {withdrawMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => setSelectedMethod(method.id as any)}
                    className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                      selectedMethod === method.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                        selectedMethod === method.id
                          ? "bg-emerald-100"
                          : "bg-white border border-gray-200"
                      }`}>
                        {method.icon}
                      </View>
                      <View className="flex-1">
                        <Text className={`font-semibold ${
                          selectedMethod === method.id ? "text-gray-900" : "text-gray-700"
                        }`}>
                          {method.title}
                        </Text>
                        <Text className="text-sm text-gray-600 mt-0.5">
                          {method.subtitle}
                        </Text>
                      </View>
                    </View>
                    {selectedMethod === method.id && (
                      <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                        <Check size={14} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Destination Details */}
            {selectedMethod === "bank" && (
              <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <Text className="text-gray-900 font-semibold mb-4 text-base">
                  Bank Account Details
                </Text>
                <TextInput
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="Enter bank account number"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                <Text className="text-xs text-gray-500 leading-4">
                  Funds will be converted to your local currency and deposited to
                  this account
                </Text>
              </View>
            )}

            {selectedMethod === "crypto" && (
              <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <Text className="text-gray-900 font-semibold mb-4 text-base">
                  Destination Wallet
                </Text>
                <View className="flex-row gap-3">
                  <TextInput
                    value={walletAddress}
                    onChangeText={setWalletAddress}
                    placeholder="Enter wallet address"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={2}
                  />
                  <TouchableOpacity
                    className="w-14 h-14 bg-emerald-600 rounded-xl items-center justify-center active:bg-emerald-700"
                    activeOpacity={0.7}
                  >
                    <QrCode size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Withdraw Button */}
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={
                !amount.trim() ||
                (selectedMethod === "bank" && !bankAccount.trim()) ||
                (selectedMethod === "crypto" && !walletAddress.trim())
              }
              className={`w-full py-4 rounded-xl ${
                !amount.trim() ||
                (selectedMethod === "bank" && !bankAccount.trim()) ||
                (selectedMethod === "crypto" && !walletAddress.trim())
                  ? "bg-gray-300"
                  : "bg-emerald-600"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center font-semibold text-lg ${
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

      {/* Token Selection Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 max-h-[50%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Select Token
              </Text>
              <TouchableOpacity
                onPress={() => setShowTokenModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-600 text-lg">×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tokens.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  onPress={() => {
                    setSelectedToken(token.symbol);
                    setShowTokenModal(false);
                  }}
                  className={`flex-row items-center p-4 rounded-xl mb-3 ${
                    selectedToken === token.symbol
                      ? "bg-emerald-50 border-2 border-emerald-500"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="w-12 h-12 rounded-full bg-white items-center justify-center mr-4 border border-gray-200">
                    <Image 
                      source={token.image}
                      className="w-10 h-10 rounded-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">
                      {token.symbol}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {token.name}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-semibold text-gray-900">
                      {token.balance} {token.symbol}
                    </Text>
                  </View>
                  {selectedToken === token.symbol && (
                    <View className="ml-3 w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                      <Check size={14} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
