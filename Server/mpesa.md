# ChamaPay M-Pesa (Daraja) Integration Guide

This document describes how ChamaPay integrates with Safaricom's **Daraja API**. It is written for coding agents and developers wiring on-ramp (STK Push), off-ramp (B2C), balance checks, and transaction reconciliation.

**Implementation file:** `Server/Lib/MpesaFunctions.ts`  
**Portal:** [Safaricom Daraja](https://developer.safaricom.co.ke/)

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Environment variables](#environment-variables)
3. [Authentication](#authentication)
4. [Shared helpers](#shared-helpers)
5. [API 1 — STK Push (on-ramp)](#api-1--stk-push-on-ramp)
6. [API 2 — B2C payment (off-ramp)](#api-2--b2c-payment-off-ramp)
7. [API 3 — Account balance](#api-3--account-balance)
8. [API 4 — Transaction status](#api-4--transaction-status)
9. [Callback routes to implement](#callback-routes-to-implement)
10. [Function reference](#function-reference)
11. [ChamaPay product mapping](#chamapay-product-mapping)
12. [Error handling](#error-handling)
13. [Agent integration checklist](#agent-integration-checklist)

---

## Architecture overview

ChamaPay uses four Daraja APIs:

| API | ChamaPay use | Direction | Sync response | Final result |
|-----|--------------|-----------|---------------|--------------|
| **M-Pesa Express (STK Push)** | Customer deposits KES | Customer → Business | Immediate ack | `CallBackURL` |
| **B2C v3** | Customer withdraws KES | Business → Customer | Immediate ack | `ResultURL` |
| **Account Balance** | Monitor float | Read-only | Immediate ack | `ResultURL` |
| **Transaction Status** | Reconcile missed callbacks | Read-only | Immediate ack | `ResultURL` |

### Two-step async pattern

Most Daraja APIs work in two steps:

```
Your server  ──POST──►  Daraja  ──►  Immediate JSON (ResponseCode: "0" = accepted)
                              │
                              └──►  Later POST to your callback URL (actual result)
```

**Never treat the immediate `ResponseCode: "0"` as payment success.** It only means Daraja accepted the request. The money movement (or balance data) arrives in the callback.

### STK Push is slightly different

STK Push sends the **final payment result** to `CallBackURL` in a `Body.stkCallback` shape (not the generic `Result` object used by B2C/Balance/Transaction Status).

### Environments

| | Sandbox | Production |
|---|---------|------------|
| Base URL | `https://sandbox.safaricom.co.ke` | `https://api.safaricom.co.ke` |
| Set via | `SANDBOX_URL` env var | Same env var, different value |

---

## Environment variables

All variables below are read by `MpesaFunctions.ts` at startup. Missing required vars throw on module load.

```env
# OAuth — all API calls
MPESA_CUSTOMER_KEY=          # Daraja app Consumer Key
MPESA_CONSUMER_SECRET=       # Daraja app Consumer Secret

# Business shortcode / till
CHAMAPAY_TILL=               # PartyA / BusinessShortCode (5–6 digits)

# STK Push password encryption
MPESA_PASSKEY=               # From Daraja portal (sandbox default exists in code)
MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline   # Till default; use CustomerPayBillOnline for Paybill

# Initiator credentials — B2C, Account Balance, Transaction Status
MPESA_INITIATOR=             # API operator username (Initiator / InitiatorName)
SECURITY_CREDENTIAL=         # RSA-encrypted initiator password (NOT consumer secret)

# Public base URL for Daraja callbacks (must be HTTPS in production)
MPESA_CALLBACK_URL=https://your-server.example.com

# Daraja host
SANDBOX_URL=https://sandbox.safaricom.co.ke
```

### Credential types (do not mix them up)

| Credential | Used for | How to obtain |
|------------|----------|---------------|
| `MPESA_CUSTOMER_KEY` + `MPESA_CONSUMER_SECRET` | OAuth Bearer token | Daraja app dashboard |
| `MPESA_PASSKEY` | STK `Password` field | Daraja Lipa Na M-PESA / test credentials |
| `MPESA_INITIATOR` + `SECURITY_CREDENTIAL` | B2C, balance, tx status | M-PESA portal API user; encrypt password with Safaricom public cert |

STK Push `Password` formula:

```
Password = base64( BusinessShortCode + Passkey + Timestamp )
Timestamp = YYYYMMDDHHmmss
```

---

## Authentication

Every API call (except OAuth itself) needs a Bearer token:

```
GET {SANDBOX_URL}/oauth/v1/generate?grant_type=client_credentials
Authorization: Basic base64(consumerKey:consumerSecret)
```

Implemented internally as `getAccessToken()` — not exported. Token is fetched fresh per function call.

---

## Shared helpers

Import from `Server/Lib/MpesaFunctions.ts`:

### `formatMpesaPhoneNumber(phone)`

Normalizes Kenyan numbers to `254XXXXXXXXX` (12 digits).

```ts
formatMpesaPhoneNumber("0712345678")   // → "254712345678"
formatMpesaPhoneNumber(254712345678)  // → "254712345678"
formatMpesaPhoneNumber("712345678")     // → "254712345678"
```

Use for all `PartyB` (B2C) and STK `PartyA` / `PhoneNumber` fields.

### `generateOriginatorConversationID(shortCode?)`

Unique ID per B2C request. Prevents duplicate disbursement (Daraja error `500.002.1001`).

---

## API 1 — STK Push (on-ramp)

Customer receives an M-Pesa prompt on their phone to pay the business till/paybill.

### Daraja endpoint

```
POST {SANDBOX_URL}/mpesa/stkpush/v1/processrequest
Authorization: Bearer {access_token}
Content-Type: application/json
```

Production: `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`

### ChamaPay functions

| Function | Purpose |
|----------|---------|
| `tillPushStk(amount, phone, accountReference)` | Legacy wrapper |
| `initiateStkPush(options)` | Preferred — full options |
| `checkPushStatus(checkoutRequestId)` | Poll if callback is slow |
| `parseStkPushCallback(body)` | Parse `CallBackURL` payload |

### Usage

```ts
import {
  initiateStkPush,
  parseStkPushCallback,
  checkPushStatus,
} from "./Lib/MpesaFunctions";

// Initiate payment
const result = await initiateStkPush({
  amount: "500",
  phoneNumber: "0712345678",
  accountReference: "DEP123",       // max 12 chars — store in DB to match callback
  transactionDesc: "ChamaPay 500",  // max 13 chars, optional
  transactionType: "CustomerBuyGoodsOnline", // default for Till
});

if (!result || "errorCode" in result) {
  // Handle Daraja error (400.002.02 Invalid BusinessShortCode, etc.)
}

if (result.ResponseCode !== "0") {
  // Request not accepted
}

// Save these — needed for status query and reconciliation
const { CheckoutRequestID, MerchantRequestID } = result;
```

### Request body (sent by `initiateStkPush`)

| Field | Source | Notes |
|-------|--------|-------|
| `BusinessShortCode` | `CHAMAPAY_TILL` | Numeric |
| `Password` | `base64(shortcode + passkey + timestamp)` | Must match Timestamp |
| `Timestamp` | `YYYYMMDDHHmmss` | Same as used in Password |
| `TransactionType` | `MPESA_TRANSACTION_TYPE` | `CustomerBuyGoodsOnline` (Till) or `CustomerPayBillOnline` (Paybill) |
| `Amount` | argument | String, whole KES |
| `PartyA` | formatted phone | Payer |
| `PartyB` | `CHAMAPAY_TILL` | Receiver |
| `PhoneNumber` | formatted phone | STK prompt target |
| `CallBackURL` | `{MPESA_CALLBACK_URL}/mpesa/stk/callback` | |
| `AccountReference` | argument | Max 12 chars |
| `TransactionDesc` | argument | Max 13 chars |

### Immediate response (success)

```json
{
  "MerchantRequestID": "2654-4b64-97ff-b827b542881d3130",
  "CheckoutRequestID": "ws_CO_1007202409152617172396192",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

`ResponseCode: "0"` = STK prompt queued. **Not payment confirmed.**

### STK callback (`CallBackURL`)

Daraja POSTs to `{MPESA_CALLBACK_URL}/mpesa/stk/callback`.

**Success example:**

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 500 },
          { "Name": "MpesaReceiptNumber", "Value": "SG632NMUAB" },
          { "Name": "TransactionDate", "Value": 20240823153000 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

**Failure example (user cancelled):**

```json
{
  "Body": {
    "stkCallback": {
      "ResultCode": 1032,
      "ResultDesc": "Request cancelled by user"
    }
  }
}
```

**Parse in your route handler:**

```ts
const outcome = parseStkPushCallback(req.body);

if (outcome.success) {
  // outcome.mpesaReceiptNumber, outcome.amount, outcome.phoneNumber
  // Credit user / mark deposit complete in DB
} else {
  // outcome.code, outcome.description
}
```

### STK status query (optional poll)

If callback is delayed, poll with the `CheckoutRequestID`:

```
POST {SANDBOX_URL}/mpesa/stkpushquery/v1/query
```

```ts
const status = await checkPushStatus(checkoutRequestId);
// status.ResultCode === "0" → payment completed
// status.ResultCode === "1032" → cancelled by user
```

---

## API 2 — B2C payment (off-ramp)

Send KES from the business shortcode to a customer's M-Pesa wallet.

### Daraja endpoint

```
POST {SANDBOX_URL}/mpesa/b2c/v3/paymentrequest
```

Production: `https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest`

### ChamaPay functions

| Function | Purpose |
|----------|---------|
| `sendB2CPayment(options)` | Initiate disbursement |
| `parseB2CCallback(body)` | Parse `ResultURL` payload |
| `B2CMpesaTx(amount, phone, remarks)` | Deprecated wrapper |
| `B2C_RESULT_CODES` | Map of result code → description |

### Usage

```ts
import { sendB2CPayment, parseB2CCallback } from "./Lib/MpesaFunctions";

const result = await sendB2CPayment({
  amount: "500",
  phoneNumber: "0712345678",
  remarks: "ChamaPay withdrawal",   // 2–100 chars
  commandId: "BusinessPayment",     // default; or SalaryPayment, PromotionPayment
  occasion: "Withdrawal",           // optional
});

if (!result || "errorCode" in result) {
  // e.g. Duplicate OriginatorConversationID
}

if (result.ResponseCode !== "0") {
  // Not accepted
}

// Save for reconciliation
const { ConversationID, OriginatorConversationID } = result;
```

### Request body (sent by `sendB2CPayment`)

| Field | Source | Notes |
|-------|--------|-------|
| `OriginatorConversationID` | auto-generated | Unique per request |
| `InitiatorName` | `MPESA_INITIATOR` | |
| `SecurityCredential` | `SECURITY_CREDENTIAL` | Encrypted password |
| `CommandID` | `BusinessPayment` (default) | |
| `Amount` | argument | String |
| `PartyA` | `CHAMAPAY_TILL` | Sender shortcode |
| `PartyB` | formatted phone | Recipient |
| `Remarks` | argument | 2–100 chars |
| `QueueTimeOutURL` | `{MPESA_CALLBACK_URL}/mpesa/b2c/timeout` | Note: capital O in TimeOut |
| `ResultURL` | `{MPESA_CALLBACK_URL}/mpesa/b2c/result` | |
| `Occassion` | argument | Daraja spelling (double s) |

### Immediate response

```json
{
  "ConversationID": "AG_20240706_20106e9209f64bebd05b",
  "OriginatorConversationID": "600997_Test_32et3241ed8yu",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

### B2C result callback (`ResultURL`)

Daraja POSTs to `{MPESA_CALLBACK_URL}/mpesa/b2c/result`.

**Success:**

```json
{
  "Result": {
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "ConversationID": "AG_20240706_2010364430d9bbdaf872",
    "TransactionID": "SG632NMUAB",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 500 },
        { "Key": "TransactionReceipt", "Value": "SG632NMUAB" },
        { "Key": "ReceiverPartyPublicName", "Value": "254712345678 - JOHN DOE" },
        { "Key": "TransactionCompletedDateTime", "Value": "23.08.2026 15:30:52" }
      ]
    }
  }
}
```

**Parse:**

```ts
const outcome = parseB2CCallback(req.body);

if (outcome.success) {
  // outcome.details.transactionReceipt
  // outcome.details.receiverName, receiverPhone
} else {
  // outcome.code — see B2C_RESULT_CODES
}
```

### Common B2C result codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Insufficient utility account balance |
| `2` | Below minimum amount |
| `3` | Above maximum amount |
| `4` | Would exceed daily limit |
| `2001` | Invalid initiator credentials |
| `2028` | Shortcode not permitted for B2C |

Full map: `B2C_RESULT_CODES` in `MpesaFunctions.ts`.

---

## API 3 — Account balance

Query float across Working / Utility / Charges Paid accounts.

### Daraja endpoint

```
POST {SANDBOX_URL}/mpesa/accountbalance/v1/query
```

### ChamaPay functions

| Function | Purpose |
|----------|---------|
| `checkBalance()` | Initiate balance query |
| `parseAccountBalanceCallback(body)` | Parse result |
| `parseAccountBalanceValue(value)` | Parse pipe-delimited balance string |

### Usage

```ts
import {
  checkBalance,
  parseAccountBalanceCallback,
} from "./Lib/MpesaFunctions";

const ack = await checkBalance();
// ack.ResponseCode === "0" → query queued; balances come via callback
```

### Request body

| Field | Value |
|-------|-------|
| `Initiator` | `MPESA_INITIATOR` |
| `SecurityCredential` | `SECURITY_CREDENTIAL` |
| `CommandID` | `AccountBalance` |
| `PartyA` | `CHAMAPAY_TILL` |
| `IdentifierType` | `"4"` (organization shortcode) |
| `Remarks` | `"Balance check"` |
| `QueueTimeoutURL` | `{MPESA_CALLBACK_URL}/mpesa/timeout` |
| `ResultURL` | `{MPESA_CALLBACK_URL}/mpesa/result` |

### Result callback

```json
{
  "Result": {
    "ResultCode": "0",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "AccountBalance",
          "Value": "Working Account|KES|700000.00|700000.00|0.00|0.00"
        },
        { "Key": "BOCompletedTime", "Value": "20240823153010" }
      ]
    }
  }
}
```

**Balance value format** (pipe-separated):

```
AccountType|Currency|CurrentBalance|AvailableBalance|ReservedBalance|UnclearedBalance
```

Multiple accounts joined with `&`.

```ts
const outcome = parseAccountBalanceCallback(req.body);
// outcome.balances[].availableBalance, accountType, etc.
```

---

## API 4 — Transaction status

Reconcile a transaction when callbacks were missed. Use M-Pesa receipt number or `OriginatorConversationID`.

### Daraja endpoint

```
POST {SANDBOX_URL}/mpesa/transactionstatus/v1/query
```

### ChamaPay functions

| Function | Purpose |
|----------|---------|
| `checkTransactionStatus(options)` | Initiate status query |
| `parseTransactionStatusCallback(body)` | Parse result |
| `checkMpesaTxStatus(txId, convId)` | Deprecated wrapper |

### Usage

```ts
import {
  checkTransactionStatus,
  parseTransactionStatusCallback,
} from "./Lib/MpesaFunctions";

// By M-Pesa receipt
await checkTransactionStatus({ transactionId: "SG632NMUAB" });

// By conversation ID from original B2C/STK-adjacent request
await checkTransactionStatus({
  originalConversationId: "7071-4170-a0e5-8345632bad442144258",
});
```

Provide **at least one** of `transactionId` or `originalConversationId`.

### Request body

| Field | Value |
|-------|-------|
| `Initiator` | `MPESA_INITIATOR` |
| `SecurityCredential` | `SECURITY_CREDENTIAL` |
| `CommandID` | `TransactionStatusQuery` |
| `PartyA` | `CHAMAPAY_TILL` |
| `IdentifierType` | `4` |
| `TransactionID` | M-Pesa receipt (optional) |
| `OriginalConversationID` | From original request (optional) |
| `Remarks` | 2–100 chars |
| `Occasion` | Optional |
| `QueueTimeoutURL` | `{MPESA_CALLBACK_URL}/mpesa/transaction-status/timeout` |
| `ResultURL` | `{MPESA_CALLBACK_URL}/mpesa/transaction-status/result` |

### Result callback

Generic `Result` object — parse with `parseTransactionStatusCallback(req.body)`.

---

## Callback routes to implement

These routes are **not yet mounted** in `Server/app.ts`. An integrating agent should add an Express router (e.g. `Server/Routes/mpesaRoutes.ts`) and register handlers:

| Method | Path | Daraja API | Parser |
|--------|------|------------|--------|
| `POST` | `/mpesa/stk/callback` | STK Push | `parseStkPushCallback` |
| `POST` | `/mpesa/b2c/result` | B2C | `parseB2CCallback` |
| `POST` | `/mpesa/b2c/timeout` | B2C timeout | Log + mark pending failed |
| `POST` | `/mpesa/result` | Account balance | `parseAccountBalanceCallback` |
| `POST` | `/mpesa/timeout` | Account balance timeout | Log |
| `POST` | `/mpesa/transaction-status/result` | Tx status | `parseTransactionStatusCallback` |
| `POST` | `/mpesa/transaction-status/timeout` | Tx status timeout | Log |

**Important:** Daraja callbacks must be publicly reachable HTTPS URLs. `MPESA_CALLBACK_URL` must match what Safaricom can reach (e.g. your Render server URL).

### Example route handler (STK)

```ts
import { Router } from "express";
import { parseStkPushCallback } from "../Lib/MpesaFunctions";

const router = Router();

router.post("/mpesa/stk/callback", async (req, res) => {
  const outcome = parseStkPushCallback(req.body);

  if (outcome.success) {
    // Match outcome.checkoutRequestId to pending deposit in DB
    // Credit user using outcome.mpesaReceiptNumber
  } else {
    // Mark deposit failed: outcome.code, outcome.description
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

export default router;
```

Always respond to Daraja callbacks promptly (HTTP 200) even if internal processing is async.

---

## Function reference

| Export | Type | Description |
|--------|------|-------------|
| `initiateStkPush` | async | STK Push — preferred entry |
| `tillPushStk` | async | STK Push — legacy `(amount, phone, ref)` |
| `checkPushStatus` | async | STK query by `CheckoutRequestID` |
| `parseStkPushCallback` | sync | Parse STK callback body |
| `sendB2CPayment` | async | B2C disbursement |
| `B2CMpesaTx` | async | B2C — deprecated wrapper |
| `parseB2CCallback` | sync | Parse B2C result callback |
| `B2C_RESULT_CODES` | const | B2C error code map |
| `checkBalance` | async | Account balance query |
| `parseAccountBalanceCallback` | sync | Parse balance result |
| `parseAccountBalanceValue` | sync | Parse balance pipe string |
| `checkTransactionStatus` | async | Transaction status query |
| `checkMpesaTxStatus` | async | Deprecated wrapper |
| `parseTransactionStatusCallback` | sync | Parse tx status result |
| `formatMpesaPhoneNumber` | sync | Normalize to `254…` |
| `generateOriginatorConversationID` | sync | Unique B2C request ID |

---

## ChamaPay product mapping

| User action | Daraja API | Init function | Confirm via |
|-------------|------------|---------------|-------------|
| Deposit KES (on-ramp) | STK Push | `initiateStkPush` | `parseStkPushCallback` or `checkPushStatus` |
| Withdraw KES (off-ramp) | B2C v3 | `sendB2CPayment` | `parseB2CCallback` |
| Check business float | Account Balance | `checkBalance` | `parseAccountBalanceCallback` |
| Reconcile missed payment | Transaction Status | `checkTransactionStatus` | `parseTransactionStatusCallback` |

Phone number verification for withdrawals uses **Pretium** (`PretiumFunctions.ts`), not Daraja.

---

## Error handling

### Immediate API errors (HTTP 4xx/5xx)

Daraja returns structured errors for malformed requests:

```json
{
  "requestId": "1c5b-4ba8-815c-ac45c57a3db01469899",
  "errorCode": "400.002.02",
  "errorMessage": "Bad Request - Invalid BusinessShortCode"
}
```

STK/B2C functions return this as `StkPushApiError` / `B2CApiError` when `"errorCode"` is present.

### Common STK error codes

| errorCode | Cause |
|-----------|-------|
| `400.002.02` | Invalid request payload / wrong shortcode |
| `404.001.03` | Expired or wrong access token |
| `500.001.1001` | Wrong Password (shortcode/passkey/timestamp mismatch) |

### Callback result codes

Use the appropriate parser (`parseStkPushCallback`, `parseB2CCallback`, etc.). Check `success` boolean first, then `code` / `description`.

### Idempotency

- **B2C:** Always use a unique `OriginatorConversationID` (auto-generated by `sendB2CPayment`).
- **STK:** Store `CheckoutRequestID` in DB; ignore duplicate callbacks with same ID.
- **Deposits:** Match `AccountReference` or `CheckoutRequestID` before crediting.

---

## Agent integration checklist

When wiring M-Pesa into ChamaPay (or extending it), follow this order:

- [ ] Set all env vars from [Environment variables](#environment-variables)
- [ ] Confirm `CHAMAPAY_TILL` matches Daraja app / go-live shortcode
- [ ] Encrypt initiator password → `SECURITY_CREDENTIAL` (Safaricom public cert)
- [ ] Set `MPESA_CALLBACK_URL` to public HTTPS base (no trailing slash issues — code appends paths)
- [ ] Mount callback routes from [Callback routes to implement](#callback-routes-to-implement)
- [ ] **On-ramp:** Call `initiateStkPush` → store `CheckoutRequestID` → handle `parseStkPushCallback` → credit user on `success`
- [ ] **Off-ramp:** Call `sendB2CPayment` → store `OriginatorConversationID` → handle `parseB2CCallback` → mark withdrawal on `success`
- [ ] **Reconciliation:** Use `checkTransactionStatus` if callback never arrives
- [ ] **Monitoring:** Optionally call `checkBalance` on a cron to alert low float
- [ ] Switch `SANDBOX_URL` to `https://api.safaricom.co.ke` for production
- [ ] Never log `SECURITY_CREDENTIAL`, `MPESA_PASSKEY`, or raw `Password` fields

---

## Quick import

```ts
import {
  // On-ramp
  initiateStkPush,
  tillPushStk,
  checkPushStatus,
  parseStkPushCallback,
  // Off-ramp
  sendB2CPayment,
  parseB2CCallback,
  B2C_RESULT_CODES,
  // Balance
  checkBalance,
  parseAccountBalanceCallback,
  // Reconciliation
  checkTransactionStatus,
  parseTransactionStatusCallback,
  // Utilities
  formatMpesaPhoneNumber,
  generateOriginatorConversationID,
} from "./Lib/MpesaFunctions";
```
