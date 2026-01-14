// File: components/MobileMoneyPay.tsx - Updated with reusable components
import { Quote } from "@/app/(tabs)/wallet";
import { useAuth } from "@/Contexts/AuthContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import {
  agentDeposit,
  CurrencyCode,
  getExchangeRate,
  pollPretiumPaymentStatus,
  pretiumOnramp,
} from "@/lib/pretiumService";
import { Check, ChevronDown, Smartphone } from "lucide-react-native";
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
  View
} from "react-native";

// Import reusable components
import CountrySelector from "@/components/CountrySelector";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

// Import utilities
import {
  isValidPhoneNumber,
  PRETIUM_COUNTRIES,
  type Country,
  type PaymentMethod
} from "@/Utils/pretiumUtils";

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
  const [amount, setAmount] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "input" | "payment_sent" | "payment_received" | "sending_usdc" | "completed"
  >("input");
  const [statusMessage, setStatusMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  // Modal states
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);

  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(PRETIUM_COUNTRIES[0]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const { token } = useAuth();
  const [exchangeRate, setExchangeRate] = useState<Quote | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const { data: exchangeRateData } = useExchangeRate(selectedCountry.currency as CurrencyCode);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  // Event handlers
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
    // Clear method selection when switching countries, especially for ROW
    if (country.code === "ROW" || country.code !== selectedCountry.code) {
      setSelectedMethod(null);
      setPhoneNumber("");
      setAmount("");
      setUsdcAmount("0.00");
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    console.log("Selected payment method:", method);
    // Only allow mobile money for payments
    if (method.type !== 'mobile_money') {
      Alert.alert("Not Available", "Bank payments are not currently supported. Please use mobile money.");
      return;
    }
    setSelectedMethod(method);
    setShowMethodModal(false);
  };

  // Check if "Rest of the World" is selected
  const isRestOfWorld = selectedCountry.code === "ROW";

  // Calculate remaining amount in local currency
  const remainingInLocalCurrency = exchangeRate?.exchangeRate?.selling_rate
    ? (remainingAmount * exchangeRate.exchangeRate.selling_rate).toFixed(2)
    : "0";

  // Fetch exchange rate based on selected country
  useEffect(() => {
    // Skip fetching if "Rest of the World" is selected
    if (isRestOfWorld) {
      setExchangeRate(null);
      setLoadingRate(false);
      return;
    }

    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        const rate = await getExchangeRate(selectedCountry.currency as CurrencyCode);
        if (rate && rate.success && rate.exchangeRate) {
          setExchangeRate(rate);
        } else if (exchangeRateData && exchangeRateData.exchangeRate) {
          setExchangeRate(exchangeRateData);
        } else {
          setExchangeRate(null);
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        if (exchangeRateData && exchangeRateData.exchangeRate) {
          setExchangeRate(exchangeRateData);
        } else {
          setExchangeRate(null);
        }
      } finally {
        setLoadingRate(false);
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, 30000);
    return () => clearInterval(interval);
  }, [selectedCountry.currency, isRestOfWorld]);

  useEffect(() => {
    if (!exchangeRate && exchangeRateData && !loadingRate) {
      setExchangeRate(exchangeRateData);
    }
  }, [exchangeRateData, exchangeRate, loadingRate]);

  // Calculate USDC amount when local currency amount changes
  useEffect(() => {
    if (!exchangeRate?.exchangeRate?.selling_rate) {
      setUsdcAmount("0.00");
      return;
    }
    if (amount && parseFloat(amount) > 0) {
      const txFee = parseFloat(amount) * 0.005;
      const amountAfterFee = parseFloat(amount) - txFee;
      const sellingRate = exchangeRate.exchangeRate.selling_rate;
      const usdc = amountAfterFee / sellingRate;
      setUsdcAmount(usdc.toFixed(3));
    } else {
      setUsdcAmount("0.00");
    }
  }, [amount, exchangeRate]);

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
    if (exchangeRate?.exchangeRate?.selling_rate && remainingAmount > 0) {
      const localValue = (
        remainingAmount * exchangeRate.exchangeRate.selling_rate
      ).toFixed(2);
      setAmount(localValue);
    }
  };

  const handlePayment = async () => {
    if (isRestOfWorld) {
      Alert.alert("Coming Soon", "Payments for Rest of the World are not yet available.");
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

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) < 10) {
      Alert.alert("Amount Too Low", `Minimum amount is 10 ${selectedCountry.currency}`);
      return;
    }

    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    if (!exchangeRate?.exchangeRate?.selling_rate) {
      Alert.alert("Exchange Rate Unavailable", "Unable to fetch current exchange rate. Please try again.");
      return;
    }

    setLoading(true);
    setCurrentStep("payment_sent");
    setStatusMessage("Initiating payment request...");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;
      const txFee = Number(amount) * 0.005;
      const amountAfterFee = Number(amount) - txFee;

      const result = await pretiumOnramp(
        fullPhoneNumber,
        Number(amount),
        exchangeRate.exchangeRate!.selling_rate,
        Number(usdcAmount),
        false,
        token,
        txFee
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment.");
      }

      setStatusMessage(`Check your phone for ${selectedMethod.name} prompt...`);

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

      setTimeout(() => {
        Alert.alert(
          "Payment Successful! 🎉",
          `You paid ${usdcAmount} USDC to ${chamaName} chama.\n\nBlockchain TX: ${txHashResult.substring(0, 10)}...`,
          [
            {
              text: "Done",
              onPress: () => {
                setPhoneNumber("");
                setAmount("");
                setUsdcAmount("0.00");
                setCurrentStep("input");
                setStatusMessage("");
                setTxHash("");
                onClose();
              },
            },
          ]
        );
      }, 2000);
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

      Alert.alert(errorTitle, errorMessage);
    }
  };

  const isFormValid =
    !isRestOfWorld &&
    selectedMethod &&
    selectedMethod.type === 'mobile_money' &&
    isValidPhoneNumber(phoneNumber) &&
    amount &&
    parseFloat(amount) >= 10 &&
    !loadingRate &&
    exchangeRate?.exchangeRate?.selling_rate !== undefined;

  const renderStatusIndicator = () => {
    if (currentStep === "input") return null;

    const steps = [
      { id: "payment_sent", label: selectedMethod?.name || "Payment", icon: "📱" },
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
                      className={`w-12 h-12 rounded-full items-center justify-center shadow-md ${
                        isCompleted ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-200"
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
                        isActive || isCompleted ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>

                  {index < steps.length - 1 && (
                    <View className="flex-1 items-center" style={{ marginTop: -20 }}>
                      <View
                        className={`h-1 w-full ${
                          index < completedStepIndex || currentStep === "completed"
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
                📲 Enter your PIN on your phone
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
      <ScrollView className="px-6 py-6 " showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header with Back Button */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={onBack}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-2"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-xl">←</Text>
            </TouchableOpacity>

            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">
                Pay to {chamaName} chama
              </Text>
            </View>
          </View>

          {/* Remaining Amount Alert */}
          {remainingAmount > 0 && !loading && currentStep === "input" && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-amber-800 mb-0.5">
                    Contribution Due
                  </Text>
                  <Text className="text-sm font-semibold text-amber-900">
                    {remainingAmount.toFixed(3)} {currency} remaining
                  </Text>
                  <Text className="text-xs text-amber-700 mt-0.5">
                    ≈ {remainingInLocalCurrency} {exchangeRate?.currencyCode || selectedCountry.currency}
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
            {/* Country Selection */}
            <View>
              <Text className="text-xs font-semibold text-gray-700 mb-2">
                Select Country
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(true)}
                className="flex-row items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-gray-50"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-2xl mr-3">{selectedCountry.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedCountry.name}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {selectedCountry.currency}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Coming Soon Overlay for Rest of the World */}
            {isRestOfWorld && (
              <View className="bg-white p-8 rounded-2xl shadow-sm items-center justify-center border-2 border-gray-200">
                <Image
                  source={require("@/assets/images/coming-soon.png")}
                  className="w-40 h-40 mb-4"
                  resizeMode="contain"
                />
                <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                  Coming Soon
                </Text>
                <Text className="text-base text-gray-600 text-center">
                  Payments for {selectedCountry.name} are not yet available.
                </Text>
                <Text className="text-sm text-gray-500 text-center mt-2">
                  We're working on expanding our services. Stay tuned!
                </Text>
              </View>
            )}

            {/* Payment Method Selection - Hide if Rest of World */}
            {!isRestOfWorld && (
              <View>
              <Text className="text-xs font-semibold text-gray-700 mb-2">
                Payment Method
              </Text>
              {selectedMethod ? (
                <TouchableOpacity
                  onPress={() => setShowMethodModal(true)}
                  className="flex-row items-center justify-between p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-white">
                      <Smartphone size={20} color="#10b981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {selectedMethod.name}
                      </Text>
                      <Text className="text-xs text-gray-600">Instant</Text>
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
            )}

            {/* Phone Number Input - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod && (
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-2">
                  Mobile Money Number
                </Text>
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                  <View className="bg-green-600 px-3 py-3">
                    <Text className="text-white font-bold text-sm">
                      +{selectedCountry.phoneCode}
                    </Text>
                  </View>
                  <TextInput
                    className="flex-1 px-3 py-3 text-sm text-gray-800"
                    placeholder="712345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={12}
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, "").slice(0, 12))}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* Amount Input - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod && (
              <View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-semibold text-gray-700">
                    Amount ({selectedCountry.currency})
                  </Text>
                  {loadingRate ? (
                    <Text className="text-xs text-gray-600">Loading rate...</Text>
                  ) : exchangeRate?.exchangeRate?.selling_rate ? (
                    <Text className="text-xs text-gray-600">
                      1 USDC = {exchangeRate.exchangeRate.selling_rate} {selectedCountry.currency}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
                  <View className="px-3 py-3 bg-gray-50">
                    <Text className="text-gray-700 font-bold text-sm">
                      {selectedCountry.currency}
                    </Text>
                  </View>
                  <TextInput
                    className="flex-1 px-3 py-3 text-sm text-gray-800"
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    editable={!loading && !loadingRate}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-1">
                  💰 Minimum: 10 {selectedCountry.currency}
                </Text>
              </View>
            )}

            {/* USDC Preview - Hide if Rest of World */}
            {!isRestOfWorld && parseFloat(usdcAmount) > 0 && exchangeRate?.exchangeRate?.selling_rate && (
              <Animated.View
                style={{ opacity: fadeAnim }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200"
              >
                <View className="mb-2">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-gray-600">Amount</Text>
                    <Text className="text-xs font-semibold text-gray-800">
                      {amount} {selectedCountry.currency}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-600">Fee (0.5%)</Text>
                    <Text className="text-xs font-semibold text-red-600">
                      -{(Number(amount) * 0.005).toFixed(2)} {selectedCountry.currency}
                    </Text>
                  </View>
                </View>

                <View className="bg-white/70 rounded-lg p-2.5">
                  <Text className="text-xl font-bold text-green-600 text-center">
                    {usdcAmount} USDC
                  </Text>
                  <Text className="text-xs text-gray-600 text-center">
                    will be paid to {chamaName}
                  </Text>
                </View>

                {/* {remainingAmount > 0 && parseFloat(usdcAmount) >= remainingAmount && (
                  <View className="bg-green-100 rounded-lg p-2 mt-2">
                    <Text className="text-xs text-green-800 text-center font-medium">
                      ✓ This payment will complete your contribution
                    </Text>
                  </View>
                )} */}
              </Animated.View>
            )}

            {/* Submit Button - Hide if Rest of World */}
            {!isRestOfWorld && selectedMethod && (
              <TouchableOpacity
                className={`py-4 rounded-xl items-center justify-center mb-6 ${
                  isFormValid && !loading ? "bg-downy-800" : "bg-gray-300"
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
            )}
          </View>
        )}
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
        excludeBankMethods={true}
      />
    </View>
  );
};

export default MobileMoneyPay;