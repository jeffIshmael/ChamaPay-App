import { useAuth } from "@/Contexts/AuthContext";
import { pollPretiumPaymentStatus, pretiumOnramp } from "@/lib/pretiumService";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Smartphone } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import utilities
import {
  formatCurrency,
  formatPhoneNumber,
  isValidPhoneNumber,
} from "@/Utils/pretiumUtils";

export default function DepositCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const { user, token } = useAuth();
  const { USDCBalance } = useLocalSearchParams();
  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();

  const theExhangeQuote = rates["KES"]?.data || null;
  const onrampRate = theExhangeQuote?.exchangeRate.selling_rate || 0;

  const MINIMUM_DEPOSIT = 10;
  const KENYA_PHONE_CODE = "254";
  const CURRENCY = "KES";

  // Calculate amounts
  const calculateAmounts = () => {
    const depositAmount = parseFloat(amount) || 0;
    if (depositAmount < MINIMUM_DEPOSIT || onrampRate === 0) {
      return { depositAmount: 0, cryptoAmount: "0.0000" };
    }
    const cryptoAmount = depositAmount / onrampRate;
    return {
      depositAmount,
      cryptoAmount: cryptoAmount.toFixed(4),
    };
  };

  useEffect(() => {
    globalFetchRate("KES");
  }, []);

  const emptyInputs = () => {
    setAmount("");
    setPhoneNumber("");
  };

  const { depositAmount, cryptoAmount } = calculateAmounts();

  const handleDeposit = async () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      Alert.alert("Error", "Please enter a valid M-Pesa number");
      return;
    }

    if (parseFloat(amount) < MINIMUM_DEPOSIT) {
      Alert.alert("Error", `Minimum deposit is ${CURRENCY} ${MINIMUM_DEPOSIT}`);
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

      // Initiate onramp
      const result = await pretiumOnramp(
        fullPhoneNumber,
        Number(amount),
        onrampRate,
        Number(cryptoAmount),
        true,
        token
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate M-Pesa payment");
      }

      setProcessingStep("waiting_for_pin");

      // Poll for payment status
      const onrampResult = await pollPretiumPaymentStatus(
        result.transactionCode,
        token,
        (status, data) => {
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
    } catch (error: any) {
      setIsProcessing(false);
      setProcessingStep("idle");

      let errorTitle = "Deposit Failed";
      let errorMessage = "The M-Pesa payment was not completed. Please try again.";

      if (error.status === "cancelled") {
        errorTitle = "Payment Cancelled";
        errorMessage = "The M-Pesa payment was cancelled.";
      } else if (error.status === "timeout") {
        errorTitle = "Payment Timeout";
        errorMessage = "The M-Pesa payment timed out. Please try again.";
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage);
    }
  };

  const isFormValid = () => {
    return (
      amount.trim() &&
      parseFloat(amount) >= MINIMUM_DEPOSIT &&
      isValidPhoneNumber(phoneNumber)
    );
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
        <Text className="text-emerald-100 text-sm text-center">
          Deposit USDC from M-Pesa instantly
        </Text>
      </View>

      {user?.location !== "KE" ? (
        <View className="flex-1 bg-gray-50 rounded-t-3xl items-center justify-center px-6">
          <View className="bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-md mb-4">
            <Text className="text-yellow-800 font-medium mb-1">
              M-Pesa Not Available
            </Text>
            <Text className="text-yellow-900 text-sm">
              M-Pesa deposits are currently only available for users in Kenya.
              You can still deposit USDC using an external wallet via the "Receive" feature.
            </Text>
            <TouchableOpacity
              className="mt-3 bg-yellow-200 py-2 px-3 rounded-lg items-center"
              onPress={() => router.push("/(tabs)/wallet/receive-crypto")}
              activeOpacity={0.7}
            >
              <Text className="text-yellow-900 font-semibold">Use External Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Main Content */
        <ScrollView
          className="flex-1 bg-gray-50 rounded-t-3xl"
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 py-8 gap-5">

            {/* M-Pesa Info Card */}
            <View className="bg-downy-50 rounded-3xl p-5 shadow-lg border border-downy-100">
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-2xl bg-green-50 items-center justify-center">
                  <Image
                    source={require("@/assets/images/mpesa.png")}
                    className="w-16 h-16"
                    resizeMode="contain"
                  />
                </View>

                {/* Vertical Divider */}
                <View className="w-px h-12 bg-gray-300 mx-4" />

                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">
                    M-Pesa
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Safaricom Kenya
                  </Text>
                </View>
              </View>
            </View>


            {/* M-Pesa Phone Number */}
            <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-2">
                M-Pesa Number
              </Text>
              <Text className="text-sm text-gray-500 mb-3">
                Enter your registered M-Pesa mobile number
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                <Text className="text-base font-semibold text-gray-700 mr-2">
                  +{KENYA_PHONE_CODE}
                </Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={(text) =>
                    setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 12))
                  }
                  placeholder="712345678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={12}
                  style={{ fontSize: 16, padding: 0, margin: 0 }}
                  className="flex-1"
                />
              </View>
              {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                <Text className="text-red-500 text-xs mt-2">
                  Please enter a valid Kenyan phone number
                </Text>
              )}
            </View>

            {/* Amount Input */}
            <View className="bg-white p-5 rounded-2xl shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-bold text-gray-900">
                  Amount ({CURRENCY})
                </Text>
                <View>
                  <Text className="text-xs font-bold text-gray-600">
                    1 USDC = {onrampRate.toFixed(2)} {CURRENCY}
                  </Text>
                </View>
              </View>
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
                  {CURRENCY}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-3 px-1">
                <Text className="text-sm text-gray-600">
                  Minimum:{" "}
                  <Text className="font-semibold">
                    {CURRENCY} {MINIMUM_DEPOSIT}
                  </Text>
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



              {parseFloat(amount) >= MINIMUM_DEPOSIT && (
                <>
                  <View className="h-px bg-gray-200 my-4" />
                  <View className="flex-row justify-between items-center bg-blue-50 p-3 rounded-xl mt-2">
                    <Text className="text-base font-bold text-blue-700">
                      You'll Receive
                    </Text>
                    <Text className="text-lg font-bold text-blue-700">
                      {cryptoAmount} USDC
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleDeposit}
              disabled={!isFormValid()}
              className={`w-full py-4 rounded-2xl shadow-lg ${isFormValid() ? "bg-downy-600" : "bg-gray-300"
                }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center text-lg font-bold ${isFormValid() ? "text-white" : "text-gray-500"
                  }`}
              >
                Deposit via M-Pesa
              </Text>
            </TouchableOpacity>

            {/* Info Note */}
            <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <Text className="text-xs text-blue-800 text-center">
                💡 You'll receive an M-Pesa prompt on your phone. Enter your PIN to
                complete the transaction.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Processing Modal */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            {processingStep === "initiating" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Initiating M-Pesa Payment
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
                  <Text className="font-bold">
                    {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                  </Text>
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
                  Converting {CURRENCY} {formatCurrency(depositAmount)} to {cryptoAmount} USDC
                </Text>
              </>
            )}

            {processingStep === "completed" && (
              <>
                <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mx-auto">
                  <Check size={40} color="#059669" strokeWidth={3} />
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-emerald-600">
                  Success!
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Your USDC has been deposited
                </Text>
              </>
            )}

            {processingStep === "failed" && (
              <>
                <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mx-auto">
                  <Text className="text-3xl">✕</Text>
                </View>
                <Text className="text-xl font-bold text-center mt-4 text-red-600">
                  Failed
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  M-Pesa deposit failed. Please try again.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}