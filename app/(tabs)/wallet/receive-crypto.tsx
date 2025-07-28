import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  QrCode,
  Share,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ReceiveCryptoScreen() {
  const router = useRouter();
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [amount, setAmount] = useState("");

  const walletAddress = "0x742d35Cc6Cd3C9C4F6a8b1E2d9F7A5B3C8e4D1f6";

  const tokens = [
    { symbol: "ETH", name: "Ethereum", icon: "⟠" },
    { symbol: "USDC", name: "USD Coin", icon: "💎" },
    { symbol: "KES", name: "Kenyan Shilling", icon: "🇰🇪" },
  ];

  const copyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert("Copied", "Wallet address copied to clipboard");
  };

  const shareAddress = () => {
    // In a real app, this would use the Share API
    Alert.alert("Share", "Share functionality would open here");
  };

  const generateQR = () => {
    // Generate QR code with amount if specified
    const qrData = amount
      ? `ethereum:${walletAddress}?value=${amount}`
      : walletAddress;

    Alert.alert("QR Code", `QR code generated for: ${qrData}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-lg text-white font-medium">
              Receive Crypto
            </Text>
            <TouchableOpacity
              onPress={shareAddress}
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <Share size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-6 gap-6">
          {/* QR Code Area */}
          <View className="bg-white p-6 rounded-lg border border-gray-200 items-center">
            <View className="w-48 h-48 bg-gray-100 rounded-lg items-center justify-center mb-4">
              <QrCode size={120} color="#6b7280" />
              <Text className="text-xs text-gray-500 mt-2">QR Code</Text>
            </View>
            <TouchableOpacity
              onPress={generateQR}
              className="bg-blue-600 px-4 py-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-white font-medium">Generate QR Code</Text>
            </TouchableOpacity>
          </View>

          {/* Select Token */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Select Token to Receive
            </Text>
            <View className="gap-2">
              {tokens.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  onPress={() => setSelectedToken(token.symbol)}
                  className={`flex-row items-center justify-between p-3 rounded-lg border ${
                    selectedToken === token.symbol
                      ? "border-blue-500 bg-blue-50"
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
                        {token.name}
                      </Text>
                    </View>
                  </View>
                  {selectedToken === token.symbol && (
                    <Check size={16} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Request Amount (Optional) */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Request Amount (Optional)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              className="border border-gray-300 rounded-lg px-3 py-3 text-lg font-medium text-center"
            />
            <Text className="text-xs text-gray-500 text-center mt-2">
              Leave empty to receive any amount
            </Text>
          </View>

          {/* Wallet Address */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Your Wallet Address
            </Text>
            <View className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <Text className="text-sm text-gray-700 font-mono break-all mb-3">
                {walletAddress}
              </Text>
              <TouchableOpacity
                onPress={copyAddress}
                className="flex-row items-center justify-center bg-blue-600 py-2 rounded-lg"
                activeOpacity={0.7}
              >
                <Copy size={16} color="white" />
                <Text className="text-white font-medium ml-2">
                  Copy Address
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions */}
          <View className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <View className="flex-row items-start">
              <Info size={16} color="#d97706" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-yellow-800 mb-1">
                  Important Notes
                </Text>
                <Text className="text-xs text-yellow-700">
                  • Only send {selectedToken} to this address{"\n"}• Sending
                  other tokens may result in permanent loss{"\n"}• Double-check
                  the address before sending
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
