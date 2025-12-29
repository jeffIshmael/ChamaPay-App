import { useRouter } from "expo-router";
import { ArrowLeft, Smartphone, Info } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useAuth } from "@/Contexts/AuthContext";
import { pretiumOnramp, pollPretiumPaymentStatus } from "@/lib/pretiumService";

export default function DepositCryptoScreen() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    | "idle"
    | "initiating"
    | "waiting_for_pin"
    | "processing"
    | "completed"
    | "failed"
  >("idle");
  const { token, user } = useAuth();
  const { currencyCode, onramp, USDCBalance } = useLocalSearchParams();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const MINIMUM_DEPOSIT = 10;

  const paymentMethods = [
    {
      id: "mpesa",
      name: "M-Pesa",
      icon: require("@/assets/images/mpesa.png"),
      description: "Mobile Money (Kenya)",
    },
  ];

  // Calculate amounts
  const calculateAmounts = () => {
    const depositAmount = parseFloat(amount) || 0;

    if (depositAmount < MINIMUM_DEPOSIT) {
      return {
        depositAmount: 0,
        cryptoAmount: 0,
      };
    }

    const cryptoAmount = depositAmount / Number(onramp);

    return {
      depositAmount,
      cryptoAmount: cryptoAmount.toFixed(4),
    };
  };

  const emptyInputs = () => {
    setAmount("");
    setPhoneNumber("");
  };

  const { depositAmount, cryptoAmount } = calculateAmounts();

  // the function to deposit crypto from fiat (onramp)
  const handleDeposit = async () => {
    if (!phoneNumber.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (phoneNumber.length !== 9) {
      Alert.alert("Error", "Please enter a valid phone number (9 digits)");
      return;
    }

    if (parseFloat(amount) < MINIMUM_DEPOSIT) {
      Alert.alert("Error", `Minimum deposit is KES ${MINIMUM_DEPOSIT}`);
      return;
    }

    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("initiating");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;

      console.log("calling the onramp now..");

      // Step 1: Initiate onramp
      const result = await pretiumOnramp(
        fullPhoneNumber,
        Number(amount),
        Number(onramp),
        Number(cryptoAmount),
        true,
        token
      );

      console.log("the onramp result", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate onramp");
      }

      setProcessingStep("waiting_for_pin");

      try {
        console.log("the result from the pretium onramp", result);

        const onrampResult = await pollPretiumPaymentStatus(
          result.transactionCode,
          token,
          (status, data) => {
            console.log("Status update:", status, data);

            switch (status) {
              case "pending":
                setProcessingStep("waiting_for_pin");
                break;
              case "pending_transfer":
              case "processing":
                setProcessingStep("processing");
                break;
              case "completed":
              case "complete":
                setProcessingStep("completed");
                break;
            }
          }
        );

        // Payment completed successfully
        setProcessingStep("completed");

        Alert.alert("Success!", `Successfully deposited ${cryptoAmount} USDC`, [
          {
            text: "OK",
            onPress: () => {
              emptyInputs();
              setIsProcessing(false);
              setProcessingStep("idle");
              router.push("/(tabs)/wallet");
            },
          },
        ]);
      } catch (pollError: any) {
        setIsProcessing(false);
        setProcessingStep("idle");

        let errorTitle = "Deposit Failed";
        let errorMessage = "The payment was not completed. Please try again.";

        if (pollError.status === "cancelled") {
          errorTitle = "Payment Cancelled";
          errorMessage = "The payment request was cancelled.";
        } else if (pollError.status === "timeout") {
          errorTitle = "Payment Timeout";
          errorMessage = "The payment request timed out. Please try again.";
        } else if (pollError.details?.message) {
          errorMessage = pollError.details.message;
        } else if (pollError.error) {
          errorMessage = pollError.error;
        }

        Alert.alert(errorTitle, errorMessage, [
          {
            text: "OK",
          },
        ]);
      }
    } catch (error: any) {
      setIsProcessing(false);
      setProcessingStep("idle");
      Alert.alert(
        "Error",
        error?.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-downy-800"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => {
              emptyInputs();
              router.push("/wallet");
            }}
            className="p-2 -ml-2"
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Deposit USDC</Text>
          <View className="w-8" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Convert mobile money to USDC instantly
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 bg-gray-50 rounded-t-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-8 gap-5">
          {/* Payment Method Selection */}
          <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Deposit via
            </Text>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedPaymentMethod(method.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                  selectedPaymentMethod === method.id
                    ? "bg-emerald-50 border-emerald-600"
                    : "bg-gray-50 border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-3 border border-gray-200">
                    <Smartphone size={24} color="#10b981" />
                  </View>
                  <View>
                    <Image source={method.icon} className="w-16 h-10" />
                    <Text className="text-xs text-gray-500">
                      {method.description}
                    </Text>
                  </View>
                </View>
                {selectedPaymentMethod === method.id && (
                  <View className="w-6 h-6 bg-emerald-600 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Phone Number Input */}
          <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-2">
              M-Pesa Phone Number
            </Text>
            <Text className="text-sm text-gray-500 mb-3">
              Enter your M-Pesa registered number
            </Text>

            <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
              <Text className="text-base font-semibold text-gray-700 mr-2">
                +254
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 9);
                  setPhoneNumber(cleaned);
                }}
                placeholder="712345678"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={9}
                style={{ fontSize: 16, padding: 0, margin: 0 }}
                className="flex-1"
              />
            </View>
            <Text className="text-xs text-gray-400 mt-2 ml-1">
              Format: 7XXXXXXXX or 1XXXXXXXX
            </Text>
          </View>

          {/* Amount Input */}
          <View className="bg-white p-5 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Amount (KES)
            </Text>
            <View className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="text-center text-3xl font-bold text-gray-900"
              />
              <Text className="text-center text-sm text-gray-500 mt-2">
                KES (Kenyan Shillings)
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-3 px-1">
              <Text className="text-sm text-gray-600">
                Minimum:{" "}
                <Text className="font-semibold">KES {MINIMUM_DEPOSIT}</Text>
              </Text>
              <View className="flex-row gap-2">
                {[50, 100, 500].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setAmount(preset.toString())}
                    className="px-3 py-1.5 bg-emerald-100 rounded-full"
                    activeOpacity={0.7}
                  >
                    <Text className="text-emerald-700 text-xs font-bold">
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="h-px bg-gray-200 my-4" />

            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-bold text-gray-600">
                Exchange Rate
              </Text>
              <Text className="text-sm font-bold text-gray-500">
                1 USDC = {onramp} {currencyCode}
              </Text>
            </View>
            {parseFloat(amount) >= MINIMUM_DEPOSIT && (
              <View className="flex-row justify-between items-center bg-blue-50 p-3 rounded-xl mt-4">
                <Text className="text-base font-bold text-blue-700">
                  You'll Receive
                </Text>
                <Text className="text-lg font-bold text-blue-700">
                  {cryptoAmount} USDC
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={
              !phoneNumber.trim() ||
              !amount.trim() ||
              parseFloat(amount) < MINIMUM_DEPOSIT ||
              phoneNumber.length !== 9
            }
            className={`w-full py-4 rounded-2xl shadow-lg ${
              !phoneNumber.trim() ||
              !amount.trim() ||
              parseFloat(amount) < MINIMUM_DEPOSIT ||
              phoneNumber.length !== 9
                ? "bg-gray-300"
                : "bg-downy-600"
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-center text-lg font-bold ${
                !phoneNumber.trim() ||
                !amount.trim() ||
                parseFloat(amount) < MINIMUM_DEPOSIT ||
                phoneNumber.length !== 9
                  ? "text-gray-500"
                  : "text-white"
              }`}
            >
              Deposit via M-Pesa
            </Text>
          </TouchableOpacity>

          {/* Info Note */}
          <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <Text className="text-xs text-blue-800 text-center">
              💡 You'll receive an M-Pesa prompt on your phone. Enter your PIN
              to complete the transaction.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Processing Modal */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            {processingStep === "initiating" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Initiating Payment
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Connecting to M-Pesa...
                </Text>
              </>
            )}

            {processingStep === "waiting_for_pin" && (
              <>
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mx-auto">
                  <Smartphone size={40} color="#059669" />
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Check Your Phone
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Enter your M-Pesa PIN on the prompt sent to{"\n"}
                  <Text className="font-bold">+254{phoneNumber}</Text>
                </Text>
                <View className="mt-4 bg-blue-50 p-3 rounded-xl">
                  <Text className="text-xs text-blue-800 text-center">
                    ⏱️ Waiting for PIN entry...
                  </Text>
                </View>
              </>
            )}

            {processingStep === "processing" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Processing Payment
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Converting KES {depositAmount} to {cryptoAmount} USDC
                </Text>
              </>
            )}

            {processingStep === "completed" && (
              <>
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mx-auto">
                  <Text className="text-4xl">✓</Text>
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-emerald-600">
                  Success!
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Your USDC has been deposited
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
