import { useAuth } from "@/Contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { ArrowLeft, CheckCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { serverUrl } from "../constants/serverUrl";

const USDCPay = ({
  visible,
  onClose,
  onBack,
  onSuccess,
  chamaId,
  chamaBlockchainId,
  USDCBalance,
  chamaName,
  remainingAmount,
  contributionAmount,
}: {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (data?: {
    txHash: string;
    message: string;
    amount: string;
  }) => void;
  chamaId: number;
  chamaBlockchainId: number;
  USDCBalance: string;
  chamaName: string;
  remainingAmount: number;
  contributionAmount: number;
}) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const { token } = useAuth();

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const paymentAmount = Number(amount);
      if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount)) {
        setError("Please enter a valid amount");
        return;
      }

      if (paymentAmount > Number(USDCBalance)) {
        setError(
          `Insufficient balance. You have ${Number(USDCBalance).toFixed(3)} USDC available`
        );
        return;
      }

      if (!token) {
        setError("Authentication required");
        return;
      }

      // Record transaction on server
      const response = await axios.post(
        `${serverUrl}/chama/deposit`,
        {
          amount: amount.toString(),
          blockchainId: chamaBlockchainId,
          chamaId: chamaId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      const data = {
        txHash: response.data.txHash || "",
        message: `Successfully deposited ${amount} USDC to ${chamaName}`,
        amount: amount.toString(),
      };

      setSuccessData(data);
      setIsSuccess(true);
    } catch (error) {
      console.log("Payment error:", error);
      setError("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSuccess = () => {
    setIsSuccess(false);
    setAmount("");
    onSuccess(successData);
  };

  const handleAmountChange = (text: string) => {
    setAmount(text);
    setError("");
  };

  const fillRemainingAmount = () => {
    if (remainingAmount > 0) {
      setAmount(remainingAmount.toFixed(3));
      handleAmountChange(remainingAmount.toFixed(3));
    }
  };

  const handleClose = () => {
    if (!isSuccess) {
      setAmount("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={handleClose}
        />
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 shadow-lg max-h-[70vh]">
          <View className="w-10 h-1 bg-gray-300 rounded self-center mb-4" />

          {isSuccess ? (
            <View className="items-center py-6">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <CheckCircle size={40} color="#059669" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Payment Successful!
              </Text>
              <Text className="text-gray-600 text-center mb-8 px-4">
                {successData?.message}
              </Text>
              <TouchableOpacity
                onPress={handleFinalSuccess}
                className="w-full bg-downy-800 py-4 rounded-xl shadow-md"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-center text-lg">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center mb-4">
                <TouchableOpacity
                  onPress={onBack}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color="black" />
                </TouchableOpacity>

                <Image
                  source={require("../assets/images/usdclogo.png")}
                  className="w-12 h-12 mr-4"
                />
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900">
                    Pay with USDC
                  </Text>
                  <Text className="text-xs text-gray-500">To {chamaName} chama</Text>
                </View>
              </View>

              {/* Remaining Amount Alert */}
              {remainingAmount > 0 && !loading && Number(amount) < remainingAmount && (
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-amber-800 mb-0.5">
                        Contribution Due
                      </Text>
                      <Text className="text-sm font-bold text-amber-900">
                        {remainingAmount.toFixed(3)} USDC remaining
                      </Text>
                      <Text className="text-xs text-amber-700 mt-0.5">
                        Required: {contributionAmount.toFixed(3)} USDC
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={fillRemainingAmount}
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

              <View className="w-full">
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2 font-medium">
                    Amount (USDC)
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
                    placeholder="0"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={handleAmountChange}
                  />
                  {error ? (
                    <Text className="text-red-500 text-xs mt-2">{error}</Text>
                  ) : null}
                </View>

                <Text className="text-black font-light text-base mb-4">
                  Available balance: {Number(USDCBalance) > 0 ? Number(USDCBalance).toFixed(3) : 0} USDC
                </Text>

                {Number(amount) > 0 && (
                  <View className="mb-6">
                    <Text className="text-black font-semibold text-base">
                      Total: {Number(amount).toFixed(3)} USDC
                    </Text>

                    {/* Show if payment covers remaining amount */}
                    {remainingAmount > 0 &&
                      Number(amount) >= remainingAmount && (
                        <View className="bg-green-100 rounded-lg p-2 mt-2">
                          <Text className="text-xs text-green-800 text-center font-medium">
                            ✓ This payment will complete your contribution
                          </Text>
                        </View>
                      )}
                  </View>
                )}

                <TouchableOpacity
                  className={`py-4 rounded-xl shadow-md ${loading ? "bg-gray-400" : "bg-downy-800"
                    }`}
                  onPress={handlePayment}
                  disabled={loading}
                >
                  {loading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-semibold text-base ml-2">
                        Processing...
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <Ionicons
                        name="paper-plane"
                        size={20}
                        color="#fff"
                        className="mr-3"
                      />
                      <Text className="text-white font-semibold text-base">
                        Pay
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

    </Modal>
  );
};

export default USDCPay;