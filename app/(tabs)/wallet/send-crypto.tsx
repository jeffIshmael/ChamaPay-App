import { useRouter } from "expo-router";
import { ArrowLeft, Check, Info, QrCode } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SendCryptoScreen() {
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: 2.456, icon: "⟠" },
    { symbol: "USDC", name: "USD Coin", balance: 1250.0, icon: "💎" },
    { symbol: "KES", name: "Kenyan Shilling", balance: 45000, icon: "🇰🇪" },
  ];

  const handleSend = () => {
    if (!recipient.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    Alert.alert("Send Crypto", "Sending...");

    // TODO: implement crypto send

    // ("payment", {
    //   type: "crypto-send",
    //   token: selectedToken,
    //   recipient,
    //   amount: parseFloat(amount),
    //   memo,
    // });
  };

  const scanQR = () => {
    Alert.alert("QR Scanner", "QR code scanner would open here");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar
        backgroundColor="#059669" // Android only
        barStyle="light-content" // 'light-content' for light icons, 'dark-content' for dark icons
      />
      {/* Header */}
      <View className="bg-emerald-600 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg text-white font-medium">Send Crypto</Text>
          <View className="w-10" />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 py-6 gap-6">
          {/* Select Token */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">Select Token</Text>
            <View className="gap-3">
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
                    <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-gray-200">
                      <Text className="text-lg">{token.icon}</Text>
                    </View>
                    <View>
                      <Text className="text-gray-900 font-medium">
                        {token.symbol}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {token.name}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-900 font-medium">
                      {token.symbol === "KES"
                        ? `${token.balance.toLocaleString()}`
                        : `${token.balance}`}{" "}
                      {token.symbol}
                    </Text>
                    {selectedToken === token.symbol && (
                      <Check size={16} color="#059669" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recipient */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">Recipient</Text>
            <View className="flex-row gap-3">
              <TextInput
                value={recipient}
                onChangeText={setRecipient}
                placeholder="Enter wallet address or ENS name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                multiline={true}
                numberOfLines={2}
              />
              <TouchableOpacity
                onPress={scanQR}
                className="w-12 h-12 bg-emerald-600 rounded-lg items-center justify-center"
                activeOpacity={0.7}
              >
                <QrCode size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">Amount</Text>
            <View className="gap-3">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-3 py-3 text-lg font-medium text-center"
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
          </View>

          {/* Memo (Optional) */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Memo (Optional)
            </Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="Add a note for this transaction"
              className="border border-gray-300 rounded-lg px-3 py-2"
              multiline={true}
              numberOfLines={2}
            />
          </View>

          {/* Transaction Fee */}
          <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Info size={16} color="#2563eb" />
                <View className="ml-3">
                  <Text className="text-sm font-medium text-blue-800">
                    Network Fee
                  </Text>
                  <Text className="text-xs text-blue-700">
                    Standard • ~2-5 minutes
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-medium text-blue-900">~$2.50</Text>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!recipient.trim() || !amount.trim()}
            className={`w-full py-4 rounded-lg ${
              !recipient.trim() || !amount.trim()
                ? "bg-gray-300"
                : "bg-emerald-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center font-medium text-lg ${
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
    </SafeAreaView>
  );
}
