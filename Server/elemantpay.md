Element Pay Quickstart: First OnRamp Quote in 10 Minutes
Create your first Kenya OnRamp quote, accept it, and receive settlement webhooks from Element Pay’s sandbox — step by step with copy-paste curl commands.

This guide walks you through the complete Element Pay order flow using the sandbox environment. By the end you will have issued a Kenya OnRamp quote, accepted it, and understood the webhook events your backend receives at settlement. All examples use curl and jq — no SDK required.
​
Prerequisites
Before you begin, make sure you have:
A sandbox API key (prefix is_test_…) — email compliance@elementpay.net to request one
An HTTPS webhook_url you control, configured on your API key (recommended — used in the webhooks step below)
curl installed; jq is optional but makes responses easier to read
1
Configure your environment

Set your base URL and API key as shell variables so every subsequent command stays clean and copy-pasteable.
export BASE="https://sandbox.elementpay.net/api/v1"
export API_KEY="is_test_YOUR_KEY_HERE"
Every request to the Partner API requires two headers:
X-API-Key: <API_KEY>
Content-Type: application/json
Sandbox asset — use this on every quote unless told otherwise:
Field	Value
asset.currency	USDC
asset.network	BASE
asset.token	0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913
Polygon USDT is also available on the rail. Prefer Base USDC for initial integration — it is supported across all sandbox corridors.
2
Discover Kenya corridors

Call the catalog endpoint to retrieve countries, payment methods, providers, and amount limits enabled for your API key. You must read providers[].id from this response — never hardcode a provider ID.
curl -sS "$BASE/partner/catalog?country=KE&order_type=OnRamp" \
  -H "X-API-Key: $API_KEY" | jq '.data.african_markets'
Look for the M-PESA entry in providers[] and note its id (a UUID). You will pass this as payment_method.network_id in the next step.
Provider UUIDs are environment-scoped. Always call the catalog in your sandbox environment to get valid IDs — do not copy UUIDs from this guide or other environments.
3
Create a quote

Submit a quote request for 800 KES via M-PESA OnRamp to Base USDC. Replace network_id with the M-PESA provider ID you retrieved from the catalog.
curl -sS -X POST "$BASE/partner/orders/quote" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_type": "OnRamp",
    "currency": "KES",
    "country": "KE",
    "local_amount": 800,
    "asset": {
      "token": "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
      "currency": "USDC",
      "network": "BASE"
    },
    "customer": {
      "uid": "partner-ke-001",
      "type": "user",
      "name": "Jane Doe",
      "country": "KE",
      "phone": "+2541111111111",
      "address": "Nairobi",
      "dob": "02/01/1997",
      "email": "jane@example.com",
      "id_number": "A1234567",
      "id_type": "passport"
    },
    "payment_method": {
      "type": "mobile_money",
      "phone_number": "+2541111111111",
      "network_id": "7ea6df5c-6bba-46b2-a7e6-f511959e7edb"
    },
    "wallet_address": "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe"
  }' | jq '{quote_id: .data.quote_id, expires_at: .data.expires_at, instructions: .data.payment_instructions}'
The response includes a quote_id (format yc_receive_…) and an expires_at timestamp. Save the quote_id — you need it in the next step.
export QUOTE_ID="yc_receive_..."   # paste your quote_id here
Replace network_id with the value from your sandbox catalog if the example UUID does not match your environment.
4
Accept the quote

Wait approximately 2 seconds after creating the quote, then accept it with an empty JSON body. Accepting locks the order and triggers Element Pay to execute the payment rail.
curl -sS -X POST "$BASE/partner/orders/$QUOTE_ID/accept" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.data'
A successful response confirms the order is now in processing state. Element Pay will POST settlement events to your webhook_url as the order progresses.
5
response kind
{
    "status": "success",
    "message": "Partner order quote accepted",
    "data": {
        "quote_id": "yc_receive_17228263-6fd1-5db1-9bc7-9640931b3b24",
        "status": "processing",
        "order": {
            "id": 526,
            "order_id": "YC-17228263-6fd1-5db1-9bc7-9640931b3b24",
            "status": "processing",
            "order_type": "OnRamp",
            "amount_fiat": 800.0,
            "amount_crypto": 5.95999,
            "currency": "KES",
            "token": "BASE_USDC",
            "wallet_address": "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
            "exchange_rate": 131.64,
            "psp_transaction_id": "17228263-6fd1-5db1-9bc7-9640931b3b24"
        },
        "accepted": {
            "sequence_id": "5fb51540-e214-4ff6-8d1f-5965228e9e77",
            "expires_at": "2026-07-21T20:27:18.075Z",
            "reference": null,
            "deposit_id": null,
            "rate": 131.64,
            "user_pays": {
                "amount": 800,
                "currency": "KES"
            },
            "user_receives": {
                "amount": 5.95999365,
                "currency": "USDC",
                "network": "BASE"
            },
            "payment_instructions": {
                "type": "momo",
                "source": {
                    "accountNumber": "+2541111111111",
                    "networkName": "Mobile Wallet (M-PESA)",
                    "networkId": "7ea6df5c-6bba-46b2-a7e6-f511959e7edb"
                }
            }
        },
        "webhooks": {
            "events": [
                "order.processing",
                "order.settled",
                "order.failed",
                "order.refunded"
            ],
            "delivery": "ElementPay will notify the webhook_url configured on the API key."
        },
        "audit": {
            "endpoint": "/receive/{id}/accept",
            "accepted_via": "receive_accept"
        },
        "rail": "local_fiat"
    }
}
Understand quote expiry

Quotes are binding but short-lived. If you do not call the accept endpoint before expires_at, the quote expires and you must create a new one. Build your integration to:
Create a quote immediately before presenting it to your customer.
Accept the quote as soon as the customer confirms — do not introduce unnecessary delays.
Handle 404 or 410 responses on the accept call as expired-quote errors and re-quote.
Display the quote’s expires_at time to your customer so they understand the deadline. A 30-second countdown UI works well for mobile money flows.
6
Listen for webhooks

Configure a publicly reachable HTTPS endpoint as the webhook_url on your API key. Element Pay POSTs order lifecycle events to this URL as the order moves through settlement.
Event	Meaning
order.processing	Accept succeeded; the payment rail is executing
order.settled	Both fiat and crypto legs are complete
order.failed	Terminal failure — no further state changes will occur
Your webhook handler should:
Return HTTP 200 immediately to acknowledge receipt.
Verify the HMAC signature using your webhook_secret before processing (see Webhooks).
Use order.settled as the trigger to credit your customer or update your order state.
Treat order.failed as terminal — do not retry the same quote_id.
See Webhooks for the full payload shape and signature verification code.
​
Core Concepts
Element Pay Order Lifecycle: From Quote to Settlement
How Element Pay orders move from quote to settlement. Covers OnRamp and OffRamp types, quote TTL, order states, and OffRamp deposit addresses.

Every transaction in Element Pay follows a predictable path from price discovery through final settlement. Understanding this lifecycle helps you build a resilient integration, handle edge cases gracefully, and know exactly which data to trust at each stage.
​
Order types
Element Pay supports two directions of value transfer.
OnRamp
Fiat → Crypto. Your customer pays in local currency (for example, KES) and receives crypto in their wallet. Quote IDs are prefixed yc_receive_<id>.
OffRamp
Crypto → Fiat. Your customer sends crypto and receives local currency in their bank account or mobile wallet. Quote IDs are prefixed yc_send_<id>.
​
The three-step flow
1
Discover

Call GET /partner/catalog to retrieve the corridors, supported assets, and rails available to your API key. This response includes each provider’s minimum and maximum amounts (providers[].min_amount, providers[].max_amount) and the fields required for payment_method. Cache the catalog; it changes infrequently.
2
Quote

Call POST /partner/orders/quote with the corridor, asset, amount, and customer details. The response contains a quote object with:
A unique quote ID (yc_receive_<id> for OnRamp, yc_send_<id> for OffRamp)
The locked exchange rate and fee breakdown
An expiry timestamp at data.expires_at
Present the rate and fees to your customer before proceeding.
Quotes have a short TTL. If your customer takes too long to confirm, the quote expires and you must request a fresh one with POST /partner/orders/quote. The new quote may carry a different rate.
3
Accept

Call POST /partner/orders/{quote_id}/accept with the quote ID before data.expires_at. A successful accept returns an order with a unique order ID in the format YC-<uuid> (for example, YC-580e04c2-a136-5cca-be54-b49fcf80970c). Execution on the payment rail begins immediately.
Accepting an already-accepted quote is safe. The API returns the existing order rather than creating a duplicate — accepting is idempotent. The exception is local fiat rails, which return 409 but still include the existing order ID so you can reconcile. See Errors for details.
​
OffRamp deposit addresses
For OffRamp orders, your customer must send crypto to a deposit address that Element Pay generates at accept time. Retrieve this address from the accept response — it is unique to that order and must not be reused across orders. Do not cache or share deposit addresses between sessions.
​
Order states
After acceptance, an order moves through the following states.
State	Meaning
processing	The payment rail has started executing. For OnRamp, the fiat leg is in flight. For OffRamp, Element Pay is waiting to detect the incoming crypto deposit.
settled	The order completed successfully. Crypto has been delivered to the wallet (OnRamp) or fiat has been credited to the customer (OffRamp).
failed	The order reached a terminal failure. No funds have moved, or a reversal is underway.
refunded	A refund was issued. This can happen when a payment is received but cannot be fulfilled.
settled is the only state that confirms successful delivery. Do not credit your customer’s account based on processing alone.
​
Webhooks are the source of truth
Element Pay pushes a webhook event to your webhook_url each time an order changes state. Treat these events as authoritative — the HTTP accept response only confirms that Element Pay received the instruction to proceed, not that settlement succeeded.
If a webhook is delayed or your endpoint is temporarily unavailable, poll GET /partner/orders/{order_id} to check the current state. Use the order_id returned in the accept response.
See the Webhooks guide for event payloads, signature verification, and idempotency handling.
​
Quick reference
Concept	Value
OnRamp quote ID prefix	yc_receive_<id>
OffRamp quote ID prefix	yc_send_<id>
Order ID format	YC-<uuid>
Quote expiry field	data.expires_at
New quote endpoint	POST /partner/orders/quote
Order status endpoint	GET /partner/orders/{order_id}
OffRamp deposit address	From accept response; unique per order

Core Concepts
Receive and Verify Element Pay Webhook Event Deliveries
Element Pay posts signed events when orders change state. Verify signatures and handle order.processing, order.settled, order.failed, and order.refunded.

Element Pay pushes an HTTP POST to your server every time an order changes state. Treat these webhook events as the authoritative source of truth for settlement — the accept response only confirms that Element Pay received your instruction to proceed, not that funds have moved. Build your integration around webhooks and use polling only as a fallback.
​
Configuration
Set two values on your partner API key before going live — once for sandbox and once for production:
Setting	Description
webhook_url	The HTTPS endpoint Element Pay should POST events to
webhook_secret	A secret string used to sign each delivery (keep this private)
Sandbox and production API keys each have their own webhook_url and webhook_secret. Configure them separately.
​
Events
Element Pay emits four event types. Every delivery includes the event type in the X-Webhook-Event header.
Event	When it fires
order.processing	Quote accepted; the payment rail has started executing
order.settled	Order completed successfully — funds delivered
order.failed	Terminal failure; no further state changes will occur
order.refunded	A refund was issued for this order
Only order.settled confirms successful delivery. Do not credit your customer’s account or release funds based on order.processing.
​
HTTP delivery format
Element Pay sends a POST request with the following headers and a JSON body:
POST <your-webhook_url>
Content-Type: application/json
User-Agent: ElementPay/1.0 (+support@elementpay.net)
X-Webhook-Event: order.settled
X-Webhook-Id: 3f2a1b4c-9e8d-4c7a-b6f5-1234567890ab
X-Webhook-Signature: t=1720000000,v1=abc123...
Header	Purpose
X-Webhook-Event	The event type (see table above)
X-Webhook-Id	A stable UUID for this delivery; use it to deduplicate retries
X-Webhook-Signature	HMAC-SHA256 signature for authenticity verification
User-Agent	Identifies the sender as Element Pay
Content-Type	Always application/json
​
Payload example
Webhook payloads are provider-neutral — they contain no internal routing metadata or upstream PSP blobs. The fields present vary by corridor and rail. A typical order.settled payload looks like this:
{
  "order_id": "YC-580e04c2-a136-5cca-be54-b49fcf80970c",
  "status": "settled",
  "amount_fiat": 800.0,
  "currency": "KES",
  "amount_crypto": 5.12,
  "exchange_rate": 156.25,
  "order_type": "OnRamp",
  "wallet_address": "0x4F07419E6bfCCF8D256E8ef803Cc2653dfbB9558",
  "phone_number": "2541111111111",
  "settlement_transaction_hash": "0xabc...",
  "created_at": "2026-07-07T10:00:00.000000Z",
  "updated_at": "2026-07-07T10:00:15.000000Z"
}
Webhook payloads include only partner-facing fields. Provider-specific routing metadata and upstream rail details are not exposed.
​
Signature verification
Verify every incoming webhook before acting on it. Skip this step and an attacker can send fake settlement events to your endpoint.
​
How the signature is constructed
The X-Webhook-Signature header contains two parts separated by a comma:
t=1720000000,v1=abc123base64encodedhmac==
Part	Description
t	Unix timestamp (seconds) at time of delivery
v1	Base64-encoded HMAC-SHA256 of {t}.{raw_body} using your webhook_secret
​
Verification steps
1
Parse the header

Split X-Webhook-Signature on , and extract t and v1.
2
Reject stale timestamps

Compute now - t. If the result is greater than 300 seconds (5 minutes), reject the request with 400. This prevents replay attacks.
3
Compute the expected signature

Build the signed payload string: {t}.{raw_body} — that is, the timestamp value, a literal dot, and the raw (un-parsed) request body bytes. Compute HMAC-SHA256 over this string using your webhook_secret, then Base64-encode the result.
4
Compare constant-time

Compare your computed signature to v1 using a constant-time equality function. If they match, the webhook is authentic.
Always use constant-time comparison. Standard string equality short-circuits on the first mismatched byte, which leaks timing information that attackers can exploit to forge signatures.
​
Code examples

Python

Node.js
import crypto from "crypto";
import express from "express";

const app = express();
const WEBHOOK_SECRET = "your_webhook_secret"; // from your API key settings

// Use raw body parser so we can verify the signature before JSON.parse
app.post(
  "/webhooks/elementpay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signatureHeader = req.headers["x-webhook-signature"] ?? "";
    const rawBody = req.body; // Buffer

    // Step 1 — parse the header (split on first "=" only to preserve base64 padding)
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => {
        const idx = p.indexOf("=");
        return [p.slice(0, idx), p.slice(idx + 1)];
      })
    );
    const { t: timestamp, v1 } = parts;

    if (!timestamp || !v1) {
      return res.status(400).send("Missing signature components");
    }

    // Step 2 — reject stale timestamps (replay protection)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (age > 300) {
      return res.status(400).send("Webhook timestamp too old");
    }

    // Step 3 — compute expected signature
    const signedPayload = Buffer.concat([
      Buffer.from(`${timestamp}.`),
      rawBody,
    ]);
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(signedPayload)
      .digest("base64");

    // Step 4 — constant-time compare
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(v1);
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.headers["x-webhook-event"];
    const payload = JSON.parse(rawBody.toString());

    if (event === "order.settled") {
      handleSettled(payload);
    }

    res.status(200).send();
  }
);

function handleSettled(payload) {
  console.log(
    `Order ${payload.order_id} settled — hash ${payload.settlement_transaction_hash}`
  );
}

app.listen(3000);
​
Idempotency
Element Pay may deliver the same event more than once (network retries, timeouts). Use the X-Webhook-Id header — a stable UUID per logical event — to deduplicate deliveries. Store processed IDs and skip re-processing if you’ve already handled a given ID.
Return a 2xx response as quickly as possible. If your processing logic is slow, enqueue the event and acknowledge it immediately — Element Pay will retry if it does not receive a 2xx within the timeout window.
​
Backup polling
If your webhook endpoint is temporarily unavailable or you need to reconcile state, poll the order directly:
GET /partner/orders/{order_id}
X-API-Key: <your-api-key>
Use the order_id returned in the accept response. Implement exponential backoff and cap your polling interval — do not poll more frequently than once every 10 seconds.
​
Core Concepts
Element Pay API Error Codes and Troubleshooting Guide
Reference for Element Pay API errors: HTTP status codes, 422 field validation failures, and quote lifecycle errors including 410 and 409.

Every error response from the Element Pay Partner API uses the same JSON envelope, so your error-handling logic can be generic across all endpoints. Once you understand the structure and which status codes map to which actions, most issues reduce to a small set of fixes.
​
Response envelope
All error responses follow this shape:
{
  "status": "error",
  "message": "Human-readable summary of what went wrong",
  "data": {}
}
Field	Description
status	Always "error" on non-2xx responses
message	A plain-English description safe to log and show to your integration team
data	Optional object with structured hints, such as data.field for validation errors
​
HTTP status codes
Use the HTTP status code to decide whether to fix your request, retry, or escalate.
Status	Meaning	What to do
400	Malformed request — the body could not be parsed	Fix your request payload (check JSON syntax and Content-Type: application/json)
401	Missing or invalid X-API-Key	Verify the API key in your request header; check you’re using the correct sandbox/production key
422	Validation failure — required fields missing or values invalid	Fix your payload; check data.field in the response for the offending field (see below)
409	Quote already accepted, or a conflicting state exists	Use a fresh quote, or fetch the existing order with GET /partner/orders/{order_id}
410	Quote has expired (TTL passed)	Request a new quote with POST /partner/orders/quote
502	Payment rail temporarily unavailable	Retry with exponential backoff; this is transient
503	Corridor not configured on this environment	Contact support@elementpay.net to enable the corridor
502 is the only status code that warrants automatic retries. For all other codes, fix the request or take a corrective action before retrying.
​
Validation errors (422)
When you receive a 422, inspect data.field to pinpoint exactly which field failed validation.
​
Example response
{
  "status": "error",
  "message": "payment_method.network_id is required for this rail",
  "data": {
    "field": "payment_method.network_id"
  }
}
​
Common validation fields
Show data.field reference

​
Quote lifecycle errors
Quotes have a short TTL and move through their own state machine. These three situations account for most errors during the accept flow.
Situation	Status	Meaning	Action
Quote TTL passed before accept	410 Gone	The exchange rate lock expired	Call POST /partner/orders/quote to get a fresh quote with a new rate
Accepting an already-accepted quote	409 Conflict	The quote was previously accepted	Idempotent — retrieve the existing order with GET /partner/orders/{order_id}; do not create a new quote
Amount below corridor minimum	422 Unprocessable	The requested amount is below the provider’s minimum	Check providers[].min_amount in GET /partner/catalog and adjust the amount
For 409 on a local fiat rail, the response body includes the existing order_id. Parse it and continue with that order rather than starting over.
​
Retry strategy
Only retry automatically on 502. For all other errors, inspect the response and take a corrective action first.
Retry-eligible: 502
Max attempts:   5
Backoff:        exponential (1s, 2s, 4s, 8s, 16s)
Jitter:         add ±20% to each interval to avoid thundering herd
Never retry 410 or 422 without changing the request. Retrying an expired quote will always return 410; the quote does not renew automatically.
​
Corridors
African Fiat Corridors: Discovery, Rails, and Stablecoins
Discover available countries, payment methods, and providers for Element Pay African fiat corridors. Covers OnRamp, OffRamp, and supported stablecoins.

African local fiat corridors all share the same integration pattern — you quote, accept, and handle webhooks the same way regardless of country. What differs between corridors is the set of required customer fields, the network_id values for payment providers, and the test identities you use in sandbox. This page explains how to discover what is available for your API key and how the two payment rails work.
​
Order Types
Every order is either an OnRamp (fiat → crypto) or an OffRamp (crypto → fiat). Pass order_type on every quote.
order_type	Direction	What the customer does
OnRamp	Fiat → crypto	Pays local fiat; receives stablecoin on wallet_address
OffRamp	Crypto → fiat	Sends stablecoin to deposit address; receives fiat to momo or bank
Provider lists in the catalog differ by direction. Filter with ?order_type=OnRamp or ?order_type=OffRamp to see only the providers active for that flow.
​
Discovery Endpoints
Use these endpoints to build your checkout UI and to stay current as corridors and providers change. Do not hardcode provider UUIDs or country lists — run discovery on your own environment whenever you onboard a new corridor.
Endpoint	Best for
GET /partner/catalog	Preferred — full tree of countries, methods, providers, and min/max amounts for a checkout UI
GET /partner/corridors	Lightweight country and currency list when you only need to know what is enabled
GET /partner/payment-methods	Methods available for a single corridor
GET /partner/order-requirements	Exact customer and payment fields required per corridor and direction
GET /partner/banks	Bank institution UUIDs; use payment_method_type=bank
GET /partner/rates/indicative	Non-binding FX ticker for display purposes

Catalog (preferred)

Corridors (lightweight)

Methods for one corridor
# Full tree — countries, providers, min/max amounts
curl -sS "$BASE/partner/catalog" \
  -H "X-API-Key: $API_KEY" | jq '.data'
The catalog shape for African local corridors nests providers under onramp.countries or offramp.countries. Each country entry carries payment_methods.mobile_money and/or payment_methods.bank, each with a providers[] array. The id field on each provider is the network_id you pass on the quote.
network_id UUIDs are environment-specific and are not guaranteed to be stable across sandbox resets. Always run discovery against your target environment — sandbox or production — rather than copying UUIDs from this documentation verbatim.
​
Payment Rails
​
Mobile Money
Use mobile money when the corridor supports it (for example, Kenya M-PESA, Uganda Airtel).
Field	Value
payment_method.type	mobile_money
payment_method.phone_number	Customer’s MSISDN in E.164 format, e.g. +2547XXXXXXXX
payment_method.network_id	Provider id from catalog.providers[]
GET /partner/banks returns a 422 error when called with payment_method_type=mobile_money. Use the catalog to obtain mobile money provider IDs.
​
Bank Transfer
Use bank transfer for corridors that require it (for example, Nigeria) or as an alternative rail where available.
Field	Value
payment_method.type	bank
payment_method.network_id	Institution UUID from GET /partner/banks or catalog
payment_method.account_number	Customer’s bank account number
payment_method.account_name	Account holder name, must match records
​
Supported African Corridors
The table below shows the indicative rails per country. Exact provider availability for your API key and each order direction comes from GET /partner/catalog.
Country	Currency	Typical rails
KE	KES	Mobile money, bank
NG	NGN	Bank (retail customers require BVN)
UG	UGX	Mobile money
TZ	TZS	Per catalog
ZA	ZAR	Per catalog
RW	RWF	Per catalog
MW	MWK	Per catalog
BW	BWP	Per catalog
Need a market that is missing from your catalog? Email compliance@elementpay.net — corridors are enabled per partner, so absence from your key does not mean the corridor is unavailable.
​
Supported Stablecoins
Pass asset.token, asset.currency, and asset.network on every quote. African local fiat corridors support two contract addresses.
Recommendation	Currency	Network	asset.token
Default (recommended)	USDC	BASE	0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913
Alternate	USDT	POLYGON	0xc2132d05d31c914a87c6611c10748aeb04b58e8f
Use Base USDC for all sandbox and production integration work unless your Element Pay account team instructs otherwise. The Quickstart and all corridor playbooks below use Base USDC. The same contract addresses apply on both sandbox and production.
​
Corridor Playbooks
Each page below covers discovery commands, sandbox test values, example network_id values, and annotated quote flows for that country.
Kenya
KES · M-PESA mobile money and bank rails
Nigeria
NGN · Bank transfer with BVN for retail customers
Uganda
UGX · Airtel mobile money
For any other corridor in your catalog, use GET /partner/catalog and GET /partner/order-requirements to discover the required fields, then follow the same quote → accept → webhook pattern.

Sandbox Test Values: Force Order Success or Failure
Element Pay sandbox outcomes are deterministic. Use these test phone numbers and account numbers to force order.settled or order.failed in sandbox.

Sandbox outcomes in Element Pay are fully deterministic — there is no randomness and no real money moves. Every test value below maps to a specific terminal webhook event. Use them to build and verify your integration before touching a live corridor.
Sandbox-only values — never use in production. Do not send 1111111111, 0000000000, +…1111111111, or +…0000000000 on a production quote. Live orders must use real customer MSISDNs and bank accounts. Submitting sandbox test values in production will fail or mis-route settlement with no recovery path.
​
Rules that apply on every quote
Every quote you submit — success or failure — must satisfy these baseline requirements. Violating any of them returns a 422 before settlement logic is even reached.
Rule	Detail
customer.name	Must be two or more words (e.g. Jane Doe). A single given name returns 422.
customer.uid	Use a new, unique value per test run — do not reuse UIDs across smoke-test runs.
payment_method.network_id	Must be an opaque UUID obtained from your sandbox GET /partner/catalog or GET /partner/banks. Do not hardcode UUIDs from another environment or from this page.
Momo identity	Pass the phone number as payment_method.phone_number in E.164 format — this is not a substitute for a bank account_number.
Bank identity	Pass payment_method.account_number and account_name when type is bank.
Nigeria retail	Must include additional_id_type: "bvn" and a valid-looking additional_id_number (e.g. 12345678901).
​
Two different “account numbers” — don’t mix them up
There are two distinct contexts where account numbers appear. Confusing them is the single most common integration mistake.
Context	What it is	Sandbox	Production
Customer identity on the quote (payment_method.account_number or momo phone_number)	The customer’s bank account or MSISDN on the payment rail	Use the test values in this page	Real customer account or phone only
OnRamp deposit instructions (returned by accept)	A temporary account Element Pay returns for the customer to pay into	Returned by the API — do not invent	Returned by the API — pass to the customer as-is; never substitute a test value
The success/failure tables below apply only to the customer identity fields on the quote. They have no effect on, and must never be substituted for, the deposit destination returned by accept.
​
Mobile money test phone numbers
Kenya (KE)
Uganda (UG)
Nigeria (NG — when momo enabled)
Result	payment_method.phone_number
Success → order.settled	+2541111111111
Failure → order.failed	+2540000000000
Copy the same MSISDN onto customer.phone when the corridor requires both fields.
​
Bank account test numbers
These values apply to payment_method.account_number across all bank corridors.
Result	account_number
Success → order.settled	1111111111
Failure → order.failed	0000000000
Do not invent arbitrary account numbers such as 0123456789. On sandbox, an unrecognised account number causes the order to sit in processing indefinitely with no terminal webhook — your test will never complete.
​
OffRamp test (crypto → fiat)
OffRamp orders in sandbox skip the real on-chain deposit step. Instead, the sandbox uses the customer.name field to determine the outcome automatically.
Result	customer.name trigger	Example
Success → order.settled (auto-credit)	Include the word Successful	Successful Jane Doe
Failure → order.failed	Include the word Failure	Failure Jane Doe
If customer.name contains neither Successful nor Failure, the sandbox OffRamp order waits for the customer to send crypto to the payment_instructions deposit address returned by accept before expiry — the same as production behaviour.
​
QA profiles
Run all eight profiles below and retain the order_id and received webhook bodies for each before requesting production credentials.
Label	Expected webhook	Key fields
KE momo success	order.settled	phone_number: "+2541111111111"
KE momo failure	order.failed	phone_number: "+2540000000000"
KE bank success	order.settled	account_number: "1111111111"
KE bank failure	order.failed	account_number: "0000000000"
NG bank success	order.settled	account_number: "1111111111" + BVN
NG bank failure	order.failed	account_number: "0000000000" + BVN
OffRamp success	order.settled	customer.name contains "Successful"
OffRamp failure	order.failed	customer.name contains "Failure"
​
What to do after accept
Prefer webhooks. Listen for order.processing followed by order.settled or order.failed. Your webhook receiver must return 200 OK within 10 seconds.
Backup polling. If a webhook is not received within your expected window, poll GET /partner/orders/{order_id} for the current status.
Retain evidence. Keep your quote_id, order_id, and the raw webhook request bodies for all eight QA profiles — Element Pay may ask for these during production onboarding review.
Always send valid-looking KYC fields on retail corridors even in sandbox: email, address, dob (format mm/dd/yyyy), id_number, and id_type. Missing required fields return 422 from order-requirements validation — not a settlement failure.
​
Copy-paste payloads
See Sandbox test payloads for ready-to-run curl commands that use all of the values above, or visit the corridor pages for Kenya and Nigeria for corridor-specific field requirements.
