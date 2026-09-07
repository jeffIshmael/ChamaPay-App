import React from "react";
import { View, Text } from "react-native";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react-native";

type Props = {
  /** Free USDC available in the Moonwell market (getCash). null = unknown. */
  liquidityUsd: number | null | undefined;
  /**
   * User's withdrawable balance in USDC. Used so green only means
   * "enough cash for YOUR full balance", not "pool has any dust".
   */
  neededUsdc?: number | null;
  /** Compact pill only (list cards). Full = badge + short explanation. */
  variant?: "badge" | "full";
  loading?: boolean;
};

type StatusKind = "available" | "limited" | "paused";

/**
 * Surfaces whether Moonwell withdrawals can succeed right now.
 * Compares pool cash to the user's balance (not just cash > 0).
 */
export default function MoonwellWithdrawStatus({
  liquidityUsd,
  neededUsdc = null,
  variant = "full",
  loading = false,
}: Props) {
  if (loading) {
    return (
      <View className="h-7 w-36 bg-gray-100 rounded-full self-start" />
    );
  }

  if (liquidityUsd == null) return null;

  const need =
    typeof neededUsdc === "number" && Number.isFinite(neededUsdc)
      ? Math.max(0, neededUsdc)
      : null;

  let kind: StatusKind;
  if (liquidityUsd <= 0) {
    kind = "paused";
  } else if (need != null && need > 0 && liquidityUsd + 1e-9 < need) {
    // Pool has some cash, but not enough to cover this user's balance
    kind = "limited";
  } else {
    kind = "available";
  }

  const styles = {
    available: {
      badgeBg: "bg-emerald-50 border-emerald-200",
      cardBg: "bg-emerald-50/80 border-emerald-100",
      text: "text-emerald-700",
      body: "text-emerald-800",
      icon: "#059669",
      label: "Withdraw available",
      copy: "The pool has enough free cash for your balance right now. Your funds stay yours.",
    },
    limited: {
      badgeBg: "bg-amber-50 border-amber-200",
      cardBg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      body: "text-amber-900",
      icon: "#d97706",
      label: "Limited liquidity",
      copy:
        need != null
          ? `The pool only has about ${liquidityUsd.toFixed(2)} USDC free right now, less than your ${need.toFixed(2)} USDC balance. You may withdraw up to the free amount, or try again later for a full exit. Your deposit is still safe and earning.`
          : "The pool has some free cash, but not enough for a full withdrawal right now. Your deposit is still safe and earning.",
    },
    paused: {
      badgeBg: "bg-amber-50 border-amber-200",
      cardBg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      body: "text-amber-900",
      icon: "#d97706",
      label: "Withdraw paused",
      copy: "The pool is fully borrowed right now, so there is no free cash to pay withdrawals. Your deposit is still safe and earning. Try again when the pool has money.",
    },
  }[kind];

  const Icon =
    kind === "available"
      ? CheckCircle2
      : kind === "limited"
        ? AlertTriangle
        : AlertCircle;

  const badge = (
    <View
      className={`flex-row items-center self-start px-2.5 py-1 rounded-full border ${styles.badgeBg}`}
    >
      <Icon size={13} color={styles.icon} />
      <Text className={`ml-1.5 text-[11px] font-bold ${styles.text}`}>
        {styles.label}
      </Text>
    </View>
  );

  if (variant === "badge") return badge;

  return (
    <View className={`rounded-2xl p-3 border ${styles.cardBg}`}>
      {badge}
      <Text className={`mt-2 text-xs leading-5 ${styles.body}`}>
        {styles.copy}
      </Text>
    </View>
  );
}
