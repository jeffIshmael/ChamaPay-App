import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowLeft,
  Check,
  Copy,
  DollarSign,
  Info
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

export default function DepositCryptoScreen() {
  const [selectedMethod, setSelectedMethod] = useState<
    "bank" | "card" | "crypto"
  >("bank");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("KES");
  const router = useRouter();

  const depositMethods = [
    {
      id: "bank",
      title: "Bank Transfer",
      subtitle: "Free • 1-2 business days",
      icon: <DollarSign size={20} color="#059669" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      id: "card",
      title: "Debit/Credit Card",
      subtitle: "2.9% fee • Instant",
      icon: <Copy size={20} color="#2563eb" />,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "crypto",
      title: "Crypto Transfer",
      subtitle: "Network fees apply • 10-30 minutes",
      icon: <ArrowDownRight size={20} color="#7c3aed" />,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
  ];

  const currencies = ["KES", "USD", "EUR"];

  const handleDeposit = () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }
    // TODO
    // onNavigate("payment", {
    //   type: "crypto-deposit",
    //   method: selectedMethod,
    //   amount: parseFloat(amount),
    //   currency: selectedCurrency,
    // });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="bg-green-600 px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full"
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-lg text-white font-medium">
              Deposit Funds
            </Text>
            <View className="w-10" />
          </View>
        </View>

        <View className="px-6 py-6 gap-6">
          {/* Amount */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Amount to Deposit
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-lg font-medium text-center flex-1"
                />
              </View>
              <View className="w-20">
                <Picker
                  selectedValue={selectedCurrency}
                  onValueChange={setSelectedCurrency}
                  style={{ height: 50 }}
                >
                  {currencies.map((currency) => (
                    <Picker.Item
                      key={currency}
                      label={currency}
                      value={currency}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Deposit Methods */}
          <View className="bg-white p-4 rounded-lg border border-gray-200">
            <Text className="text-gray-900 font-medium mb-3">
              Select Deposit Method
            </Text>
            <View className="gap-3">
              {depositMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id as any)}
                  className={`flex-row items-center justify-between p-4 rounded-lg border ${
                    selectedMethod === method.id
                      ? "border-emerald-500 bg-emerald-50"
                      : `${method.borderColor} ${method.bgColor}`
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
                    <Check size={16} color="#059669" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Method-specific Information */}
          {selectedMethod === "bank" && (
            <View className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <View className="flex-row items-start">
                <Info size={16} color="#059669" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-green-800 mb-1">
                    Bank Transfer
                  </Text>
                  <Text className="text-xs text-green-700">
                    • Free bank transfers from supported banks{"\n"}• Processing
                    time: 1-2 business days{"\n"}• Minimum deposit: 100{" "}
                    {selectedCurrency}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {selectedMethod === "card" && (
            <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <View className="flex-row items-start">
                <Info size={16} color="#2563eb" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-blue-800 mb-1">
                    Card Payment
                  </Text>
                  <Text className="text-xs text-blue-700">
                    • Instant deposit with 2.9% processing fee{"\n"}• Visa and
                    Mastercard accepted{"\n"}• Minimum deposit: 10{" "}
                    {selectedCurrency}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {selectedMethod === "crypto" && (
            <View className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <View className="flex-row items-start">
                <Info size={16} color="#7c3aed" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-purple-800 mb-1">
                    Crypto Transfer
                  </Text>
                  <Text className="text-xs text-purple-700">
                    • Transfer from external wallet{"\n"}• Network fees apply
                    (varies by blockchain){"\n"}• Processing time: 10-30 minutes
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Deposit Button */}
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={!amount.trim()}
            className={`w-full py-4 rounded-lg ${
              !amount.trim() ? "bg-gray-300" : "bg-green-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center font-medium text-lg ${
                !amount.trim() ? "text-gray-500" : "text-white"
              }`}
            >
              Continue Deposit
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
