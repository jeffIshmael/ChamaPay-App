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
      const transactionCode = offrampResult.transactionCode;

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
            onPress={() => router.push("/wallet")}
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
        animationType="slide"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="bg-white rounded-3xl p-6 w-full shadow-2xl"
            style={{ maxWidth: 400 }}
          >
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              Verify M-Pesa Number
            </Text>
            {isVerifying ? (
              <View className="items-center py-4">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="mt-3 text-sm text-gray-700">
                  Verifying your M-Pesa details...
                </Text>
              </View>
            ) : verificationError ? (
              <View className="py-3">
                <Text className="text-sm text-red-600 text-center mb-3">
                  {verificationError}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowVerificationModal(false)}
                  className="mt-2 py-3 rounded-xl bg-gray-200"
                  activeOpacity={0.8}
                >
                  <Text className="text-center font-semibold text-gray-800">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!!getMobileDetails(verifiedPhoneData) && (
                  <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                    {(() => {
                      const md = getMobileDetails(verifiedPhoneData);
                      if (!md) return null;
                      return (
                        <>
                          <Text className="text-sm text-gray-600 mb-1">
                            Phone Number
                          </Text>
                          <Text className="text-base font-semibold text-gray-900 mb-3">
                            {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                          </Text>
                          <Text className="text-sm text-gray-600 mb-1">
                            Account Name
                          </Text>
                          <Text className="text-base font-semibold text-gray-900 mb-3">
                            {md.public_name || "—"}
                          </Text>
                          <Text className="text-sm text-gray-600 mb-1">
                            Mobile Network
                          </Text>
                          <Text className="text-base font-semibold text-gray-900 mb-3">
                            {MOBILE_NETWORK}
                          </Text>
                          <Text className="text-sm text-blue-700 mb-1">
                            Amount
                          </Text>
                          <View className="flex-row items-center gap-4">
                            <Text className="text-lg font-bold text-blue-700 mb-1">
                              {CURRENCY} {formatCurrency(amountKES)}
                            </Text>
                            <Text className="text-sm text-blue-800">
                              ≈ {parseFloat(usdcAmount).toFixed(4)} USDC
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                )}

                <View className="flex-row gap-3 mt-2">
                  <TouchableOpacity
                    onPress={() => setShowVerificationModal(false)}
                    className="flex-1 py-3 px-1 rounded-xl border border-gray-300"
                    activeOpacity={0.8}
                  >
                    <Text className="text-center font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmedWithdraw}
                    disabled={!canConfirmWithdraw}
                    className={`flex-1 py-3 px-1 rounded-xl ${canConfirmWithdraw ? "bg-downy-600" : "bg-gray-300"
                      }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-center font-semibold ${canConfirmWithdraw ? "text-white" : "text-gray-600"
                        }`}
                    >
                      Confirm Withdrawal
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Processing Modal - Keep inline as it's specific to withdraw */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View
            className="bg-white rounded-3xl p-8 w-full shadow-2xl"
            style={{ maxWidth: 400 }}
          >
            {processingStep === "processing" && (
              <>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xl font-bold text-center mt-4 text-gray-900">
                  Processing Withdrawal
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  Sending {CURRENCY} {formatCurrency(amountKES)} to{" "}
                  {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                </Text>
                <View className="mt-4 bg-blue-50 p-3 rounded-xl">
                  <Text className="text-xs text-blue-800 text-center">
                    ⏱️ This may take a few moments...
                  </Text>
                </View>

                {/* Progress indicators */}
                <View className="mt-6 space-y-3">
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center mr-3">
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                    <Text className="text-sm text-gray-700">
                      USDC transferred
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#059669" />
                    <Text className="text-sm text-gray-700 ml-3">
                      Converting to KES
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center mr-3">
                      <Text className="text-xs text-gray-500">3</Text>
                    </View>
                    <Text className="text-sm text-gray-500">
                      Sending to M-Pesa
                    </Text>
                  </View>
                </View>
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
                  KES {formatCurrency(amountKES)} sent successfully
                </Text>
                <View className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <Text className="text-xs text-emerald-800 text-center">
                    ✓ Withdrawal completed to{" "}
                    {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                  </Text>
                </View>
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
                  Withdrawal failed. Please try again.
                </Text>
                <View className="mt-4 bg-red-50 p-4 rounded-xl border border-red-200">
                  <Text className="text-xs text-red-800 text-center">
                    If funds were deducted, please contact support
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}