import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/Contexts/AuthContext";
import { getAllBalances } from "@/constants/viem";
import { contributeToGoal } from "@/lib/goalService";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import {
  formatAmountTyping,
  parseAmountTyping,
} from "@/Utils/helperFunctions";
import MobileMoneyPay from "./MobileMoneyPay";
import GoalDepositSuccess from "./GoalDepositSuccess";

interface GoalDepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  goalId: number;
  goalName: string;
}

const GoalDepositModal = ({
  visible,
  onClose,
  onSuccess,
  goalId,
  goalName,
}: GoalDepositModalProps) => {
  const { user, token } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"" | "USDC" | "mobileMoney">("");
  const [USDCBalance, setUSDCBalance] = useState("0");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const [successLabel, setSuccessLabel] = useState<string | undefined>();
  const pendingSuccessRef = useRef(false);
  const { currency, platformRate } = useCurrencyStore();

  const displayBalance =
    currency === "KES"
      ? `KSh ${Math.floor(Number(USDCBalance || 0) * platformRate).toLocaleString()}`
      : `${Number(USDCBalance || 0).toFixed(3)} USDC`;

  const inputAmount = parseAmountTyping(amount);
  const actualUSDCAmount =
    currency === "KES" ? inputAmount / platformRate : inputAmount;
  const isAmountTooHigh = actualUSDCAmount > Number(USDCBalance);
  const displayError =
    error ||
    (isAmountTooHigh
      ? `Insufficient balance. You have ${displayBalance} available`
      : "");
  const isButtonDisabled =
    loading || !amount || isAmountTooHigh || inputAmount <= 0;

  useEffect(() => {
    const fetchUSDCBalance = async () => {
      if (user?.smartAddress) {
        const balance = await getAllBalances(user.smartAddress as `0x${string}`);
        setUSDCBalance(balance.USDC.displayValue);
      }
    };
    if (visible) fetchUSDCBalance();
  }, [user?.smartAddress, visible]);

  useEffect(() => {
    if (!visible) {
      setPaymentMethod("");
      setAmount("");
      setError("");
      setSuccessVisible(false);
      setSuccessLabel(undefined);
    }
  }, [visible]);

  const resetState = () => {
    setPaymentMethod("");
    setAmount("");
    setError("");
  };

  const finishFlow = () => {
    setSuccessVisible(false);
    resetState();
    onSuccess?.();
    onClose();
  };

  const showSuccess = (label?: string) => {
    pendingSuccessRef.current = true;
    setSuccessLabel(label);
    setSuccessVisible(true);
  };

  const handleMobileMoneyClose = () => {
    if (pendingSuccessRef.current) {
      pendingSuccessRef.current = false;
      setPaymentMethod("");
      return;
    }
    resetState();
    onClose();
  };

  const handleAccountDeposit = async () => {
    setLoading(true);
    setError("");
    try {
      const parsed = parseAmountTyping(amount);
      if (!parsed || parsed <= 0) {
        setError("Please enter a valid amount");
        return;
      }
      const usdc =
        currency === "KES" ? parsed / platformRate : parsed;
      if (isAmountTooHigh) return;
      if (!token) {
        setError("Authentication required");
        return;
      }

      const res = await contributeToGoal(goalId, usdc.toFixed(6), token);
      if (!res.success) {
        throw new Error(res.error || "Deposit failed");
      }

      const label =
        currency === "KES"
          ? `KSh ${Math.floor(parsed).toLocaleString()}`
          : `${usdc.toFixed(3)} USDC`;
      showSuccess(label);
    } catch {
      setError("Failed to process deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !successVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          resetState();
          onClose();
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="absolute inset-0"
            onPress={() => {
              resetState();
              onClose();
            }}
          />
          <View>
            {!paymentMethod ? (
              <View className="bg-white rounded-t-[30px] p-4 pb-8">
                <View className="flex-row items-center w-full mb-5">
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
                    <Text className="text-xl font-semibold">Deposit to goal</Text>
                    <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                      {goalName}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setPaymentMethod("USDC")}
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
                  onPress={() => setPaymentMethod("mobileMoney")}
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
            ) : paymentMethod === "USDC" ? (
              <View className="bg-white rounded-t-[30px] p-4 pb-8">
                <View className="flex-row items-center w-full mb-6">
                  <TouchableOpacity
                    onPress={() => setPaymentMethod("")}
                    className="p-2 absolute z-10 left-0"
                  >
                    <ArrowLeft size={24} color="#374151" />
                  </TouchableOpacity>
                  <View className="flex-1 items-center">
                    <Text className="text-xl font-semibold">From account</Text>
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
                        setAmount(formatAmountTyping(t, true));
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
                  onPress={handleAccountDeposit}
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
              </View>
            ) : (
              <MobileMoneyPay
                chamaName={goalName}
                chamaBlockchainId={0}
                chamaId={0}
                goalId={goalId}
                onClose={handleMobileMoneyClose}
                onBack={() => setPaymentMethod("")}
                onSuccess={(data) => {
                  const amt = data?.amount;
                  showSuccess(
                    amt ? `${Number(amt).toFixed(3)} USDC` : undefined
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <GoalDepositSuccess
        visible={successVisible}
        onDone={finishFlow}
        amountLabel={successLabel}
      />
    </>
  );
};

export default GoalDepositModal;
