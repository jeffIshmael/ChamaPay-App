/**
 * Snapshot FX balances (treasury / escrow / test user) + queue M-Pesa float query.
 *
 * Usage:
 *   npx ts-node scripts/fxTestBalances.ts
 *
 * Env:
 *   FX_TEST_BASE_URL   default http://localhost:3000
 *   FX_TEST_USER       optional user address
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE = (process.env.FX_TEST_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const USER = process.env.FX_TEST_USER;

async function main() {
  console.log("=== FX balance snapshot ===");
  const url = `${BASE}/fx-test/balances${USER ? `?user=${USER}` : ""}`;
  console.log("GET", url);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  }

  console.log(JSON.stringify(body, null, 2));

  const chain = body.chain;
  if (chain?.belowUsdcWatermark) {
    console.warn(
      `⚠️ USDC treasury below watermark $${chain.usdcLowWatermark} (current $${chain.treasuryUsdc})`
    );
  } else {
    console.log(
      `USDC treasury OK: $${chain?.treasuryUsdc} (watermark $${chain?.usdcLowWatermark})`
    );
  }

  if (body.mpesaBalanceQueued) {
    console.log(
      "M-Pesa balance query accepted — final floats arrive on POST /mpesa/result (check server logs)."
    );
  }

  console.log("=== done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
