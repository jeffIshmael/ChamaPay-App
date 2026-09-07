import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { KycStatusResponse } from "@/lib/kycService";

type Props = {
  verified: boolean;
  status: KycStatusResponse | null;
  /** True while usage/limit amounts are still loading */
  loading?: boolean;
  /**
   * `profile` — larger card with horizontal progress bar (profile settings).
   * `deposit` — compact card with progress as background fill (deposit USDC).
   * `limit-reached` — only when monthly headroom is exhausted (other M-Pesa flows).
   */
  variant?: "profile" | "deposit" | "limit-reached";
  /** Tighter bottom margin (e.g. deposit screen above M-Pesa card) */
  dense?: boolean;
  onPress: () => void;
};

function formatKes(n: number): string {
  return Math.floor(n).toLocaleString();
}

function InlineSkeleton({ className }: { className: string }) {
  return <View className={`rounded-md bg-gray-200 ${className}`} />;
}

/**
 * Deposit-limit card for unverified users.
 * Hidden once identity is verified.
 * While usage loads, the card shell stays visible; only amount / % / bar skeleton.
 */
export default function DepositLimitCard({
  verified,
  status,
  loading = false,
  variant = "profile",
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
    if (loading || limitKes <= 0) return 0;
    return Math.min(100, Math.max(0, (mtdKes / limitKes) * 100));
  }, [mtdKes, limitKes, loading]);

  // Verified users — hide the monthly-limit nudge entirely.
  if (verified) return null;

  if (variant === "limit-reached") {
    if (loading || !status?.success || !atLimit) return null;
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

  const pctLabel =
    usedPct > 0 && usedPct < 1 ? "<1%" : `${Math.round(usedPct)}%`;

  // Profile settings — horizontal progress bar
  if (variant === "profile") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View
          className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-lg ${bottomGap}`}
        >
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="flex-1 pr-2">
              <Text className="text-lg font-bold text-gray-900">
                Monthly M-Pesa limit is {formatKes(limitKes)}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-600">
                Verify identity to have no limit
              </Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-amber-600 underline">
              Verify identity
            </Text>
          </View>

          <View className="mb-1.5 flex-row items-center justify-between">
            {loading ? (
              <>
                <InlineSkeleton className="h-3 w-16" />
                <InlineSkeleton className="h-3 w-8" />
              </>
            ) : (
              <>
                <Text className="text-xs font-semibold text-gray-700">
                  KES {formatKes(mtdKes)}
                </Text>
                <Text className="text-xs font-semibold text-gray-500">
                  {pctLabel}
                </Text>
              </>
            )}
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-gray-100">
            {loading ? (
              <View className="h-full w-full rounded-full bg-gray-200" />
            ) : (
              <View
                style={{
                  width: `${Math.max(usedPct, usedPct > 0 ? 2 : 0)}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: "#f59e0b",
                }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Deposit USDC — progress as card background fill
  const fillColor = "rgba(245,158,11,0.28)";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        className={`overflow-hidden rounded-2xl border border-amber-200 bg-white ${bottomGap}`}
      >
        {!loading ? (
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
        ) : null}

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
            {loading ? (
              <InlineSkeleton className="h-3 w-24" />
            ) : (
              <Text className="text-[11px] font-semibold text-gray-700">
                KES {formatKes(mtdKes)} used · {pctLabel}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
