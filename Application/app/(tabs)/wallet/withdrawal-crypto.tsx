import { pretiumSettlementAddress } from "@/constants/contractAddress";
import { chain, client, usdcContract } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import {
  CurrencyCode,
  disburseToMobileNumber,
  pollPretiumPaymentStatus,
  validatePhoneNumber
} from "@/lib/pretiumService";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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
  const { token } = useAuth();
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

  // Calculations
  const calculateTotalAmount = () =>
    (parseFloat(amount) || 0) * currentExchangeRate;
  const calculateFee = () => calculateTotalAmount() * 0.005;
  const calculateFinalAmount = () =>
    (calculateTotalAmount() - calculateFee()).toFixed(2);

  // Convert min/max limits from KES to USDC
  const minUSDC =
    limits && currentExchangeRate > 0
      ? (limits.min / currentExchangeRate).toFixed(2)
      : null;
  const maxUSDC =
    limits && currentExchangeRate > 0
      ? (limits.max / currentExchangeRate).toFixed(2)
      : null;

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

  // const transferUSDC = async (
  //   amount: string,
  //   receivingAddress: `0x${string}`
  // ) => {
  //   if (!token) {
  //     Alert.alert("Error", "Authentication required");
  //     return;
  //   }
  //   try {
  //     const transaction = prepareContractCall({
  //       contract: usdcContract,
  //       method: "function transfer(address to, uint256 amount)",
  //       params: [receivingAddress, toUnits(amount, 6)],
  //     });
  //     const { transactionHash } = await sendTransaction({
  //       account: activeAccount,
  //       transaction,
  //     });
  //     const receipt = await waitForReceipt({ client, chain, transactionHash });
  //     return receipt?.transactionHash;
  //   } catch (error) {
  //     console.log("Transfer error:", error);
  //     return null;
  //   }
  // };

  const handleInitialWithdraw = async () => {
    if (!amount.trim()) return Alert.alert("Error", "Please enter an amount");

    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(currentToken.balance.toString());

    if (amountNum <= 0) {
      return Alert.alert("Error", "Amount must be greater than 0");
    }

    if (amountNum > balanceNum) {
      return Alert.alert("Error", "Insufficient balance");
    }

    // Validate against min/max limits
    if (limits && currentExchangeRate > 0) {
      const localCurrencyAmount = amountNum * currentExchangeRate;
      if (localCurrencyAmount < limits.min) {
        return Alert.alert(
          "Error",
          `Minimum withdrawal is ${CURRENCY} ${formatCurrency(
            limits.min
          )} (${minUSDC} USDC)`
        );
      }
      if (localCurrencyAmount > limits.max) {
        return Alert.alert(
          "Error",
          `Maximum withdrawal is ${CURRENCY} ${formatCurrency(
            limits.max
          )} (${maxUSDC} USDC)`
        );
      }
    }

    if (!isValidPhoneNumber(phoneNumber))
      return Alert.alert("Error", "Please enter a valid M-Pesa number");

    setShowVerificationModal(true);
    handleVerifyPhoneNumber();
  };

  const handleConfirmedWithdraw = async () => {
    if (!token ) {
      Alert.alert("Error", "No token or wallet connected");
      return;
    }

    setShowVerificationModal(false);
    setIsProcessing(true);
    setProcessingStep("processing");

    try {
      // Step 1: Transfer USDC to Pretium settlement address
      // const txHash = await transferUSDC(amount, pretiumSettlementAddress);
      // if (!txHash) {
      //   throw new Error("Unable to send USDC");
      // }
      const txHash = "0x1234567890";

      // Step 2: Initiate M-Pesa offramp
      const offrampResult = await disburseToMobileNumber(
        "KES" as CurrencyCode,
        MOBILE_NETWORK,
        `0${phoneNumber}`,
        txHash,
        calculateFinalAmount(),
        amount,
        currentExchangeRate.toString(),
        token
      );

      if (!offrampResult.success) {
        throw new Error(offrampResult.error || "Failed to initiate withdrawal");
      }

      // Step 3: Poll for transaction completion
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

        // Step 4: Handle successful completion
        setProcessingStep("completed");

        setTimeout(() => {
          setIsProcessing(false);
          Alert.alert(
            "Success!",
            `${CURRENCY} ${calculateFinalAmount()} has been sent to ${formatPhoneNumber(
              KENYA_PHONE_CODE,
              phoneNumber
            )}`,
            [
              {
                text: "OK",
                onPress: () => {
                  setAmount("");
                  setPhoneNumber("");
                  router.push("/wallet");
                },
              },
            ]
          );
        }, 2000);
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
        setTimeout(() => {
          setIsProcessing(false);
          Alert.alert(errorTitle, errorMessage, [
            {
              text: "OK",
              onPress: () => router.push("/wallet"),
            },
          ]);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      setProcessingStep("failed");

      setTimeout(() => {
        setIsProcessing(false);
        Alert.alert(
          "Withdrawal Failed",
          error.message || "Failed to process M-Pesa withdrawal. Please try again.",
          [
            {
              text: "OK",
              onPress: () => setProcessingStep("idle"),
            },
          ]
        );
      }, 2000);
    }
  };

  const currentToken = tokens[0];
  const totalAmount = calculateTotalAmount().toFixed(2);
  const fee = calculateFee().toFixed(2);
  const finalAmount = calculateFinalAmount();

  const canConfirmWithdraw =
    !isVerifying &&
    !verificationError &&
    !!getMobileDetails(verifiedPhoneData);

  const isFormValid = () => {
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(currentToken.balance.toString());

    if (!amount.trim() || amountNum <= 0 || amountNum > balanceNum) {
      return false;
    }

    if (limits && currentExchangeRate > 0) {
      const localCurrencyAmount = amountNum * currentExchangeRate;
      if (
        localCurrencyAmount < limits.min ||
        localCurrencyAmount > limits.max
      ) {
        return false;
      }
    }

    return isValidPhoneNumber(phoneNumber);
  };

  return (
    <View className="flex-1 bg-gray-50">
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
          Withdraw USDC to M-Pesa instantly
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="flex-1 pb-20"
        >
          <View className="px-6 py-6 gap-5">
            {/* M-Pesa Info Card */}
            <View className="bg-downy-50 rounded-3xl p-5 shadow-lg border border-downy-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-2xl bg-green-50 items-center justify-center">
                    <Image
                      source={require("@/assets/images/mpesa.png")}
                      className="w-16 h-16"
                      resizeMode="contain"
                    />
                  </View>

                  <View className="ml-4">
                    <Text className="text-lg font-bold text-gray-900">
                      M-Pesa
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Safaricom Kenya
                    </Text>
                  </View>
                </View>
              </View>
            </View>


            {/* M-Pesa Number Input */}
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

            {/* Amount Input Section */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Withdrawal Amount
              </Text>
              <View className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9CA3AF"
                  className="text-center text-4xl font-bold text-gray-900"
                />
                <Text className="text-center text-xs font-medium text-gray-500 mt-2">
                  USDC
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-4">
                <View className="flex-1">
                  <Text className="text-sm text-gray-600">
                    Available:{" "}
                    <Text className="font-semibold">
                      {currentToken.balance} USDC
                    </Text>
                  </Text>
                  {limits && minUSDC && maxUSDC && (
                    <Text className="text-xs text-amber-600 mt-1">
                      Limits: {minUSDC} - {maxUSDC} USDC
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const balanceNum = parseFloat(
                      currentToken.balance.toString()
                    );
                    const maxLimitNum = maxUSDC
                      ? parseFloat(maxUSDC)
                      : Infinity;
                    const maxAmount = Math.min(balanceNum, maxLimitNum);
                    setAmount(maxAmount.toFixed(2));
                  }}
                  className="bg-downy-100 px-4 py-2 rounded-lg border border-downy-300"
                  activeOpacity={0.7}
                >
                  <Text className="text-downy-700 text-xs font-bold">
                    Max
                  </Text>
                </TouchableOpacity>
              </View>
              {parseFloat(amount) > 0 && (
                <>
                  <View className="my-5">
                    <View className="flex-1 h-px bg-gray-200" />
                  </View>
                  <View className="mb-4 flex-row justify-between items-center">
                    <Text className="text-sm font-semibold text-emerald-800">
                      Exchange Rate
                    </Text>
                    <Text className="text-sm font-bold text-emerald-700">
                      1 USDC = {currentExchangeRate.toFixed(2)} {CURRENCY}
                    </Text>
                  </View>
                  {(limits && Number(finalAmount) > limits?.max) ||
                    (limits && Number(finalAmount) < limits?.min && (
                      <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-2">
                        <Text className="text-xs text-amber-800 text-center">
                          💰 Limits: {CURRENCY}{" "}
                          {formatCurrency(limits.min)} -{" "}
                          {formatCurrency(limits.max)}
                        </Text>
                      </View>
                    ))}
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600">
                        {amount} USDC converts to
                      </Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {CURRENCY} {formatCurrency(totalAmount)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm text-gray-600">
                        Service Fee (0.5%)
                      </Text>
                      <Text className="text-sm font-semibold text-amber-600">
                        - {CURRENCY} {formatCurrency(fee)}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-4 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                    <Text className="text-xs text-blue-600 font-semibold mb-2 text-center">
                      YOU'LL RECEIVE
                    </Text>
                    <Text className="text-3xl font-bold text-blue-600 text-center">
                      {CURRENCY} {formatCurrency(finalAmount)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleInitialWithdraw}
              disabled={!isFormValid()}
              className={`w-full py-4 rounded-2xl shadow-lg ${isFormValid() ? "bg-downy-600" : "bg-gray-300"
                }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-center font-bold text-lg ${isFormValid() ? "text-white" : "text-gray-500"
                  }`}
              >
                Withdraw to M-Pesa
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
                              {amount} USDC
                            </Text>
                            <Text className="text-sm text-blue-800">
                              ≈ {CURRENCY} {formatCurrency(finalAmount)}{" "}
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
                  Sending {CURRENCY} {finalAmount} to{" "}
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
                  KES {finalAmount} sent successfully
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
