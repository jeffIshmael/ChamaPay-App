import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, X } from "lucide-react-native";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { withdrawFromGoal } from "@/lib/goalService";
import {
  formatAmountTyping,
  parseAmountTyping,
} from "@/Utils/helperFunctions";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  goalId: number;
  goalName: string;
  balance: number;
  maxWithdrawable: number;
  token: string;
};

export default function GoalWithdrawModal({
  visible,
  onClose,
  onSuccess,
  goalId,
  goalName,
  balance,
  maxWithdrawable,
  token,
}: Props) {
  const { formatBalance } = useFormattedBalance();
  const { currency, platformRate } = useCurrencyStore();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const available = Math.min(
    balance,
    maxWithdrawable > 0 ? maxWithdrawable : balance
  );
  const isKES = currency === "KES" && platformRate > 0;
  const limit = isKES ? available * platformRate : available;

  useEffect(() => {
    if (!visible) {
      setAmount("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [visible]);

  const close = () => {
    if (loading) return;
    onClose();
  };

  const runWithdraw = async (mode: "all" | "amount", usdcAmount?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await withdrawFromGoal(
        goalId,
        { mode, amount: usdcAmount },
        token
      );
      if (!res.success) {
        setError(res.error || "Withdrawal failed");
        return;
      }
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setError("Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const entered = parseAmountTyping(amount);
    if (!entered || entered <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (entered > limit + 0.0001) {
      setError(`Insufficient balance. Available ${formatBalance(available)}`);
      return;
    }
    if (entered >= limit - 0.01) {
      await runWithdraw("all");
      return;
    }
    const amountUsdc = isKES
      ? (entered / platformRate).toFixed(6)
      : entered.toFixed(6);
    await runWithdraw("amount", amountUsdc);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={close} />
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">Withdraw</Text>
            <TouchableOpacity
              onPress={close}
              disabled={loading}
              className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>
            {goalName}
          </Text>
          <Text className="text-sm text-gray-700 mb-4">
            Available{" "}
            <Text className="font-bold text-gray-900">
              {formatBalance(available)}
            </Text>
          </Text>

          {success ? (
            <View className="items-center py-8">
              <View className="h-16 w-16 rounded-full bg-emerald-100 items-center justify-center mb-3">
                <Check size={28} color="#059669" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Withdrawn to wallet
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Amount
              </Text>
              <View className="mt-1.5 flex-row items-center h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 mb-2">
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(formatAmountTyping(v));
                    setError("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  className="flex-1 text-base font-bold text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                <Text className="text-xs font-bold text-gray-400">
                  {isKES ? "KES" : "USDC"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setAmount(
                    limit > 0
                      ? String(Number(limit.toFixed(isKES ? 2 : 3)))
                      : ""
                  )
                }
                className="mb-3"
              >
                <Text className="text-[11px] font-bold text-downy-700">Use max</Text>
              </TouchableOpacity>

              {error ? (
                <Text className="text-xs text-rose-600 mb-3">{error}</Text>
              ) : null}

              <View className="flex-row gap-2">
                <TouchableOpacity
                  disabled={loading || available <= 0}
                  onPress={() => void runWithdraw("all")}
                  className="flex-1 py-3 rounded-xl border border-gray-200 bg-white items-center disabled:opacity-50"
                >
                  <Text className="text-[13px] font-bold text-gray-800">
                    Withdraw all
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={loading || available <= 0}
                  onPress={() => void handleWithdraw()}
                  className="flex-1 py-3 rounded-xl bg-downy-600 items-center disabled:opacity-50"
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[13px] font-bold text-white">
                      Withdraw
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
