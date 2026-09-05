import { formatUnits } from "viem";
import { moonwellUSDCAddress } from "../Blockchain/Constants";
import { getBasePublicClient, withRpcRetry } from "../Blockchain/baseRpc";

const MOONWELL_API_BASE = "https://api.moonwell.fi/v1";
const USDC_MARKET = moonwellUSDCAddress.toLowerCase();

const MTOKEN_VIEW_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "exchangeRateStored",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCash",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type MoonwellLiveSnapshot = {
  totalBalanceUsdc: number;
  supplyApy: number | null;
  marketTotalSupplyUsd: number | null;
  /** Available USDC in the market. <= 0 means withdraws will fail (TOKEN_INSUFFICIENT_CASH). */
  liquidityUsd: number | null;
  source: "moonwell-api" | "on-chain" | "none";
};

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ChamapayServer/1.0",
      },
    });
    if (!res.ok) {
      console.warn(`[Moonwell API] ${url} -> ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn(`[Moonwell API] fetch failed ${url}`, error);
    return null;
  }
}

/** Underlying USDC value of an account's mUSDC via exchange rate (on-chain). */
export async function readMoonwellUsdcBalanceOnChain(
  wallet: string
): Promise<number> {
  const client = getBasePublicClient();
  const owner = wallet as `0x${string}`;
  const mToken = moonwellUSDCAddress as `0x${string}`;

  const [mBal, rate] = await Promise.all([
    withRpcRetry("mUSDC.balanceOf", () =>
      client.readContract({
        address: mToken,
        abi: MTOKEN_VIEW_ABI,
        functionName: "balanceOf",
        args: [owner],
      })
    ),
    withRpcRetry("mUSDC.exchangeRateStored", () =>
      client.readContract({
        address: mToken,
        abi: MTOKEN_VIEW_ABI,
        functionName: "exchangeRateStored",
      })
    ),
  ]);

  // Compound-style: underlying = balance * exchangeRate / 1e18
  const underlyingWei = (mBal * rate) / 10n ** 18n;
  return Number(formatUnits(underlyingWei, 6));
}

/** On-chain free USDC sitting in the mUSDC market (getCash). */
export async function readMoonwellMarketCashUsdc(): Promise<number> {
  const client = getBasePublicClient();
  const cash = await withRpcRetry("mUSDC.getCash", () =>
    client.readContract({
      address: moonwellUSDCAddress as `0x${string}`,
      abi: MTOKEN_VIEW_ABI,
      functionName: "getCash",
    })
  );
  return Number(formatUnits(cash, 6));
}

export async function getMoonwellMarketUsdc(): Promise<{
  supplyApy: number | null;
  marketTotalSupplyUsd: number | null;
  liquidityUsd: number | null;
} | null> {
  const body = await fetchJson(`${MOONWELL_API_BASE}/markets/USDC?chain=base`);
  const market = body?.data;
  if (!market) return null;
  return {
    supplyApy:
      typeof market.baseSupplyApy === "number" ? market.baseSupplyApy : null,
    marketTotalSupplyUsd:
      typeof market.totalSupplyUsd === "number" ? market.totalSupplyUsd : null,
    liquidityUsd:
      typeof market.liquidityUsd === "number" ? market.liquidityUsd : null,
  };
}

export async function getMoonwellPositionUsdcFromApi(
  address: string
): Promise<number | null> {
  const body = await fetchJson(
    `${MOONWELL_API_BASE}/positions/${address}?chain=base&active=true`
  );
  const rows = body?.data;
  if (!Array.isArray(rows)) return null;

  const usdc = rows.find(
    (pos: any) =>
      typeof pos?.marketAddress === "string" &&
      pos.marketAddress.toLowerCase() === USDC_MARKET
  );
  if (!usdc) return 0;
  const n = Number(usdc.suppliedUsd);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Live supplied USDC + market meta.
 * Prefer Moonwell HTTP API; fall back to on-chain mToken math when API is blocked.
 */
export async function getMoonwellLiveSnapshot(
  address: string
): Promise<MoonwellLiveSnapshot> {
  const empty = (
    source: MoonwellLiveSnapshot["source"],
    market?: Awaited<ReturnType<typeof getMoonwellMarketUsdc>>
  ): MoonwellLiveSnapshot => ({
    totalBalanceUsdc: 0,
    supplyApy: market?.supplyApy ?? null,
    marketTotalSupplyUsd: market?.marketTotalSupplyUsd ?? null,
    liquidityUsd: market?.liquidityUsd ?? null,
    source,
  });

  if (!address) return empty("none");

  const [apiBalance, market] = await Promise.all([
    getMoonwellPositionUsdcFromApi(address),
    getMoonwellMarketUsdc(),
  ]);

  // Prefer on-chain getCash when API liquidity is missing/negative
  let liquidityUsd = market?.liquidityUsd ?? null;
  if (liquidityUsd == null || liquidityUsd <= 0) {
    try {
      liquidityUsd = await readMoonwellMarketCashUsdc();
    } catch {
      /* keep API value */
    }
  }

  if (apiBalance != null) {
    return {
      totalBalanceUsdc: apiBalance,
      supplyApy: market?.supplyApy ?? null,
      marketTotalSupplyUsd: market?.marketTotalSupplyUsd ?? null,
      liquidityUsd,
      source: "moonwell-api",
    };
  }

  try {
    const onChain = await readMoonwellUsdcBalanceOnChain(address);
    return {
      totalBalanceUsdc: onChain,
      supplyApy: market?.supplyApy ?? null,
      marketTotalSupplyUsd: market?.marketTotalSupplyUsd ?? null,
      liquidityUsd,
      source: "on-chain",
    };
  } catch (error) {
    console.error("[Moonwell] on-chain balance failed", error);
    return empty("none", market);
  }
}
