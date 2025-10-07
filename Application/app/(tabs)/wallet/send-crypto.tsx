import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { ArrowLeft, WalletMinimal } from "lucide-react-native";
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
import Svg, { Path } from "react-native-svg";

export default function SendCryptoScreen() {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<"chamapay" | "external">("chamapay");
  const [recipient, setRecipient] = useState("");
  const [isTokenModalVisible, setIsTokenModalVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tokens = [
    {
      symbol: "cUSD",
      name: "Celo Dollar",
      balance: 1250.0,
      image: require("@/assets/images/cusd.jpg"),
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: 980.5,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  const scanQR = () => {
    Alert.alert("QR Scanner", "QR code scanner would open here");
  };

  const handleSend = () => {
    if (!recipient.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    Alert.alert("Send Crypto", `Sending ${amount} ${selectedToken}...`);
  };

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-emerald-700"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => router.push("/wallet")}
            className="p-2 -ml-2"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Send Crypto</Text>
          <View className="w-8" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Send tokens to ChamaPay users or external wallets
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 bg-gray-50 rounded-t-3xl">
        <View className="px-6 py-8 gap-5">
          {/* Select Token */}
          <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Select Token
            </Text>

            <TouchableOpacity
              onPress={() => setIsTokenModalVisible(true)}
              className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center space-x-3">
                {selectedToken ? (
                  <>
                    <Image
                      source={selectedTokenData?.image || tokens[0].image}
                      className="w-10 h-10 rounded-full"
                    />
                    <View>
                      <Text className="text-base text-gray-900 font-semibold">
                        {selectedToken}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {selectedTokenData?.name}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                      <Text className="text-gray-400 font-bold">?</Text>
                    </View>
                    <Text className="text-base text-gray-500 font-medium">
                      Choose a token
                    </Text>
                  </>
                )}
              </View>

              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9l6 6 6-6"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Show rest only after token selected */}
          {selectedToken && (
            <>
              {/* Mode Tabs */}
              <View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setSendMode("chamapay")}
                    className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 ${
                      sendMode === "chamapay"
                        ? "bg-emerald-600 shadow-md"
                        : "bg-white border-2 border-gray-200"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={require("@/assets/images/logo.png")}
                      className="w-6 h-6 rounded-md"
                      style={{
                        tintColor: sendMode === "chamapay" ? "#fff" : "#059669",
                      }}
                    />
                    <Text
                      className={`font-bold text-sm ${
                        sendMode === "chamapay" ? "text-white" : "text-gray-700"
                      }`}
                    >
                      ChamaPay User
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSendMode("external")}
                    className={`flex-1 py-4 px-4 rounded-xl flex-row items-center justify-center gap-2 ${
                      sendMode === "external"
                        ? "bg-emerald-600"
                        : "bg-white border-2 border-gray-200"
                    }`}
                    activeOpacity={0.7}
                  >
                    <WalletMinimal
                      color={sendMode === "external" ? "#fff" : "#059669"}
                      size={20}
                    />
                    <Text
                      className={`text-center font-semibold ${
                        sendMode === "external" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      External Wallet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setSendMode("chamapay")}
                  className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 ${
                    sendMode === "chamapay" 
                      ? "bg-emerald-600 shadow-md" 
                      : "bg-white border-2 border-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={require("@/assets/images/logo.png")}
                    className="w-6 h-6 rounded-md"
                    style={{ tintColor: sendMode === "chamapay" ? "#fff" : "#059669" }}
                  />
                  <Text
                    className={`font-bold text-sm ${
                      sendMode === "chamapay" ? "text-white" : "text-gray-700"
                    }`}
                  >
                    ChamaPay User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSendMode("external")}
                  className={`flex-1 py-4 px-4 rounded-2xl flex-row items-center justify-center gap-2 ${
                    sendMode === "external" 
                      ? "bg-emerald-600 shadow-md" 
                      : "bg-white border-2 border-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <WalletMinimal />
                  <Text
                    className={`font-bold text-sm ${
                      sendMode === "external" ? "text-white" : "text-gray-700"
                    }`}
                  >
                    External Wallet
                  </Text>
                </TouchableOpacity>
              </View> */}

              {/* Recipient Input */}
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-2">
                  {sendMode === "chamapay" ? "Username" : "Recipient Address"}
                </Text>

                {sendMode === "chamapay" && (
                  <Text className="text-sm text-gray-500 mb-3">
                    Enter the recipient's ChamaPay username
                  </Text>
                )}

                {sendMode === "chamapay" ? (
                  <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4">
                    <Text className="text-lg font-semibold text-emerald-600 mr-1">
                      @
                    </Text>
                    <TextInput
                      value={recipient}
                      onChangeText={setRecipient}
                      placeholder="username"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 text-base py-3"
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center space-x-2">
                    <TextInput
                      value={recipient}
                      onChangeText={setRecipient}
                      placeholder="0x... or ENS name"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 bg-gray-50 text-sm px-4 py-3 rounded-xl border-2 border-gray-200"
                      multiline
                      numberOfLines={2}
                    />
                    <TouchableOpacity
                      onPress={scanQR}
                      className="w-12 h-12 bg-emerald-600 rounded-xl items-center justify-center shadow-md"
                      activeOpacity={0.7}
                    >
                      <Svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="white"
                      >
                        <Path d="M4 4h5V2H2v7h2V4zM4 15H2v7h7v-2H4v-5zM15 2v2h5v5h2V2h-7zM20 20h-5v2h7v-7h-2v5zM2 11h20v2H2z" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Amount Input */}
              <View className="bg-white p-5 rounded-2xl shadow-sm">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  Amount
                </Text>
                <View className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="text-center text-3xl font-bold text-gray-900"
                  />
                  <Text className="text-center text-sm text-gray-500 mt-2">
                    {selectedToken}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mt-3 px-1">
                  <Text className="text-sm text-gray-600">
                    Available:{" "}
                    <Text className="font-semibold">
                      {selectedTokenData?.balance} {selectedToken}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setAmount(selectedTokenData?.balance.toString() || "")
                    }
                    className="px-4 py-1.5 bg-emerald-100 rounded-full"
                    activeOpacity={0.7}
                  >
                    <Text className="text-emerald-700 text-sm font-bold">
                      Max
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={!recipient.trim() || !amount.trim()}
                className={`w-full py-4 rounded-2xl shadow-lg ${
                  !recipient.trim() || !amount.trim()
                    ? "bg-gray-300"
                    : "bg-emerald-600"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-center text-lg font-bold ${
                    !recipient.trim() || !amount.trim()
                      ? "text-gray-500"
                      : "text-white"
                  }`}
                >
                  Send {selectedToken}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Token Modal - Fixed z-index issue */}
      <Modal
        visible={isTokenModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsTokenModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <Text className="text-xl font-bold mb-5 text-center text-gray-900">
              Choose Token
            </Text>
            {tokens.map((token, index) => (
              <TouchableOpacity
                key={token.symbol}
                onPress={() => {
                  setSelectedToken(token.symbol);
                  setIsTokenModalVisible(false);
                }}
                className={`flex-row items-center justify-between p-4 rounded-xl ${
                  index < tokens.length - 1 ? "mb-3" : ""
                } ${
                  selectedToken === token.symbol
                    ? "bg-emerald-100 border-2 border-emerald-600"
                    : "bg-gray-50 border-2 border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center space-x-3">
                  <Image
                    source={token.image}
                    className="w-12 h-12 rounded-full"
                  />
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      {token.symbol}
                    </Text>
                    <Text className="text-sm text-gray-500">{token.name}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-base font-semibold text-gray-900">
                    {token.balance}
                  </Text>
                  <Text className="text-xs text-gray-500">{token.symbol}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setIsTokenModalVisible(false)}
              className="mt-4 bg-gray-200 py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-700 font-bold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
