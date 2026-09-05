import axios from "axios";
import { serverUrl } from "../constants/serverUrl";
import type { Transaction } from "./walletServices";

/** Moonwell HTTP API — https://agents.moonwell.fi/skill.md */
const MOONWELL_API_BASE = "https://api.moonwell.fi/v1";

/** Native USDC market on Base (non-deprecated). */
export const MOONWELL_USDC_MARKET_ADDRESS =
  "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22";

export interface MoonwellUsdcSnapshot {
  /** Current supplied USDC value on Moonwell (principal + accrued interest). */
  totalBalanceUsdc: number;
  /** Net USDC deposited via ChamaPay (deposits − withdrawals). */
  principalUsdc: number;
  /** Accrued interest: totalBalance − principal. */
  earnedUsdc: number;
  supplyApy: number | null;
  marketTotalSupplyUsd: number | null;
  /** Free USDC in the market; <= 0 means withdraws will fail until liquidity returns. */
  liquidityUsd?: number | null;
}

const parseUsd = (value: unknown): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const emptySnapshot = (principalUsdc = 0): MoonwellUsdcSnapshot => ({
  totalBalanceUsdc: 0,
  principalUsdc: Math.max(0, principalUsdc),
  earnedUsdc: 0,
  supplyApy: null,
  marketTotalSupplyUsd: null,
  liquidityUsd: null,
});

const splitPrincipalYield = (
  totalBalanceUsdc: number,
  principalUsdc: number,
  supplyApy: number | null,
  marketTotalSupplyUsd: number | null,
  liquidityUsd: number | null = null
): MoonwellUsdcSnapshot => {
  const tracked = Math.max(0, principalUsdc);
  if (tracked > 0) {
    return {
      totalBalanceUsdc,
      principalUsdc: Math.min(tracked, totalBalanceUsdc),
      earnedUsdc: Math.max(0, totalBalanceUsdc - tracked),
      supplyApy,
      marketTotalSupplyUsd,
      liquidityUsd,
    };
  }
  return {
    totalBalanceUsdc,
    principalUsdc: totalBalanceUsdc,
    earnedUsdc: 0,
    supplyApy,
    marketTotalSupplyUsd,
    liquidityUsd,
  };
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
 * Direct Moonwell HTTP reads (docs: positions + markets + health).
 * Used when Chamapay /moonwell/live-snapshot is not deployed yet (404).
 */
const fetchSnapshotFromMoonwellApi = async (
  address: string,
  principalUsdc: number
): Promise<MoonwellUsdcSnapshot | null> => {
  if (!address) return null;

  try {
    const headers = {
      Accept: "application/json",
      "User-Agent": "ChamapayApp/1.0",
    };

    // Prefer positions?active=true (skill.md) — Base has two mUSDC markets;
    // pick the non-deprecated native market by address.
    const [posRes, marketRes, healthRes] = await Promise.all([
      axios.get(`${MOONWELL_API_BASE}/positions/${address}`, {
        params: { chain: "base", active: true },
        headers,
        timeout: 15000,
      }),
      axios.get(`${MOONWELL_API_BASE}/markets/USDC`, {
        params: { chain: "base" },
        headers,
        timeout: 15000,
      }),
      axios.get(`${MOONWELL_API_BASE}/health/${address}`, {
        params: { chain: "base" },
        headers,
        timeout: 15000,
      }),
    ]);

    const rows: any[] = posRes.data?.data ?? [];
    const target = MOONWELL_USDC_MARKET_ADDRESS.toLowerCase();
    const usdcRow = rows.find(
      (pos) => String(pos?.marketAddress ?? "").toLowerCase() === target
    );

    const fromPosition = usdcRow ? parseUsd(usdcRow.suppliedUsd) : null;
    const fromHealth = parseUsd(healthRes.data?.data?.totalSupplyUsd);
    const totalBalanceUsdc =
      fromPosition != null && fromPosition > 0 ? fromPosition : fromHealth;

    const market = marketRes.data?.data;
    const supplyApy =
      typeof market?.baseSupplyApy === "number" ? market.baseSupplyApy : null;
    const marketTotalSupplyUsd =
      typeof market?.totalSupplyUsd === "number"
        ? market.totalSupplyUsd
        : null;
    const liquidityUsd =
      typeof market?.liquidityUsd === "number" ? market.liquidityUsd : null;

    return splitPrincipalYield(
      totalBalanceUsdc,
      principalUsdc,
      supplyApy,
      marketTotalSupplyUsd,
      liquidityUsd
    );
  } catch (error) {
    console.warn(
      "Moonwell public API fallback failed (device may block api.moonwell.fi):",
      (error as any)?.message || error
    );
    return null;
  }
};

const fetchSnapshotFromServer = async (
  principalUsdc: number,
  token: string
): Promise<MoonwellUsdcSnapshot | null> => {
  try {
    const response = await axios.get(`${serverUrl}/moonwell/live-snapshot`, {
      params: { principal: principalUsdc },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });

    const snapshot = response.data?.snapshot;
    if (!response.data?.success || !snapshot) return null;

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
      liquidityUsd:
        typeof snapshot.liquidityUsd === "number"
          ? snapshot.liquidityUsd
          : null,
    };
  } catch (error: any) {
    const status = error?.response?.status;
    // 404 = Render not on the build that added /live-snapshot yet
    console.warn(
      `Moonwell live-snapshot via server failed${status ? ` (${status})` : ""} — trying Moonwell API`
    );
    return null;
  }
};

/**
 * Live Moonwell USDC snapshot for Save & Earn UI.
 * 1) Chamapay server proxy (preferred)
 * 2) Moonwell public API (positions / health / markets) per their docs
 */
export const getMoonwellUsdcSnapshot = async (
  address: string,
  principalUsdc = 0,
  _chain = "base",
  _platformRate = 132,
  token?: string | null
): Promise<MoonwellUsdcSnapshot> => {
  if (token) {
    const fromServer = await fetchSnapshotFromServer(principalUsdc, token);
    if (fromServer) return fromServer;
  }

  const fromApi = await fetchSnapshotFromMoonwellApi(address, principalUsdc);
  if (fromApi) return fromApi;

  return emptySnapshot(principalUsdc);
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
    console.warn("Error fetching Moonwell yields history:", error);
    return null;
  }
};
