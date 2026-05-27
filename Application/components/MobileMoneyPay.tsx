// File: components/MobileMoneyPay.tsx - Simplified M-Pesa Only
import { useAuth } from "@/Contexts/AuthContext";
import {
  agentDeposit,
  pollPretiumPaymentStatus,
  pretiumOnramp
} from "@/lib/pretiumService";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { PRETIUM_TRANSACTION_LIMIT } from "@/Utils/pretiumUtils";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ToastAndroid
} from "react-native";

interface MobileMoneyPayProps {
  chamaName: string;
  chamaBlockchainId: number;
  chamaId: number;
  onClose: () => void;
  onBack: () => void;
  remainingAmount?: number;
  contributionAmount?: number;
  currency?: string;
}

const MobileMoneyPay = ({
  chamaName,
  chamaBlockchainId,
  chamaId,
  onClose,
  onBack,
  remainingAmount = 0,
  contributionAmount = 0,
  currency = "USDC",
}: MobileMoneyPayProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [kesAmount, setKesAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "input" | "payment_sent" | "payment_received" | "sending_usdc" | "completed"
  >("input");
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const [isKESMode, setIsKESMode] = useState(false);
  const { token, user } = useAuth();
  const { fetchRate: globalFetchRate, rates, loading: loadingRates } = useExchangeRateStore();

  const theExhangeQuote = rates["KES"]?.data || null;
  const loadingRate = loadingRates["KES"] || false;

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  // Validate Kenyan phone number (starts with 7 or 1, 9 digits total)
  const isValidPhoneNumber = (phone: string): boolean => {
    return /^[71]\d{8}$/.test(phone);
  };

  const sellingRate = theExhangeQuote?.exchangeRate?.selling_rate || 0;

  // Calculate remaining amount in KES
  const remainingInKES = sellingRate
    ? (remainingAmount * sellingRate).toFixed(2)
    : "0";

  const minimumKES = PRETIUM_TRANSACTION_LIMIT.KE.min; // Minimum KES amount
  const maximumKES = PRETIUM_TRANSACTION_LIMIT.KE.max; // Maximum KES amount

  // Fetch exchange rate for KES
  useEffect(() => {
    globalFetchRate("KES");
    const interval = setInterval(() => globalFetchRate("KES"), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleKESChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setKesAmount(text);
        if (text && sellingRate > 0) {
          setUsdcAmount((parseFloat(text) / sellingRate).toFixed(3));
        } else {
          setUsdcAmount("");
        }
      }
    }
  };

  const handleUSDCChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const decimalCount = (text.match(/\./g) || []).length;
      if (decimalCount <= 1) {
        setUsdcAmount(text);
        if (text && sellingRate > 0) {
          setKesAmount((parseFloat(text) * sellingRate).toFixed(2));
        } else {
          setKesAmount("");
        }
      }
    }
  };

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

  // Quick fill function for remaining amount
  const fillRemainingAmount = () => {
    if (remainingAmount > 0) {
      setUsdcAmount(remainingAmount.toString());
      if (sellingRate) {
        setKesAmount((remainingAmount * sellingRate).toFixed(2));
      }
    }
  };

  const handlePayment = async () => {
    // Validate phone number
    if (!phoneNumber) {
      ToastAndroid.show("Please enter your M-Pesa number", ToastAndroid.SHORT);
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      ToastAndroid.show(
        "Invalid Phone Number, Use a valid M-Pesa number starting with 7 or 1 (e.g., 712345678)", ToastAndroid.SHORT
      );
      return;
    }

    // Validate amount
    if (!usdcAmount || usdcAmount.trim() === "") {
      ToastAndroid.show("Please enter an amount to pay", ToastAndroid.SHORT);
      return;
    }

    const parsedUSDC = parseFloat(usdcAmount);
    const parsedKES = parseFloat(kesAmount) || 0;

    if (isNaN(parsedUSDC) || parsedUSDC <= 0) {
      ToastAndroid.show("Please enter a valid amount greater than 0", ToastAndroid.SHORT);
      return;
    }

    if (parsedKES < minimumKES) {
      const minUSDC = minimumKES / sellingRate;
      ToastAndroid.show(
        `Minimum payment is ${minUSDC.toFixed(2)} USDC (approx. ${minimumKES} KES)`, ToastAndroid.SHORT
      );
      return;
    }

    if (parsedKES > maximumKES) {
      const maxUSDC = maximumKES / sellingRate;
      ToastAndroid.show(
        `Maximum payment is ${maxUSDC.toFixed(2)} USDC (approx. ${maximumKES} KES)`,
        ToastAndroid.SHORT
      );
      return;
    }

    if (!token) {
      ToastAndroid.show("You need to be logged in to make a payment", ToastAndroid.SHORT);
      return;
    }

    if (!sellingRate) {
      ToastAndroid.show(
        "Unable to fetch current exchange rate.", ToastAndroid.SHORT
      );
      return;
    }

    setLoading(true);
    setCurrentStep("payment_sent");
    setStatusMessage("Initiating M-Pesa payment request...");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;

      const result = await pretiumOnramp(
        fullPhoneNumber,
        parsedKES,
        sellingRate,
        parsedUSDC,
        false,
        token,
        chamaId
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment.");
      }

      setStatusMessage("Check your phone for M-Pesa prompt...");

      const onrampResult = await pollPretiumPaymentStatus(
        result.transactionCode,
        token,
        (status, data) => {
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

      const txResult = await agentDeposit(
        result.transactionCode,
        chamaBlockchainId,
        usdcAmount,
        chamaId,
        token
      );

      if (!txResult.success) {
        throw new Error(txResult.error || "Failed to deposit for user.");
      }

      const txHashResult = txResult.details;
      setTxHash(txHashResult);
      setLoading(false);
      setCurrentStep("completed");
      setStatusMessage("Payment completed successfully!");

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

      ToastAndroid.show(`Successfully paid ${usdcAmount} USDC to ${chamaName} chama.`, ToastAndroid.SHORT);

      setPhoneNumber("");
      setUsdcAmount("");
      setKesAmount("");
      setCurrentStep("input");
      setStatusMessage("");
      setTxHash("");
      onClose();
    } catch (error: any) {
      setLoading(false);
      setCurrentStep("input");

      let errorTitle = "Payment Failed";
      let errorMessage = "The payment could not be completed.";

      if (error.status === "cancelled") {
        errorTitle = "Payment Cancelled";
        errorMessage = "You cancelled the payment request.";
      } else if (error.status === "timeout") {
        errorTitle = "Payment Timeout";
        errorMessage = "The payment request timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
    }
  };

  const isFormValid =
    isValidPhoneNumber(phoneNumber) &&
    usdcAmount &&
    (parseFloat(kesAmount) || 0) >= minimumKES &&
    !loadingRate &&
    sellingRate !== undefined &&
    parseFloat(usdcAmount) > 0;

  const renderStatusIndicator = () => {
    if (currentStep === "input") return null;

    const steps = [
      { id: "payment_sent", label: "M-Pesa", icon: "📱" },
      { id: "payment_received", label: "Received", icon: "✓" },
      { id: "sending_usdc", label: "Sending", icon: "💸" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
    const completedStepIndex = currentStep === "completed" ? steps.length : currentStepIndex;

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
        <View className="mb-4">
          <View className="flex-row justify-between items-center">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < completedStepIndex || currentStep === "completed";

              return (
                <React.Fragment key={step.id}>
                  <View className="items-center" style={{ flex: 1 }}>
                    <Animated.View
                      style={{
                        transform: [{ scale: isActive ? pulseAnim : isCompleted ? 1.05 : 1 }],
                      }}
                      className={`w-12 h-12 rounded-full items-center justify-center shadow-md ${isCompleted ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-200"
                        }`}
                    >
                      {isCompleted ? (
                        <Text className="text-xl">✓</Text>
                      ) : (
                        <Text className="text-lg">{step.icon}</Text>
                      )}
                    </Animated.View>
                    <Text
                      className={`text-xs mt-1.5 font-medium ${isActive || isCompleted ? "text-gray-800" : "text-gray-400"
                        }`}
                    >
                      {step.label}
                    </Text>
                  </View>

                  {index < steps.length - 1 && (
                    <View className="flex-1 items-center" style={{ marginTop: -20 }}>
                      <View
                        className={`h-1 w-full ${index < completedStepIndex || currentStep === "completed"
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

        <View className="items-center bg-white rounded-xl p-4 shadow-sm">
          {loading && currentStep !== "completed" && (
            <View className="mb-2">
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          )}

          <Animated.View
            style={{
              transform: [{ scale: currentStep === "completed" ? scaleAnim : 1 }],
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
    <View className="bg-white rounded-t-3xl shadow-2xl w-full max-h-[70vh]">
      <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header with Back Button */}
        <View className="mb-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={onBack}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="black" />
            </TouchableOpacity>

            <Image
              source={require("../assets/images/mpesa.png")}
              className="w-14 h-14 mr-4"
              resizeMode="contain"
            />
            <View className="flex-1">
              <Text className="text-xl font-semibold text-gray-900">
                Pay with M-Pesa
              </Text>
              <Text className="text-xs text-gray-500">To {chamaName} chama</Text>
            </View>
          </View>

          {/* Remaining Amount Alert */}
          {remainingAmount > 0 && !loading && currentStep === "input" && Number(usdcAmount || 0) < remainingAmount && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-amber-800 mb-0.5">
                    Contribution Due
                  </Text>
                  <Text className="text-sm font-semibold text-amber-900">
                    {remainingAmount.toFixed(3)} USDC remaining
                  </Text>
                  <Text className="text-xs text-amber-700 mt-0.5">
                    ≈ {remainingInKES} KES
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={fillRemainingAmount}
                  disabled={loadingRate}
                  className="bg-amber-600 px-3 py-2 rounded-lg"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-xs font-semibold">
                    Pay Full
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Status Indicator */}
        {renderStatusIndicator()}

        {/* Form - Only show when in input state */}
        {currentStep === "input" && (
          <View className="w-full gap-4">

            {/* Phone Number Input */}
            <View>
              <Text className="text-xs font-semibold text-gray-700 mb-2">
                M-Pesa Number
              </Text>
              <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                <View className="bg-green-600 px-3 py-3">
                  <Text className="text-white font-bold text-sm">+254</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 py-3 text-sm text-gray-800"
                  placeholder="712345678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={9}
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 9))}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Amount Input */}
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-semibold text-gray-700">
                  Amount ({isKESMode ? "KES" : "USDC"})
                </Text>
                <View className="flex-row items-center gap-2">
                  {user?.location === "KE" && (
                    <TouchableOpacity
                      onPress={() => setIsKESMode(!isKESMode)}
                      className="bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"
                    >
                      <Text className="text-emerald-700 text-[10px] font-bold">
                        Switch to {isKESMode ? "USDC" : "KES"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {loadingRate ? (
                    <Text className="text-xs text-gray-600">Loading rate...</Text>
                  ) : sellingRate ? (
                    <Text className="text-xs text-gray-600">
                      1 USDC = {sellingRate} KES
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                <View className="px-3 py-3 bg-gray-50">
                  <Text className="text-gray-700 font-bold text-sm">{isKESMode ? "KES" : "USDC"}</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 py-3 text-sm text-gray-800"
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={isKESMode ? kesAmount : usdcAmount}
                  onChangeText={isKESMode ? handleKESChange : handleUSDCChange}
                  editable={!loading && !loadingRate}
                />
              </View>
              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-xs text-gray-500">
                  💰 Minimum: {isKESMode ? `${minimumKES} KES` : `${(minimumKES / (sellingRate || 1)).toFixed(2)} USDC`}
                </Text>
                {(parseFloat(kesAmount) || 0) > 0 && (parseFloat(kesAmount) || 0) < minimumKES && (
                  <Text className="text-xs text-red-600 font-medium">
                    Below minimum {isKESMode ? "KES" : "USDC"}
                  </Text>
                )}
              </View>
            </View>

            {/* KES Deduction Preview */}
            {(parseFloat(kesAmount) || 0) > 0 && sellingRate && (
              <Animated.View
                style={{ opacity: fadeAnim }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200"
              >
                <View className="bg-white/70 rounded-lg p-2.5">
                  <Text className="text-xl font-bold text-emerald-700 text-center">
                    KES {parseFloat(kesAmount).toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-600 text-center">
                    will be deducted from M-Pesa (for {parseFloat(usdcAmount).toFixed(3)} USDC)
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl items-center justify-center mb-6 ${isFormValid && !loading ? "bg-downy-800" : "bg-gray-300"
                }`}
              disabled={!isFormValid || loading}
              onPress={handlePayment}
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
                  {isFormValid ? "Make Payment" : loadingRate ? "Loading..." : "Enter Details"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MobileMoneyPay;