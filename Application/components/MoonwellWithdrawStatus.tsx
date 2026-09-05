import React from "react";
import { View, Text } from "react-native";
import { CheckCircle2, AlertCircle } from "lucide-react-native";

type Props = {
  /** Free USDC available in the Moonwell market. null = unknown / still loading. */
  liquidityUsd: number | null | undefined;
  /** Compact pill only (list cards). Full = badge + short explanation. */
  variant?: "badge" | "full";
  loading?: boolean;
};

/**
 * Surfaces whether Moonwell withdrawals can succeed right now.
 * Liquidity = free cash in the pool (getCash / markets.liquidityUsd).
 */
export default function MoonwellWithdrawStatus({
  liquidityUsd,
  variant = "full",
  loading = false,
}: Props) {
  if (loading) {
    return (
      <View className="h-7 w-36 bg-gray-100 rounded-full self-start" />
    );
  }

  if (liquidityUsd == null) return null;

  const canWithdraw = liquidityUsd > 0;

  const badge = (
    <View
      className={`flex-row items-center self-start px-2.5 py-1 rounded-full border ${
        canWithdraw
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      {canWithdraw ? (
        <CheckCircle2 size={13} color="#059669" />
      ) : (
        <AlertCircle size={13} color="#d97706" />
      )}
      <Text
        className={`ml-1.5 text-[11px] font-bold ${
          canWithdraw ? "text-emerald-700" : "text-amber-800"
        }`}
      >
        {canWithdraw ? "Withdraw available" : "Withdraw paused"}
      </Text>
    </View>
  );

  if (variant === "badge") return badge;

  return (
    <View
      className={`rounded-2xl p-3 border ${
        canWithdraw
          ? "bg-emerald-50/80 border-emerald-100"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      {badge}
      <Text
        className={`mt-2 text-xs leading-5 ${
          canWithdraw ? "text-emerald-800" : "text-amber-900"
        }`}
      >
        {canWithdraw
          ? "You can withdraw anytime while the pool has free money (liquidity). Your funds stay yours."
          : "The pool is fully borrowed right now, so there is no free cash to pay withdrawals. Your deposit is still safe and earning. Try again when the pool has money."}
      </Text>
    </View>
  );
}
