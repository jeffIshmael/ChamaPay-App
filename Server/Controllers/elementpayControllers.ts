// Element Pay (KES M-Pesa on-ramp + off-ramp) controller.
//
// Drop-in alternative to the Pretium flow:
//   - same table (pretiumTransaction), so the existing status endpoints keep working.
//     For Element Pay rows, `transactionCode` holds the Element Pay `order_id` (YC-...).
//   - on-ramp rows:  isOnramp = true,  type = goal | moonwell | deposit | payment
//   - off-ramp rows: isOnramp = false, type = "offramp"
//
// On-ramp:   discover network_id -> quote -> accept (STK push) -> webhook `order.settled`
//            -> treasury credits the user in USDC at CHAMAPAY_RATE.
// Off-ramp:  quote -> accept (returns a per-order deposit address) -> debit user's USDC to treasury
//            -> treasury forwards the NET amount to the deposit address -> webhook `order.settled`
//            (M-Pesa paid). On failure the user is refunded in full from the treasury.
//
// Routes to mount:
//   POST /elementpay/quote     (auth)  getElementPayQuote            real, binding quote (on or off-ramp)
//   POST /elementpay/onramp    (auth)  initiateElementPayOnramp
//   POST /elementpay/offramp   (auth)  initiateElementPayOfframp
//   POST /elementpay/webhook   (no auth, signature-verified)  elementPayWebhook
//   app.use(express.json({ verify: captureRawBody }))  // needed for HMAC verification
//
// Docs used: https://partners.elementpay.net (quote-and-accept, webhooks, corridors/kenya, sandbox/success-failure)
//
// ENV (sandbox):
//   ELEMENTPAY_SANDBOX_URL          e.g. https://sandbox.elementpay.net   (/api/v1 is appended if missing)
//   ELEMENTPAY_SANDBOX_API_KEY      is_test_...
//   ELEMENT_PAY_WEBHOOK_SECRET      must match the webhook_secret configured on your Element Pay key
// ENV (optional):
//   ELEMENTPAY_SANDBOX_TEST_PHONE        sandbox only. Default +2541111111111 (forces success). +2540000000000 forces failure.
//   ELEMENTPAY_SANDBOX_OFFRAMP_OUTCOME   "Successful" (default) | "Failure": sandbox off-ramp outcome is driven by customer.name
//                                        (only works with the inline customer, not a vault customer_id)
//   ELEMENTPAY_OFFRAMP_ASSET_TOKEN / _CURRENCY / _NETWORK   default Base USDC. See the warning at OFFRAMP_ASSET.
//   (off-ramp fee now comes from WITHDRAWAL_FEE_BRACKETS, in KES; ELEMENTPAY_OFFRAMP_FEE_BPS is no longer used)
//   ELEMENTPAY_OFFRAMP_ONCHAIN=true      run the on-chain legs in sandbox too (they always run in production)
//   ELEMENTPAY_ENV=production            LIVE: uses ELEMENTPAY_URL (default https://api.elementpay.net) / ELEMENTPAY_API_KEY and the live key's webhook secret
//   ELEMENTPAY_REFERENCE_USDC            sample size for the page-load off-ramp rate quote. Default 10
// network_id is NEVER configured: it is read from GET /partner/catalog for the quote's country + order_type.
//   CHAMAPAY_RATE, TREASURY_WALLET       already used by the Pretium flow

import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { formatUnits } from "viem";
import {
  bcMoonwellDeposit,
  bcDepositFundsToChama,
  bcDepositFundsForMember,
  bcTreasuryGoalContribute,
} from "../Blockchain/WriteFunction";
import { transferTx, transferWithFeeTx } from "../Blockchain/erc20Functions";
// KES fee table. ADJUST THIS PATH to wherever WITHDRAWAL_FEE_BRACKETS lives in your backend.
import { WITHDRAWAL_FEE_BRACKETS } from "../Lib/transactionFees";
import emailService from "../Lib/EmailService";
import { getCached, setCache } from "../Lib/cache";
import { treasuryTransferToUser } from "../Lib/pimlicoAgent";
import { checkOnrampKesAllowed, KYC_REQUIRED_CODE } from "../Lib/kycService";
// kycDocumentNumber is AES-encrypted at rest. CONFIRM this export name in Lib/kycPii.ts.
import { decryptKycDocumentNumber } from "../Lib/kycPii";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Config + HTTP client
// ---------------------------------------------------------------------------

const IS_PRODUCTION = process.env.ELEMENTPAY_ENV === "production";

// USDC on Base (same address on Element Pay sandbox and production)
const BASE_USDC_ASSET = {
  token: "0x833589fcd6edb6e08f4c7c32d4f71b54bdA02913",
  currency: "USDC",
  network: "BASE",
};

// test payloads use Base USDC for KE OffRamp. Confirm with Element Pay which asset your live key is
// enabled for. If it is not Base, the on-chain leg below (treasuryTransferToUser) cannot be used as-is,
// and initiateElementPayOfframp refuses to run it.
const OFFRAMP_ASSET = {
  token: BASE_USDC_ASSET.token,
  currency: BASE_USDC_ASSET.currency,
  network: BASE_USDC_ASSET.network,
};

// In sandbox, Element Pay auto-settles off-ramp orders via the "Successful" name trigger and expects NO
// on-chain deposit, so by default we skip debiting the user / sending crypto outside production.
const OFFRAMP_ONCHAIN =
  IS_PRODUCTION || process.env.ELEMENTPAY_OFFRAMP_ONCHAIN === "true";

const SANDBOX_SUCCESS_PHONE = "+2541111111111";
const WEBHOOK_TOLERANCE_SECONDS = 300; // Element Pay: reject signatures older than 5 minutes
const QUOTE_TO_ACCEPT_DELAY_MS = 2000; // docs: wait ~2s between quote and accept
const QUOTE_FALLBACK_TTL_MS = 30_000; // if a quote has no parsable expires_at
const QUOTE_REUSE_MARGIN_MS = 5_000; // don't reuse a quote that is about to expire

class ElementPayError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function epConfig() {
  const rawUrl = IS_PRODUCTION
    ? process.env.ELEMENTPAY_URL || "https://api.elementpay.net"
    : process.env.ELEMENTPAY_SANDBOX_URL;
  const apiKey = IS_PRODUCTION
    ? process.env.ELEMENTPAY_API_KEY
    : process.env.ELEMENTPAY_SANDBOX_API_KEY;
  if (!rawUrl || !apiKey) {
    throw new Error("Element Pay URL / API key is not set in environment.");
  }
  let baseUrl = rawUrl.replace(/\/+$/, "");
  if (!/\/api\/v1$/.test(baseUrl)) baseUrl += "/api/v1";
  return { baseUrl, apiKey };
}

async function epRequest<T = any>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const { baseUrl, apiKey } = epConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await resp.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body */
    }
    if (!resp.ok) {
      throw new ElementPayError(
        resp.status,
        json?.message || `Element Pay request failed (${resp.status})`,
        json?.data,
      );
    }
    return json as T;
  } catch (err: any) {
    if (err instanceof ElementPayError) throw err;
    if (err?.name === "AbortError") {
      throw new ElementPayError(504, "Element Pay request timed out");
    }
    throw new ElementPayError(502, "Could not reach Element Pay");
  } finally {
    clearTimeout(timer);
  }
}

function sendEpError(res: Response, err: unknown, fallback: string) {
  if (err instanceof ElementPayError) {
    console.error(
      "Element Pay error:",
      err.status,
      err.message,
      err.data ?? "",
    );
    if (err.status === 401) {
      // our credentials problem, not the user's
      return res.status(502).json({
        success: false,
        error: "Payment provider authentication failed",
      });
    }
    const clientError = [400, 409, 410, 422].includes(err.status);
    return res
      .status(
        err.status === 403
          ? 403
          : clientError
            ? 400
            : err.status >= 500
              ? 503
              : 502,
      )
      .json({
        success: false,
        error: err.message,
        ...(typeof (err.data as any)?.code === "string"
          ? { code: (err.data as any).code, missing: (err.data as any).missing }
          : {}),
      });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, error: fallback });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Exact decimal math (BigInt). No floats anywhere on the money path.
//
// USDC has 6 decimals on-chain, so 1 micro-USDC (0.000001) is the smallest amount that can ever be
// sent. We therefore work in exact integer "units" and keep the full-precision value for logs.
// Off-ramp math FLOORs to 6 decimals. What we CREDIT on an on-ramp deposit is rounded UP to 6
// decimals (kesToUsdcCeil), so a deposit is never 1 micro-USDC short of the KES the user paid
// (e.g. KES 1000 / 132 = 7.5757575... must be 7.575758, not 7.575757, or a chama sees a part-payment).
// ---------------------------------------------------------------------------

const USDC_DECIMALS = 6;
type Dec = { n: bigint; scale: number }; // value = n / 10^scale

function numberToPlain(n: number): string {
  if (!Number.isFinite(n) || n < 0)
    throw new Error(`Invalid decimal value: ${n}`);
  const s = String(n);
  return /e/i.test(s) ? n.toFixed(20).replace(/\.?0+$/, "") : s;
}

function parseDec(value: string | number): Dec {
  const s =
    typeof value === "number" ? numberToPlain(value) : String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(s))
    throw new Error(`Invalid decimal value: ${value}`);
  const [int, frac = ""] = s.split(".");
  return { n: BigInt(int + frac), scale: frac.length };
}

// floor(value * 10^decimals) as an integer
function toUnits(value: string | number, decimals = USDC_DECIMALS): bigint {
  const { n, scale } = parseDec(value);
  return scale <= decimals
    ? n * 10n ** BigInt(decimals - scale)
    : n / 10n ** BigInt(scale - decimals);
}

// floor((a / b) * 10^decimals)
function divDec(a: Dec, b: Dec, decimals: number): bigint {
  if (b.n === 0n) throw new Error("Division by zero");
  return (
    (a.n * 10n ** BigInt(b.scale + decimals)) / (b.n * 10n ** BigInt(a.scale))
  );
}

// KES / rate -> USDC, exact, floored to `decimals` (6 = what can actually be sent on-chain)
function kesToUsdc(
  kes: number,
  rate: string,
  decimals = USDC_DECIMALS,
): bigint {
  return divDec({ n: BigInt(kes), scale: 0 }, parseDec(rate), decimals);
}

// KES / rate -> USDC, exact, rounded UP to `decimals`. Same as kesToUsdc but never lands below the
// true value, so (credited USDC x rate) is always >= the KES paid. Costs at most 1 micro-USDC.
function kesToUsdcCeil(
  kes: number,
  rate: string,
  decimals = USDC_DECIMALS,
): bigint {
  const b = parseDec(rate);
  if (b.n === 0n) throw new Error("Division by zero");
  const num = BigInt(kes) * 10n ** BigInt(b.scale + decimals);
  return (num + b.n - 1n) / b.n; // ceil(num / b.n)
}

function ratioString(
  a: string | number,
  b: string | number,
  decimals: number,
): string | null {
  try {
    const d = parseDec(b);
    if (d.n === 0n) return null;
    return formatUnits(divDec(parseDec(a), d, decimals), decimals);
  } catch {
    return null;
  }
}

function platformRate(): string {
  const raw = (process.env.CHAMAPAY_RATE || "132").trim();
  if (parseDec(raw).n === 0n)
    throw new Error("CHAMAPAY_RATE must be greater than zero");
  return raw;
}

function treasuryAddress(): string {
  const addr = process.env.TREASURY_WALLET;
  if (!addr) throw new Error("TREASURY_WALLET is not set in environment.");
  return addr;
}

// "25" | "25.5" | "25.123456" -> units. Rejects >6 decimals instead of silently rounding.
function parseUsdcInput(input: unknown): bigint | null {
  const s =
    typeof input === "number"
      ? Number.isFinite(input)
        ? String(input)
        : ""
      : String(input ?? "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(s)) return null;
  const units = toUnits(s);
  return units > 0n ? units : null;
}

// ---------------------------------------------------------------------------
// Withdrawal pricing: the user types KES, our fee comes from WITHDRAWAL_FEE_BRACKETS (KES), Element Pay
// pays (KES - fee) to M-Pesa at its real rate, and we work out the USDC that has to leave the wallet.
// ---------------------------------------------------------------------------

const OFFRAMP_MIN_KES: number = WITHDRAWAL_FEE_BRACKETS[0].min;
const OFFRAMP_MAX_KES: number =
  WITHDRAWAL_FEE_BRACKETS[WITHDRAWAL_FEE_BRACKETS.length - 1].max;
const OFFRAMP_REF_KEY = "elementpay:ref:offramp";

interface OfframpPlan {
  kesCents: string; // what the user typed, in cents
  feeKes: number; // our fee (from the bracket table)
  receiveKes: number; // what Element Pay pays to M-Pesa (from the binding quote)
  netUnits: string; // USDC sent to Element Pay
  feeUnits: string; // USDC the treasury keeps
  grossUnits: string; // USDC debited from the user (net + fee)
  effectiveRate: string; // KES per USDC that reaches Element Pay, after their fees
}

// "500" | "500.5" | 500.25 -> cents. At most 2 decimals.
function parseKesInput(input: unknown): bigint | null {
  const s =
    typeof input === "number"
      ? Number.isFinite(input)
        ? String(input)
        : ""
      : String(input ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  const cents = BigInt(i) * 100n + BigInt(f.padEnd(2, "0"));
  return cents > 0n ? cents : null;
}

function kesToCents(amount: unknown): bigint {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) {
    throw new ElementPayError(502, "Element Pay returned an invalid amount");
  }
  return BigInt(Math.round(n * 100));
}

// Integer division rounded toward +infinity (b > 0). BigInt division truncates toward zero,
// which already is the ceiling for negative numerators.
function ceilDiv(a: bigint, b: bigint): bigint {
  return a >= 0n ? (a + b - 1n) / b : a / b;
}

// KES (in cents) / rate -> USDC units, rounded UP so we never under-send.
function kesCentsToUsdcUnitsCeil(kesCents: bigint, rate: string): bigint {
  const { n, scale } = parseDec(rate);
  if (n === 0n) throw new Error("Rate must be greater than zero");
  return ceilDiv(kesCents * 10_000n * 10n ** BigInt(scale), n);
}

// Our fee for paying out `kesCents` (the whole amount the user typed).
function withdrawalFeeKes(kesCents: bigint): number {
  const kes = Math.ceil(Number(kesCents) / 100); // brackets have gaps like 500 -> 501
  const bracket = WITHDRAWAL_FEE_BRACKETS.find(
    (b) => kes >= b.min && kes <= b.max,
  );
  if (!bracket) {
    throw new ElementPayError(
      400,
      `Withdrawals must be between KES ${OFFRAMP_MIN_KES.toLocaleString()} and KES ${OFFRAMP_MAX_KES.toLocaleString()}`,
    );
  }
  return bracket.fee;
}

interface RefRate {
  effectiveRate: string;
  listedRate: unknown;
  expiresAt: number;
}

// Effective KES per USDC (after Element Pay's fees) from a reference-size quote. Same for every user,
// so it is shared for 30s. Only used to size the real quote and to show the page rate.
async function referenceOfframpRate(
  userId: number,
  payPhone: string,
  provider: Provider,
  treasury: string,
): Promise<RefRate> {
  const cached = getCached<RefRate>(OFFRAMP_REF_KEY);
  if (cached) return cached;

  const refUnits = parseUsdcInput(
    process.env.ELEMENTPAY_REFERENCE_USDC || "10",
  );
  if (!refUnits) throw new Error("ELEMENTPAY_REFERENCE_USDC is invalid");
  const q = await createQuote(
    await offrampQuoteBody(userId, payPhone, refUnits, provider.id, treasury),
  );
  const payout = q?.amounts?.user_receives?.amount;
  const effectiveRate = payout
    ? ratioString(payout, formatUnits(refUnits, USDC_DECIMALS), 6)
    : null;
  if (!effectiveRate) {
    throw new ElementPayError(502, "Element Pay did not return a rate");
  }
  const out: RefRate = {
    effectiveRate,
    listedRate: q?.amounts?.rate ?? null,
    expiresAt: Date.parse(q?.expires_at) || Date.now() + QUOTE_FALLBACK_TTL_MS,
  };
  setCache(OFFRAMP_REF_KEY, out, 30_000);
  return out;
}

// Binding price for a withdrawal. Sizes the USDC so Element Pay pays exactly (kes - fee) to M-Pesa
// (never less, at most KES 1 more), re-quoting up to 3 times because their fee/rate may not be linear.
async function priceOfframp(
  userId: number,
  payPhone: string,
  provider: Provider,
  treasury: string,
  kesCents: bigint,
): Promise<{ q: any; plan: OfframpPlan }> {
  const feeKes = withdrawalFeeKes(kesCents);
  const targetCents = kesCents - BigInt(feeKes) * 100n; // what M-Pesa must receive
  if (targetCents <= 0n) {
    throw new ElementPayError(400, "Amount is too small to withdraw");
  }

  const ref = await referenceOfframpRate(userId, payPhone, provider, treasury);
  let net = kesCentsToUsdcUnitsCeil(targetCents, ref.effectiveRate);

  let q: any;
  let payoutCents = 0n;
  let ok = false;
  for (let i = 0; i < 3; i++) {
    q = await createQuote(
      await offrampQuoteBody(userId, payPhone, net, provider.id, treasury),
    );
    payoutCents = kesToCents(q?.amounts?.user_receives?.amount);
    const diff = targetCents - payoutCents; // > 0: they would pay us too little
    if (diff <= 0n && diff > -100n) {
      ok = true; // payout is within [target, target + KES 1)
      break;
    }
    if (i === 2) break;
    // payout moves by `listed rate` KES per USDC, so shift the USDC by diff / rate
    const { n, scale } = parseDec(q?.amounts?.rate);
    net += ceilDiv(diff * 10_000n * 10n ** BigInt(scale), n);
    if (net <= 0n) {
      throw new ElementPayError(400, "Amount is too small to withdraw");
    }
  }
  if (!ok) {
    throw new ElementPayError(
      502,
      "Could not price this withdrawal. Please try again.",
    );
  }

  const netStr = formatUnits(net, USDC_DECIMALS);
  const payoutKes = Number(payoutCents) / 100;
  const effectiveRate = ratioString(payoutKes, netStr, 6);
  if (!effectiveRate) {
    throw new ElementPayError(502, "Element Pay did not return a rate");
  }

  // our fee is a KES amount; collect it in USDC at the same effective rate, rounded up
  const feeUnits = kesCentsToUsdcUnitsCeil(
    BigInt(feeKes) * 100n,
    effectiveRate,
  );
  const plan: OfframpPlan = {
    kesCents: kesCents.toString(),
    feeKes,
    receiveKes: payoutKes,
    netUnits: net.toString(),
    feeUnits: feeUnits.toString(),
    grossUnits: (net + feeUnits).toString(),
    effectiveRate,
  };
  return { q, plan };
}

function offrampPayload(
  quoteId: string | null,
  expiresAt: number,
  plan: OfframpPlan,
) {
  return {
    success: true,
    type: "offramp",
    mode: "exact",
    quoteId,
    expiresAt: new Date(expiresAt).toISOString(),
    kes: {
      amount: Number(plan.kesCents) / 100, // what the user typed
      fee: plan.feeKes, // our fee
      receive: plan.receiveKes, // what lands in M-Pesa
    },
    usdc: {
      gross: formatUnits(BigInt(plan.grossUnits), USDC_DECIMALS), // leaves the wallet
      fee: formatUnits(BigInt(plan.feeUnits), USDC_DECIMALS),
      net: formatUnits(BigInt(plan.netUnits), USDC_DECIMALS),
    },
    rate: plan.effectiveRate,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// '0712345678' | '712345678' | '254712345678' | '+254712345678' -> '+254712345678'
export function toKenyaE164(input: string): string | null {
  const digits = String(input).replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("254")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  return /^[17]\d{8}$/.test(national) ? `+254${national}` : null;
}

// Sandbox: force a deterministic outcome with Element Pay's test MSISDN
function resolvePayPhone(phone: string | null): string {
  if (IS_PRODUCTION) {
    if (!phone) {
      throw new ElementPayError(
        400,
        "Enter a valid Safaricom number (e.g. 0712345678)",
      );
    }
    return phone;
  }
  return process.env.ELEMENTPAY_SANDBOX_TEST_PHONE || SANDBOX_SUCCESS_PHONE;
}

type OrderType = "OnRamp" | "OffRamp";
type Provider = { id: string; min?: number; max?: number };

// network_id always comes from GET /partner/catalog for the SAME country + order_type as the quote
// (provider ids differ between OnRamp and OffRamp, and between sandbox and production), so nothing
// is configured in .env. Cached for 10 minutes.
function findKenyaProviders(data: any, orderType: OrderType): any[] {
  const dir = orderType.toLowerCase(); // "onramp" | "offramp"
  // docs show the tree under data.african_markets; accept it at the top level too
  const node = data?.african_markets?.[dir] ?? data?.[dir];
  const countries = node?.countries;
  const ke = Array.isArray(countries)
    ? countries.find((c: any) =>
        [c?.code, c?.country, c?.iso, c?.iso2].some(
          (v) => String(v ?? "").toUpperCase() === "KE",
        ),
      )
    : (countries?.KE ?? countries?.ke);

  const direct = ke?.payment_methods?.mobile_money?.providers;
  if (Array.isArray(direct)) return direct;

  // fallback: any `providers` list under the Kenya node
  const found: any[] = [];
  const walk = (n: any, depth = 0) => {
    if (!n || typeof n !== "object" || depth > 8) return;
    if (Array.isArray(n.providers)) found.push(...n.providers);
    for (const v of Object.values(n)) walk(v, depth + 1);
  };
  walk(ke);
  return found;
}

async function getMpesaProvider(orderType: OrderType): Promise<Provider> {
  const cacheKey = `elementpay:ke-mpesa-provider:${orderType}`;
  const cached = getCached<Provider>(cacheKey);
  if (cached) return cached;

  const res = await epRequest(
    "GET",
    `/partner/catalog?country=KE&order_type=${orderType}`,
  );
  const providers = findKenyaProviders(res?.data, orderType);
  const mpesa = providers.find(
    (p) =>
      p?.enabled !== false &&
      /m[\s_-]?pesa/i.test(`${p?.code} ${p?.name} ${p?.network_name ?? ""}`),
  );
  if (!mpesa?.id) {
    console.error(
      `[elementpay] no M-Pesa ${orderType} provider in catalog. data keys: ${Object.keys(res?.data ?? {}).join(", ")}; providers seen: ${providers.length}`,
    );
    throw new ElementPayError(
      503,
      orderType === "OnRamp"
        ? "M-Pesa deposits are not available right now"
        : "M-Pesa withdrawals are not available right now",
    );
  }
  const provider: Provider = {
    id: mpesa.id as string,
    min: typeof mpesa.min_amount === "number" ? mpesa.min_amount : undefined,
    max: typeof mpesa.max_amount === "number" ? mpesa.max_amount : undefined,
  };
  setCache(cacheKey, provider, 10 * 60_000);
  return provider;
}

function assertWithinLimits(provider: Provider, kes: number) {
  if (provider.min && kes < provider.min) {
    throw new ElementPayError(400, `Minimum amount is KES ${provider.min}`);
  }
  if (provider.max && kes > provider.max) {
    throw new ElementPayError(400, `Maximum amount is KES ${provider.max}`);
  }
}

// ---------------------------------------------------------------------------
// Customer details: sent inline as `customer` on every quote (no Element Pay vault customer needed).
// Source: the user's Didit-verified KYC fields on the User row.
//   kycFirstName + kycLastName   -> customer.name (Element Pay needs two or more words)
//   kycDateOfBirth (YYYY-MM-DD)  -> customer.dob  (mm/dd/yyyy)
//   kycDocumentNumber (encrypted)-> customer.id_number
//   kycDocumentType              -> customer.id_type
//   address                      -> customer.address (the schema has no city field; see below)
//   email, country = KE
// ---------------------------------------------------------------------------

interface CustomerProfile {
  name: string;
  email: string;
  address: string;
  dob: string; // mm/dd/yyyy, as Element Pay expects
  idNumber: string;
  idType: string;
}

// Sandbox only: used when a dev account has no approved KYC.
const SANDBOX_PROFILE: CustomerProfile = {
  name: "Chamapay User",
  email: "sandbox@example.com",
  address: "Nairobi",
  dob: "01/01/1990",
  idNumber: "A1234567",
  idType: "passport",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" (or a Date) -> "mm/dd/yyyy". Anything else is rejected, never guessed.
function toEpDob(value: unknown): string | null {
  let y: number, m: number, d: number;
  if (value instanceof Date && !isNaN(value.getTime())) {
    y = value.getUTCFullYear();
    m = value.getUTCMonth() + 1;
    d = value.getUTCDate();
  } else {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
    if (!iso) return null;
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  }
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${pad2(m)}/${pad2(d)}/${y}`;
}

// Didit document types ("Identity Card", "Passport", "Driver's License", ...) -> Element Pay id_type.
// CONFIRM the accepted values with GET /partner/order-requirements?country=KE&currency=KES&order_type=OnRamp.
function toEpIdType(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[\s\-/]+/g, "_");
  const map: Record<string, string> = {
    identity_card: "national_id",
    id_card: "national_id",
    national_id: "national_id",
    national_id_card: "national_id",
    id: "national_id",
    passport: "passport",
    drivers_license: "driving_license",
    drivers_licence: "driving_license",
    driving_license: "driving_license",
    driving_licence: "driving_license",
    residence_permit: "alien_id",
    alien_card: "alien_id",
    alien_id: "alien_id",
  };
  return map[s] ?? s;
}

async function readDocumentNumber(encrypted: string | null): Promise<string> {
  if (!encrypted) return "";
  try {
    return String((await decryptKycDocumentNumber(encrypted)) ?? "").trim();
  } catch (err) {
    console.error("[elementpay] could not decrypt kycDocumentNumber", err);
    throw new ElementPayError(
      500,
      "We couldn't read your verified ID details. Please contact support.",
    );
  }
}

async function loadCustomerProfile(userId: number): Promise<CustomerProfile> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      address: true,
      kycStatus: true,
      kycDocumentType: true,
      kycFirstName: true,
      kycLastName: true,
      kycFullName: true,
      kycDateOfBirth: true,
      kycDocumentNumber: true,
    },
  });
  if (!u) throw new ElementPayError(400, "User not found");

  const approved = u.kycStatus === "approved";

  let first = (u.kycFirstName ?? "").trim();
  let last = (u.kycLastName ?? "").trim();
  if ((!first || !last) && u.kycFullName) {
    const parts = u.kycFullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      first = first || parts[0];
      last = last || parts.slice(1).join(" ");
    }
  }
  const dob = toEpDob(u.kycDateOfBirth);
  console.log("the right date of birth", dob);
  const idNumber = approved
    ? await readDocumentNumber(u.kycDocumentNumber)
    : "";
  const idTypeRaw = (u.kycDocumentType ?? "").trim();
  const email = (u.email ?? "").trim();
  const address = "Nairobi";

  const missing: string[] = [];
  if (!first) missing.push("first name");
  if (!last) missing.push("last name");
  if (!dob) missing.push("date of birth");
  if (!idNumber) missing.push("ID number");
  if (!idTypeRaw) missing.push("ID type");
  if (!email) missing.push("email");

  if (!approved || missing.length > 0) {
    if (!IS_PRODUCTION) {
      console.warn(
        `[elementpay] user ${userId} has no approved KYC data; using sandbox placeholder`,
      );
      return SANDBOX_PROFILE;
    }
    // Element Pay needs real identity details; never fabricate them in production.
    if (!approved) {
      throw new ElementPayError(
        403,
        "Verify your identity to deposit or withdraw with M-Pesa.",
        { code: KYC_REQUIRED_CODE },
      );
    }
    throw new ElementPayError(
      400,
      `Your verified details are incomplete (${missing.join(", ")}). Please redo identity verification.`,
      { code: "PROFILE_INCOMPLETE", missing },
    );
  }

  return {
    name: `${first} ${last}`,
    email,
    address,
    dob: dob as string,
    idNumber,
    idType: toEpIdType(idTypeRaw),
  };
}

async function buildQuoteCustomer(
  userId: number,
  phone: string,
  orderType: OrderType,
): Promise<{ customer: Record<string, unknown> }> {
  const p = await loadCustomerProfile(userId);

  // Sandbox off-ramp only: the word in customer.name ("Successful" / "Failure") decides the auto outcome.
  const name =
    !IS_PRODUCTION && orderType === "OffRamp"
      ? `${process.env.ELEMENTPAY_SANDBOX_OFFRAMP_OUTCOME || "Successful"} ${p.name}`
      : p.name;

  return {
    customer: {
      // production: one stable uid per user. sandbox: docs ask for a fresh uid per run.
      uid: IS_PRODUCTION
        ? `chamapay-${userId}`
        : `chamapay-${userId}-${Date.now()}`,
      type: "user",
      name,
      country: "KE",
      phone, // same MSISDN as payment_method.phone_number
      address: p.address,
      dob: p.dob,
      email: p.email,
      id_number: p.idNumber,
      id_type: p.idType,
    },
  };
}

async function onrampQuoteBody(
  userId: number,
  payPhone: string,
  kes: number,
  networkId: string,
  treasury: string,
) {
  return {
    order_type: "OnRamp",
    currency: "KES",
    country: "KE",
    local_amount: kes,
    ...(await buildQuoteCustomer(userId, payPhone, "OnRamp")),
    asset: BASE_USDC_ASSET,
    payment_method: {
      type: "mobile_money",
      phone_number: payPhone,
      network_id: networkId,
    },
    wallet_address: treasury, // USDC lands in the treasury; the user is credited from it
  };
}

async function offrampQuoteBody(
  userId: number,
  payPhone: string,
  netUsdc: bigint,
  networkId: string,
  refundAddress: string,
) {
  return {
    order_type: "OffRamp",
    currency: "KES",
    country: "KE",
    crypto_amount: Number(formatUnits(netUsdc, USDC_DECIMALS)),
    ...(await buildQuoteCustomer(userId, payPhone, "OffRamp")),
    asset: OFFRAMP_ASSET,
    payment_method: {
      type: "mobile_money",
      phone_number: payPhone,
      network_id: networkId,
    },
    refund_address: refundAddress, // failed payouts refunds to the user
  };
}

// OffRamp accept returns a per-order deposit address in payment_instructions.crypto_deposit.
// The exact field names are not published, so read the documented object first, then fall back to the
// first address-looking value (never the token contract or our treasury).
function extractDeposit(
  acceptRes: any,
  treasury: string,
): { address: string | null; cryptoDeposit: any; instructions: any } {
  const instructions =
    acceptRes?.data?.accepted?.payment_instructions ??
    acceptRes?.data?.payment_instructions;
  const cryptoDeposit =
    instructions?.crypto_deposit ??
    (instructions?.type === "crypto_deposit" ? instructions : undefined);
  const excluded = new Set(
    [OFFRAMP_ASSET.token, BASE_USDC_ASSET.token, treasury].map((a) =>
      String(a).toLowerCase(),
    ),
  );
  const isAddr = (v: unknown): v is string =>
    typeof v === "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(v) &&
    !excluded.has(v.toLowerCase());

  const src = cryptoDeposit ?? instructions;
  for (const c of [
    src?.address,
    src?.wallet_address,
    src?.deposit_address,
    src?.to,
  ]) {
    if (isAddr(c)) return { address: c, cryptoDeposit, instructions };
  }

  let found: string | null = null;
  const walk = (n: any, depth = 0) => {
    if (found || !n || typeof n !== "object" || depth > 6) return;
    for (const v of Object.values(n)) {
      if (isAddr(v)) {
        found = v;
        return;
      }
      walk(v, depth + 1);
    }
  };
  walk(instructions);
  return { address: found, cryptoDeposit, instructions };
}

async function createQuote(body: Record<string, unknown>): Promise<any> {
  const res = await epRequest("POST", "/partner/orders/quote", body);
  if (!res?.data?.quote_id) {
    throw new ElementPayError(502, "Element Pay did not return a quote");
  }
  return res.data;
}

async function acceptQuote(quoteId: string, quotedAt: number): Promise<any> {
  // docs: wait ~2s after quoting; skip whatever has already elapsed (e.g. a quote previewed earlier)
  await sleep(Math.max(0, QUOTE_TO_ACCEPT_DELAY_MS - (Date.now() - quotedAt)));
  return epRequest("POST", `/partner/orders/${quoteId}/accept`, {});
}

// ---------------------------------------------------------------------------
// Quote memory: lets the user accept exactly the quote they were shown.
// A cache miss (or a different instance) just means a fresh quote is created, so this is optional.
// ---------------------------------------------------------------------------

interface CachedQuote {
  userId: number;
  type: "onramp" | "offramp";
  amountKey: string; // on-ramp: KES as string. off-ramp: gross USDC units as string
  phone: string;
  createdAt: number;
  expiresAt: number;
  usdcToTreasuryUnits: string | null; // on-ramp only, for the FX-reserve check
  plan?: OfframpPlan; // off-ramp only: the priced withdrawal the user was shown
}

const quoteKey = (id: string) => `elementpay:quote:${id}`;

function rememberQuote(
  q: any,
  meta: Omit<CachedQuote, "createdAt" | "expiresAt">,
): number {
  const expiresAt =
    Date.parse(q?.expires_at) || Date.now() + QUOTE_FALLBACK_TTL_MS;
  const ttl = expiresAt - Date.now();
  if (ttl > 0)
    setCache(
      quoteKey(q.quote_id),
      { ...meta, createdAt: Date.now(), expiresAt },
      ttl,
    );
  return expiresAt;
}

function takeReusableQuote(
  quoteId: unknown,
  userId: number,
  type: "onramp" | "offramp",
  amountKey: string,
  phone: string,
): CachedQuote | null {
  if (typeof quoteId !== "string" || !quoteId) return null;
  const c = getCached<CachedQuote>(quoteKey(quoteId));
  if (!c || c.userId !== userId || c.type !== type) return null;
  if (c.amountKey !== amountKey || c.phone !== phone) return null;
  if (c.expiresAt - Date.now() < QUOTE_REUSE_MARGIN_MS) return null;
  return c;
}

function receivesUnits(q: any): bigint | null {
  try {
    return toUnits(q?.amounts?.user_receives?.amount);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST  real quote  (binding quote from Element Pay, not the indicative rate)
//
//   body: { type: "onramp" | "offramp", amount, phoneNo }
//     onramp : amount = KES (whole number)
//     offramp: kesAmount = KES the user types (our fee is taken out of it); omit for the page rate
//
// This calls POST /partner/orders/quote and does NOT accept it, so nothing is charged. The returned
// quoteId can be sent back to the on/off-ramp endpoint to accept exactly this quote until `expiresAt`.
//
// NOTE: `platform.belowCost` / `effectiveRate` reveal your margin. If this route is user-facing,
// strip those fields (or restrict the route to admins).
// ---------------------------------------------------------------------------

export async function getElementPayQuote(req: Request, res: Response) {
  const userId = req.user?.userId;
  const type = String(req.body?.type ?? "onramp").toLowerCase();

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }
    if (type !== "onramp" && type !== "offramp") {
      return res
        .status(400)
        .json({ success: false, error: 'type must be "onramp" or "offramp"' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, email: true, phoneE164: true },
    });
    if (!user || !user.smartAddress) {
      return res
        .status(400)
        .json({ success: false, error: "User wallet address not found" });
    }

    // A binding quote is tied to the payer's number, so production needs a valid phoneNo.
    // phoneNo may be missing (e.g. a page-load rate quote): fall back to the account's own number.
    // That quote is only for pricing and is never accepted.
    const typedPhone = toKenyaE164(String(req.body?.phoneNo ?? ""));
    const accountPhone = user.phoneE164 ? toKenyaE164(user.phoneE164) : null;
    const payPhone = resolvePayPhone(typedPhone ?? accountPhone);
    const treasury = treasuryAddress();

    if (type === "onramp") {
      const kes = Number(req.body?.amount);
      if (!Number.isInteger(kes) || kes < 1) {
        return res.status(400).json({
          success: false,
          error: "Amount must be a whole number of KES",
        });
      }
      const provider = await getMpesaProvider("OnRamp");
      assertWithinLimits(provider, kes);

      const q = await createQuote(
        await onrampQuoteBody(userId, payPhone, kes, provider.id, treasury),
      );
      const treasuryUnits = receivesUnits(q);
      const expiresAt = rememberQuote(q, {
        userId,
        type: "onramp",
        amountKey: String(kes),
        phone: payPhone,
        usdcToTreasuryUnits:
          treasuryUnits === null ? null : treasuryUnits.toString(),
      });

      const rate = platformRate();
      const userUnits = kesToUsdcCeil(kes, rate);
      const receivesRaw = q?.amounts?.user_receives?.amount;

      return res.status(200).json({
        success: true,
        type: "onramp",
        quoteId: q.quote_id,
        expiresAt: new Date(expiresAt).toISOString(),
        amountKes: kes,
        elementPay: {
          listedRate: q?.amounts?.rate ?? null, // the headline rate, before fees
          // KES per USDC you actually pay once Element Pay's fees are taken out
          effectiveRate: ratioString(kes, receivesRaw, 4),
          usdcToTreasury:
            receivesRaw === undefined ? null : String(receivesRaw),
          fees: q?.amounts?.fees ?? null,
        },
        platform: {
          rate,
          usdcToUser: formatUnits(userUnits, USDC_DECIMALS),
          // true => the treasury receives less USDC than we would credit the user
          belowCost: treasuryUnits !== null ? treasuryUnits < userUnits : null,
        },
      });
    }

    // off-ramp (KES in). Without `kesAmount` we return the reference effective rate, so the page can show
    // "1 USDC = X KES" and the withdrawable balance. With `kesAmount` we return a BINDING quote: our fee
    // from the bracket table, the KES the user receives and the exact USDC that will leave the wallet.
    const provider = await getMpesaProvider("OffRamp");
    const hasAmount = String(req.body?.kesAmount ?? "").trim() !== "";

    if (!hasAmount) {
      const ref = await referenceOfframpRate(
        userId,
        payPhone,
        provider,
        treasury,
      );
      return res.status(200).json({
        success: true,
        type: "offramp",
        mode: "reference",
        effectiveRate: ref.effectiveRate, // KES per 1 USDC, after Element Pay's fees
        listedRate: ref.listedRate,
        expiresAt: new Date(ref.expiresAt).toISOString(),
        minKes: OFFRAMP_MIN_KES,
        maxKes: OFFRAMP_MAX_KES,
      });
    }

    const kesCents = parseKesInput(req.body?.kesAmount);
    if (!kesCents) {
      return res.status(400).json({
        success: false,
        error: "Enter a KES amount with at most 2 decimals",
      });
    }
    assertWithinLimits(provider, Math.ceil(Number(kesCents) / 100));

    const { q, plan } = await priceOfframp(
      userId,
      payPhone,
      provider,
      treasury,
      kesCents,
    );
    const expiresAt = rememberQuote(q, {
      userId,
      type: "offramp",
      amountKey: kesCents.toString(),
      phone: payPhone,
      usdcToTreasuryUnits: null,
      plan,
    });
    return res.status(200).json(offrampPayload(q.quote_id, expiresAt, plan));
  } catch (error) {
    return sendEpError(res, error, "Failed to get Element Pay quote");
  }
}

// ---------------------------------------------------------------------------
// POST  on-ramp initiate  (same body as before; optional `quoteId` from /elementpay/quote)
// ---------------------------------------------------------------------------

export async function initiateElementPayOnramp(req: Request, res: Response) {
  const {
    amount,
    phoneNo,
    exchangeRate,
    isDeposit,
    isMoonwellDeposit,
    chamaId,
    memberForId,
    goalId,
    quoteId: clientQuoteId,
  } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, email: true },
    });
    if (!user || !user.smartAddress) {
      return res
        .status(400)
        .json({ success: false, error: "User wallet address not found" });
    }

    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }

    const requestedKes = Number(amount);
    if (!Number.isInteger(requestedKes) || requestedKes < 1) {
      return res.status(400).json({
        success: false,
        error: "Amount must be a whole number of KES",
      });
    }

    const phone = toKenyaE164(phoneNo);
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid Safaricom number (e.g. 0712345678)",
      });
    }

    // Same KYC / monthly limit gate as Pretium
    const limitCheck = await checkOnrampKesAllowed(userId, requestedKes);
    if (!limitCheck.ok) {
      const status = limitCheck.code === KYC_REQUIRED_CODE ? 403 : 400;
      return res.status(status).json({
        success: false,
        error: limitCheck.message,
        code: limitCheck.code,
        mtdKes: limitCheck.mtdKes,
        limitKes: limitCheck.limitKes,
        remainingKes: limitCheck.remainingKes,
        kycTier: limitCheck.kycTier,
        requestedKes: limitCheck.requestedKes,
      });
    }

    // What we credit the user: exact integer math at CHAMAPAY_RATE, rounded UP to the 6 decimals USDC
    // supports, so the credit is never below requestedKes / rate (chama payments need the full amount).
    const rate = platformRate();
    const usdcUnits = kesToUsdcCeil(requestedKes, rate);
    if (usdcUnits <= 0n) {
      return res
        .status(400)
        .json({ success: false, error: "Amount is too small" });
    }
    const usdcToCredit = formatUnits(usdcUnits, USDC_DECIMALS);

    const treasury = treasuryAddress();
    const provider = await getMpesaProvider("OnRamp");
    assertWithinLimits(provider, requestedKes);
    const payPhone = resolvePayPhone(phone);

    // 1) Quote (reuse the one the user was shown if it is still valid)
    let quoteId: string;
    let quotedAt: number;
    let elementpayRate: number;
    let amountElementpayGives: number;
    let treasuryUnits: bigint | null;
    const reuse = takeReusableQuote(
      clientQuoteId,
      userId,
      "onramp",
      String(requestedKes),
      payPhone,
    );

    if (reuse) {
      quoteId = clientQuoteId;
      quotedAt = reuse.createdAt;
      treasuryUnits =
        reuse.usdcToTreasuryUnits === null
          ? null
          : BigInt(reuse.usdcToTreasuryUnits);
    } else {
      const q = await createQuote(
        await onrampQuoteBody(
          userId,
          payPhone,
          requestedKes,
          provider.id,
          treasury,
        ),
      );
      console.log("q", q);
      quoteId = q.quote_id;
      quotedAt = Date.now();
      elementpayRate = q.amounts.rate;
      amountElementpayGives = q.amounts.user_receives.amount;
      treasuryUnits = receivesUnits(q);
    }

    console.log("elementpay rate is", elementpayRate!);
    console.log(
      `amount user needs: ${usdcToCredit} USDC. Elelemntpay gives: ${amountElementpayGives!} USDC.`,
    );
    if (Number(amountElementpayGives!) < Number(usdcToCredit)) {
      console.log(
        `we are about to add this ${Number(usdcToCredit) - Number(amountElementpayGives!)} USDC`,
      );
    }

    // Visibility into FX-reserve exposure: what the treasury receives vs. what we owe the user
    if (treasuryUnits !== null && treasuryUnits < usdcUnits) {
      console.warn(
        `[elementpay] treasury shortfall on quote ${quoteId}: receives ${formatUnits(
          treasuryUnits,
          USDC_DECIMALS,
        )} USDC, owes ${usdcToCredit} USDC (CHAMAPAY_RATE=${rate})`,
      );
    }

    // 2) Accept -> triggers the M-Pesa STK push
    const acceptRes = await acceptQuote(quoteId, quotedAt);

    // native rail: order_id is null until the on-chain order is created; fall back to
    // identifiers that the webhook also carries (invoice_id / creation_transaction_hash)
    const orderId: string | undefined =
      acceptRes?.data?.order?.order_id ||
      acceptRes?.data?.audit?.partner_quote_invoice_id ||
      acceptRes?.data?.accepted?.creation_tx_hash ||
      acceptRes?.data?.order?.creation_transaction_hash ||
      undefined;

    if (!orderId) {
      console.error(
        `[elementpay] CRITICAL: accepted quote ${quoteId} but no usable id`,
        acceptRes,
      );
      throw new ElementPayError(502, "Element Pay did not return an order");
    }

    // 3) Persist (same table + shape as Pretium rows)
    const parsedGoalId = goalId ? Number(goalId) : null;
    const txType = parsedGoalId
      ? "goal"
      : isMoonwellDeposit
        ? "moonwell"
        : isDeposit
          ? "deposit"
          : "payment";

    try {
      await prisma.pretiumTransaction.create({
        data: {
          userId,
          transactionCode: orderId,
          isOnramp: true,
          shortcode: String(phoneNo),
          amount: amount,
          type: txType,
          status: "PENDING",
          isRealesed: false,
          // exact 6-dp credit (<= 15 significant digits, so it round-trips through a Float/Decimal column unchanged)
          cusdAmount: Number(usdcToCredit),
          exchangeRate: exchangeRate,
          walletAddress: user.smartAddress,
          chamaId: chamaId ? Number(chamaId) : null,
          memberForId: memberForId ? Number(memberForId) : null,
          goalId:
            parsedGoalId && Number.isFinite(parsedGoalId) ? parsedGoalId : null,
          message: `elementpay quote ${quoteId}`,
        } as any,
      });
    } catch (dbErr) {
      // The STK push is already on its way, so make this impossible to miss in logs.
      console.error(
        `[elementpay] CRITICAL: order ${orderId} (quote ${quoteId}) accepted but DB insert failed for user ${userId}`,
        dbErr,
      );
      throw dbErr;
    }
    console.log(
      `[elementpay] on-ramp ${orderId}: KES ${requestedKes} @ ${rate} -> ${usdcToCredit} USDC`,
    );

    return res.status(200).json({
      success: true,
      message:
        "M-Pesa prompt sent. Enter your PIN on your phone to complete the deposit.",
      status: "PENDING",
      transactionCode: orderId,
      usdcAmount: usdcToCredit,
      transactionMessage:
        "M-Pesa prompt sent. Enter your PIN on your phone to complete the deposit.",
    });
  } catch (error) {
    return sendEpError(res, error, "Failed to initiate Element Pay on-ramp");
  }
}

// ---------------------------------------------------------------------------
// POST  off-ramp initiate   body: { kesAmount, phoneNo, quoteId?, expectedUsdc? }
//
// kesAmount is what the user typed. Our fee comes from WITHDRAWAL_FEE_BRACKETS, Element Pay pays
// (kesAmount - fee) to M-Pesa, and the USDC leaves the user's wallet in ONE transfer to the treasury.
// The treasury keeps the fee and forwards the net to Element Pay's per-order deposit address.
// If the quote the user confirmed has expired we re-price, and refuse (409 RATE_CHANGED) when that
// would cost the user more than 0.5% extra USDC than the amount they confirmed (`expectedUsdc`).
// ---------------------------------------------------------------------------
// charging directly from the user's address
async function fundOfframpOrder(
  t: any,
  cdpWalletId: string,
  depositAddress: string,
  net: bigint,
  fee: bigint,
) {
  let txHash: string;
  try {
    txHash = await transferWithFeeTx(
      cdpWalletId,
      formatUnits(net, USDC_DECIMALS),
      depositAddress as `0x${string}`,
      formatUnits(fee, USDC_DECIMALS),
    );
  } catch (err) {
    // Atomic batch: if it threw, nothing moved (but see the timeout caveat below)
    await prisma.pretiumTransaction.updateMany({
      where: { id: t.id, status: "PENDING" },
      data: { status: "FAILED", message: "Could not send funds" },
    });
    throw new ElementPayError(
      400,
      "Could not debit your wallet. Check your balance and try again.",
    );
  }

  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, status: "PENDING", isRealesed: false },
    data: {
      status: "processing",
      blockchainTxHash: txHash,
      message: "Sent to Element Pay. Waiting for M-Pesa payout",
    },
  });
  // A failure webhook closed the order before we recorded the send: funds did move
  if (claim.count === 0)
    await refundOfframpFee(t, "Order closed before funding");
}

export async function initiateElementPayOfframp(req: Request, res: Response) {
  const { kesAmount, phoneNo, quoteId: clientQuoteId, expectedUsdc } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, cdpWalletId: true, email: true },
    });
    if (!user || !user.smartAddress || !user.cdpWalletId) {
      return res
        .status(400)
        .json({ success: false, error: "User wallet not found" });
    }

    if (!kesAmount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }

    const kesCents = parseKesInput(kesAmount);
    if (!kesCents) {
      return res.status(400).json({
        success: false,
        error: "Enter a KES amount with at most 2 decimals",
      });
    }

    const phone = toKenyaE164(phoneNo);
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid Safaricom number (e.g. 0712345678)",
      });
    }

    if (OFFRAMP_ONCHAIN && OFFRAMP_ASSET.network.toUpperCase() !== "BASE") {
      throw new ElementPayError(
        501,
        `Off-ramp on ${OFFRAMP_ASSET.network} is not supported by the treasury transfer yet`,
      );
    }

    const treasury = treasuryAddress();
    const provider = await getMpesaProvider("OffRamp");
    assertWithinLimits(provider, Math.ceil(Number(kesCents) / 100));
    const payPhone = resolvePayPhone(phone);

    // 1) Price it: reuse the quote the user confirmed if it is still valid, otherwise re-price
    let quoteId: string;
    let quotedAt: number;
    let plan: OfframpPlan;
    const reuse = takeReusableQuote(
      clientQuoteId,
      userId,
      "offramp",
      kesCents.toString(),
      payPhone,
    );
    if (reuse?.plan) {
      quoteId = clientQuoteId;
      quotedAt = reuse.createdAt;
      plan = reuse.plan;
    } else {
      const priced = await priceOfframp(
        userId,
        payPhone,
        provider,
        treasury,
        kesCents,
      );
      quoteId = priced.q.quote_id;
      quotedAt = Date.now();
      plan = priced.plan;
      console.log("The offramp plan", plan);

      // The confirmed quote is gone. Never silently charge noticeably more than what the user agreed to.
      const confirmed = parseUsdcInput(expectedUsdc);
      if (confirmed && BigInt(plan.grossUnits) > confirmed + confirmed / 200n) {
        return res.status(409).json({
          ...offrampPayload(null, Date.now(), plan),
          success: false,
          code: "RATE_CHANGED",
          error: "The rate changed. Please review the new amount.",
        });
      }
    }

    const gross = BigInt(plan.grossUnits);
    const net = BigInt(plan.netUnits);
    const fee = BigInt(plan.feeUnits);

    console.log("accepting the quote...");
    console.log("The gross USDC is", Number(gross) + "USDC");
    console.log("The net USDC is", Number(net) + "USDC");
    console.log("The fee USDC is", Number(fee) + "USDC");

    // 2) Accept -> creates the order and (live) returns the per-order crypto deposit address
    const acceptRes = await acceptQuote(quoteId, quotedAt);
    console.log("the accepted quote", acceptRes);
    const orderId: string | undefined = acceptRes?.data?.order?.order_id;
    if (!orderId) {
      console.error(
        `[elementpay] off-ramp accept returned no order_id for quote ${quoteId}`,
        acceptRes,
      );
      throw new ElementPayError(502, "Element Pay did not return an order");
    }

    const {
      address: depositAddress,
      cryptoDeposit: deposit,
      instructions,
    } = extractDeposit(acceptRes, treasury);
    console.log(
      `[elementpay] off-ramp ${orderId} payment_instructions:`,
      JSON.stringify(instructions ?? null),
    );
    console.log(
      `The deposit address ${depositAddress} and amount is ${deposit?.amount}`,
    );

    if (OFFRAMP_ONCHAIN) {
      if (!depositAddress) {
        console.error(
          `[elementpay] off-ramp ${orderId}: no crypto_deposit address in accept response`,
          acceptRes,
        );
        throw new ElementPayError(
          502,
          "Element Pay did not return a deposit address",
        );
      }
      // Element Pay expects the exact amount. If it states one and it is not what we quoted, do not send.
      if (deposit?.amount !== undefined) {
        let expected: bigint | null = null;
        try {
          expected = toUnits(deposit.amount);
        } catch {
          /* unparsable, ignore */
        }
        if (expected !== null && expected !== net) {
          console.error(
            `[elementpay] CRITICAL: off-ramp ${orderId} deposit amount mismatch: expects ${deposit.amount}, we would send ${formatUnits(net, USDC_DECIMALS)}`,
          );
          throw new ElementPayError(
            502,
            "Withdrawal amount mismatch. Nothing was debited.",
          );
        }
      }
    }

    // 3) Persist
    const epRate = Number(acceptRes?.data?.order?.exchange_rate);
    let row: any;
    try {
      row = await prisma.pretiumTransaction.create({
        data: {
          userId,
          transactionCode: orderId,
          isOnramp: false,
          shortcode: String(phoneNo),
          // KES the user typed (fee included), e.g. 60. This is what the activity list shows;
          // the fee (e.g. KES 5) is kept in `message` and what lands in M-Pesa is plan.receiveKes.
          amount: Number(plan.kesCents) / 100,
          type: "offramp",
          status: "PENDING",
          isRealesed: false,
          cusdAmount: Number(formatUnits(gross, USDC_DECIMALS)), // gross USDC debited from the user (fee included)
          exchangeRate: Number.isFinite(epRate) ? epRate : undefined, // real Element Pay rate
          walletAddress: user.smartAddress,
          message: `elementpay quote ${quoteId}; fee KES ${plan.feeKes} (${formatUnits(fee, USDC_DECIMALS)} USDC)`,
        } as any,
      });
    } catch (dbErr) {
      console.error(
        `[elementpay] CRITICAL: off-ramp order ${orderId} (quote ${quoteId}) accepted but DB insert failed for user ${userId}. Nothing was debited; the order will expire.`,
        dbErr,
      );
      throw dbErr;
    }

    // 4) Move the money (production). Sandbox auto-settles from the "Successful" name trigger.
    if (OFFRAMP_ONCHAIN) {
      await fundOfframpOrder(
        row,
        user.cdpWalletId,
        depositAddress as string,
        net,
        fee,
      );
    } else {
      console.log(
        `[elementpay] sandbox off-ramp ${orderId}: on-chain legs skipped`,
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Withdrawal started. You will receive the money on M-Pesa shortly.",
      status: "PENDING",
      transactionCode: orderId,
      kes: {
        amount: Number(plan.kesCents) / 100,
        fee: plan.feeKes,
        receive: plan.receiveKes,
      },
      usdc: {
        gross: formatUnits(gross, USDC_DECIMALS),
        fee: formatUnits(fee, USDC_DECIMALS),
        net: formatUnits(net, USDC_DECIMALS),
      },
    });
  } catch (error) {
    return sendEpError(res, error, "Failed to initiate Element Pay off-ramp");
  }
}

async function refundOfframpFee(t: any, reason: string): Promise<boolean> {
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, isRealesed: false },
    data: {
      isRealesed: true,
      status: "FAILED",
      message: `Refunding fee: ${reason}`.slice(0, 250),
    },
  });
  if (claim.count === 0) return false; // already refunded, never twice

  try {
    const tx = await treasuryTransferToUser(
      t.walletAddress as `0x${string}`,
      toUnits(String(t.feeUsdc)), // new column, see below
    );
    if (!tx) throw new Error("Fee refund returned no result");
    await prisma.pretiumTransaction.update({
      where: { id: t.id },
      data: {
        message:
          `Fee refunded. Element Pay is returning your USDC: ${reason}`.slice(
            0,
            250,
          ),
      },
    });
    return true;
  } catch (err) {
    console.error(
      `[elementpay] CRITICAL: fee refund failed for ${t.transactionCode}`,
      err,
    );
    await prisma.pretiumTransaction
      .update({
        where: { id: t.id },
        data: {
          message: `REFUND_FAILED: ${(err as Error)?.message}`.slice(0, 250),
        },
      })
      .catch(() => {});
    return false;
  }
}

// Refund the full gross amount from the treasury. Guarded by an atomic claim so a retry or a duplicate
// webhook can never refund twice.
async function refundOfframpUser(t: any, reason: string): Promise<boolean> {
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, isRealesed: false },
    data: {
      isRealesed: true,
      status: "FAILED",
      message: `Refunding: ${reason}`.slice(0, 250),
    },
  });
  if (claim.count === 0) {
    console.warn(
      `[elementpay] refund skipped for ${t.transactionCode}: already finalised`,
    );
    return false;
  }

  try {
    const refundTx = await treasuryTransferToUser(
      t.walletAddress as `0x${string}`,
      toUnits(usdcOwed(t)),
    );
    if (!refundTx) throw new Error("Refund transfer returned no result");
    await prisma.pretiumTransaction.update({
      where: { id: t.id },
      data: { message: `Refunded: ${reason}`.slice(0, 250) },
    });
    console.log(
      `↩️ Off-ramp ${t.transactionCode} refunded to user (${reason})`,
    );
    return true;
  } catch (err) {
    console.error(
      `[elementpay] CRITICAL: refund failed for off-ramp ${t.transactionCode}; needs manual refund`,
      err,
    );
    await prisma.pretiumTransaction
      .update({
        where: { id: t.id },
        data: {
          message:
            `REFUND_FAILED: ${(err as Error)?.message || "unknown error"}`.slice(
              0,
              250,
            ),
        },
      })
      .catch(() => {});
    return false;
  }
}

// ---------------------------------------------------------------------------
// Webhook (source of truth)
// ---------------------------------------------------------------------------

// Use as:  app.use(express.json({ verify: captureRawBody }))
// The HMAC is computed over the exact raw bytes, so we need them.
export function captureRawBody(req: any, _res: any, buf: Buffer) {
  req.rawBody = buf;
}

function getRawBody(req: Request): Buffer | null {
  const withRaw = (req as any).rawBody;
  if (Buffer.isBuffer(withRaw)) return withRaw;
  if (typeof withRaw === "string") return Buffer.from(withRaw);
  if (Buffer.isBuffer(req.body)) return req.body; // express.raw()
  if (req.body && typeof req.body === "object") {
    console.warn(
      "[elementpay] raw body unavailable; re-serialising parsed JSON (signature may fail). Add captureRawBody to express.json({ verify }).",
    );
    return Buffer.from(JSON.stringify(req.body));
  }
  return null;
}

// Header:  X-Webhook-Signature: t=<unix_ts>,v1=<base64 HMAC-SHA256 of `${t}.${rawBody}`>
function verifyWebhookSignature(
  raw: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const i = piece.indexOf("=");
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const ts = Number(t);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TOLERANCE_SECONDS)
    return false;

  const expected = createHmac("sha256", secret)
    .update(`${t}.`)
    .update(raw)
    .digest();
  const given = Buffer.from(v1, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function elementPayWebhook(req: Request, res: Response) {
  console.log("elementPayWebhook has been triggered.");
  console.log("req.body", req.body);

  const secret = process.env.ELEMENT_PAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[elementpay] ELEMENT_PAY_WEBHOOK_SECRET is not set; rejecting webhook",
    );
    return res.status(500).json({ received: false });
  }

  const raw = getRawBody(req);
  if (!raw)
    return res.status(400).json({ received: false, error: "Empty body" });

  if (!verifyWebhookSignature(raw, req.header("x-webhook-signature"), secret)) {
    console.warn("[elementpay] invalid webhook signature");
    return res
      .status(401)
      .json({ received: false, error: "Invalid signature" });
  }

  let body: any;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ received: false, error: "Invalid JSON" });
  }

  // Ack fast (Element Pay wants a quick 2xx), process afterwards.
  // This is the ONLY place we write a response on the happy path.
  const ack = res.status(200).json({ received: true });

  const event = req.header("x-webhook-event") || "";
  const webhookId = req.header("x-webhook-id") || "";
  console.log(
    `[elementpay] webhook ${event} id=${webhookId} order=${body?.order_id}`,
  );

  try {
    await handleOrderEvent(event, body);
  } catch (err) {
    console.error("[elementpay] error processing webhook", err);
  }

  return ack; // already sent above; returned only to satisfy the return type
}

function webhookCodes(body: any): string[] {
  const ref =
    typeof body?.client_ref === "string" &&
    body.client_ref.startsWith("epartner:")
      ? `EPQ-${body.client_ref.slice("epartner:".length)}` // = the code we saved
      : null;
  return [
    body?.order_id,
    ref,
    body?.creation_transaction_hash,
    body?.invoice_id,
  ].filter((c): c is string => typeof c === "string" && c.length > 0);
}

// Element Pay names the SAME order differently from event to event, but every name embeds one UUID:
//   accept response / order.processing  order_id = EP-BANK-<uuid>   (this is what we store)
//   order.settled                       order_id = <on-chain hash>, invoice_id/file_id/psp_transaction_id = EPB-<uuid>
// So match on the UUID as well, otherwise the settled webhook never finds its row.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function webhookOrderUuid(body: any): string | null {
  for (const v of [
    body?.order_id,
    body?.invoice_id,
    body?.file_id,
    body?.psp_transaction_id,
  ]) {
    const m = typeof v === "string" ? UUID_RE.exec(v) : null;
    if (m) return m[0].toLowerCase();
  }
  return null;
}

async function findTxWithRetry(
  codes: string[],
  uuid: string | null = null,
  attempts = 6,
  delayMs = 1500,
) {
  for (let i = 0; i < attempts; i++) {
    const tx = await prisma.pretiumTransaction.findFirst({
      where: {
        OR: [
          { transactionCode: { in: codes } },
          ...(uuid
            ? [{ transactionCode: { endsWith: uuid, mode: "insensitive" as const } }]
            : []),
        ],
      },
      include: { user: true },
    });
    if (tx) return tx;
    await sleep(delayMs);
  }
  return null;
}

async function handleOrderEvent(event: string, body: any) {
  if (!event.startsWith("order.")) return;

  const codes = webhookCodes(body);
  const uuid = webhookOrderUuid(body);
  if (codes.length === 0 && !uuid) return;

  const transaction = await findTxWithRetry(codes, uuid);
  if (!transaction) {
    console.error(
      `[elementpay] no transaction found for ${[...codes, uuid].filter(Boolean).join(" | ")}`,
    );
    return;
  }

  await applyOrderEvent(transaction, event, body);
}

// The ONE place an Element Pay state change is applied to a row. Called by the webhook and by
// reconcileOrder (polling), so both paths share the same atomic claims and can never double-apply.
async function applyOrderEvent(transaction: any, event: string, body: any) {
  const orderId = body?.order_id ?? transaction.transactionCode; // only used in the log messages below

  // The row decides the direction; make sure the payload agrees before touching any money.
  const isOnramp = !!transaction.isOnramp;
  if (
    body.order_type &&
    (String(body.order_type).toLowerCase() === "onramp") !== isOnramp
  ) {
    console.error(
      `[elementpay] CRITICAL: order ${orderId} direction mismatch (payload ${body.order_type}, row isOnramp=${isOnramp}); ignoring`,
    );
    return;
  }

  switch (event) {
    case "order.processing":
      await prisma.pretiumTransaction.updateMany({
        where: { id: transaction.id, status: "PENDING" },
        data: { message: "Payment in progress" },
      });
      return;

    case "order.settled":
      if (isOnramp) await fulfillOnramp(transaction, body);
      else await completeOfframp(transaction);
      return;

    case "order.failed":
    case "order.refunded": {
      if (!isOnramp) {
        await failOfframp(transaction, event);
        return;
      }
      const label = event === "order.refunded" ? "refunded" : "failed";
      const result = await prisma.pretiumTransaction.updateMany({
        // never touch a row we've already started crediting
        where: {
          id: transaction.id,
          isRealesed: false,
          status: { not: "COMPLETE" },
        },
        data: { status: "FAILED", message: `Payment ${label}` },
      });
      if (result.count === 0) {
        console.error(
          `[elementpay] CRITICAL: ${event} for order ${orderId} but the transaction was already released/complete. Manual review needed.`,
        );
      } else {
        console.log(`❌ Element Pay order ${orderId} ${label}`);
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Reconciliation: webhooks are the source of truth, polling Element Pay is the safety net.
// Docs: GET /partner/orders/{order_id}, at most once per 10s per order. It runs
//   - from the status endpoint, while the user is watching the modal, and
//   - from a sweeper, for orders nobody is watching any more (app closed, phone died).
// Both feed applyOrderEvent. Off-ramp only: on-ramp stays webhook-driven.
// ---------------------------------------------------------------------------

const RECONCILE_MIN_AGE_MS = 30_000; // give the webhook (and fundOfframpOrder) a head start
const RECONCILE_MIN_INTERVAL_MS = 10_000; // per order, as Element Pay asks
const EP_OFFRAMP_CODE_PREFIX = "EP-"; // Element Pay off-ramp ids (EP-BANK-<uuid>); keeps Pretium rows out

// Only terminal states are acted on; anything else just means "keep waiting".
const RECONCILE_EVENTS: Record<string, string> = {
  settled: "order.settled",
  failed: "order.failed",
  refunded: "order.refunded",
};

export async function reconcileOrder(row: any): Promise<void> {
  if (!row || row.isOnramp || row.isRealesed) return;
  if (!["PENDING", "processing"].includes(row.status)) return;

  // assumes the model has createdAt; without it the age check is skipped
  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
  if (Number.isFinite(createdAt) && Date.now() - createdAt < RECONCILE_MIN_AGE_MS) {
    return;
  }

  const key = `elementpay:reconcile:${row.transactionCode}`;
  if (getCached(key)) return;
  setCache(key, true, RECONCILE_MIN_INTERVAL_MS);

  let order: any;
  try {
    const res = await epRequest(
      "GET",
      `/partner/orders/${encodeURIComponent(row.transactionCode)}`,
    );
    order = res?.data?.order;
  } catch (err) {
    console.warn(
      `[elementpay] reconcile ${row.transactionCode}: lookup failed:`,
      (err as Error)?.message,
    );
    return;
  }

  const event = RECONCILE_EVENTS[String(order?.status ?? "").toLowerCase()];
  if (!event) return;

  // applyOrderEvent expects the row with its user, like the webhook lookup returns
  const tx = await prisma.pretiumTransaction.findUnique({
    where: { id: row.id },
    include: { user: true },
  });
  if (!tx) return;
  console.log(
    `[elementpay] reconcile ${tx.transactionCode}: Element Pay says ${order.status}`,
  );
  await applyOrderEvent(tx, event, order);
}

let sweeping = false;

// Orders still open after their webhook should have arrived. Safe to run on several instances at once:
// every transition is an atomic claim.
export async function reconcileStuckOfframps(): Promise<void> {
  if (sweeping) return;
  sweeping = true;
  try {
    const rows = await prisma.pretiumTransaction.findMany({
      where: {
        isOnramp: false,
        isRealesed: false,
        status: { in: ["PENDING", "processing"] },
        transactionCode: { startsWith: EP_OFFRAMP_CODE_PREFIX },
      },
      take: 25,
    });
    for (const row of rows) await reconcileOrder(row);
  } catch (err) {
    console.error("[elementpay] off-ramp sweep failed", err);
  } finally {
    sweeping = false;
  }
}

// Call once at server start, e.g. startOfframpSweeper() in index.ts
export function startOfframpSweeper(intervalMs = 60_000) {
  const timer = setInterval(() => void reconcileStuckOfframps(), intervalMs);
  timer.unref?.();
  return timer;
}

// ---------------------------------------------------------------------------
// Off-ramp settlement
// ---------------------------------------------------------------------------

async function completeOfframp(t: any) {
  const claim = await prisma.pretiumTransaction.updateMany({
    where: {
      id: t.id,
      isRealesed: false,
      status: { in: ["PENDING", "processing"] },
    },
    data: {
      isRealesed: true,
      status: "COMPLETE",
      message: "Withdrawal complete",
    },
  });
  if (claim.count === 0) {
    console.log(
      `⚠️ Element Pay off-ramp already processed: ${t.transactionCode}`,
    );
    return;
  }
  console.log(`✅ Off-ramp settled ${t.transactionCode}: M-Pesa paid`);

  // No Payment row here on purpose. The pretiumTransaction row IS the withdrawal in the activity list
  // (shown as "Withdraw"); a second Payment row showed up as a duplicate "Sent to M-Pesa".
}

async function failOfframp(t: any, event: string) {
  const label = event === "order.refunded" ? "refunded" : "failed";

  // processing = user's USDC has been debited and forwarded, so the user must be made whole
  if (t.status === "processing") {
    await refundOfframpUser(t, `Payout ${label}`);
    return;
  }

  const result = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, status: "PENDING", isRealesed: false },
    data: { status: "FAILED", message: `Payout ${label}` },
  });
  if (result.count > 0) {
    console.log(
      `❌ Element Pay off-ramp ${t.transactionCode} ${label} (nothing had been debited)`,
    );
    return;
  }

  // Status moved while we were reading it: re-check once.
  const fresh = await prisma.pretiumTransaction.findUnique({
    where: { id: t.id },
  });
  if (fresh?.status === "processing") {
    await refundOfframpUser(fresh, `Payout ${label}`);
  } else if (fresh?.status === "COMPLETE") {
    console.error(
      `[elementpay] CRITICAL: ${event} for off-ramp ${t.transactionCode} but it is already COMPLETE. Manual review needed.`,
    );
  } else {
    console.log(
      `[elementpay] ${event} for off-ramp ${t.transactionCode}: already ${fresh?.status}, no action`,
    );
  }
}

// ---------------------------------------------------------------------------
// On-ramp fulfilment (mirrors the is_released branch of pretiumCallback)
// ---------------------------------------------------------------------------

// The USDC we owe (on-ramp) or debited (off-ramp) for a row, as an exact 6-dp string.
function usdcOwed(t: any): string {
  // Use the amount locked at initiation (CHAMAPAY_RATE at that moment) so a later
  // env/rate change can't make the credit drift from what the user saw.
  const stored = t.cusdAmount != null ? String(t.cusdAmount) : "";
  if (/^\d+(\.\d+)?$/.test(stored)) {
    const units = toUnits(stored);
    if (units > 0n) return formatUnits(units, USDC_DECIMALS);
  }
  if (t.isOnramp) {
    return formatUnits(
      kesToUsdcCeil(Math.trunc(Number(t.amount)), platformRate()),
      USDC_DECIMALS,
    );
  }
  throw new Error(`No stored USDC amount for ${t.transactionCode}`);
}

async function fulfillOnramp(transaction: any, body: any) {
  const t: any = transaction; // schema fields (memberForId, goalId, ...) accessed loosely, as in the Pretium controller

  // Atomic claim: concurrent / duplicate webhook deliveries can only win this once.
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, isRealesed: false },
    data: {
      isRealesed: true,
      status: "processing",
      blockchainTxHash: body.settlement_transaction_hash || t.blockchainTxHash,
      message: "Payment received. Crediting your wallet...",
    } as any,
  });
  if (claim.count === 0) {
    console.log(`⚠️ Element Pay order already processed: ${t.transactionCode}`);
    return;
  }

  console.log(
    `Element Pay settled ${t.type} ${t.transactionCode}. Initiating onchain transfer...`,
  );

  const memberForId = t.memberForId as number | null;
  let targetUserId = t.userId;
  let targetAddress = t.user.smartAddress as string | null;
  let description = t.type === "payment" ? "deposited" : "Wallet deposit";

  if (memberForId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: memberForId },
      select: { smartAddress: true, userName: true },
    });
    if (targetUser && targetUser.smartAddress) {
      targetUserId = memberForId;
      targetAddress = targetUser.smartAddress;
      description = `Deposited by @${t.user.userName || "Unknown"} on behalf of @${targetUser.userName}`;
    }
  }

  const usdcAmountToCredit = usdcOwed(t);
  if (!targetAddress) {
    console.error(
      `[elementpay] CRITICAL: no target address for ${t.transactionCode}`,
    );
    return;
  }

  // Expected vs. delivered, for FX-reserve monitoring (webhook amount_crypto may carry fewer decimals)
  const bigintAmount = toUnits(usdcAmountToCredit);
  try {
    const delivered = toUnits(body.amount_crypto);
    if (delivered < bigintAmount) {
      console.warn(
        `[elementpay] treasury shortfall on ${t.transactionCode}: received ${body.amount_crypto} USDC, crediting ${usdcAmountToCredit} USDC`,
      );
    }
  } catch {
    /* amount_crypto missing or unparsable, skip the check */
  }

  try {
    let txResult: any;

    if (t.type === "payment") {
      let actualBlockchainId = t.chamaId ? Number(t.chamaId) : 0;
      if (t.chamaId) {
        const chama = await prisma.chama.findUnique({
          where: { id: t.chamaId },
        });
        if (chama) actualBlockchainId = Number(chama.blockchainId);
      }
      // Treasury -> payer, then payer -> chama contract
      await treasuryTransferToUser(
        t.user.smartAddress as `0x${string}`,
        bigintAmount,
      );
      await sleep(5000); // let RPC/CDP nodes see the new balance

      if (!t.user.cdpWalletId) {
        throw new Error("No CDP Wallet found for user to deposit to Chama");
      }
      txResult =
        memberForId && targetAddress
          ? await bcDepositFundsForMember(
              t.user.cdpWalletId,
              BigInt(actualBlockchainId),
              targetAddress,
              usdcAmountToCredit,
            )
          : await bcDepositFundsToChama(
              t.user.cdpWalletId,
              BigInt(actualBlockchainId),
              usdcAmountToCredit,
            );
    } else if (t.type === "moonwell") {
      await treasuryTransferToUser(
        targetAddress as `0x${string}`,
        bigintAmount,
      );
      await sleep(5000);
      if (!t.user.cdpWalletId) {
        throw new Error("No CDP Wallet found for user to deposit to Moonwell");
      }
      txResult = await bcMoonwellDeposit(
        t.user.cdpWalletId,
        usdcAmountToCredit,
      );
      description = "Moonwell Deposit via M-Pesa";
    } else if (t.type === "goal" && t.goalId) {
      const goal = await prisma.goal.findUnique({ where: { id: t.goalId } });
      if (!goal) throw new Error("Goal not found for pay-link contribution");

      txResult = await bcTreasuryGoalContribute(
        BigInt(goal.blockchainId),
        usdcAmountToCredit,
      );
      description = "Goal contribution via M-Pesa";

      const msg = typeof t.message === "string" ? t.message : "";
      const isGuestPay = msg.startsWith("guest:");
      const payerAddr =
        t.user?.smartAddress ||
        t.walletAddress ||
        process.env.TREASURY_WALLET ||
        "treasury";

      await prisma.goalContribution.create({
        data: {
          goalId: goal.id,
          amount: usdcAmountToCredit,
          contributorAddress: payerAddr,
          payerAddress: payerAddr,
          contributorUserId: isGuestPay ? null : t.userId,
          payerUserId: isGuestPay ? null : t.userId,
          isGuest: isGuestPay,
          guestDisplayName: isGuestPay ? msg.slice(6) : null,
          txHash: typeof txResult === "string" ? txResult : String(txResult),
          pretiumTxCode: t.transactionCode, // holds the Element Pay order_id for these rows
        } as any,
      });
    } else {
      // plain wallet deposit
      txResult = await treasuryTransferToUser(
        targetAddress as `0x${string}`,
        bigintAmount,
      );
    }

    if (!txResult) throw new Error("Onchain transfer returned no result");

    if (t.type !== "goal") {
      const payerUserId = t.userId;
      const payerDescription =
        memberForId && description.includes("on behalf of")
          ? `Deposited for @${description.split("on behalf of @")[1] || "member"}`
          : description;
      const displayUsdc = t.cusdAmount
        ? t.cusdAmount.toString()
        : t.amount.toString();

      await prisma.payment.create({
        data: {
          amount: displayUsdc,
          description: payerDescription,
          chamaId: t.chamaId || null,
          txHash: txResult,
          userId: payerUserId,
          receiver: t.type === "moonwell" ? "Moonwell" : undefined,
        },
      });

      if (memberForId && targetUserId !== payerUserId) {
        await prisma.payment.create({
          data: {
            amount: displayUsdc,
            description,
            chamaId: t.chamaId || null,
            txHash: txResult,
            userId: targetUserId,
          },
        });
      }
    }

    await prisma.pretiumTransaction.update({
      where: { id: t.id },
      data: { status: "COMPLETE", message: "Deposit complete" },
    });
    console.log(`✅ Onchain transfer successful: ${txResult}`);
  } catch (err) {
    // Keep isRealesed=true on purpose: a retry could double-pay if the treasury leg already went through.
    console.error(
      `[elementpay] CRITICAL: onchain credit failed for ${t.transactionCode}; needs manual review`,
      err,
    );
    await prisma.pretiumTransaction
      .update({
        where: { id: t.id },
        data: {
          status: "processing",
          message:
            `ONCHAIN_FAILED: ${(err as Error)?.message || "unknown error"}`.slice(
              0,
              250,
            ),
        },
      })
      .catch(() => {});
    return;
  }

  // Emails are best-effort and must never affect the credited state.
  try {
    const timeStr = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Nairobi",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const amountUsdc = t.cusdAmount
      ? t.cusdAmount.toString()
      : t.amount.toString();

    if (t.user.emailNotify && t.type === "deposit") {
      await emailService.sendMpesaDepositEmail(
        t.user.email,
        amountUsdc,
        t.user.location === "KE" ? t.amount.toString() : null,
        t.transactionCode, // Element Pay doesn't return an M-Pesa receipt; use the order id
        t.shortcode || "M-Pesa",
        timeStr,
      );
    }

    if (memberForId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: memberForId },
        select: { email: true, emailNotify: true, location: true },
      });
      if (targetUser?.emailNotify) {
        let chamaName = "Chama";
        if (t.chamaId) {
          const chama = await prisma.chama.findUnique({
            where: { id: t.chamaId },
          });
          if (chama) chamaName = chama.name;
        }
        await emailService.sendPaidForSomeoneEmail(
          targetUser.email,
          t.user.userName || "Someone",
          amountUsdc,
          targetUser.location === "KE" ? t.amount.toString() : null,
          chamaName,
        );
      }
    }
  } catch (emailErr) {
    console.error("[elementpay] email notification failed", emailErr);
  }
}

// ---------------------------------------------------------------------------
// GET /elementpay/rate   (public)
// The rate deposits are credited at (CHAMAPAY_RATE), so the UI preview always matches the credit.
//
// GET /elementpay/status/:transactionCode   (auth)
// DB-backed status for the polling UI. Webhooks keep the row up to date, so no call to Element Pay.
// Response shape matches what the existing poller reads: { success, details: { status, message, ... } }
//   status: "pending" (waiting for PIN) | "processing" | "completed" | "failed"
// ---------------------------------------------------------------------------

export async function getElementPayRate(_req: Request, res: Response) {
  try {
    return res
      .status(200)
      .json({ success: true, currency: "KES", rate: Number(platformRate()) });
  } catch (error) {
    return sendEpError(res, error, "Failed to get rate");
  }
}

function clientStatus(tx: any): { status: string; message: string } {
  const isOnramp = !!tx.isOnramp;
  const noun = isOnramp ? "Payment" : "Withdrawal";
  switch (tx.status) {
    case "COMPLETE":
      return {
        status: "completed",
        message: isOnramp ? "Deposit complete" : "Withdrawal complete",
      };
    case "FAILED":
      return {
        status: "failed",
        message: /refund/i.test(String(tx.message ?? ""))
          ? `${noun} refunded`
          : `${noun} failed`,
      };
    case "processing":
      return {
        status: "processing",
        message: isOnramp
          ? "Payment received. Crediting your wallet"
          : "Withdrawal in progress",
      };
    default:
      return {
        status: "pending",
        message: isOnramp
          ? "Waiting for your M-Pesa PIN"
          : "Starting withdrawal",
      };
  }
}

export async function getElementPayStatus(req: Request, res: Response) {
  const userId = req.user?.userId;
  const transactionCode = String(req.params.transactionCode ?? "");

  try {
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }
    if (!transactionCode) {
      return res
        .status(400)
        .json({ success: false, error: "transactionCode is required" });
    }

    const tx: any = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode },
    });
    // same 404 for "not yours" and "doesn't exist", so order ids can't be probed
    if (!tx || tx.userId !== userId) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Safety net for a missed or unmatched webhook. Throttled per order and not awaited, so polling
    // stays fast; the next poll sees whatever this finds.
    if (!tx.isOnramp) void reconcileOrder(tx).catch(() => {});

    const { status, message } = clientStatus(tx);
    return res.status(200).json({
      success: true,
      details: {
        transactionCode,
        status,
        message, // never expose tx.message: it can hold internal notes (quote ids, ONCHAIN_FAILED, ...)
        type: tx.type,
        isOnramp: !!tx.isOnramp,
        amountKes: Number(tx.amount),
        usdcAmount: tx.cusdAmount != null ? String(tx.cusdAmount) : null,
      },
    });
  } catch (error) {
    return sendEpError(res, error, "Failed to get transaction status");
  }
}