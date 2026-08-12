import React, { useState, useEffect } from "react";
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
  const [totalYield, setTotalYield] = useState<number>(0);
  const [isYieldLoading, setIsYieldLoading] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const { currency, platformRate } = useCurrencyStore();

  useEffect(() => {
    if (visible && token) {
      const fetchYields = async () => {
        setIsYieldLoading(true);
        try {
          const response = await fetch(`${serverUrl}/moonwell/yields`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success && data.yields) {
            const sum = data.yields.reduce((acc: number, y: any) => acc + (parseFloat(y.earned) || 0), 0);
            setTotalYield(sum);
          }
        } catch (error) {
          console.error("Failed to fetch yields", error);
        } finally {
          setIsYieldLoading(false);
        }
      };
      fetchYields();
    }
  }, [visible, token]);

  const inputAmount = Number(amount) || 0;
  let actualUSDCAmount = isMax ? availableBalance : (currency === "KES" ? inputAmount / platformRate : inputAmount);
  
  // Add a small epsilon tolerance for KES rounding issues
  const epsilon = currency === "KES" ? 0.05 / platformRate : 0.0001;
  let isAmountTooHigh = false;
  let finalIsMax = isMax;

  if (!isMax) {
    if (actualUSDCAmount > availableBalance + epsilon) {
      isAmountTooHigh = true;
    } else if (actualUSDCAmount >= availableBalance - epsilon) {
      // If it's extremely close to the max balance, treat it as a MAX withdrawal
      // to avoid backend InsufficientFunds errors due to floating math
      actualUSDCAmount = availableBalance;
      finalIsMax = true;
    }
  }
  
  const displayBalance = currency === "KES"
    ? `KSh ${(availableBalance * platformRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
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
        body: JSON.stringify({ amount: actualUSDCAmount, isMax: finalIsMax }),
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
    setIsMax(false);
    onSuccess(successData);
  };

  const resetState = () => {
    setAmount("");
    setIsMax(false);
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
                  <Text className="text-xl font-semibold">Withdraw from Moonwell</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mb-2 mt-2">
            <Text className="text-gray-500 font-medium">Total Balance (Inc. Yield)</Text>
            <Text className="text-gray-900 font-bold">{displayBalance}</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
            <Text className="text-green-700 font-medium flex-row items-center">
              Total Yield Earned
            </Text>
            {isYieldLoading ? (
              <ActivityIndicator size="small" color="#15803d" />
            ) : (
              <Text className="text-green-700 font-bold">
                {currency === "KES" 
                  ? `KSh ${(totalYield * platformRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                  : `${totalYield.toFixed(6)} USDC`}
              </Text>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-gray-500 font-medium mb-2">Amount to Withdraw</Text>
            
            <View className={`flex-row items-center border ${isAmountTooHigh ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded-xl px-4 bg-gray-50 mb-3`}>
              <Text className="text-gray-500 font-bold mr-2 text-lg">{currency === "KES" ? 'KSh' : '$'}</Text>
              <TextInput
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  setIsMax(false);
                }}
                keyboardType="numeric"
                className="flex-1 py-4 text-gray-900 text-lg font-bold"
                placeholder={`0.00`}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="flex-row justify-between mb-2">
              <TouchableOpacity
                onPress={() => {
                  const principle = Math.max(0, availableBalance - totalYield);
                  setAmount(currency === "KES" ? (principle * platformRate).toFixed(2) : principle.toFixed(3));
                  setIsMax(false);
                }}
                className="flex-1 bg-gray-100 rounded-lg py-2 mr-2 items-center border border-gray-200"
              >
                <Text className="text-xs font-semibold text-gray-700">Principle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setAmount(currency === "KES" ? (totalYield * platformRate).toFixed(2) : totalYield.toFixed(3));
                  setIsMax(false);
                }}
                className="flex-1 bg-gray-100 rounded-lg py-2 mr-2 items-center border border-gray-200"
              >
                <Text className="text-xs font-semibold text-gray-700">Interest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setAmount(currency === "KES" ? (availableBalance * platformRate).toFixed(2) : availableBalance.toFixed(3));
                  setIsMax(true);
                }}
                className={`flex-1 rounded-lg py-2 items-center border ${isMax ? 'bg-blue-600 border-blue-600' : 'bg-gray-100 border-gray-200'}`}
              >
                <Text className={`text-xs font-semibold ${isMax ? 'text-white' : 'text-gray-700'}`}>All</Text>
              </TouchableOpacity>
            </View>

            {displayError ? (
              <Text className="text-red-500 text-xs mt-1 ml-1">{displayError}</Text>
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
