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
} from "react-native";
import { initiateOnramp, pollOnrampStatus } from "@/lib/onrampService";
import { useAuth } from "@/Contexts/AuthContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { pretiumOnramp } from "@/lib/pretiumService";


const MPesaPay = ({chamaName, chamaId}: {chamaName:string, chamaId:number}) => {
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
  const { data: exchangeRate } = useExchangeRate("KES");

  console.log("The usdc to Kes rate", exchangeRate);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Calculate USDC amount when KES changes
  useEffect(() => {
    if (kesAmount && parseFloat(kesAmount) > 0) {
      const usdc = parseFloat(kesAmount) / exchangeRate.exchangeRate.selling_rate;
      setUsdcAmount(usdc.toFixed(3));
    } else {
      setUsdcAmount("0.00");
    }
  }, [kesAmount]);

  // Pulse animation for loading states
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading]);

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

    if (!token) {
      Alert.alert("Error", "Authentication required");
      return;
    }

    setLoading(true);
    setCurrentStep("payment_sent");
    setStatusMessage("Initiating payment request...");

    try {
      const fullPhoneNumber = `0${phoneNumber}`;
      
      
      // add 0.5% tx fee
      const additionalFee = Number(kesAmount) * 0.005;
      const fullKesAmount = Number(kesAmount) + additionalFee;

      // Step 1: Initiate onramp
      const result = await pretiumOnramp(fullPhoneNumber,fullKesAmount, exchangeRate.exchangeRate.selling_rate, Number(usdcAmount),false, token,additionalFee);

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate onramp");
      }

      // Step 2: Show M-Pesa prompt message
      setStatusMessage("Check your phone for M-Pesa prompt...");

      // Step 3: Start polling for status
      try {
        const onrampResult = await pollOnrampStatus(
          result.checkoutRequestID,
          token,
          (status, data) => {
            console.log("Status update:", status, data);

            switch (status) {
              case "pending":
                setCurrentStep("payment_sent");
                setStatusMessage("Waiting for payment confirmation...");
                break;
              case "pending_transfer":
                setCurrentStep("payment_received");
                setStatusMessage("Payment received! 🎉");
                setTimeout(() => {
                  setCurrentStep("sending_usdc");
                  setStatusMessage(`Sending ${data.cusdAmount} USDC to your wallet...`);
                }, 1500);
                break;
              case "completed":
                setCurrentStep("completed");
                setStatusMessage("cUSD successfully sent! ✅");
                setReceiptNumber(data.mpesaReceiptNumber || "");
                setTxHash(data.blockchainTxHash || "");
                break;
            }
          }
        );

        // Onramp completed successfully
        setLoading(false);
        setCurrentStep("completed");

        setTimeout(() => {
          Alert.alert(
            "Onramp Successful! 🎉",
            `You paid KES ${kesAmount}\nReceived: ${cusdAmount} cUSD\n\nM-Pesa Receipt: ${onrampResult.mpesaReceiptNumber || "N/A"}\nBlockchain TX: ${onrampResult.blockchainTxHash?.substring(0, 10)}...`,
            [
              {
                text: "Done",
                onPress: () => {
                  // Reset form
                  setPhoneNumber("");
                  setKesAmount("");
                  setCusdAmount("0.00");
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

        let errorTitle = "Onramp Failed";
        let errorMessage = "The onramp could not be completed.";

        if (pollError.status === "cancelled") {
          errorTitle = "Payment Cancelled";
          errorMessage = "You cancelled the payment request.";
        } else if (pollError.status === "timeout") {
          errorTitle = "Payment Timeout";
          errorMessage = "The payment request timed out. Please try again.";
        } else if (pollError.resultDesc) {
          errorMessage = pollError.resultDesc;
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
    phoneNumber.length >= 9 && kesAmount && parseFloat(kesAmount) > 0;

  const renderStatusIndicator = () => {
    if (currentStep === "input") return null;

    return (
      <View className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
        {/* Progress Steps */}
        <View className="flex-row justify-between mb-6">
          {/* Step 1: Payment Sent */}
          <View className="items-center flex-1">
            <Animated.View
              style={{
                transform: [
                  {
                    scale:
                      currentStep === "payment_sent" ? pulseAnim : 1,
                  },
                ],
              }}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                currentStep === "payment_sent"
                  ? "bg-blue-500"
                  : currentStep === "sending_cusd"
                  ? "bg-gray-300"
                  : "bg-green-500"
              }`}
            >
              <Text className="text-white text-lg font-bold">1</Text>
            </Animated.View>
            <Text className="text-xs text-gray-600 mt-2 text-center">
              M-Pesa
            </Text>
          </View>

          {/* Connecting Line */}
          <View className="flex-1 justify-center">
            <View
              className={`h-1 ${
                ["payment_received", "sending_cusd", "completed"].includes(
                  currentStep
                )
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            />
          </View>

          {/* Step 2: Payment Received */}
          <View className="items-center flex-1">
            <Animated.View
              style={{
                transform: [
                  {
                    scale:
                      currentStep === "payment_received" ? pulseAnim : 1,
                  },
                ],
              }}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                ["payment_received", "sending_cusd", "completed"].includes(
                  currentStep
                )
                  ? currentStep === "payment_received"
                    ? "bg-blue-500"
                    : "bg-green-500"
                  : "bg-gray-300"
              }`}
            >
              <Text className="text-white text-lg font-bold">2</Text>
            </Animated.View>
            <Text className="text-xs text-gray-600 mt-2 text-center">
              Received
            </Text>
          </View>

          {/* Connecting Line */}
          <View className="flex-1 justify-center">
            <View
              className={`h-1 ${
                ["sending_cusd", "completed"].includes(currentStep)
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            />
          </View>

          {/* Step 3: cUSD Sent */}
          <View className="items-center flex-1">
            <Animated.View
              style={{
                transform: [
                  {
                    scale:
                      currentStep === "sending_cusd" ? pulseAnim : 1,
                  },
                ],
              }}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                currentStep === "completed"
                  ? "bg-green-500"
                  : currentStep === "sending_cusd"
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            >
              <Text className="text-white text-lg font-bold">3</Text>
            </Animated.View>
            <Text className="text-xs text-gray-600 mt-2 text-center">
              cUSD Sent
            </Text>
          </View>
        </View>

        {/* Status Message */}
        <View className="items-center">
          {loading && currentStep !== "completed" && (
            <ActivityIndicator size="large" color="#10b981" className="mb-3" />
          )}
          <Text className="text-lg font-semibold text-gray-800 text-center">
            {statusMessage}
          </Text>
          {currentStep === "payment_sent" && (
            <Text className="text-sm text-gray-600 mt-2 text-center">
              Enter your M-Pesa PIN on your phone
            </Text>
          )}
          {currentStep === "sending_cusd" && (
            <Text className="text-sm text-gray-600 mt-2 text-center">
              This may take a few seconds...
            </Text>
          )}
          {currentStep === "completed" && (
            <View className="mt-4 bg-white rounded-xl p-4 w-full">
              <Text className="text-2xl text-center mb-2">🎉</Text>
              <Text className="text-sm text-gray-600 text-center">
                You received{" "}
                <Text className="font-bold text-green-600">{cusdAmount} cUSD</Text>
              </Text>
              {txHash && (
                <Text className="text-xs text-gray-500 mt-2 text-center">
                  TX: {txHash.substring(0, 20)}...
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="bg-white rounded-t-3xl shadow-2xl w-full px-6 py-8">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center flex-1">
          <Image
            source={require("../assets/images/mpesa.png")}
            className="w-16 h-12 mr-3"
            resizeMode="contain"
          />
          <View>
            <Text className="text-2xl font-bold text-gray-800">
              Pay to {chamaName}
            </Text>
            <Text className="text-sm text-gray-500">
              1 USDC = {exchangeRate.exchangeRate.selling_rate} {exchangeRate.currencyCode}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Indicator */}
      {renderStatusIndicator()}

      {/* Form - Only show when in input state */}
      {currentStep === "input" && (
        <View className="w-full">
          {/* Phone Number Input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <View className="bg-green-600 px-4 py-3.5 border-r border-gray-300">
                <Text className="text-white font-semibold text-base">+254</Text>
              </View>
              <TextInput
                className="flex-1 px-4 py-3 text-base text-gray-800"
                placeholder="712345678"
                keyboardType="phone-pad"
                maxLength={9}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-1.5">
              Enter your M-Pesa registered number
            </Text>
          </View>

          {/* Amount Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Amount ({exchangeRate.currencyCode})
            </Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <View className="px-4 py-3.5">
                <Text className="text-gray-600 font-semibold text-base">{exchangeRate.currencyCode}</Text>
              </View>
              <TextInput
                className="flex-1 px-4 py-3 text-base text-gray-800"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={kesAmount}
                onChangeText={setKesAmount}
                editable={!loading}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-1.5">
              Minimum: 10 {exchangeRate.currencyCode}
            </Text>
          </View>

          {/* cUSD Preview */}
          {parseFloat(cusdAmount) > 0 && (
            <View className="mb-6 bg-green-50 rounded-xl p-2 border-2 border-green-200">
              <Text className="text-sm text-gray-600 text-center mb-1">
                Payment amount
              </Text>
              <Text className="text-xl font-bold text-green-600 text-center">
                {cusdAmount} USDC
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                ≈ ${(parseFloat(cusdAmount) * 1).toFixed(2)} USDC
              </Text>
            </View>
          )}

          {/* Buy Button */}
          <TouchableOpacity
            className={`py-4 rounded-xl items-center justify-center ${
              isFormValid && !loading ? "bg-green-600" : "bg-gray-300"
            }`}
            disabled={!isFormValid || loading}
            onPress={handleOnramp}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-base">
              {isFormValid ? "Make Payment" : "Enter Details"}
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <View className="mt-4 bg-blue-50 rounded-lg p-3">
            <Text className="text-xs text-blue-800 text-center">
              💡 You'll receive an M-Pesa prompt. Enter your PIN to buy USDC
              instantly.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MPesaPay;