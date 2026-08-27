# FX Test Harness — Server env vars

Add these to `Server/.env`, then restart the server.  
Existing Pretium routes are unchanged. `/mpesa` and `/fx-test` mount **only** when `FX_TEST_ENABLED=true`.

## Feature flag

```env
FX_TEST_ENABLED=true
```

## Base Sepolia escrow

```env
ESCROW_ADDRESS=0xf0253CF2591c5E30A0dD80624921d21D576774E9
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_SEPOLIA_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## EOA private keys (must match on-chain agent / treasury)

```env
AGENT_PRIVATE_KEY=0x...       # escrow agent (createOrder / settleOrder / refundOrder)
TREASURY_PRIVATE_KEY=0x...    # treasury EOA holding Sepolia USDC (onramp escrow)
TEST_USER_PRIVATE_KEY=0x...   # funded test user (receives onramp / funds offramp)
```

## FX rate + USDC watermark

```env
CHAMAPAY_RATE=132
FX_USDC_LOW_WATERMARK=200
```

Optional KES float warning (logged on `/mpesa/result` balance callback):

```env
FX_KES_LOW_WATERMARK=20000
```

## M-Pesa sandbox (required by `Lib/MpesaFunctions.ts`)

These names are read at module load — missing values throw:

```env
MPESA_CUSTOMER_KEY=...
MPESA_CONSUMER_SECRET=...
CHAMAPAY_TILL=...
MPESA_PASSKEY=...
MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline
MPESA_INITIATOR=...
SECURITY_CREDENTIAL=...
SANDBOX_URL=https://sandbox.safaricom.co.ke
MPESA_CALLBACK_URL=https://<your-public-tunnel>
```

`MPESA_CALLBACK_URL` must be the public base URL **with no path**. Code appends:

| Daraja callback | Path |
|-----------------|------|
| STK result | `/mpesa/stk/callback` |
| B2C result | `/mpesa/b2c/result` |
| B2C timeout | `/mpesa/b2c/timeout` |
| Account balance | `/mpesa/result` |
| Generic timeout | `/mpesa/timeout` |
| Tx status | `/mpesa/transaction-status/result` |

## Driver HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/fx-test/onramp/start` | `{ phone, kesAmount, userAddress? }` |
| POST | `/fx-test/offramp/start` | `{ phone, usdcAmount, userAddress? }` |
| GET | `/fx-test/order/:orderId` | memory + on-chain status |
| GET | `/fx-test/orders` | list in-memory records |
| GET | `/fx-test/balances` | USDC snapshot + queue M-Pesa float |
| POST | `/fx-test/order/:orderId/settle` | manual settle (debug) |
| POST | `/fx-test/order/:orderId/refund` | manual refund (debug) |

## Scripts

```bash
cd Server
# server must be running with FX_TEST_ENABLED=true and a public tunnel for callbacks
npx ts-node scripts/fxTestBalances.ts
npx ts-node scripts/fxTestOnramp.ts
npx ts-node scripts/fxTestOfframp.ts
```

Script overrides:

```env
FX_TEST_BASE_URL=http://localhost:3000
FX_TEST_PHONE=254708374149
FX_TEST_KES=10
FX_TEST_USDC=0.1
FX_TEST_USER=0x...   # optional; must match TEST_USER_PRIVATE_KEY for offramp
```

## Known RPC race (fixed in EscrowFunctions)

Empty escrow orders default to `status=PENDING` with `token=address(0)`. If `escrowFunds` is simulated before `createOrder` is visible on the RPC node, Daraja-side never runs and you get:

`SafeERC20FailedOperation(address(0))` / `0x5274afe7` with zero address in the error data.

`EscrowFunctions` now: checks tx receipt status, polls until the order is readable after `createOrder`, refuses `escrowFunds` on empty orders, and uses max USDC allowance after a proper approve(0) reset when needed.

## Preconditions

1. Agent, treasury, and test user have Base Sepolia ETH for gas.
2. Treasury holds Base Sepolia USDC; test user holds USDC for offramp.
3. On-chain `agent` / `treasury` match the private keys above.
4. `MPESA_CALLBACK_URL` is publicly reachable (ngrok / cloudflared / deployed URL).
