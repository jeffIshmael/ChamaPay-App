// File: app/(tabs)/deposit.tsx - Updated with reusable components
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Smartphone, ChevronDown, Check } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
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
import { useAuth } from "@/Contexts/AuthContext";
import { pretiumOnramp, pollPretiumPaymentStatus } from "@/lib/pretiumService";

// Import reusable components
import CountrySelector from "@/components/CountrySelector";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

// Import utilities
import {
  PRETIUM_COUNTRIES,
  formatPhoneNumber,
  isValidPhoneNumber,
  formatCurrency,
  type Country,
  type PaymentMethod,
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

  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);

  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(PRETIUM_COUNTRIES[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const { token } = useAuth();
  const { currencyCode, onramp, USDCBalance } = useLocalSearchParams();

  const MINIMUM_DEPOSIT = 10;

  // Event handlers
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
    setSelectedMethod(null);
    setPhoneNumber("");
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    // Only allow mobile money for deposits (onramp)
    if (method.type !== 'mobile_money') {
      Alert.alert("Not Available", "Bank deposits are not currently supported. Please use mobile money.");
      return;
    }
    setSelectedMethod(method);
    setShowMethodModal(false);
  };

  // Calculate amounts
  const calculateAmounts = () => {
    const depositAmount = parseFloat(amount) || 0;
    if (depositAmount < MINIMUM_DEPOSIT) {
      return { depositAmount: 0, cryptoAmount: "0.0000" };
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

  const handleDeposit = async () => {
    if (!amount.trim()) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    if (parseFloat(amount) < MINIMUM_DEPOSIT) {
      Alert.alert("Error", `Minimum deposit is ${selectedCountry.currency} ${MINIMUM_DEPOSIT}`);
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
        Number(onramp),
        Number(cryptoAmount),
        true,
        token
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate onramp");
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
      let errorMessage = "The payment was not completed. Please try again.";

      if (error.status === "cancelled") {
        errorTitle = "Payment Cancelled";
        errorMessage = "The payment request was cancelled.";
      } else if (error.status === "timeout") {
        errorTitle = "Payment Timeout";
        errorMessage = "The payment request timed out. Please try again.";
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
      selectedMethod &&
      selectedMethod.type === 'mobile_money' &&
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
          {/* Country Selection */}
          <View className="bg-white p-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-4">
              Select Country
            </Text>
            <TouchableOpacity
              onPress={() => setShowCountryModal(true)}
              className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-gray-200">
                  <Text className="text-2xl">{selectedCountry.flag}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {selectedCountry.name}
                  </Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    Currency: {selectedCountry.currency}
                  </Text>
                </View>
              </View>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Payment Method Selection */}
          <View className="bg-white p-6 rounded-2xl shadow-sm">
            <Text className="text-base font-bold text-gray-900 mb-4">
              Deposit Method
            </Text>
            {selectedMethod ? (
              <TouchableOpacity
                onPress={() => setShowMethodModal(true)}
                className="flex-row items-center justify-between p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-white border-2 border-emerald-200">
                    <Smartphone size={22} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedMethod.name}
                    </Text>
                    <Text className="text-xs text-gray-600 mt-0.5">
                      Instant • {selectedCountry.currency}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center">
                    <Check size={14} color="white" strokeWidth={3} />
                  </View>
                  <ChevronDown size={18} color="#10b981" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowMethodModal(true)}
                className="flex-row items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 font-medium">
                  Tap to select mobile money
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Mobile Money Phone Number */}
          {selectedMethod && (
            <View className="bg-white px-5 py-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-2">
                Mobile Money Number
              </Text>
              <Text className="text-sm text-gray-500 mb-3">
                Enter your {selectedMethod.name} registered number
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                <Text className="text-base font-semibold text-gray-700 mr-2">
                  +{selectedCountry.phoneCode}
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
            </View>
          )}

          {/* Amount Input */}
          {selectedMethod && (
            <View className="bg-white p-5 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Amount ({selectedCountry.currency})
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
                  {selectedCountry.currency}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mt-3 px-1">
                <Text className="text-sm text-gray-600">
                  Minimum:{" "}
                  <Text className="font-semibold">
                    {selectedCountry.currency} {MINIMUM_DEPOSIT}
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

              <View className="h-px bg-gray-200 my-4" />

              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-bold text-gray-600">
                  Exchange Rate
                </Text>
                <Text className="text-sm font-bold text-gray-500">
                  1 USDC = {onramp} {selectedCountry.currency}
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
          )}

          {/* Submit Button */}
          {selectedMethod && (
            <>
              <TouchableOpacity
                onPress={handleDeposit}
                disabled={!isFormValid()}
                className={`w-full py-4 rounded-2xl shadow-lg ${
                  isFormValid() ? "bg-downy-600" : "bg-gray-300"
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-center text-lg font-bold ${
                    isFormValid() ? "text-white" : "text-gray-500"
                  }`}
                >
                  Deposit via {selectedMethod.name}
                </Text>
              </TouchableOpacity>

              {/* Info Note */}
              <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <Text className="text-xs text-blue-800 text-center">
                  💡 You'll receive a prompt on your phone. Enter your PIN to
                  complete the transaction.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Reusable Modal Components */}
      <CountrySelector
        visible={showCountryModal}
        selectedCountry={selectedCountry}
        onSelect={handleCountrySelect}
        onClose={() => setShowCountryModal(false)}
      />

      <PaymentMethodSelector
        visible={showMethodModal}
        selectedCountry={selectedCountry}
        selectedMethod={selectedMethod}
        onSelect={handleMethodSelect}
        onClose={() => setShowMethodModal(false)}
      />

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
                  Connecting to {selectedMethod?.name}...
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
                  Enter your PIN on the prompt sent to{"\n"}
                  <Text className="font-bold">
                    {formatPhoneNumber(selectedCountry.phoneCode, phoneNumber)}
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
                  Converting {selectedCountry.currency} {formatCurrency(depositAmount)} to {cryptoAmount} USDC
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
                  Deposit failed. Please try again.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}