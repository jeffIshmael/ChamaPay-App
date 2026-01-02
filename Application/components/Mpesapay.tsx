import React, { useState, useEffect } from "react";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
} from "react-native";
import { useAuth } from "@/Contexts/AuthContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import {
  agentDeposit,
  CurrencyCode,
  getExchangeRate,
  pollPretiumPaymentStatus,
  pretiumOnramp,
} from "@/lib/pretiumService";
import { Quote } from "@/app/(tabs)/wallet";

const MPesaPay = ({
  chamaName,
  chamaBlockchainId,
}: {
  chamaName: string;
  chamaBlockchainId: number;
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [kesAmount, setKesAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "input" | "payment_sent" | "payment_received" | "sending_usdc" | "completed"
  >("input");
  const [statusMessage, setStatusMessage] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [txHash, setTxHash] = useState("");
  const { token } = useAuth();
  const [exchangeRate, setExchangeRate] = useState<Quote | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const { data: exchangeRateData } = useExchangeRate("KES");

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  // Fetch exchange rate on mount and ensure we have the latest rate
  useEffect(() => {
    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        // Prioritize fetching fresh rate from API
        const rate = await getExchangeRate("KES" as CurrencyCode);
        if (rate) {
          setExchangeRate(rate);
        } else if (exchangeRateData) {
          // Fallback to hook data if API fails
          setExchangeRate(exchangeRateData);
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        // Fallback to hook data on error
        if (exchangeRateData) {
          setExchangeRate(exchangeRateData);
        }
      } finally {
        setLoadingRate(false);
      }
    };

    fetchRate();

    // Refresh rate every 30 seconds to ensure accuracy
    const interval = setInterval(fetchRate, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update from hook data if it changes and we don't have a rate yet
  useEffect(() => {
    if (!exchangeRate && exchangeRateData && !loadingRate) {
      setExchangeRate(exchangeRateData);
    }
  }, [exchangeRateData, exchangeRate, loadingRate]);

  // Calculate USDC amount when KES changes
  useEffect(() => {
    if (!exchangeRate) return;
    if (kesAmount && parseFloat(kesAmount) > 0) {
      // Calculate 0.5% tx fee from KES amount
      const txFee = parseFloat(kesAmount) * 0.005;
      // Amount after fee deduction
      const kesAfterFee = parseFloat(kesAmount) - txFee;
      // Convert to USDC
      const usdc = kesAfterFee / exchangeRate.exchangeRate.selling_rate;
      setUsdcAmount(usdc.toFixed(3));
    } else {
      setUsdcAmount("0.00");
    }
  }, [kesAmount, exchangeRate]);

  // Pulse animation for loading states
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  // Slide in animation for status card
  useEffect(() => {
    if (currentStep !== "input") {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [currentStep]);

  const handleOnramp = async () => {
    // Validation
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid phone number (9 digits)"
      );
      return;
    }

    if (!kesAmount || parseFloat(kesAmount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (parseFloat(kesAmount) < 10) {
      Alert.alert(
        "Amount Too Low",
        `Minimum amount is 10 ${exchangeRate?.currencyCode || "KES"}`
      );
      return;
    }

    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    if (!exchangeRate) {
      Alert.alert(
        "Exchange Rate Unavailable",
        "Unable to fetch current exchange rate. Please try again."
      );
      return;
    }

    setLoading(true);
    setCurrentStep("payment_sent");
    setStatusMessage("Initiating payment request...");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;

      // Calculate 0.5% tx fee from KES amount
      const txFee = Number(kesAmount) * 0.005;
      const kesAfterFee = Number(kesAmount) - txFee;

      // Step 1: Initiate onramp - send only the original amount (before fee)
      const result = await pretiumOnramp(
        fullPhoneNumber,
        Number(kesAmount),
        exchangeRate.exchangeRate.selling_rate,
        Number(usdcAmount),
        false,
        token,
        txFee
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment.");
      }

      // Step 2: Show M-Pesa prompt message
      setStatusMessage("Check your phone for M-Pesa prompt...");

      // Step 3: Start polling for status
      try {
        const onrampResult = await pollPretiumPaymentStatus(
          result.transactionCode,
          token,
          (status, data) => {
            console.log("Status update:", status, data);

            switch (status) {
              case "pending":
                setStatusMessage("Waiting for payment confirmation...");
                break;
              case "pending_transfer":
              case "processing":
                setCurrentStep("payment_received");
                setStatusMessage("Payment received! Processing...");
                break;
              case "completed":
              case "complete":
                setCurrentStep("payment_received");
                setStatusMessage("Payment confirmed!");
                break;
            }
          }
        );

        setCurrentStep("sending_usdc");
        setStatusMessage("Sending USDC to your chama...");

        // since the onramp is okay, trigger the agent to deposit
        const txResult = await agentDeposit(
          result.transactionCode,
          chamaBlockchainId,
          usdcAmount,
          token
        );

        if (!txResult.success) {
          throw new Error(txResult.error || "Failed to deposit for user.");
        }
        const txHashResult = txResult.details;
        setTxHash(txHashResult);

        // Onramp completed successfully
        setLoading(false);
        setCurrentStep("completed");
        setStatusMessage("Payment completed successfully!");

        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        setTimeout(() => {
          Alert.alert(
            "Payment Successful! 🎉",
            `You paid ${usdcAmount} USDC to ${chamaName} chama.\n\nBlockchain TX: ${txHashResult.substring(
              0,
              10
            )}...`,
            [
              {
                text: "Done",
                onPress: () => {
                  // Reset form
                  setPhoneNumber("");
                  setKesAmount("");
                  setUsdcAmount("0.00");
                  setCurrentStep("input");
                  setStatusMessage("");
                  setReceiptNumber("");
                  setTxHash("");
                },
              },
            ]
          );
        }, 2000);
      } catch (pollError: any) {
        setLoading(false);
        setCurrentStep("input");

        let errorTitle = "Payment Failed";
        let errorMessage = "The payment could not be completed.";

        if (pollError.status === "cancelled") {
          errorTitle = "Payment Cancelled";
          errorMessage = "You cancelled the payment request.";
        } else if (pollError.status === "timeout") {
          errorTitle = "Payment Timeout";
          errorMessage = "The payment request timed out. Please try again.";
        } else if (pollError.resultDesc) {
          errorMessage = pollError.resultDesc;
        } else if (pollError.message) {
          errorMessage = pollError.message;
        }

        Alert.alert(errorTitle, errorMessage, [
          {
            text: "OK",
            onPress: () => {
              setStatusMessage("");
            },
          },
        ]);
      }
    } catch (error: any) {
      setLoading(false);
      setCurrentStep("input");

      Alert.alert(
        "Error",
        error.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  const isFormValid =
    phoneNumber.length >= 9 &&
    kesAmount &&
    parseFloat(kesAmount) >= 10 &&
    !loadingRate &&
    exchangeRate !== null;

  const renderStatusIndicator = () => {
    if (currentStep === "input") return null;

    const steps = [
      { id: "payment_sent", label: "M-Pesa", icon: "📱" },
      { id: "payment_received", label: "Received", icon: "✓" },
      { id: "sending_usdc", label: "Sending", icon: "💸" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
    const completedStepIndex =
      currentStep === "completed" ? steps.length : currentStepIndex;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
        className="mb-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl p-4 shadow-lg border border-green-100"
      >
        {/* Progress Steps */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted =
                index < completedStepIndex || currentStep === "completed";

              return (
                <React.Fragment key={step.id}>
                  {/* Step Circle */}
                  <View className="items-center" style={{ flex: 1 }}>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            scale: isActive
                              ? pulseAnim
                              : isCompleted
                                ? 1.05
                                : 1,
                          },
                        ],
                      }}
                      className={`w-12 h-12 rounded-full items-center justify-center shadow-md ${
                        isCompleted
                          ? "bg-green-500"
                          : isActive
                            ? "bg-blue-500"
                            : "bg-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <Text className="text-xl">✓</Text>
                      ) : (
                        <Text className="text-lg">{step.icon}</Text>
                      )}
                    </Animated.View>
                    <Text
                      className={`text-xs mt-1.5 font-medium ${
                        isActive || isCompleted
                          ? "text-gray-800"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>

                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <View
                      className="flex-1 items-center"
                      style={{ marginTop: -20 }}
                    >
                      <View
                        className={`h-1 w-full ${
                          index < completedStepIndex ||
                          currentStep === "completed"
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Status Message */}
        <View className="items-center bg-white rounded-xl p-4 shadow-sm">
          {loading && currentStep !== "completed" && (
            <View className="mb-2">
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          )}

          <Animated.View
            style={{
              transform: [
                { scale: currentStep === "completed" ? scaleAnim : 1 },
              ],
            }}
          >
            <Text className="text-base font-bold text-gray-800 text-center">
              {statusMessage}
            </Text>
          </Animated.View>

          {currentStep === "payment_sent" && (
            <View className="mt-2 bg-blue-50 rounded-lg p-2.5 w-full">
              <Text className="text-xs text-blue-800 text-center font-medium">
                📲 Enter your M-Pesa PIN on your phone
              </Text>
            </View>
          )}

          {currentStep === "payment_received" && (
            <View className="mt-2 bg-green-50 rounded-lg p-2.5 w-full">
              <Text className="text-xs text-green-800 text-center font-medium">
                ✓ Payment confirmed! Processing transfer...
              </Text>
            </View>
          )}

          {currentStep === "sending_usdc" && (
            <View className="mt-2 bg-purple-50 rounded-lg p-2.5 w-full">
              <Text className="text-xs text-purple-800 text-center font-medium">
                ⏳ Blockchain transaction in progress...
              </Text>
            </View>
          )}

          {currentStep === "completed" && (
            <View className="mt-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 w-full border-2 border-green-200">
              <Text className="text-3xl text-center mb-2">🎉</Text>
              <Text className="text-sm text-gray-700 text-center mb-1">
                You successfully sent
              </Text>
              <Text className="text-xl font-bold text-green-600 text-center mb-1">
                {usdcAmount} USDC
              </Text>
              <Text className="text-xs text-gray-600 text-center mb-2">
                to {chamaName}
              </Text>
              {txHash && (
                <View className="bg-white rounded-lg p-2 mt-1">
                  <Text className="text-xs text-gray-500 text-center mb-0.5">
                    Transaction Hash
                  </Text>
                  <Text className="text-xs text-gray-700 text-center font-mono">
                    {txHash.substring(0, 30)}...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View className="bg-white rounded-t-3xl shadow-2xl w-full max-h-[65vh]">
      <ScrollView
        className="px-6 py-6"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <View className="bg-green-50 rounded-xl p-2 mr-2 shadow-sm">
                <Image
                  source={require("../assets/images/mpesa.png")}
                  className="w-10 h-8"
                  resizeMode="contain"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-800">
                  Pay to {chamaName} chama
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Quick & secure payment
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Indicator */}
        {renderStatusIndicator()}

        {/* Form - Only show when in input state */}
        {currentStep === "input" && (
          <View className="w-full">
            {/* Phone Number Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                Phone Number
              </Text>
              <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <View className="bg-green-600 px-3 py-3 border-r border-gray-300">
                  <Text className="text-white font-bold text-sm">+254</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 py-3 text-sm text-gray-800 font-medium"
                  placeholder="712345678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={9}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!loading}
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1 ml-1">
                📱 Enter your M-Pesa registered number
              </Text>
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                  Amount ({exchangeRate?.currencyCode || "KES"})
                </Text>

                <View className="flex-row justify-end items-center">
                  {loadingRate ? (
                    <Text className="text-xs text-gray-600 ml-2">
                      Loading rate...
                    </Text>
                  ) : exchangeRate ? (
                    <Text className="text-xs text-gray-600 ml-2">
                      1 USDC = {exchangeRate.exchangeRate.selling_rate}{" "}
                      {exchangeRate.currencyCode}
                    </Text>
                  ) : (
                    <Text className="text-xs text-red-800 text-center">
                      ⚠️ Unable to load exchange rate
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mt-1">
                <View className="px-3 py-3 bg-gray-50">
                  <Text className="text-gray-700 font-bold text-sm">
                    {exchangeRate?.currencyCode || "KES"}
                  </Text>
                </View>

                <TextInput
                  className="flex-1 px-3 py-3 text-sm text-gray-800 font-medium"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={kesAmount}
                  onChangeText={setKesAmount}
                  editable={!loading && !loadingRate}
                />
              </View>

              <Text className="text-xs text-gray-500 mt-1 ml-1">
                💰 Minimum: 10 {exchangeRate?.currencyCode || "KES"}
              </Text>
            </View>

            {/* USDC Preview */}
            {parseFloat(usdcAmount) > 0 && exchangeRate && (
              <Animated.View
                style={{ opacity: fadeAnim }}
                className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-md"
              >
                {/* <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-gray-600 font-medium">
                    Payment breakdown
                  </Text>
                  <View className="bg-green-100 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-green-700 font-bold">
                      USDC
                    </Text>
                  </View>
                </View> */}

                {/* Amount Breakdown */}
                <View className="space-y-1.5 mb-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-600">Amount</Text>
                    <Text className="text-xs font-semibold text-gray-800">
                      {kesAmount} {exchangeRate.currencyCode}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-600">
                      Transaction fee (0.5%)
                    </Text>
                    <Text className="text-xs font-semibold text-red-600">
                      -{(Number(kesAmount) * 0.005).toFixed(2)}{" "}
                      {exchangeRate.currencyCode}
                    </Text>
                  </View>
                  {/* <View className="h-px bg-green-300 my-0.5" />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-600">
                      Amount after fee
                    </Text>
                    <Text className="text-xs font-semibold text-gray-800">
                      {(Number(kesAmount) - Number(kesAmount) * 0.005).toFixed(
                        2
                      )}{" "}
                      {exchangeRate.currencyCode}
                    </Text>
                  </View> */}
                </View>

                {/* USDC You'll pay */}
                <View className="bg-white/70 rounded-lg p-2.5 mt-1.5">
                 
                  <Text className="text-xl font-bold text-green-600 text-center">
                    {usdcAmount} USDC
                  </Text>
                  <Text className="text-xs text-gray-600 text-center mb-0.5">
                    will paid to {chamaName}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Buy Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl items-center justify-center shadow-lg ${
                isFormValid && !loading
                  ? "bg-downy-800"
                  : "bg-gray-300"
              }`}
              disabled={!isFormValid || loading}
              onPress={handleOnramp}
              activeOpacity={0.8}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">
                    Processing...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-base">
                  {isFormValid
                    ? "Make Payment"
                    : loadingRate
                      ? "Loading..."
                      : "Enter Details"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Info Card */}
            {/* <View className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-blue-900 mb-0.5">
                    How it works
                  </Text>
                  <Text className="text-xs text-blue-800 leading-4">
                    You'll receive an M-Pesa prompt on your phone. Enter your
                    PIN to complete the payment instantly.
                  </Text>
                </View>
              </View>
            </View> */}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MPesaPay;
