// We have 2 types of transactions:
// 1. Internal transfers (USDC)
// 2. Withdrawals to M-PESA (KES)
//
// Withdrawal schedule is ChamaPay's own: Safaricom send-tariff ranges as a
// reference for band widths, but fees step smoothly from 5 → 250 KES
// (no late spikes).

// Internal transfer fee lookup table (USDC)
// Bands widen with size; fees step smoothly up to a 1.00 USDC cap:
// +0.01 → +0.02 → +0.03 → +0.05 → +0.05 → +0.10 → +0.15 → +0.20 → +0.20 → +0.20
const TRANSFER_FEE_BRACKETS = [
  { min: 0.01, max: 1.0, fee: 0.01 }, // tiny sends
  { min: 1.01, max: 5.0, fee: 0.02 }, // +0.01
  { min: 5.01, max: 10.0, fee: 0.05 }, // +0.03
  { min: 10.01, max: 25.0, fee: 0.1 }, // +0.05
  { min: 25.01, max: 50.0, fee: 0.15 }, // +0.05
  { min: 50.01, max: 100.0, fee: 0.25 }, // +0.10
  { min: 100.01, max: 250.0, fee: 0.4 }, // +0.15
  { min: 250.01, max: 500.0, fee: 0.6 }, // +0.20
  { min: 500.01, max: 750.0, fee: 0.8 }, // +0.20
  { min: 750.01, max: 1000.0, fee: 1.0 }, // +0.20 (cap)
] as const;

const MAX_TRANSFER_FEE = 1.0;

export const internalTransferFee = (amount: number): number => {
  if (amount < 0.01) throw new Error("Minimum transfer amount is 0.01 USDC");

  const bracket = TRANSFER_FEE_BRACKETS.find(
    (b) => amount >= b.min && amount <= b.max
  );

  return bracket?.fee ?? MAX_TRANSFER_FEE;
};

/**
 * M-Pesa withdrawal fees (KES) — ChamaPay schedule.
 *
 * Design:
 * - Min fee 5, max fee 250
 * - Band widths grow with amount (Safaricom-style), but fee steps stay even:
 *   +5 → +10 → +15 → +20 → +25 → +30 → +35 → +35 → +35 → +35
 * - Effective rate falls as size grows (~1% at 500, ~0.25% at 100k)
 */
const WITHDRAWAL_FEE_BRACKETS = [
  { min: 100, max: 500, fee: 5 }, // +5 from floor
  { min: 501, max: 1000, fee: 10 }, // +5
  { min: 1001, max: 2500, fee: 20 }, // +10
  { min: 2501, max: 5000, fee: 35 }, // +15
  { min: 5001, max: 10000, fee: 55 }, // +20
  { min: 10001, max: 20000, fee: 80 }, // +25
  { min: 20001, max: 35000, fee: 110 }, // +30
  { min: 35001, max: 50000, fee: 145 }, // +35
  { min: 50001, max: 70000, fee: 180 }, // +35
  { min: 70001, max: 85000, fee: 215 }, // +35
  { min: 85001, max: 100000, fee: 250 }, // +35
] as const;

const MIN_WITHDRAWAL_FEE = 5;
const MAX_WITHDRAWAL_FEE = 250;

export const withdrawalToMpesaFee = (amount: number): number => {
  // Soft bounds for UI (avoid render crashes on empty/partial input)
  if (amount < 100) return MIN_WITHDRAWAL_FEE;
  if (amount > 100000) return MAX_WITHDRAWAL_FEE;

  const bracket = WITHDRAWAL_FEE_BRACKETS.find(
    (b) => amount >= b.min && amount <= b.max
  );

  return bracket?.fee ?? MAX_WITHDRAWAL_FEE;
};
