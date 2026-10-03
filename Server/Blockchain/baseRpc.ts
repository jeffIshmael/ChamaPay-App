import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

/**
 * Prefer authenticated RPCs — public https://mainnet.base.org rate-limits easily on Render.
 */
export function getBaseMainnetRpcUrls(): string[] {
  const urls: string[] = [];
  const add = (u?: string) => {
    const t = u?.trim();
    if (t && !urls.includes(t)) urls.push(t);
  };

  add(process.env.BASE_RPC_URL);
  add(process.env.BASE_MAINNET_RPC);

  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();
  if (alchemyKey) add(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`);

  add(process.env.BASE_RPC_URL_BACKUP); // optional second provider

  // Coinbase Developer Platform JSON-RPC also supports eth_call / receipts
  add(process.env.COINBASE_PAYMASTER_URL);

  add("https://mainnet.base.org"); // public: last resort only
  return urls;
}

/** Highest-priority URL. Kept for callers that need a single URL. */
export function getBaseMainnetRpcUrl(): string {
  return getBaseMainnetRpcUrls()[0];
}

type BasePublicClient = ReturnType<typeof createBasePublicClient>;

function createBasePublicClient() {
  const urls = getBaseMainnetRpcUrls();
  // hosts only: URLs often carry the API key in the path
  const hosts = urls.map((u) => u.replace(/^https?:\/\//, "").split("/")[0]);
  console.log(`[RPC] Base public client using hosts (in order): ${hosts.join(" -> ")}`);
  return createPublicClient({
    chain: base,
    // If an endpoint rate-limits or fails, move to the next one instead of retrying it repeatedly.
    transport: fallback(
      urls.map((url) =>
        http(url, {
          timeout: 15_000,
          retryCount: 1,
          retryDelay: 500,
        })
      )
    ),
    // merges readContract calls made in the same tick into one Multicall3 request
    batch: { multicall: true },
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
  // Walk the viem error chain and look at structured fields first. Matching a bare "429" in
  // String(error) is unsafe: viem errors embed the full calldata hex, which often contains "429".
  let e: any = error;
  for (let depth = 0; e && depth < 6; depth++) {
    if (e.status === 429 || e.code === 429 || e.code === -32016) return true;
    const msg = `${e.details ?? ""} ${e.shortMessage ?? ""} ${e.message ?? ""}`.toLowerCase();
    if (/rate limit|too many requests|\b429\b/.test(msg)) return true;
    e = e.cause;
  }
  return false;
}

/** Retry eth_call-style work when the RPC is throttling. */
export async function withRpcRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
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