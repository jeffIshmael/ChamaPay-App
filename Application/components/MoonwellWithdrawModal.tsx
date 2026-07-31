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
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const handleWithdraw = async () => {
    setLoading(true);
    setError("");

    try {
      const withdrawAmount = Number(amount);
      if (!withdrawAmount || withdrawAmount <= 0 || isNaN(withdrawAmount)) {
        setError("Please enter a valid amount");
        return;
      }

      if (withdrawAmount > availableBalance) {
        setError(
          `Insufficient balance. You have ${availableBalance.toFixed(3)} USDC available to withdraw.`
        );
        return;
      }

      // Simulate a backend / Moonwell withdraw transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const data = {
        txHash: "0xMockHash...",
        message: `Successfully withdrew ${amount} USDC from Moonwell.`,
        amount: amount.toString(),
      };

      setSuccessData(data);
      setIsSuccess(true);
    } catch (err) {
      setError("Failed to process withdrawal. Please try again.");
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

              <View className="items-center mb-8">
                <View className="flex-row items-center bg-gray-50 rounded-2xl px-6 py-4 w-full justify-center">
                  <Image
                    source={require("../assets/images/usdclogo.png")}
                    className="w-8 h-8 mr-3"
                  />
                  <TextInput
                    className="text-4xl font-bold text-gray-900 min-w-[100px]"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(t) => {
                      setAmount(t);
                      setError("");
                    }}
                    autoFocus
                  />
                </View>
                <View className="flex-row justify-between w-full mt-3 px-2">
                  <Text className="text-gray-500 text-sm">
                    Available: {availableBalance.toFixed(3)} USDC
                  </Text>
                  <TouchableOpacity onPress={() => setAmount(availableBalance.toString())}>
                    <Text className="text-[#10b981] font-bold text-sm">MAX</Text>
                  </TouchableOpacity>
                </View>
                {error ? (
                  <Text className="text-red-500 mt-3 text-sm text-center">{error}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={loading || !amount}
                className={`w-full py-4 rounded-xl items-center ${
                  loading || !amount ? "bg-gray-300" : "bg-[#10b981]"
                }`}
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
