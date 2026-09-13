import React from "react";
import { View, Text } from "react-native";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react-native";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { formatCurrency } from "@/Utils/pretiumUtils";

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

function formatMoney(
  usdc: number,
  isKES: boolean,
  getKesValue: (n: number) => number
): string {
  if (isKES) {
    const kes = getKesValue(usdc);
    if (usdc > 0 && kes < 0.01) return "less than KES 0.01";
    return `KES ${formatCurrency(kes, 2)}`;
  }
  if (usdc > 0 && usdc < 0.01) return `${usdc.toFixed(4)} USDC`;
  return `${usdc.toFixed(2)} USDC`;
}

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
  const { currency } = useCurrencyStore();
  const { getKesValue } = useFormattedBalance();
  const isKES = currency === "KES";

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
    kind = "limited";
  } else {
    kind = "available";
  }

  const freeLabel = formatMoney(liquidityUsd, isKES, getKesValue);
  const needLabel =
    need != null ? formatMoney(need, isKES, getKesValue) : null;

  const styles = {
    available: {
      badgeBg: "bg-emerald-50 border-emerald-200",
      cardBg: "bg-emerald-50/80 border-emerald-100",
      text: "text-emerald-700",
      body: "text-emerald-800",
      icon: "#059669",
      label: "Withdraw available",
      copy: isKES
        ? "The pool has enough free cash for your full balance right now. You can withdraw to your wallet (shown in KES)."
        : "The pool has enough free cash for your full balance right now. You can withdraw to your wallet.",
    },
    limited: {
      badgeBg: "bg-amber-50 border-amber-200",
      cardBg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      body: "text-amber-900",
      icon: "#d97706",
      label: "Limited free cash",
      copy:
        needLabel != null
          ? `Your money is still safe and earning, but others have borrowed most of the pool. Only about ${freeLabel} is free right now, less than your ${needLabel} balance, so a full withdrawal may not go through. Try a smaller amount, or come back when more cash returns.`
          : `Your money is still safe and earning, but others have borrowed most of the pool. Only about ${freeLabel} is free right now, so a full withdrawal may not go through.`,
    },
    paused: {
      badgeBg: "bg-amber-50 border-amber-200",
      cardBg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      body: "text-amber-900",
      icon: "#d97706",
      label: "Withdraw paused",
      copy: isKES
        ? "Borrowers are using the pool’s cash right now, so there is nothing free to pay withdrawals. Your deposit (shown in KES) is still safe and earning. Try again when free cash returns."
        : "Borrowers are using the pool’s cash right now, so there is nothing free to pay withdrawals. Your deposit is still safe and earning. Try again when free cash returns.",
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
