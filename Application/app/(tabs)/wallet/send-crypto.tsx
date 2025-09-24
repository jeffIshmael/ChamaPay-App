import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
  const [selectedToken, setSelectedToken] = useState("cUSD");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
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
      balance: 1250.0,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  const handleSend = () => {
    if (!recipient.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    Alert.alert("Send Crypto", "Sending...");
    // TODO: handle actual send
  };

  const scanQR = () => {
    Alert.alert("QR Scanner", "QR code scanner would open here");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-emerald-600"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-6 pt-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Send Crypto</Text>
          <View className="w-8" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 bg-gray-50 rounded-t-3xl mt-4">
        <View className="px-6 py-6 space-y-6">

          {/* Select Token */}
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <Text className="text-base font-semibold text-gray-800 mb-3">Select Token</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3 flex-1">
                <Image
                  source={tokens.find(t => t.symbol === selectedToken)?.image || tokens[0].image}
                  className="w-10 h-10 rounded-full"
                  resizeMode="cover"
                />
                <Picker
                  selectedValue={selectedToken}
                  onValueChange={setSelectedToken}
                  style={{ height: 40, width: 120 }}
                  dropdownIconColor="black"
                >
                  {tokens.map(token => (
                    <Picker.Item key={token.symbol} label={token.symbol} value={token.symbol} />
                  ))}
                </Picker>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-gray-900">
                  {tokens.find(t => t.symbol === selectedToken)?.balance} {selectedToken}
                </Text>
                <Text className="text-xs text-gray-500">
                  {tokens.find(t => t.symbol === selectedToken)?.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Recipient Input */}
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <Text className="text-base font-semibold text-gray-800 mb-3">Recipient</Text>
            <View className="flex-row items-center space-x-3">
              <TextInput
                value={recipient}
                onChangeText={setRecipient}
                placeholder="Wallet address or ENS name"
                className="flex-1 bg-gray-100 text-sm px-4 py-3 rounded-xl border border-gray-300"
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity
                onPress={scanQR}
                className="w-12 h-12 bg-emerald-600 rounded-xl items-center justify-center"
                activeOpacity={0.8}
              >
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <Path d="M4 4h5V2H2v7h2V4zM4 15H2v7h7v-2H4v-5zM15 2v2h5v5h2V2h-7zM20 20h-5v2h7v-7h-2v5zM2 11h20v2H2z" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Input */}
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <Text className="text-base font-semibold text-gray-800 mb-3">Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              className="text-center text-lg font-semibold px-4 py-3 bg-gray-100 rounded-xl border border-gray-300"
            />
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-xs text-gray-500">
                Available: {tokens.find(t => t.symbol === selectedToken)?.balance} {selectedToken}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setAmount(tokens.find(t => t.symbol === selectedToken)?.balance.toString() || "")
                }
                className="px-3 py-1 bg-emerald-100 rounded-full"
              >
                <Text className="text-emerald-700 text-sm font-semibold">Max</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!recipient.trim() || !amount.trim()}
            className={`w-full py-4 rounded-2xl ${
              !recipient.trim() || !amount.trim()
                ? "bg-gray-300"
                : "bg-emerald-600"
            }`}
            activeOpacity={0.9}
          >
            <Text
              className={`text-center text-lg font-medium ${
                !recipient.trim() || !amount.trim()
                  ? "text-gray-500"
                  : "text-white"
              }`}
            >
              Review Transaction
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
