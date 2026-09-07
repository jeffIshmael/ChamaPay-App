import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { KycStatusResponse } from "@/lib/kycService";

type Props = {
  verified: boolean;
  status: KycStatusResponse | null;
  /** True while KYC status is loading — avoids flashing KES 0 */
  loading?: boolean;
  /**
   * `full` — usage card for unverified users (profile + wallet deposit).
   * `limit-reached` — only when monthly headroom is exhausted (other M-Pesa flows).
   */
  variant?: "full" | "limit-reached";
  /** Tighter bottom margin (e.g. deposit screen above M-Pesa card) */
  dense?: boolean;
  onPress: () => void;
};

function formatKes(n: number): string {
  return Math.floor(n).toLocaleString();
}

function LimitCardSkeleton({ dense }: { dense?: boolean }) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-amber-200 bg-white px-4 py-3.5 ${
        dense ? "mb-0" : "mb-6"
      }`}
    >
      <View className="h-4 w-3/5 rounded-md bg-gray-100" />
      <View className="mt-2 h-3 w-2/5 rounded-md bg-gray-100" />
    </View>
  );
}

/**
 * Compact deposit-limit card for unverified users.
 * Hidden once identity is verified (no monthly M-Pesa cap nudge).
 * Progress fills the card background; no separate progress bar.
 */
export default function DepositLimitCard({
  verified,
  status,
  loading = false,
  variant = "full",
  dense = false,
  onPress,
}: Props) {
  const limitKes = status?.limitKes ?? 20_000;
  const mtdKes = status?.mtdKes ?? 0;
  const remainingKes =
    status?.remainingKes ?? Math.max(0, limitKes - mtdKes);
  const atLimit = remainingKes <= 0;
  const bottomGap = dense ? "mb-0" : "mb-6";

  const usedPct = useMemo(() => {
    if (limitKes <= 0) return 0;
    return Math.min(100, Math.max(0, (mtdKes / limitKes) * 100));
  }, [mtdKes, limitKes]);

  // Verified users — hide the monthly-limit nudge entirely.
  if (verified) return null;

  if (loading) {
    if (variant === "limit-reached") return null;
    return <LimitCardSkeleton dense={dense} />;
  }

  if (variant === "limit-reached") {
    if (!status?.success || !atLimit) return null;
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <Text className="text-[15px] font-semibold text-amber-950">
            You have reached your limit
          </Text>
          <Text className="mt-1 text-sm leading-5 text-amber-900/80">
            Verify details to increase your spending this month.
          </Text>
          <Text className="mt-2 text-sm font-semibold text-amber-700 underline">
            Verify identity
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const fillColor = "rgba(245,158,11,0.28)";
  const pctLabel =
    usedPct > 0 && usedPct < 1 ? "<1%" : `${Math.round(usedPct)}%`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        className={`overflow-hidden rounded-2xl border border-amber-200 bg-white ${bottomGap}`}
      >
        {/* Progress = width of the card background fill */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${usedPct}%`,
            backgroundColor: fillColor,
          }}
        />

        <View className="px-4 py-3.5">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 pr-2 text-[15px] font-bold text-gray-900">
              Monthly M-Pesa deposit limit is KES {formatKes(limitKes)}
            </Text>
            <Text className="mt-0.5 text-[13px] font-semibold text-amber-700 underline">
              Verify identity
            </Text>
          </View>

          <View className="mt-0.5 flex-row items-center justify-between gap-3">
            <Text className="flex-1 pr-2 text-[13px] text-gray-600">
              Verify identity to have no limit
            </Text>
            <Text className="text-[11px] font-semibold text-gray-700">
              KES {formatKes(mtdKes)} used · {pctLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
