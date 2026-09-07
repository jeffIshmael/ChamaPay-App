import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { KycStatusResponse } from "@/lib/kycService";

type Props = {
  verified: boolean;
  status: KycStatusResponse | null;
  onPress: () => void;
};

function formatKes(n: number): string {
  return Math.floor(n).toLocaleString();
}

/**
 * Compact deposit-limit card (same footprint as Edit Profile).
 * Whole card routes to verify-identity.
 */
export default function DepositLimitCard({ verified, status, onPress }: Props) {
  const limitKes = status?.limitKes ?? (verified ? 100_000 : 20_000);
  const mtdKes = status?.mtdKes ?? 0;

  const usedPct = useMemo(() => {
    if (limitKes <= 0) return 0;
    return Math.min(100, Math.max(0, (mtdKes / limitKes) * 100));
  }, [mtdKes, limitKes]);

  const barColor = verified ? "#10b981" : "#f59e0b";
  const pctLabel =
    usedPct > 0 && usedPct < 1 ? "<1%" : `${Math.round(usedPct)}%`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <View className="mb-3 flex-row items-start justify-between gap-3">
          <View className="flex-1 pr-2">
            <Text className="text-lg font-bold text-gray-900">
              Monthly M-Pesa limit is {formatKes(limitKes)}
            </Text>
            <Text className="mt-0.5 text-sm text-gray-600">
              {verified
                ? `KES ${formatKes(Math.max(0, limitKes - mtdKes))} remaining this month`
                : "Verify identity to have no limit"}
            </Text>
          </View>
          {!verified ? (
            <Text className="mt-1 text-sm font-semibold text-amber-600 underline">
              Verify identity
            </Text>
          ) : (
            <Text className="mt-1 text-sm font-semibold text-emerald-600">
              Verified
            </Text>
          )}
        </View>

        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-gray-700">
            KES {formatKes(mtdKes)}
          </Text>
          <Text className="text-xs font-semibold text-gray-500">{pctLabel}</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-gray-100">
          <View
            style={{
              width: `${Math.max(usedPct, usedPct > 0 ? 2 : 0)}%`,
              height: "100%",
              borderRadius: 999,
              backgroundColor: barColor,
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
