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

const DUST_USDC = 0.000001;

const roundUsdc6 = (value: number) =>
  Math.floor((Number.isFinite(value) ? value : 0) * 1e6) / 1e6;

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
  const [marketLiquidityUsd, setMarketLiquidityUsd] = useState<number | null>(
    null
  );
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<
    "principal" | "interest" | "all" | null
  >(null);
  /** Exact USDC to withdraw when a preset tab is used (avoids KES round-trip drift). */
  const [lockedUsdcAmount, setLockedUsdcAmount] = useState<number | null>(null);
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
          platformRate,
          token
        );
        setLiveTotal(snapshot.totalBalanceUsdc);
        setLiveEarned(snapshot.earnedUsdc);
        setLivePrincipal(snapshot.principalUsdc);
        setMarketLiquidityUsd(
          typeof snapshot.liquidityUsd === "number"
            ? snapshot.liquidityUsd
            : null
        );
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
    return roundUsdc6(usdc).toFixed(6).replace(/\.?0+$/, "") || "0";
  };

  const inputAmount = Number(amount) || 0;

  let actualUSDCAmount =
    lockedUsdcAmount != null
      ? roundUsdc6(lockedUsdcAmount)
      : roundUsdc6(
          isMax
            ? liveTotal
            : currency === "KES"
              ? inputAmount / (platformRate || 1)
              : inputAmount
        );

  const epsilon = currency === "KES" ? 0.05 / (platformRate || 1) : DUST_USDC;
  let isAmountTooHigh = false;
  let finalIsMax = isMax;

  if (!finalIsMax) {
    if (actualUSDCAmount > liveTotal + epsilon) {
      isAmountTooHigh = true;
    } else if (actualUSDCAmount >= liveTotal - epsilon) {
      // Avoid leaving sub-dust mUSDC behind — redeem full position.
      actualUSDCAmount = roundUsdc6(liveTotal);
      finalIsMax = true;
    }
  } else {
    actualUSDCAmount = roundUsdc6(liveTotal);
  }

  const displayBalance =
    currency === "KES"
      ? `KSh ${getKesValue(liveTotal).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${roundUsdc6(liveTotal).toFixed(6)} USDC`;

  const displayEarned =
    currency === "KES"
      ? `KSh ${getKesValue(liveEarned).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${roundUsdc6(liveEarned).toFixed(6)} USDC`;

  const displayError =
    error ||
    (isAmountTooHigh
      ? `Insufficient balance. You have ${displayBalance} available`
      : "");

  const isButtonDisabled =
    loading ||
    isLiveLoading ||
    isAmountTooHigh ||
    actualUSDCAmount <= 0 ||
    (!amount && lockedUsdcAmount == null);

  const applyPreset = (preset: "principal" | "interest" | "all") => {
    setError("");
    setActivePreset(preset);

    if (preset === "all") {
      const usdc = roundUsdc6(liveTotal);
      setIsMax(true);
      setLockedUsdcAmount(usdc);
      setAmount(formatUsdcForInput(usdc));
      return;
    }

    const raw = preset === "principal" ? livePrincipal : liveEarned;
    const capped = Math.min(Math.max(0, raw), liveTotal);
    const usdc = roundUsdc6(capped);

    if (usdc <= 0) {
      setIsMax(false);
      setLockedUsdcAmount(null);
      setAmount("");
      setError(
        preset === "interest"
          ? "No yield available to withdraw yet"
          : "No principal available to withdraw"
      );
      return;
    }

    // If this tab covers (almost) the whole position, redeem max so wallet gets everything.
    const nearAll = usdc >= liveTotal - DUST_USDC;
    setIsMax(nearAll);
    setLockedUsdcAmount(nearAll ? roundUsdc6(liveTotal) : usdc);
    setAmount(formatUsdcForInput(nearAll ? liveTotal : usdc));
  };

  const handleWithdraw = async () => {
    setLoading(true);
    setError("");

    try {
      if (isAmountTooHigh || actualUSDCAmount <= 0) {
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
        body: JSON.stringify({
          amount: actualUSDCAmount,
          isMax: finalIsMax,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const shown =
          currency === "KES"
            ? `KSh ${getKesValue(actualUSDCAmount).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}`
            : `${actualUSDCAmount.toFixed(6)} USDC`;
        setSuccessData({
          txHash: data.txHash,
          message: `Successfully withdrew ${shown} from Moonwell to your wallet.`,
          amount: String(actualUSDCAmount),
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
    setLockedUsdcAmount(null);
    onSuccess(successData);
  };

  const resetState = () => {
    setAmount("");
    setIsMax(false);
    setActivePreset(null);
    setLockedUsdcAmount(null);
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

              {marketLiquidityUsd != null && marketLiquidityUsd <= 0 ? (
                <View className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Text className="text-amber-800 text-xs leading-5">
                    Moonwell USDC has no free liquidity right now (borrowers are
                    using the cash). Your deposit is safe — withdraws will work
                    again when liquidity returns.
                  </Text>
                </View>
              ) : null}

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
                      setLockedUsdcAmount(null);
                    }}
                    keyboardType="numeric"
                    className="flex-1 py-4 text-gray-900 text-lg font-bold"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View className="flex-row justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => applyPreset("principal")}
                    disabled={isLiveLoading || livePrincipal <= 0}
                    className={`flex-1 rounded-lg py-2 mr-2 items-center border ${
                      livePrincipal <= 0
                        ? "bg-gray-50 opacity-50 border-gray-200"
                        : presetTabClass("principal")
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        livePrincipal <= 0
                          ? "text-gray-400"
                          : presetTextClass("principal")
                      }`}
                    >
                      Principal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => applyPreset("interest")}
                    disabled={isLiveLoading || liveEarned <= DUST_USDC}
                    className={`flex-1 rounded-lg py-2 mr-2 items-center border ${
                      liveEarned <= DUST_USDC
                        ? "bg-gray-50 opacity-50 border-gray-200"
                        : presetTabClass("interest")
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        liveEarned <= DUST_USDC
                          ? "text-gray-400"
                          : presetTextClass("interest")
                      }`}
                    >
                      Interest
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => applyPreset("all")}
                    disabled={isLiveLoading || liveTotal <= 0}
                    className={`flex-1 rounded-lg py-2 items-center border ${
                      liveTotal <= 0
                        ? "bg-gray-50 opacity-50 border-gray-200"
                        : presetTabClass("all")
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        liveTotal <= 0
                          ? "text-gray-400"
                          : presetTextClass("all")
                      }`}
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
