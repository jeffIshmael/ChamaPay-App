import React, { useState } from "react";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { sendMpesaStkPush, pollPaymentStatus } from "@/lib/mpesaService";
import { useAuth } from "@/Contexts/AuthContext";

const MPesaPay = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const { token } = useAuth();

  const handlePay = async () => {
    // Validation
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid phone number (9 digits)"
      );
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (!token) {
      Alert.alert("No token set.");
      return;
    }

    setLoading(true);
    setPaymentStatus("initiating");
    setStatusMessage("Initiating payment...");

    try {
      const fullPhoneNumber = `254${phoneNumber}`;

      // Step 1: Initiate STK push
      const result = await sendMpesaStkPush(
        Number(fullPhoneNumber),
        amount,
        token
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      // Step 2: Show prompt sent message
      setPaymentStatus("pending");
      setStatusMessage("Check your phone for M-Pesa prompt...");

      // Step 3: Start polling for payment status
      try {
        const paymentResult = await pollPaymentStatus(
          result.checkoutRequestID,
          token,
          (status, data) => {
            // Update UI as status changes
            switch (status) {
              case "pending":
                setStatusMessage("Waiting for payment confirmation...");
                break;
              case "processing":
                setStatusMessage("Processing payment...");
                break;
              default:
                setStatusMessage(`Status: ${status}`);
            }
          }
        );

        // Payment successful
        setPaymentStatus("completed");
        setLoading(false);

        Alert.alert(
          "Payment Successful! ✅",
          `Your payment of KES ${amount} has been received.\nReceipt: ${paymentResult.mpesaReceiptNumber || "N/A"}`,
          [
            {
              text: "OK",
              onPress: () => {
                // Reset form
                setPhoneNumber("");
                setAmount("");
                setPaymentStatus("");
                setStatusMessage("");
              },
            },
          ]
        );
      } catch (pollError: any) {
        // Handle payment failure/cancellation
        setLoading(false);

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
        }

        setPaymentStatus("failed");

        Alert.alert(errorTitle, errorMessage, [
          {
            text: "OK",
            onPress: () => {
              setPaymentStatus("");
              setStatusMessage("");
            },
          },
        ]);
      }
    } catch (error: any) {
      setLoading(false);
      setPaymentStatus("failed");

      Alert.alert(
        "Error",
        error.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  const isFormValid =
    phoneNumber.length >= 9 && amount && parseFloat(amount) > 0;

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
          <Text className="text-2xl font-bold text-gray-800">
            M-Pesa Payment
          </Text>
        </View>
      </View>

      {/* Form */}
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
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Amount (KES)
          </Text>
          <View className="flex-row items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <View className="px-4 py-3.5">
              <Text className="text-gray-600 font-semibold text-base">KES</Text>
            </View>
            <TextInput
              className="flex-1 px-4 py-3 text-base text-gray-800"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!loading}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1.5">
            Minimum amount: KES 1
          </Text>
        </View>

        {/* Status Message */}
        {loading && statusMessage && (
          <View className="mb-4 bg-blue-50 rounded-lg p-4">
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-sm text-blue-800 ml-3 flex-1">
                {statusMessage}
              </Text>
            </View>
            {paymentStatus === "pending" && (
              <Text className="text-xs text-blue-600 mt-2">
                This may take up to 60 seconds...
              </Text>
            )}
          </View>
        )}

        {/* Pay Button */}
        <TouchableOpacity
          className={`py-4 rounded-xl items-center justify-center ${
            isFormValid && !loading ? "bg-green-600" : "bg-gray-300"
          }`}
          disabled={!isFormValid || loading}
          onPress={handlePay}
          activeOpacity={0.8}
        >
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-bold text-base ml-2">
                Processing...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">
              {isFormValid ? "Pay Now" : "Enter Details"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <View className="mt-4 bg-blue-50 rounded-lg p-3">
          <Text className="text-xs text-blue-800 text-center">
            You will receive an M-Pesa prompt on your phone. Enter your PIN to
            complete the payment.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MPesaPay;
