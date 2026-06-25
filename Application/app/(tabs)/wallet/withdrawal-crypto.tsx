import { useAuth } from "@/Contexts/AuthContext";
import {
  CurrencyCode,
  disburseToMobileNumber,
  extractTransactionCode,
  pollPretiumPaymentStatus,
  validatePhoneNumber,
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
  View,
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
import { withdrawalToMpesaFee } from "@/Utils/transactionFeeUtils";

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
  const [amountUSDC, setAmountUSDC] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneTouched, setIsPhoneTouched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [withdrawalProgressStep, setWithdrawalProgressStep] = useState(1);

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
    PRETIUM_TRANSACTION_LIMIT["KE"] || null,
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

  // Calculate available balance in USDC
  const balanceInUSDC = parseFloat(USDCBalance as string) || 0;

  // Calculations - now based on USDC input
  // User gets exactly what they input in USDC converted to KES, fee is added on top in USDC
  // const calculateFeeUSDC = () => parseFloat(amountUSDC || "0") * 0.005;

  const calculateTotalDeductionUSDC = () => {
    const usdcAmountVal = parseFloat(amountUSDC) || 0;
    return usdcAmountVal;
  };

  const calculatePayoutKES = () => {
    const usdcVal = parseFloat(amountUSDC) || 0;
    return usdcVal * currentExchangeRate;
  };

  const usdcAmount = calculateTotalDeductionUSDC().toFixed(6);
  const finalAmountKES = calculatePayoutKES();

  // Verify M-Pesa number
  const handleVerifyPhoneNumber = async () => {
    if (!token) {
      ToastAndroid.show( "Authentication required", ToastAndroid.SHORT);
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
        token,
      );

      if (!validation.success) {
        setVerificationError(
          validation.error || "Failed to validate M-Pesa number",
        );
      } else {
        const md = getMobileDetails(validation);
        if (!md) {
          setVerificationError(
            "Verification succeeded but details were missing. Please try again.",
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
    if (!amountUSDC.trim())
      return ToastAndroid.show( "Please enter an amount", ToastAndroid.SHORT);

    const usdcAmountNum = parseFloat(amountUSDC);
    const totalDeductionUSDC = calculateTotalDeductionUSDC();
    const payoutKES = calculatePayoutKES();

    if (usdcAmountNum <= 0) {
      return ToastAndroid.show( "Amount must be greater than 0", ToastAndroid.SHORT);
    }

    if (usdcAmountNum < 110 / currentExchangeRate) {
      return ToastAndroid.show(
        `Minimum withdrawal is ${formatCurrency(110 / currentExchangeRate)} USDC.`,
        ToastAndroid.SHORT,
      );
    }

    // Validate against min/max limits in KES
    if (limits) {
      if (payoutKES < limits.min) {
        const minUSDC = limits.min / currentExchangeRate;
        return ToastAndroid.show(
          `Minimum withdrawal is ${minUSDC.toFixed(2)} USDC (approx. KES ${formatCurrency(limits.min)})`,
          ToastAndroid.SHORT,
        );
      }
      if (payoutKES > limits.max) {
        const maxUSDC = limits.max / currentExchangeRate;
        return ToastAndroid.show(
          `Maximum withdrawal is ${maxUSDC.toFixed(2)} USDC (approx. KES ${formatCurrency(limits.max)})`,
          ToastAndroid.SHORT,
        );
      }
    }

    if (!isValidPhoneNumber(phoneNumber))
      return ToastAndroid.show( "Please enter a valid M-Pesa number", ToastAndroid.SHORT);

    setShowVerificationModal(true);
    handleVerifyPhoneNumber();
  };

  const handleConfirmedWithdraw = async () => {
    if (!token) {
      ToastAndroid.show( "No token or wallet connected", ToastAndroid.SHORT);
      return;
    }

    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");
    setWithdrawalProgressStep(1);

    try {
      const payoutKES = calculatePayoutKES();
      const feeKES = withdrawalToMpesaFee(payoutKES).toFixed(2);
      const totalDeductionKES = payoutKES;

      console.log("totalDeductionKES", totalDeductionKES);
      console.log("usdcAmount", usdcAmount);
      console.log("currentExchangeRate", currentExchangeRate);
      console.log("feeKES", feeKES);

      const offrampResult = await disburseToMobileNumber(
        "KES" as CurrencyCode,
        MOBILE_NETWORK,
        `0${phoneNumber}`,
        totalDeductionKES.toFixed(2), // Total KES deduction (payout + fee)
        usdcAmount, // Total USDC deduction
        currentExchangeRate.toString(),
        feeKES, // KES fee
        token,
      );

      if (!offrampResult.success) {
        throw new Error(offrampResult.error || "Failed to initiate withdrawal");
      }

      // Poll for transaction completion
      const transactionCode = extractTransactionCode(offrampResult);

      if (!transactionCode) {
        throw new Error("No transaction code received");
      }

      setWithdrawalProgressStep(2);

      try {
        const finalResult = await pollPretiumPaymentStatus(
          transactionCode,
          token,
          (status) => {
            console.log("Withdrawal status update:", status);
            switch (status) {
              case "pending":
                setWithdrawalProgressStep(2);
                break;
              case "processing":
              case "pending_transfer":
                setWithdrawalProgressStep(3);
                break;
              case "completed":
              case "complete":
                setWithdrawalProgressStep(3);
                setProcessingStep("completed");
                break;
            }
          },
          60,
          2000,
        );

        // Handle successful completion
        setProcessingStep("completed");
        setIsProcessing(false);
        ToastAndroid.show(
          `Successfully withdrew ${amountUSDC} USDC to M-Pesa`,
          ToastAndroid.SHORT,
        );
        setAmountUSDC("");
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
        error.message ||
          "Failed to process M-Pesa withdrawal. Please try again.",
        ToastAndroid.SHORT,
      );
      setProcessingStep("idle");
    }
  };

  const canConfirmWithdraw =
    !isVerifying && !verificationError && !!getMobileDetails(verifiedPhoneData);

  const isFormValid = () => {
    const usdcAmountNum = parseFloat(amountUSDC);
    const totalDeductionUSDC = calculateTotalDeductionUSDC();
    const payoutKES = calculatePayoutKES();

    if (
      !amountUSDC.trim() ||
      usdcAmountNum <= 0 ||
      totalDeductionUSDC > balanceInUSDC
    ) {
      return false;
    }

    if (limits) {
      if (payoutKES < limits.min || payoutKES > limits.max) {
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
              setAmountUSDC("");
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
                M-Pesa withdrawal services are only available in Kenya. Please
                use the "Send" feature to transfer to an external crypto wallet.
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
                <Text className="text-amber-700 font-semibold text-center">
                  Go Back
                </Text>
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
                  <Text className="text-lg font-bold text-gray-900">
                    M-Pesa
                  </Text>
                  <Text className="text-xs text-gray-500">Safaricom Kenya</Text>
                </View>
              </View>

              {/* --- Phone Number Input --- */}
              <View className="bg-white px-5 py-6 rounded-2xl shadow-sm border border-gray-200">
                <Text className="text-base font-bold text-gray-900 mb-1">
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
                    onBlur={() => setIsPhoneTouched(true)}
                    className="flex-1 text-base"
                  />
                </View>
                {isPhoneTouched &&
                  phoneNumber &&
                  !isValidPhoneNumber(phoneNumber) && (
                    <Text className="text-red-500 text-xs mt-2">
                      Please enter a valid Kenyan phone number
                    </Text>
                  )}
              </View>

              {/* --- Amount Input Section --- */}
              <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-bold text-gray-900">
                    Withdrawal Amount
                  </Text>
                  <Text className="text-xs font-bold text-gray-600">
                    1 USDC = {currentExchangeRate.toFixed(2)} KES
                  </Text>
                </View>

                <View className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50 mb-4">
                  <TextInput
                    value={amountUSDC}
                    onChangeText={setAmountUSDC}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    className="text-center text-4xl font-bold text-gray-900"
                  />
                  <Text className="text-center text-xs font-medium text-gray-500 mt-2">
                    USDC
                  </Text>
                </View>

                {/* Available Balance & Max Button */}
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-sm text-gray-600">
                      Available:{" "}
                      <Text className="font-semibold">
                        {balanceInUSDC.toFixed(3)} USDC
                      </Text>
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Min withdrawal: {(110 / currentExchangeRate).toFixed(2)}{" "}
                      USDC
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setAmountUSDC(balanceInUSDC.toFixed(4));
                    }}
                    className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300"
                    activeOpacity={0.7}
                  >
                    <Text className="text-downy-700 text-xs font-bold">
                      Max
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Fee & Total */}
                {parseFloat(amountUSDC) >= 110 / currentExchangeRate ? (
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2 space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">
                        Amount in KES
                      </Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        KES {formatCurrency(finalAmountKES.toFixed(2))}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-600">Service Fee</Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        - {withdrawalToMpesaFee(finalAmountKES).toFixed(2)} KES
                      </Text>
                    </View>
                    <View className="flex-1 h-px bg-gray-300 my-4" />
                    <View className="flex-row justify-between">
                      <Text className="text-md font-bold text-gray-900">
                        You will receive
                      </Text>
                      <Text className="text-md font-bold text-gray-900">
                        KES{" "}
                        {formatCurrency(
                          Number(finalAmountKES.toFixed(2)) -
                            withdrawalToMpesaFee(finalAmountKES),
                        )}
                      </Text>
                    </View>
                    {/* <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-500">Total KES Deduction</Text>
                      <Text className="text-xs text-gray-500">
                        KES {formatCurrency((parseFloat(usdcAmount) * currentExchangeRate).toFixed(2))}
                      </Text>
                    </View> */}
                  </View>
                ) : parseFloat(amountUSDC) < 110 / currentExchangeRate &&
                  parseFloat(amountUSDC) > 0 ? (
                  <View className=" p-2 rounded-xl border border-yellow-200 mb-2 space-y-2">
                    <Text className="text-sm text-yellow-600">
                      Minimum withdrawal is{" "}
                      {formatCurrency(110 / currentExchangeRate)} USDC
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleInitialWithdraw}
                disabled={!isFormValid()}
                className={`w-full py-4 rounded-2xl shadow-lg ${isFormValid() ? "bg-downy-600" : "bg-gray-300"}`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-center font-bold text-lg ${isFormValid() ? "text-white" : "text-gray-500"}`}
                >
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
        <View className="flex-1 bg-downy-950/80 items-center justify-center px-6">
          <View
            className="bg-white rounded-[32px] w-full shadow-2xl overflow-hidden border border-downy-100"
            style={{ maxWidth: 400 }}
          >
            {/* Modal Header */}
            <View className="bg-downy-50/80 py-7 px-6 border-b border-downy-100/50 items-center">
              <View className="w-18 h-18 bg-white rounded-3xl items-center justify-center shadow-md mb-3 border border-downy-100/30">
                <Image
                  source={require("@/assets/images/mpesa.png")}
                  className="w-14 h-14"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-2xl font-black text-downy-900 tracking-tight">
                Confirm Details
              </Text>
              <Text className="text-[11px] text-downy-600 mt-1 uppercase tracking-widest font-black">
                M-Pesa Cashout Verification
              </Text>
            </View>

            <View className="p-6">
              {isVerifying ? (
                <View className="items-center py-10">
                  <ActivityIndicator size="large" color="#1c8584" />
                  <Text className="mt-4 text-sm font-bold text-downy-800">
                    Verifying recipient information...
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Checking phone registration status
                  </Text>
                </View>
              ) : verificationError ? (
                <View className="items-center py-6">
                  <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4 border border-red-200">
                    <Text className="text-3xl">⚠️</Text>
                  </View>
                  <Text className="text-base font-bold text-red-600 text-center px-2">
                    Verification Failed
                  </Text>
                  <Text className="text-sm text-gray-500 text-center font-medium px-4 mt-2 leading-5">
                    {verificationError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowVerificationModal(false)}
                    className="mt-8 w-full py-4 rounded-2xl bg-gray-100 active:bg-gray-200 border border-gray-200"
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
                    <View className="gap-4">
                      {/* Recipient Card */}
                      <View className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                          RECIPIENT ACCOUNT
                        </Text>

                        <View className="flex-row items-center justify-between mb-3.5 pb-3 border-b border-gray-200/50">
                          <Text className="text-sm text-gray-500">Name</Text>
                          <Text className="text-sm font-black text-gray-900">
                            {getMobileDetails(verifiedPhoneData)?.public_name ||
                              "—"}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-500">
                            Phone Number
                          </Text>
                          <Text className="text-sm font-black text-downy-700">
                            {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                          </Text>
                        </View>
                      </View>

                      {/* Amount Details */}
                      <View className="bg-downy-50/50 rounded-2xl p-5 border border-downy-100/50 my-2 shadow-sm">
                        <Text className="text-[10px] font-black text-downy-600/70 uppercase tracking-widest mb-3">
                          TRANSACTION VALUE
                        </Text>

                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-sm text-gray-600 font-medium">
                            You Receive
                          </Text>
                          <Text className="text-xl font-black text-downy-800">
                            KES {formatCurrency(finalAmountKES.toFixed(2))}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between pt-2 border-t border-downy-100/30">
                          <Text className="text-xs text-gray-500 font-medium font-semibold">
                            Total USDC Deduction
                          </Text>
                          <Text className="text-xs font-bold text-gray-800">
                            {parseFloat(usdcAmount).toFixed(4)} USDC
                          </Text>
                        </View>
                      </View>

                      {/* Info Alert */}
                      <View className="bg-amber-50 p-3.5 rounded-2xl flex-row items-center mb-6 border border-amber-100">
                        <Text className="text-xl mr-3">⚡</Text>
                        <Text className="text-[11px] text-amber-800 font-medium flex-1 leading-4">
                          Funds will be disbursed instantly to the registered
                          mobile line verified above.
                        </Text>
                      </View>
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setShowVerificationModal(false)}
                      className="flex-1 py-4 rounded-2xl border border-gray-300 active:bg-gray-50"
                      activeOpacity={0.8}
                    >
                      <Text className="text-center font-bold text-gray-600">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleConfirmedWithdraw}
                      disabled={!canConfirmWithdraw}
                      className={`flex-[1.5] py-4 rounded-2xl shadow-md ${
                        canConfirmWithdraw
                          ? "bg-downy-600 shadow-downy-100 active:bg-downy-700"
                          : "bg-gray-200"
                      }`}
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`text-center font-bold ${
                          canConfirmWithdraw ? "text-white" : "text-gray-400"
                        }`}
                      >
                        Confirm Cashout
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
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="bg-white rounded-3xl w-full shadow-2xl overflow-hidden"
            style={{ maxWidth: 400 }}
          >
            {processingStep === "processing" && (
              <View className="p-7">
                <View className="items-center mb-7">
                  <View className="w-16 h-16 rounded-full items-center justify-center bg-downy-50 border border-downy-100">
                    <ActivityIndicator size="large" color="#1c8584" />
                  </View>
                  <Text className="text-xl font-bold text-center mt-5 text-gray-900">
                    Processing Withdrawal
                  </Text>
                  <Text className="text-sm text-gray-500 text-center mt-2 px-2 leading-5">
                    Sending{" "}
                    <Text className="text-gray-800 font-semibold">
                      {amountUSDC} USDC
                    </Text>{" "}
                    (≈ KES {formatCurrency(finalAmountKES.toFixed(2))}) to{" "}
                    {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                  </Text>
                </View>

                {/* Progress Steps */}
                <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  {[
                    {
                      step: 1,
                      title: "Transfer request created",
                      doneLabel: "Done",
                      activeLabel: "Creating",
                    },
                    {
                      step: 2,
                      title: "Converting USDC to KES",
                      doneLabel: "Done",
                      activeLabel: "Converting",
                    },
                    {
                      step: 3,
                      title: "M-Pesa payout",
                      doneLabel: "Sent",
                      activeLabel: "Sending",
                    },
                  ].map((item, index, arr) => {
                    const isDone = withdrawalProgressStep > item.step;
                    const isActive = withdrawalProgressStep === item.step;
                    const isPending = withdrawalProgressStep < item.step;

                    return (
                      <View key={item.step}>
                        <View className="flex-row items-center">
                          <View
                            className={`w-7 h-7 rounded-full items-center justify-center ${
                              isDone
                                ? "bg-downy-600"
                                : isActive
                                  ? "bg-downy-100 border border-downy-300"
                                  : "bg-gray-200"
                            }`}
                          >
                            {isDone ? (
                              <Check size={14} color="white" strokeWidth={3} />
                            ) : isActive ? (
                              <ActivityIndicator size="small" color="#1c8584" />
                            ) : (
                              <View className="w-2 h-2 rounded-full bg-gray-400" />
                            )}
                          </View>
                          <View className="flex-1 ml-3">
                            <Text
                              className={`text-sm font-semibold ${
                                isPending ? "text-gray-400" : "text-gray-800"
                              }`}
                            >
                              {item.title}
                            </Text>
                            <Text
                              className={`text-[10px] uppercase tracking-wide mt-0.5 font-semibold ${
                                isDone
                                  ? "text-downy-600"
                                  : isActive
                                    ? "text-downy-600"
                                    : "text-gray-400"
                              }`}
                            >
                              {isDone
                                ? item.doneLabel
                                : isActive
                                  ? item.activeLabel
                                  : "Waiting"}
                            </Text>
                          </View>
                        </View>
                        {index < arr.length - 1 && (
                          <View
                            className={`w-0.5 h-5 ml-[13px] my-1 ${
                              isDone ? "bg-downy-400" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>

                <Text className="text-xs text-gray-400 text-center mt-6">
                  This usually takes under a minute. Please keep the app open.
                </Text>
              </View>
            )}

            {processingStep === "completed" && (
              <View className="p-8 items-center">
                <View className="w-24 h-24 bg-downy-100 rounded-full items-center justify-center mb-6 border border-downy-200">
                  <View className="w-18 h-18 bg-downy-600 rounded-full items-center justify-center shadow-lg shadow-downy-200">
                    <Check size={40} color="white" strokeWidth={3} />
                  </View>
                </View>

                <Text className="text-2xl font-black text-center text-downy-900 tracking-tight">
                  Withdrawal Complete!
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2 px-4 leading-5">
                  Your transaction has processed successfully. The funds will be
                  credited to your M-Pesa account shortly.
                </Text>

                <View className="bg-downy-50/50 w-full mt-8 rounded-2xl p-5 border border-downy-100 shadow-sm">
                  <View className="flex-row justify-between mb-3 pb-3 border-b border-downy-100/30">
                    <Text className="text-xs text-downy-600 font-bold uppercase tracking-wider">
                      Amount Sent
                    </Text>
                    <Text className="text-sm font-black text-downy-900">
                      {amountUSDC} USDC (≈ KES{" "}
                      {formatCurrency(finalAmountKES.toFixed(2))})
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-downy-600 font-bold uppercase tracking-wider">
                      Recipient Line
                    </Text>
                    <Text className="text-sm font-black text-downy-850">
                      {formatPhoneNumber(KENYA_PHONE_CODE, phoneNumber)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsProcessing(false);
                    router.push("/wallet");
                  }}
                  className="w-full bg-downy-600 py-4.5 rounded-2xl mt-8 shadow-md active:bg-downy-700 shadow-downy-100"
                >
                  <Text className="text-center text-white font-bold text-base">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {processingStep === "failed" && (
              <View className="p-8 items-center">
                <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6 border border-red-100">
                  <View className="w-18 h-18 bg-red-500 rounded-full items-center justify-center shadow-lg shadow-red-200">
                    <Text className="text-3xl text-white font-black">✕</Text>
                  </View>
                </View>

                <Text className="text-2xl font-black text-center text-gray-900 tracking-tight">
                  Withdrawal Failed
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2 px-6 leading-5">
                  We encountered an unexpected error processing your payout
                  offramp.
                </Text>

                <View className="bg-red-50/85 w-full mt-8 rounded-2xl p-5 border border-red-150">
                  <Text className="text-xs text-red-800 text-center font-bold leading-5">
                    Your digital assets remain completely safe. If your USDC
                    balance was debited and payout didn't arrive, contact
                    support immediately.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsProcessing(false);
                    setProcessingStep("idle");
                  }}
                  className="w-full bg-gray-900 py-4.5 rounded-2xl mt-8 active:bg-gray-800 shadow-md"
                >
                  <Text className="text-center text-white font-bold text-base">
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
