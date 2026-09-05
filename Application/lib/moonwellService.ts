import axios from "axios";
import { serverUrl } from "../constants/serverUrl";
import type { Transaction } from "./walletServices";

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
 * Live Moonwell USDC snapshot for Save & Earn UI.
 * Goes through Chamapay server (proxies Moonwell API + on-chain fallback)
 * so Android/iOS do not call api.moonwell.fi directly.
 */
export const getMoonwellUsdcSnapshot = async (
  _address: string,
  principalUsdc = 0,
  _chain = "base",
  _platformRate = 132,
  token?: string | null
): Promise<MoonwellUsdcSnapshot> => {
  const empty: MoonwellUsdcSnapshot = {
    totalBalanceUsdc: 0,
    principalUsdc: 0,
    earnedUsdc: 0,
    supplyApy: null,
    marketTotalSupplyUsd: null,
  };

  if (!token) {
    console.warn(
      "getMoonwellUsdcSnapshot: missing auth token — cannot load live Moonwell data"
    );
    return {
      ...empty,
      principalUsdc: Math.max(0, principalUsdc),
    };
  }

  try {
    const response = await axios.get(`${serverUrl}/moonwell/live-snapshot`, {
      params: { principal: principalUsdc },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });

    const snapshot = response.data?.snapshot;
    if (!response.data?.success || !snapshot) {
      return {
        ...empty,
        principalUsdc: Math.max(0, principalUsdc),
      };
    }

    return {
      totalBalanceUsdc: parseUsd(snapshot.totalBalanceUsdc),
      principalUsdc: parseUsd(snapshot.principalUsdc),
      earnedUsdc: parseUsd(snapshot.earnedUsdc),
      supplyApy:
        typeof snapshot.supplyApy === "number" ? snapshot.supplyApy : null,
      marketTotalSupplyUsd:
        typeof snapshot.marketTotalSupplyUsd === "number"
          ? snapshot.marketTotalSupplyUsd
          : null,
    };
  } catch (error) {
    console.error("Error fetching Moonwell live snapshot via server:", error);
    return {
      ...empty,
      principalUsdc: Math.max(0, principalUsdc),
    };
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
