import { PrismaClient } from "@prisma/client";
import {
  KYC_REQUIRED_CODE,
  KYC_TIER1_MONTHLY_KES,
  KYC_TIER2_MONTHLY_KES,
  LIMIT_EXCEEDED_CODE,
  monthlyKesLimitForTier,
} from "./kycLimits";

const prisma = new PrismaClient();

/** Statuses that count toward monthly on-ramp usage (paid or in flight). */
const ONRAMP_COUNT_STATUSES = [
  "pending",
  "PENDING",
  "processing",
  "PROCESSING",
  "COMPLETE",
  "complete",
  "SUCCESS",
  "success",
];

export function getTier1MonthlyKes(): number {
  const n = Number(process.env.KYC_TIER1_MONTHLY_KES);
  return Number.isFinite(n) && n > 0 ? n : KYC_TIER1_MONTHLY_KES;
}

export function getTier2MonthlyKes(): number {
  const n = Number(process.env.KYC_TIER2_MONTHLY_KES);
  return Number.isFinite(n) && n > 0 ? n : KYC_TIER2_MONTHLY_KES;
}

export function resolveMonthlyLimit(kycTier: number): number {
  if (kycTier >= 2) return getTier2MonthlyKes();
  return getTier1MonthlyKes();
}

export function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Sum of KES on-ramp amounts for the user in the current UTC calendar month.
 */
export async function getMonthToDateOnrampKes(userId: number): Promise<number> {
  const since = startOfUtcMonth();
  const rows = await prisma.pretiumTransaction.findMany({
    where: {
      userId,
      isOnramp: true,
      createdAt: { gte: since },
      status: { in: ONRAMP_COUNT_STATUSES },
    },
    select: { amount: true },
  });

  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export type OnrampLimitCheck =
  | { ok: true; mtdKes: number; limitKes: number; remainingKes: number; kycTier: number }
  | {
      ok: false;
      code: typeof KYC_REQUIRED_CODE | typeof LIMIT_EXCEEDED_CODE;
      message: string;
      mtdKes: number;
      limitKes: number;
      remainingKes: number;
      kycTier: number;
      requestedKes: number;
    };

/**
 * Gate a new on-ramp amount against the user's tier monthly cap.
 */
export async function checkOnrampKesAllowed(
  userId: number,
  requestedKes: number
): Promise<OnrampLimitCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycTier: true, kycStatus: true },
  });

  const kycTier = user?.kycTier ?? 1;
  const limitKes = resolveMonthlyLimit(kycTier);
  const mtdKes = await getMonthToDateOnrampKes(userId);
  const remainingKes = Math.max(0, limitKes - mtdKes);

  if (requestedKes <= 0) {
    return {
      ok: false,
      code: LIMIT_EXCEEDED_CODE,
      message: "Invalid on-ramp amount",
      mtdKes,
      limitKes,
      remainingKes,
      kycTier,
      requestedKes,
    };
  }

  if (mtdKes + requestedKes <= limitKes) {
    return { ok: true, mtdKes, limitKes, remainingKes, kycTier };
  }

  // Over Tier-1 but under Tier-2 ceiling → need KYC upgrade
  if (kycTier < 2 && mtdKes + requestedKes <= getTier2MonthlyKes()) {
    return {
      ok: false,
      code: KYC_REQUIRED_CODE,
      message:
        "You have reached your monthly deposit limit. Verify your identity to increase it.",
      mtdKes,
      limitKes,
      remainingKes,
      kycTier,
      requestedKes,
    };
  }

  return {
    ok: false,
    code: LIMIT_EXCEEDED_CODE,
    message: `This deposit would exceed your monthly limit of ${limitKes.toLocaleString()} KES.`,
    mtdKes,
    limitKes,
    remainingKes,
    kycTier,
    requestedKes,
  };
}

export { monthlyKesLimitForTier, KYC_REQUIRED_CODE, LIMIT_EXCEEDED_CODE };
