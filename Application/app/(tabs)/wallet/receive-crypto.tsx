import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ArrowLeft, Copy, Info } from "lucide-react-native";
import React, { useState } from "react";
import QRCode from "react-native-qrcode-svg";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReceiveCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedToken, setSelectedToken] = useState("USDC or cUSD");
  const [amount, setAmount] = useState("");

  const walletAddress = "0x742d35Cc6Cd3C9C4F6a8b1E2d9F7A5B3C8e4D1f6";

  const qrValue = amount
    ? `ethereum:${walletAddress}?value=${amount}`
    : walletAddress;

  const copyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert("Copied", "Wallet address copied to clipboard");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-downy-800"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.push("/wallet")}
          className="p-2 rounded-full bg-white/10"
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Receive Crypto</Text>
        <View className="w-8" />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-downy-50 rounded-t-3xl px-6 pt-6"
      >
        {/* QR Code Section */}
        <View className="bg-white p-6 rounded-xl shadow border border-gray-200 items-center">
          <View className="w-48 h-48 items-center justify-center mb-4">
            <QRCode value={qrValue} size={180} />
            {amount.length > 0 && (
              <Text className="text-xs text-gray-500 mt-2">{`Amount: ${amount}`}</Text>
            )}
          </View>
          <Text className="text-sm text-gray-600 text-center">
            Scan to send <Text className="font-semibold">{selectedToken}</Text>
          </Text>
        </View>

        {/* Wallet Address Section */}
        <View className="bg-white p-4 mt-6 rounded-xl border border-gray-200">
          <Text className="text-gray-900 font-medium mb-2">Wallet Address</Text>
          <View className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-3">
            <Text className="text-sm text-gray-700 font-mono break-all mb-3">
              {walletAddress}
            </Text>
            <TouchableOpacity
              onPress={copyAddress}
              className="flex-row items-center justify-center bg-downy-600 py-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Copy size={16} color="white" />
              <Text className="text-white font-medium ml-2">Copy Address</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Info Section */}
        <View className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-6 mb-10">
          <View className="flex-row items-start">
            <Info size={16} color="#d97706" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-yellow-800 mb-1">
                Important Notes
              </Text>
              <Text className="text-xs text-yellow-700 leading-relaxed">
                • Only send supported tokens like USDC or cUSD on the Celo network{"\n"}
                • Sending unsupported tokens may result in loss{"\n"}
                • Always double-check the address before sending
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
