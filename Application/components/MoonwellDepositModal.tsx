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
import { getAllBalances } from "@/constants/viem";
import MobileMoneyPay from "./MobileMoneyPay";
import { serverUrl } from "@/constants/serverUrl";
import { useCurrencyStore } from "@/store/useCurrencyStore";

interface MoonwellDepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

const MoonwellDepositModal = ({
  visible,
  onClose,
  onSuccess,
}: MoonwellDepositModalProps) => {
  const { user, token } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"" | "USDC" | "mobileMoney">("");
  const [USDCBalance, setUSDCBalance] = useState("0");

  // USDC Pay specific states
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const { currency, platformRate } = useCurrencyStore();

  const displayBalance = currency === "KES"
    ? `KSh ${Math.floor(Number(USDCBalance || 0) * platformRate).toLocaleString()}`
    : `${Number(USDCBalance || 0).toFixed(3)} USDC`;

  const inputAmount = Number(amount) || 0;
  const actualUSDCAmount = currency === "KES" ? inputAmount / platformRate : inputAmount;
  const isAmountTooHigh = actualUSDCAmount > Number(USDCBalance);
  const displayError = error || (isAmountTooHigh ? `Insufficient balance. You have ${displayBalance} available` : "");
  const isButtonDisabled = loading || !amount || isAmountTooHigh || inputAmount <= 0;

  useEffect(() => {
    const fetchUSDCBalance = async () => {
      if (user?.smartAddress) {
        const balance = await getAllBalances(user.smartAddress as `0x${string}`);
        setUSDCBalance(balance.USDC.displayValue);
      }
    };
    fetchUSDCBalance();
  }, [user?.smartAddress]);

  useEffect(() => {
    if (!visible) {
      setPaymentMethod("");
      setAmount("");
      setError("");
      setIsSuccess(false);
      setSuccessData(null);
    }
  }, [visible]);

  const handlePaymentMethod = (method: "USDC" | "mobileMoney") => {
    setPaymentMethod(method);
  };

  const handleUSDCDeposit = async () => {
    setLoading(true);
    setError("");

    try {
      const inputAmount = Number(amount);
      if (!inputAmount || inputAmount <= 0 || isNaN(inputAmount)) {
        setError("Please enter a valid amount");
        return;
      }

      // Convert input to USDC if needed
      const actualUSDCAmount = currency === "KES" ? inputAmount / platformRate : inputAmount;

      if (isAmountTooHigh) {
        return;
      }

      if (!token) {
        setError("Authentication required");
        return;
      }

      // Real backend Moonwell deposit call
      const response = await fetch(`${serverUrl}/moonwell/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: actualUSDCAmount.toString() }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Deposit failed");
      }

      const data = {
        txHash: json.txHash,
        message: `Successfully supplied ${amount} ${currency === "KES" ? "KES" : "USDC"} to Moonwell`,
        amount: actualUSDCAmount.toString(),
      };

      setSuccessData(data);
      setIsSuccess(true);
    } catch (err) {
      setError("Failed to process deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSuccess = () => {
    setIsSuccess(false);
    setAmount("");
    setPaymentMethod("");
    onSuccess(successData);
  };

  const resetState = () => {
    setPaymentMethod("");
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
        <View>
          {!paymentMethod ? (
            <View className="bg-white rounded-t-[30px] p-4 pb-8">
              <View className="flex-row items-center w-full mb-5">
                <TouchableOpacity onPress={onClose} className="p-2 absolute z-10 left-0">
                  <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1 items-center">
                  <Text className="text-xl font-semibold">Deposit:</Text>
                </View>
              </View>
              <View className="w-full items-center">
                <TouchableOpacity
                  onPress={() => handlePaymentMethod("USDC")}
                  className="flex-row justify-between items-center py-3 px-5 bg-gray-50 rounded-lg w-full my-2"
                >
                  <View className="flex-row items-center">
                    <Image
                      source={require("../assets/images/icon.png")}
                      className="w-10 h-10 mr-4 rounded-full"
                    />
                    <View>
                      <Text className="text-lg font-medium">From account</Text>
                      <Text className="text-xs text-gray-500">
                        {displayBalance} available
                      </Text>
                    </View>
                  </View>
                  <Text className="text-2xl text-gray-500">➔</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handlePaymentMethod("mobileMoney")}
                  className="flex-row justify-between items-center py-4 px-5 bg-gray-50 rounded-lg w-full my-2"
                >
                  <View className="flex-row items-center">
                    <Image
                      source={require("../assets/images/mpesa.png")}
                      className="w-10 h-10 mr-4"
                      resizeMode="contain"
                    />
                    <Text className="text-lg font-medium">From M-Pesa</Text>
                  </View>
                  <Text className="text-2xl text-gray-500">➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : paymentMethod === "USDC" ? (
            <View className="bg-white rounded-t-[30px] p-4 pb-8">
              {isSuccess ? (
                <View className="items-center py-8">
                  <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                    <Text className="text-green-500 text-4xl">✓</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-2">Deposit Successful</Text>
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
                      onPress={() => setPaymentMethod("")}
                      className="p-2 absolute z-10 left-0"
                    >
                      <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center">
                      <Text className="text-xl font-semibold">Deposit from account</Text>
                    </View>
                  </View>

                  <View className="items-center mb-8">
                    <View className="flex-row items-center bg-gray-50 rounded-2xl px-6 py-4 w-full justify-center">
                      {currency === "KES" ? (
                        <Text className="text-xl font-bold text-gray-900 mr-2">KSh</Text>
                      ) : (
                        <Image
                          source={require("../assets/images/usdclogo.png")}
                          className="w-8 h-8 mr-3"
                        />
                      )}
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
                    <Text className="text-gray-500 mt-3 text-sm">
                      Balance: {displayBalance}
                    </Text>
                    {displayError ? (
                      <Text className="text-red-500 mt-3 text-sm">{displayError}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={handleUSDCDeposit}
                    disabled={isButtonDisabled}
                    className={`w-full py-4 rounded-xl items-center ${
                      isButtonDisabled ? "bg-gray-300" : "bg-downy-600"
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-lg font-bold">Deposit</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <MobileMoneyPay
              chamaName="Moonwell Save & Earn"
              chamaBlockchainId={0}
              chamaId={0}
              onClose={() => {
                resetState();
                onClose();
              }}
              onBack={() => setPaymentMethod("")}
              contributionAmount={Number(amount) || 0}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MoonwellDepositModal;
