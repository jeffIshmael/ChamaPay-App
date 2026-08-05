import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { useAuth } from "@/Contexts/AuthContext";
import { serverUrl } from "@/constants/serverUrl";
import { useCurrencyStore } from "@/store/useCurrencyStore";

interface MoonwellWithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  availableBalance: number;
}

const MoonwellWithdrawModal = ({
  visible,
  onClose,
  onSuccess,
  availableBalance,
}: MoonwellWithdrawModalProps) => {
  const { token } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const { currency, platformRate } = useCurrencyStore();

  const inputAmount = Number(amount) || 0;
  const actualUSDCAmount = currency === "KES" ? inputAmount / platformRate : inputAmount;
  const isAmountTooHigh = actualUSDCAmount > availableBalance;
  
  const displayBalance = currency === "KES"
    ? `KSh ${Math.floor(availableBalance * platformRate).toLocaleString()}`
    : `${availableBalance.toFixed(3)} USDC`;
    
  const displayError = error || (isAmountTooHigh ? `Insufficient balance. You have ${displayBalance} available` : "");
  const isButtonDisabled = loading || !amount || isAmountTooHigh || inputAmount <= 0;

  const handleWithdraw = async () => {
    setLoading(true);
    setError("");

    try {
      if (isAmountTooHigh) {
        return;
      }
      
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Real backend Moonwell withdraw call
      const response = await fetch(`${serverUrl}/moonwell/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: actualUSDCAmount }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          txHash: data.txHash,
          message: `Successfully withdrew ${currency === "KES" ? 'KSh ' : ''}${inputAmount.toLocaleString()} ${currency === "KES" ? '' : 'USDC'} from Moonwell.`,
          amount: amount.toString(),
        });
        setIsSuccess(true);
      } else {
        setError(data.error || "Failed to withdraw");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSuccess = () => {
    setIsSuccess(false);
    setAmount("");
    onSuccess(successData);
  };

  const resetState = () => {
    setAmount("");
    setError("");
    setIsSuccess(false);
    setSuccessData(null);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        resetState();
        onClose();
      }}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="absolute inset-0" onPress={onClose} />
        <View className="bg-white rounded-t-[30px] p-4 pb-8">
          {isSuccess ? (
            <View className="items-center py-8">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <Text className="text-green-500 text-4xl">✓</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Successful</Text>
              <Text className="text-gray-500 text-center mb-8 px-4">
                {successData?.message}
              </Text>
              <TouchableOpacity
                onPress={handleFinalSuccess}
                className="w-full bg-[#10b981] py-4 rounded-xl"
              >
                <Text className="text-white text-center font-bold text-lg">Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="flex-row items-center w-full mb-6">
                <TouchableOpacity
                  onPress={() => {
                    resetState();
                    onClose();
                  }}
                  className="p-2 absolute z-10 left-0"
                >
                  <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1 items-center">
                  <Text className="text-xl font-semibold">Withdraw USDC</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mb-4 mt-2">
            <Text className="text-gray-500 font-medium">Available Balance</Text>
            <Text className="text-gray-900 font-bold">{displayBalance}</Text>
          </View>

          <View className="mb-6">
            <Text className="text-gray-500 font-medium mb-2">Amount to Withdraw</Text>
            <View className={`flex-row items-center border ${isAmountTooHigh ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded-xl px-4 bg-gray-50`}>
              <Text className="text-gray-500 font-bold mr-2 text-lg">{currency === "KES" ? 'KSh' : '$'}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                className="flex-1 py-4 text-gray-900 text-lg font-bold"
                placeholder={`0.00`}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={() => setAmount(currency === "KES" ? Math.floor(availableBalance * platformRate).toString() : availableBalance.toFixed(3))}
                className="bg-blue-100 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-blue-700 font-bold text-xs">MAX</Text>
              </TouchableOpacity>
            </View>
            {displayError ? (
              <Text className="text-red-500 text-xs mt-2 ml-1">{displayError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={isButtonDisabled}
            className={`w-full py-4 rounded-xl flex-row justify-center items-center ${isButtonDisabled ? 'bg-blue-300' : 'bg-blue-600'}`}
          >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-lg font-bold">Confirm Withdraw</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MoonwellWithdrawModal;
