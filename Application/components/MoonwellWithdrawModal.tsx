import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { useAuth } from "@/Contexts/AuthContext";
import { serverUrl } from "@/constants/serverUrl";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import {
  computeMoonwellPrincipalUsdc,
  getMoonwellUsdcSnapshot,
} from "@/lib/moonwellService";
import { getTheUserTx } from "@/lib/walletServices";

interface MoonwellWithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  availableBalance: number;
  earnedUsdc?: number;
  principalUsdc?: number;
}

const MoonwellWithdrawModal = ({
  visible,
  onClose,
  onSuccess,
  availableBalance,
  earnedUsdc: earnedUsdcProp,
  principalUsdc: principalUsdcProp,
}: MoonwellWithdrawModalProps) => {
  const { token, user } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [liveTotal, setLiveTotal] = useState(availableBalance);
  const [liveEarned, setLiveEarned] = useState(earnedUsdcProp ?? 0);
  const [livePrincipal, setLivePrincipal] = useState(principalUsdcProp ?? 0);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<
    "principal" | "interest" | "all" | null
  >(null);
  const [isMax, setIsMax] = useState(false);
  const { currency, platformRate } = useCurrencyStore();
  const { getKesValue } = useFormattedBalance();

  useEffect(() => {
    if (!visible) return;

    setLiveTotal(availableBalance);
    setLiveEarned(earnedUsdcProp ?? 0);
    setLivePrincipal(principalUsdcProp ?? 0);

    if (!user?.smartAddress) return;

    const fetchLive = async () => {
      setIsLiveLoading(true);
      try {
        let principal = principalUsdcProp ?? 0;
        if (token && principal === 0) {
          const txRes = await getTheUserTx(token, { limit: 100 });
          const moonwellTxs =
            txRes?.transactions.filter(
              (tx) =>
                tx.rawReceiver === "Moonwell" ||
                tx.rawSender === "Moonwell" ||
                tx.description?.includes("Moonwell")
            ) ?? [];
          principal = computeMoonwellPrincipalUsdc(moonwellTxs);
        }

        const snapshot = await getMoonwellUsdcSnapshot(
          user.smartAddress,
          principal,
          "base",
          platformRate
        );
        setLiveTotal(snapshot.totalBalanceUsdc);
        setLiveEarned(snapshot.earnedUsdc);
        setLivePrincipal(snapshot.principalUsdc);
      } catch (err) {
        console.error("Failed to fetch live Moonwell yield", err);
      } finally {
        setIsLiveLoading(false);
      }
    };

    fetchLive();
  }, [
    visible,
    user?.smartAddress,
    token,
    platformRate,
    availableBalance,
    earnedUsdcProp,
    principalUsdcProp,
  ]);

  const formatUsdcForInput = (usdc: number) => {
    if (currency === "KES") {
      return getKesValue(usdc).toFixed(2);
    }
    return (Math.ceil(usdc * 1000) / 1000).toFixed(3);
  };

  const inputAmount = Number(amount) || 0;
  let actualUSDCAmount = isMax
    ? liveTotal
    : currency === "KES"
      ? inputAmount / platformRate
      : inputAmount;

  const epsilon = currency === "KES" ? 0.05 / platformRate : 0.0001;
  let isAmountTooHigh = false;
  let finalIsMax = isMax;

  if (!isMax) {
    if (actualUSDCAmount > liveTotal + epsilon) {
      isAmountTooHigh = true;
    } else if (actualUSDCAmount >= liveTotal - epsilon) {
      actualUSDCAmount = liveTotal;
      finalIsMax = true;
    }
  }

  const displayBalance =
    currency === "KES"
      ? `KSh ${getKesValue(liveTotal).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${(Math.ceil(liveTotal * 1000) / 1000).toFixed(3)} USDC`;

  const displayEarned =
    currency === "KES"
      ? `KSh ${getKesValue(liveEarned).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${liveEarned.toFixed(6)} USDC`;

  const displayError =
    error ||
    (isAmountTooHigh
      ? `Insufficient balance. You have ${displayBalance} available`
      : "");
  const isButtonDisabled =
    loading || !amount || isAmountTooHigh || inputAmount <= 0;

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
          message: `Successfully withdrew ${currency === "KES" ? "KSh " : ""}${inputAmount.toLocaleString()} ${currency === "KES" ? "" : "USDC"} from Moonwell.`,
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
    setActivePreset(null);
    onSuccess(successData);
  };

  const resetState = () => {
    setAmount("");
    setIsMax(false);
    setActivePreset(null);
    setError("");
    setIsSuccess(false);
    setSuccessData(null);
  };

  const presetTabClass = (preset: "principal" | "interest" | "all") =>
    activePreset === preset
      ? "bg-blue-600/15 border-blue-400"
      : "bg-gray-100 border-gray-200";

  const presetTextClass = (preset: "principal" | "interest" | "all") =>
    activePreset === preset ? "text-blue-700" : "text-gray-700";

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
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Withdrawal Successful
              </Text>
              <Text className="text-gray-500 text-center mb-8 px-4">
                {successData?.message}
              </Text>
              <TouchableOpacity
                onPress={handleFinalSuccess}
                className="w-full bg-[#10b981] py-4 rounded-xl"
              >
                <Text className="text-white text-center font-bold text-lg">
                  Continue
                </Text>
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
                  <Text className="text-xl font-semibold">
                    Withdraw from Moonwell
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mb-2 mt-2">
                <Text className="text-gray-500 font-medium">
                  Total Balance (Inc. Yield)
                </Text>
                {isLiveLoading ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <Text className="text-gray-900 font-bold">
                    {displayBalance}
                  </Text>
                )}
              </View>

              <View className="flex-row items-center justify-between mb-4 p-3 rounded-lg border border-green-200">
                <Text className="text-green-700 font-medium">
                  Total Yield Earned
                </Text>
                {isLiveLoading ? (
                  <ActivityIndicator size="small" color="#15803d" />
                ) : (
                  <Text className="text-green-700 font-bold">
                    {displayEarned}
                  </Text>
                )}
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 font-medium mb-2">
                  Amount to Withdraw
                </Text>

                <View
                  className={`flex-row items-center border ${isAmountTooHigh ? "border-red-300 bg-red-50" : "border-gray-200"} rounded-xl px-4 bg-gray-50 mb-3`}
                >
                  <Text className="text-gray-500 font-bold mr-2 text-lg">
                    {currency === "KES" ? "KSh" : "$"}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val: string) => {
                      setAmount(val);
                      setIsMax(false);
                      setActivePreset(null);
                    }}
                    keyboardType="numeric"
                    className="flex-1 py-4 text-gray-900 text-lg font-bold"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View className="flex-row justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => {
                      setAmount(formatUsdcForInput(livePrincipal));
                      setIsMax(false);
                      setActivePreset("principal");
                    }}
                    className={`flex-1 rounded-lg py-2 mr-2 items-center border ${presetTabClass("principal")}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${presetTextClass("principal")}`}
                    >
                      Principal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setAmount(formatUsdcForInput(liveEarned));
                      setIsMax(false);
                      setActivePreset("interest");
                    }}
                    disabled={liveEarned <= 0}
                    className={`flex-1 rounded-lg py-2 mr-2 items-center border ${liveEarned <= 0 ? "bg-gray-50 opacity-50 border-gray-200" : presetTabClass("interest")}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${liveEarned <= 0 ? "text-gray-400" : presetTextClass("interest")}`}
                    >
                      Interest
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setAmount(formatUsdcForInput(liveTotal));
                      setIsMax(true);
                      setActivePreset("all");
                    }}
                    className={`flex-1 rounded-lg py-2 items-center border ${presetTabClass("all")}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${presetTextClass("all")}`}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                </View>

                {displayError ? (
                  <Text className="text-red-500 text-xs mt-1 ml-1">
                    {displayError}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={isButtonDisabled}
                className={`w-full py-4 rounded-xl flex-row justify-center items-center ${isButtonDisabled ? "bg-blue-300" : "bg-blue-600"}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-lg font-bold">
                    Confirm Withdraw
                  </Text>
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
