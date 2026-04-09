import { useAuth } from "@/Contexts/AuthContext";
import {
  CurrencyCode,
  disburseToMobileNumber,
  pollPretiumPaymentStatus,
  validatePhoneNumber
} from "@/lib/pretiumService";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Check } from "lucide-react-native";
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
  ToastAndroid,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import utilities
import {
  PRETIUM_TRANSACTION_LIMIT,
  formatCurrency,
  formatPhoneNumber,
  isValidPhoneNumber,
  type TransactionLimits,
} from "@/Utils/pretiumUtils";
import { type Quote } from "./index";

type MobileDetailsShape = {
  mobile_network?: string;
  public_name?: string;
  shortcode?: string;
  status?: string;
};

interface Verification {
  success: boolean;
  MobileDetails?: MobileDetailsShape;
  details?: MobileDetailsShape;
}

export default function WithdrawCryptoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amountKES, setAmountKES] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneTouched, setIsPhoneTouched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");

  // Modal states
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPhoneData, setVerifiedPhoneData] =
    useState<Verification | null>(null);
  const [verificationError, setVerificationError] = useState("");

  const { USDCBalance } = useLocalSearchParams();
  const { user, token } = useAuth();
  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();

  const theExhangeQuote = rates["KES"]?.data || null;

  const KENYA_PHONE_CODE = "254";
  const CURRENCY = "KES";
  const MOBILE_NETWORK = "Safaricom";

  const [limits, setLimits] = useState<TransactionLimits | null>(
    PRETIUM_TRANSACTION_LIMIT["KE"] || null
  );
  const [exchangeRate, setExchangeRate] = useState<Quote | null>(null);

  const getMobileDetails = (v: any): MobileDetailsShape | null =>
    (v?.MobileDetails as MobileDetailsShape) ||
    (v?.details as MobileDetailsShape) ||
    null;

  const tokens = [
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: USDCBalance,
      image: require("@/assets/images/usdclogo.png"),
    },
  ];

  // Fetch exchange rate on mount
  useEffect(() => {
    globalFetchRate("KES");
  }, []);

  // Get current exchange rate
  const currentExchangeRate = theExhangeQuote?.exchangeRate?.buying_rate || 0;

  // Calculate available balance in KES
  const balanceInKES = (parseFloat(USDCBalance as string) || 0) * currentExchangeRate;

  // Calculations - now based on KES input
  // User gets exactly what they input, fee is added on top
  const calculateFee = () => parseFloat(amountKES || "0") * 0.005;

  const calculateTotalDeduction = () => {
    const kesAmount = parseFloat(amountKES) || 0;
    return kesAmount + calculateFee();
  };

  const calculateUSDCAmount = () => {
    const totalKES = calculateTotalDeduction();
    return currentExchangeRate > 0 ? totalKES / currentExchangeRate : 0;
  };

  const usdcAmount = calculateUSDCAmount().toFixed(6);
  const finalAmount = amountKES; // User receives exactly what they enter

  // Verify M-Pesa number
  const handleVerifyPhoneNumber = async () => {
    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");
    setVerifiedPhoneData(null);

    try {
      const shortcode = `0${phoneNumber}`;

      const validation = await validatePhoneNumber(
        "KES" as CurrencyCode,
        "MOBILE",
        MOBILE_NETWORK,
        shortcode,
        token
      );

      if (!validation.success) {
        setVerificationError(
          validation.error || "Failed to validate M-Pesa number"
        );
      } else {
        const md = getMobileDetails(validation);
        if (!md) {
          setVerificationError(
            "Verification succeeded but details were missing. Please try again."
          );
          return;
        }

        setVerifiedPhoneData(validation);
        setVerificationError("");
      }
    } catch (error) {
      console.error("Error during M-Pesa verification:", error);
      setVerificationError("An error occurred during verification");
      setVerifiedPhoneData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInitialWithdraw = async () => {
    if (!amountKES.trim()) return Alert.alert("Error", "Please enter an amount");

    const kesAmountNum = parseFloat(amountKES);
    const totalDeduction = calculateTotalDeduction();

    if (kesAmountNum <= 0) {
      return Alert.alert("Error", "Amount must be greater than 0");
    }

    if (totalDeduction > balanceInKES) {
      // Calculate max amount user can withdraw
      const maxWithdrawable = balanceInKES / 1.005; // Reverse calculate: balance / (1 + 0.005)
      return Alert.alert(
        "Insufficient Balance",
        `You can withdraw up to ${CURRENCY} ${formatCurrency(maxWithdrawable.toFixed(2))} (including 0.5% fee)`
      );
    }

    // Validate against min/max limits
    if (limits) {
      if (kesAmountNum < limits.min) {
        return Alert.alert(
          "Error",
          `Minimum withdrawal is ${CURRENCY} ${formatCurrency(limits.min)}`
        );
      }
      if (kesAmountNum > limits.max) {
        return Alert.alert(
          "Error",
          `Maximum withdrawal is ${CURRENCY} ${formatCurrency(limits.max)}`
        );
      }
    }

    if (!isValidPhoneNumber(phoneNumber))
      return Alert.alert("Error", "Please enter a valid M-Pesa number");

    setShowVerificationModal(true);
    handleVerifyPhoneNumber();
  };

  const handleConfirmedWithdraw = async () => {
    if (!token) {
      Alert.alert("Error", "No token or wallet connected");
      return;
    }

    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");

    try {

      const totalDeduction = calculateTotalDeduction();
      // the fee is 0.5% of the amount
      const fee = calculateFee();

      console.log("totalDeduction", totalDeduction);
      console.log("usdcAmount", usdcAmount);
      console.log("currentExchangeRate", currentExchangeRate);
      console.log("fee", fee);

      const offrampResult = await disburseToMobileNumber(
        "KES" as CurrencyCode,
        MOBILE_NETWORK,
        `0${phoneNumber}`,
        totalDeduction.toString(), // User receives exactly what they entered
        usdcAmount,
        currentExchangeRate.toString(),
        fee.toString(),
        token,
      );

      if (!offrampResult.success) {
        throw new Error(offrampResult.error || "Failed to initiate withdrawal");
      }

      // Poll for transaction completion
      const transactionCode = offrampResult.result.transactionCode;

      if (!transactionCode) {
        throw new Error("No transaction code received");
      }

      setProcessingStep("processing");

      try {
        const finalResult = await pollPretiumPaymentStatus(
          transactionCode,
          token,
          (status, data) => {
            console.log("Withdrawal status update:", status);
            switch (status) {
              case "pending":
                setProcessingStep("processing");
                break;
              case "processing":
              case "pending_transfer":
                setProcessingStep("processing");
                break;
              case "completed":
              case "complete":
                setProcessingStep("completed");
                break;
            }
          },
          60,
          2000
        );

        // Handle successful completion
        setProcessingStep("completed");
        setIsProcessing(false);
        ToastAndroid.show(` ${formatCurrency(amountKES)} ${CURRENCY} has been successfully sent to ${formatPhoneNumber(
          KENYA_PHONE_CODE,
          phoneNumber
        )}`, ToastAndroid.SHORT);
        setAmountKES("");
        setPhoneNumber("");
        router.push("/wallet");
      } catch (pollError: any) {
        let errorTitle = "Withdrawal Processing";
        let errorMessage =
          "The withdrawal was initiated but we couldn't confirm completion. Please check your M-Pesa account.";

        if (pollError.status === "timeout") {
          errorTitle = "Processing Timeout";
          errorMessage =
            "The withdrawal is still processing. It may take a few minutes to complete. Please check your M-Pesa account shortly.";
        } else if (pollError.status === "cancelled") {
          errorTitle = "Withdrawal Cancelled";
          errorMessage = "The M-Pesa withdrawal was cancelled.";
        } else if (pollError.status === "failed") {
          errorTitle = "Withdrawal Failed";
          errorMessage =
            pollError.details?.message ||
            "The withdrawal failed. Your USDC has been sent but the conversion may have failed.";
        }

        setProcessingStep("failed");

        ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      setProcessingStep("failed");

      setIsProcessing(false);
      ToastAndroid.show(
        error.message || "Failed to process M-Pesa withdrawal. Please try again.",
        ToastAndroid.SHORT
      );
      setProcessingStep("idle");
    }
  };


  const canConfirmWithdraw =
    !isVerifying &&
    !verificationError &&
    !!getMobileDetails(verifiedPhoneData);

  const isFormValid = () => {
    const kesAmountNum = parseFloat(amountKES);
    const totalDeduction = calculateTotalDeduction();

    if (!amountKES.trim() || kesAmountNum <= 0 || totalDeduction > balanceInKES) {
      return false;
    }

    if (limits) {
      if (kesAmountNum < limits.min || kesAmountNum > limits.max) {
        return false;
      }
    }

    return isValidPhoneNumber(phoneNumber);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      {/* Header */}
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 24,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => {
              setAmountKES("");
              setPhoneNumber("");
              router.push("/(tabs)/wallet");
            }}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Withdraw</Text>
          <View className="w-10" />
        </View>
        <Text className="text-emerald-100 text-sm text-center mt-1">
          Withdraw to M-Pesa instantly
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 rounded-t-3xl bg-gray-50"
      >
        {user?.location !== "KE" ? (
          // --- Non-Kenya Users --- //
          <View className="flex-1 items-center rounded-t-3xl justify-center px-6">
            <View className="bg-amber-50 p-6 rounded-2xl border border-amber-200 items-center shadow-sm">
              <Text className="text-5xl mb-4">⚠️</Text>
              <Text className="text-lg font-bold text-amber-900 text-center mb-2">
                Regional Restriction
              </Text>
              <Text className="text-amber-800 text-center leading-6 mb-4">
                M-Pesa withdrawal services are only available in Kenya.
                Please use the "Send" feature to transfer to an external crypto wallet.
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/wallet/send-crypto")}
                className="w-full bg-amber-600 p-3 rounded-xl mb-3 shadow-md"
              >
                <Text className="text-white text-center font-bold">
                  Send to Wallet Address
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                className="p-3 border border-amber-700 rounded-xl"
              >
                <Text className="text-amber-700 font-semibold text-center">Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // --- Kenya Users --- //
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1 pb-20"
          >
            <View className="px-6 py-6 gap-6">

              {/* --- M-Pesa Info Card --- */}
              <View className="bg-downy-50 rounded-3xl p-5 shadow-md border border-downy-100 flex-row items-center">
                <View className="w-16 h-16 rounded-2xl bg-green-50 items-center justify-center">
                  <Image
                    source={require("@/assets/images/mpesa.png")}
                    className="w-16 h-16"
                    resizeMode="contain"
                  />
                </View>
                <View className="w-px h-12 bg-gray-300 mx-4" />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">M-Pesa</Text>
                  <Text className="text-xs text-gray-500">Safaricom Kenya</Text>
                </View>
              </View>

              {/* --- Phone Number Input --- */}
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm border border-gray-200">
                <Text className="text-base font-bold text-gray-900 mb-1">M-Pesa Number</Text>
                <Text className="text-sm text-gray-500 mb-3">
                  Enter your registered M-Pesa mobile number
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border-2 border-gray-200 px-4 py-3">
                  <Text className="text-base font-semibold text-gray-700 mr-2">+{KENYA_PHONE_CODE}</Text>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) =>
                      setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 12))
                    }
                    placeholder="712345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={12}
                    onBlur={() => setIsPhoneTouched(true)}
                    className="flex-1 text-base"
                  />
                </View>
                {isPhoneTouched && phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                  <Text className="text-red-500 text-xs mt-2">
                    Please enter a valid Kenyan phone number
                  </Text>
                )}
              </View>

              {/* --- Amount Input Section --- */}
              <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-bold text-gray-900">Withdrawal Amount</Text>
                  <Text className="text-xs font-bold text-gray-600">
                    1 USDC = {currentExchangeRate.toFixed(2)} {CURRENCY}
                  </Text>
                </View>

                <View className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50 mb-4">
                  <TextInput
                    value={amountKES}
                    onChangeText={setAmountKES}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    className="text-center text-4xl font-bold text-gray-900"
                  />
                  <Text className="text-center text-xs font-medium text-gray-500 mt-2">{CURRENCY}</Text>
                </View>

                {/* Available Balance & Max Button */}
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-sm text-gray-600">
                    Available: <Text className="font-semibold">{CURRENCY} {formatCurrency(balanceInKES.toFixed(2))}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const maxLimitNum = limits?.max || Infinity;
                      const maxFromBalance = balanceInKES / 1.005; // fee included
                      const maxAmount = Math.min(maxFromBalance, maxLimitNum);
                      setAmountKES(maxAmount.toFixed(2));
                    }}
                    className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300"
                    activeOpacity={0.7}
                  >
                    <Text className="text-downy-700 text-xs font-bold">Max</Text>
                  </TouchableOpacity>
                </View>

                {/* Fee & Total */}
                {parseFloat(amountKES) > 0 && (
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2 space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">You will receive</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {CURRENCY} {formatCurrency(amountKES)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Service Fee (0.5%)</Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        + {CURRENCY} {formatCurrency(calculateFee().toFixed(2))}
                      </Text>
                    </View>
                    <View className="flex-1 h-px bg-gray-300 my-1" />
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-bold text-gray-900">Total Deduction</Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {CURRENCY} {formatCurrency(calculateTotalDeduction().toFixed(2))}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-500">USDC to withdraw</Text>
                      <Text className="text-xs text-gray-500">{parseFloat(usdcAmount).toFixed(4)} USDC</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleInitialWithdraw}
                disabled={!isFormValid()}
                className={`w-full py-4 rounded-2xl shadow-lg ${isFormValid() ? "bg-downy-600" : "bg-gray-300"}`}
                activeOpacity={0.8}
              >
                <Text className={`text-center font-bold text-lg ${isFormValid() ? "text-white" : "text-gray-500"}`}>
                  Withdraw to M-Pesa
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View
            className="bg-white rounded-[32px] w-full shadow-2xl overflow-hidden"
            style={{ maxWidth: 400 }}
          >
            {/* Modal Header */}
            <View className="bg-downy-50 py-6 px-6 border-b border-downy-100 items-center">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-sm mb-3">
                <Image
                  source={require("@/assets/images/mpesa.png")}
                  className="w-12 h-12"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xl font-bold text-gray-900">
                Confirm Details
              </Text>
              <Text className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">
                Withdrawal Verification
              </Text>
            </View>

            <View className="p-6">
              {isVerifying ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#059669" />
                  <Text className="mt-4 text-sm font-medium text-gray-600">
                    Verifying M-Pesa details...
                  </Text>
                </View>
              ) : verificationError ? (
                <View className="items-center py-4">
                  <View className="w-12 h-12 bg-red-50 rounded-full items-center justify-center mb-3">
                    <Text className="text-xl">⚠️</Text>
                  </View>
                  <Text className="text-sm text-red-600 text-center font-medium px-4">
                    {verificationError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowVerificationModal(false)}
                    className="mt-6 w-full py-3.5 rounded-2xl bg-gray-100 active:bg-gray-200"
                    activeOpacity={0.8}
                  >
                    <Text className="text-center font-bold text-gray-800">
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {!!getMobileDetails(verifiedPhoneData) && (
                    <View className="space-y-4">
                      {/* Recipient Card */}
                      <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recipient</Text>
                        <View className="flex-row items-center justify-between mb-3">
                          <Text className="text-sm text-gray-600">Account Name</Text>
                          <Text className="text-sm font-bold text-gray-900">
                            {getMobileDetails(verifiedPhoneData)?.public_name || "—"}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">M-Pesa Number</Text>
                          <Text className="text-sm font-bold text-emerald-700">
                            {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                          </Text>
                        </View>
                      </View>

                      {/* Amount Details */}
                      <View className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 my-4">
                        <Text className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-wider mb-2">Withdrawal Amount</Text>
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-sm text-gray-600">You Receive</Text>
                          <Text className="text-lg font-bold text-emerald-800">
                            {CURRENCY} {formatCurrency(amountKES)}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs text-gray-500">Total Deduction</Text>
                          <Text className="text-xs font-medium text-gray-700">
                            {parseFloat(usdcAmount).toFixed(4)} USDC
                          </Text>
                        </View>
                      </View>

                      {/* Info Alert */}
                      <View className="bg-blue-50 p-3 rounded-xl flex-row items-center mb-6">
                        <Text className="text-lg mr-2">ℹ️</Text>
                        <Text className="text-[11px] text-blue-800 flex-1 leading-4">
                          Funds will be sent immediately to the registered M-Pesa account above.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setShowVerificationModal(false)}
                      className="flex-1 py-4 rounded-2xl border border-gray-200 active:bg-gray-50"
                      activeOpacity={0.8}
                    >
                      <Text className="text-center font-bold text-gray-600">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmedWithdraw}
                      disabled={!canConfirmWithdraw}
                      className={`flex-[1.5] py-4 rounded-2xl shadow-sm ${canConfirmWithdraw ? "bg-emerald-600 shadow-emerald-200" : "bg-gray-200"
                        }`}
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`text-center font-bold ${canConfirmWithdraw ? "text-white" : "text-gray-400"
                          }`}
                      >
                        Confirm Withdraw
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View
            className="bg-white rounded-[32px] w-full shadow-2xl overflow-hidden"
            style={{ maxWidth: 400 }}
          >
            {processingStep === "processing" && (
              <View className="p-8">
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center relative">
                    <ActivityIndicator size="large" color="#059669" />
                    <View className="absolute inset-0 items-center justify-center">
                      {/* Subtle inner icon or text could go here */}
                    </View>
                  </View>
                  <Text className="text-2xl font-bold text-center mt-6 text-gray-900">
                    Processing
                  </Text>
                  <Text className="text-sm text-gray-500 text-center mt-2 font-medium px-4">
                    Sending <Text className="text-gray-900 font-bold">{CURRENCY} {formatCurrency(amountKES)}</Text> to your M-Pesa account
                  </Text>
                </View>

                {/* Status Timeline */}
                <View className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <View className="space-y-6">
                    {/* Step 1: Initialized */}
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-4 shadow-sm shadow-emerald-200">
                        <Check size={16} color="white" strokeWidth={3} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">Transfer Initialized</Text>
                        <Text className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Completed</Text>
                      </View>
                    </View>

                    {/* Step 2: Conversion */}
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-4">
                        <ActivityIndicator size="small" color="#059669" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">Off-ramping USDC</Text>
                        <Text className="text-[10px] text-emerald-600 uppercase font-bold tracking-tighter">In Progress</Text>
                      </View>
                    </View>

                    {/* Step 3: Payout */}
                    <View className="flex-row items-center opacity-40">
                      <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-4">
                        <View className="w-2 h-2 bg-gray-400 rounded-full" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">M-Pesa Payout</Text>
                        <Text className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Pending</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="mt-8 bg-blue-50 py-3 px-4 rounded-2xl flex-row items-center justify-center">
                  <Text className="text-blue-700 font-bold text-[11px] uppercase tracking-wider">⏱️ SECURING TRANSACTION...</Text>
                </View>
              </View>
            )}

            {processingStep === "completed" && (
              <View className="p-8 items-center">
                <View className="w-24 h-24 bg-emerald-100 rounded-full items-center justify-center mb-6">
                  <View className="w-16 h-16 bg-emerald-500 rounded-full items-center justify-center shadow-lg shadow-emerald-200">
                    <Check size={40} color="white" strokeWidth={3} />
                  </View>
                </View>

                <Text className="text-2xl font-bold text-center text-gray-900">
                  Withdrawal Successful
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2 px-4 leading-5">
                  Your funds are on their way to your M-Pesa account. You will receive a confirmation message shortly.
                </Text>

                <View className="bg-gray-50 w-full mt-8 rounded-2xl p-5 border border-gray-100">
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-xs text-gray-500 font-bold uppercase tracking-wider">Amount Sent</Text>
                    <Text className="text-sm font-black text-gray-900">{CURRENCY} {formatCurrency(amountKES)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-500 font-bold uppercase tracking-wider">Recipient No.</Text>
                    <Text className="text-sm font-black text-emerald-700">{formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsProcessing(false);
                    router.push("/wallet");
                  }}
                  className="w-full bg-emerald-600 py-4 rounded-2xl mt-8 shadow-sm active:bg-emerald-700 shadow-emerald-100"
                >
                  <Text className="text-center text-white font-bold">Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {processingStep === "failed" && (
              <View className="p-8 items-center">
                <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
                  <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center">
                    <Text className="text-4xl">❌</Text>
                  </View>
                </View>

                <Text className="text-2xl font-bold text-center text-gray-900">
                  Withdrawal Failed
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2 px-6">
                  We encountered an error while processing your withdrawal.
                </Text>

                <View className="bg-red-50 w-full mt-8 rounded-2xl p-5 border border-red-100">
                  <Text className="text-xs text-red-800 text-center font-medium leading-5">
                    Your funds are safe. If USDC was deducted and you didn't receive KES, please contact our support team immediately.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsProcessing(false);
                    setProcessingStep("idle");
                  }}
                  className="w-full bg-gray-900 py-4 rounded-2xl mt-8 active:bg-gray-800 shadow-md"
                >
                  <Text className="text-center text-white font-bold">Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}