import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

/**
 * Prefer authenticated RPCs — public https://mainnet.base.org rate-limits easily on Render.
 */
export function getBaseMainnetRpcUrl(): string {
  const explicit =
    process.env.BASE_RPC_URL?.trim() ||
    process.env.BASE_MAINNET_RPC?.trim();
  if (explicit) return explicit;

  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();
  if (alchemyKey) {
    return `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }

  // Coinbase Developer Platform JSON-RPC also supports eth_call / receipts
  const cdpRpc = process.env.COINBASE_PAYMASTER_URL?.trim();
  if (cdpRpc) return cdpRpc;

  return "https://mainnet.base.org";
}

type BasePublicClient = ReturnType<typeof createBasePublicClient>;

function createBasePublicClient() {
  const url = getBaseMainnetRpcUrl();
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  console.log(`[RPC] Base public client using host: ${host}`);
  return createPublicClient({
    chain: base,
    transport: http(url, {
      timeout: 30_000,
      retryCount: 3,
      retryDelay: 750,
    }),
  });
}

let cachedClient: BasePublicClient | null = null;

export function getBasePublicClient(): BasePublicClient {
  if (!cachedClient) {
    cachedClient = createBasePublicClient();
  }
  return cachedClient;
}

export function isRpcRateLimitError(error: unknown): boolean {
  const text = String(error ?? "").toLowerCase();
  return (
    text.includes("over rate limit") ||
    text.includes("rate limit") ||
    text.includes("429") ||
    text.includes("too many requests")
  );
}

/** Retry eth_call-style work when the RPC is throttling. */
export async function withRpcRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 5
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRpcRateLimitError(error) || i === attempts - 1) throw error;
      const waitMs = 500 * Math.pow(2, i);
      console.warn(
        `[RPC] ${label} rate-limited (attempt ${i + 1}/${attempts}), retry in ${waitMs}ms`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}
