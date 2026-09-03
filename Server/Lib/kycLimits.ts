/**
 * Chamapay tiered on-ramp limits (KES / calendar month).
 * See docs/fx_and_kyc_strategy.md
 */
export const KYC_TIER1_MONTHLY_KES = 20_000;
export const KYC_TIER2_MONTHLY_KES = 100_000;

export type KycTier = 1 | 2;

export const monthlyKesLimitForTier = (tier: number): number => {
  if (tier >= 2) return KYC_TIER2_MONTHLY_KES;
  return KYC_TIER1_MONTHLY_KES;
};

export const KYC_REQUIRED_CODE = "KYC_REQUIRED";
export const LIMIT_EXCEEDED_CODE = "LIMIT_EXCEEDED";
