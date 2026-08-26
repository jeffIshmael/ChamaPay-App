/**
 * Drive an FX OFFRAMP test against a running Server (FX_TEST_ENABLED=true).
 *
 * Usage:
 *   npx ts-node scripts/fxTestOfframp.ts
 *
 * Env (script):
 *   FX_TEST_BASE_URL   default http://localhost:3000
 *   FX_TEST_PHONE      M-Pesa sandbox phone
 *   FX_TEST_USDC       USDC amount (default 0.1)
 *   FX_TEST_USER       must match TEST_USER_PRIVATE_KEY address on server
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE = (process.env.FX_TEST_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const PHONE = process.env.FX_TEST_PHONE || "254708374149";
const USDC = Number(process.env.FX_TEST_USDC || "0.1");
const USER = process.env.FX_TEST_USER;

async function getJson(url: string) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== FX OFFRAMP test ===");
  console.log({ BASE, PHONE, USDC, USER });

  console.log("\n1) Balances BEFORE");
  const before = await getJson(
    `${BASE}/fx-test/balances${USER ? `?user=${USER}` : ""}`
  );
  console.log(JSON.stringify(before, null, 2));

  console.log("\n2) Start offramp");
  const start = await postJson(`${BASE}/fx-test/offramp/start`, {
    phone: PHONE,
    usdcAmount: USDC,
    ...(USER ? { userAddress: USER } : {}),
  });
  console.log(JSON.stringify(start, null, 2));

  const orderId = start.orderId as string;
  if (!orderId) {
    throw new Error("No orderId returned from offramp/start");
  }

  console.log(
    "\n3) Waiting for B2C result callback → settle/refund (poll /fx-test/order/:id)"
  );

  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    const status = await getJson(`${BASE}/fx-test/order/${orderId}`);
    const local = status.memory?.localStatus;
    const chain = status.onChain?.statusLabel;
    console.log(`[poll ${i + 1}] local=${local} onChain=${chain}`);

    if (
      local === "SETTLED" ||
      local === "REFUNDED" ||
      local === "FAILED" ||
      chain === "SETTLED" ||
      chain === "REFUNDED"
    ) {
      console.log("\n4) Final order status");
      console.log(JSON.stringify(status, null, 2));
      break;
    }
  }

  console.log("\n5) Balances AFTER");
  const after = await getJson(
    `${BASE}/fx-test/balances${USER ? `?user=${USER}` : ""}`
  );
  console.log(JSON.stringify(after, null, 2));
  console.log("\n=== OFFRAMP test complete ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
