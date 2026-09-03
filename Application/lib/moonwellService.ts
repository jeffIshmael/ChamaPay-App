import axios from "axios";
import { serverUrl } from "../constants/serverUrl";
import type { Transaction } from "./walletServices";

/** Moonwell API — https://agents.moonwell.fi/skill.md */
const MOONWELL_API_BASE = "https://api.moonwell.fi/v1";

/** Native USDC market on Base (non-deprecated). */
export const MOONWELL_USDC_MARKET_ADDRESS =
  "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22";

export interface MoonwellPositionRow {
  market: string;
  marketAddress: string;
  suppliedUsd: number;
  borrowedUsd: number;
  collateralUsd: number;
  collateralEnabled: boolean;
  deprecated?: boolean;
}

export interface MoonwellUsdcSnapshot {
  /** Current supplied USDC value on Moonwell (principal + accrued interest). */
  totalBalanceUsdc: number;
  /** Net USDC deposited via ChamaPay (deposits − withdrawals). */
  principalUsdc: number;
  /** Accrued interest: totalBalance − principal. */
  earnedUsdc: number;
  supplyApy: number | null;
  marketTotalSupplyUsd: number | null;
}

const normalizeAddress = (address: string) => address.toLowerCase();

const parseUsd = (value: unknown): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const isMoonwellDepositTx = (tx: Transaction) => {
  const desc = tx.description ?? "";
  return (
    desc === "Moonwell Deposit" ||
    desc === "Moonwell Deposit via M-Pesa" ||
    desc.startsWith("Moonwell Deposit") ||
    tx.rawReceiver === "Moonwell"
  );
};

const isMoonwellWithdrawalTx = (tx: Transaction) => {
  const desc = tx.description ?? "";
  return (
    desc === "Moonwell Withdrawal" ||
    desc.startsWith("Moonwell Withdrawal") ||
    tx.rawSender === "Moonwell"
  );
};

/**
 * Net principal from ChamaPay Moonwell deposit / withdrawal records.
 */
export const computeMoonwellPrincipalUsdc = (
  transactions: Transaction[]
): number => {
  let net = 0;

  for (const tx of transactions) {
    const amount = Math.abs(parseFloat(tx.amount) || 0);
    if (!amount) continue;

    if (isMoonwellWithdrawalTx(tx)) net -= amount;
    else if (isMoonwellDepositTx(tx)) net += amount;
  }

  return Math.max(0, net);
};

/**
 * Fetches the real-time APY and market data for USDC on Base from Moonwell.
 */
export const getMoonwellRates = async (chain = "base", asset = "USDC") => {
  try {
    const response = await axios.get(
      `${MOONWELL_API_BASE}/rates?chain=${chain}&asset=${asset}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Moonwell rates:", error);
    return null;
  }
};

/**
 * Fetches per-market USDC metadata (TVL, APY).
 */
export const getMoonwellUsdcMarket = async (chain = "base") => {
  try {
    const response = await axios.get(
      `${MOONWELL_API_BASE}/markets/USDC?chain=${chain}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Moonwell USDC market:", error);
    return null;
  }
};

/**
 * Fetches the user's Moonwell positions (all markets).
 * Pass activeOnly=true to drop empty markets (?active=true).
 */
export const getMoonwellPositions = async (
  address: string,
  chain = "base",
  activeOnly = false
): Promise<MoonwellPositionRow | null> => {
  if (!address) return null;

  try {
    const query = activeOnly
      ? `?chain=${chain}&active=true`
      : `?chain=${chain}`;
    const response = await axios.get(
      `${MOONWELL_API_BASE}/positions/${address}${query}`
    );

    const rows: MoonwellPositionRow[] = response.data?.data ?? [];
    const target = normalizeAddress(MOONWELL_USDC_MARKET_ADDRESS);

    const usdcMarket = rows.find(
      (pos) => normalizeAddress(pos.marketAddress) === target
    );

    if (!usdcMarket) return null;

    return {
      ...usdcMarket,
      suppliedUsd: parseUsd(usdcMarket.suppliedUsd),
      borrowedUsd: parseUsd(usdcMarket.borrowedUsd),
      collateralUsd: parseUsd(usdcMarket.collateralUsd),
    };
  } catch (error) {
    console.error("Error fetching Moonwell positions:", error);
    return null;
  }
};

/**
 * Live Moonwell USDC snapshot for Save & Earn UI.
 * - totalBalanceUsdc: suppliedUsd from Moonwell (includes yield)
 * - principalUsdc: net ChamaPay deposits (optional)
 * - earnedUsdc: interest accrued on Moonwell
 */
export const getMoonwellUsdcSnapshot = async (
  address: string,
  principalUsdc = 0,
  chain = "base",
  _platformRate = 132
): Promise<MoonwellUsdcSnapshot> => {
  const empty: MoonwellUsdcSnapshot = {
    totalBalanceUsdc: 0,
    principalUsdc: 0,
    earnedUsdc: 0,
    supplyApy: null,
    marketTotalSupplyUsd: null,
  };

  if (!address) return empty;

  try {
    const [position, marketRes, ratesRes] = await Promise.all([
      getMoonwellPositions(address, chain, false),
      getMoonwellUsdcMarket(chain),
      getMoonwellRates(chain, "USDC"),
    ]);

    const totalBalanceUsdc = position?.suppliedUsd ?? 0;
    const trackedPrincipal = Math.max(0, principalUsdc);

    // Yield = Moonwell balance − ChamaPay net deposits.
    // KES display rounding (ceil) is handled in the UI — do not zero out real yield here.
    let principalForDisplay: number;
    let earnedUsdc: number;

    if (trackedPrincipal > 0) {
      earnedUsdc = Math.max(0, totalBalanceUsdc - trackedPrincipal);
      principalForDisplay = Math.min(trackedPrincipal, totalBalanceUsdc);
    } else {
      // No deposit history — treat full Moonwell balance as principal.
      principalForDisplay = totalBalanceUsdc;
      earnedUsdc = 0;
    }

    const market = marketRes?.data;
    const rateRow = ratesRes?.data?.[0];
    const supplyApy =
      typeof market?.baseSupplyApy === "number"
        ? market.baseSupplyApy
        : typeof rateRow?.baseSupplyApy === "number"
          ? rateRow.baseSupplyApy
          : null;

    return {
      totalBalanceUsdc,
      principalUsdc: principalForDisplay,
      earnedUsdc,
      supplyApy,
      marketTotalSupplyUsd:
        typeof market?.totalSupplyUsd === "number"
          ? market.totalSupplyUsd
          : null,
    };
  } catch (error) {
    console.error("Error building Moonwell snapshot:", error);
    return empty;
  }
};

/**
 * Fetches the user's historical Moonwell yields from the backend (daily snapshots).
 */
export const getMoonwellYieldsHistory = async (token: string) => {
  if (!token) return null;
  try {
    const response = await axios.get(`${serverUrl}/moonwell/yields`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching Moonwell yields history:", error);
    return null;
  }
};
