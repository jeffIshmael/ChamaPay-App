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
//   ELEMENTPAY_SANDBOX_CUSTOMER_ID       approved vault customer (pcus_...). If unset in sandbox, an inline customer is sent.
//   ELEMENTPAY_SANDBOX_OFFRAMP_OUTCOME   "Successful" (default) | "Failure": sandbox off-ramp outcome is driven by customer.name
//                                        (only works with the inline customer, not a vault customer_id)
//   ELEMENTPAY_MPESA_NETWORK_ID          pin the on-ramp M-Pesa network_id (skips catalog lookup)
//   ELEMENTPAY_MPESA_OFFRAMP_NETWORK_ID  pin the off-ramp M-Pesa network_id (on/off-ramp ids differ, never reuse one for the other)
//   ELEMENTPAY_OFFRAMP_ASSET_TOKEN / _CURRENCY / _NETWORK   default Base USDC. See the warning at OFFRAMP_ASSET.
//   ELEMENTPAY_OFFRAMP_FEE_BPS           explicit withdrawal fee in basis points. Default 150 (= 1.5%)
//   ELEMENTPAY_OFFRAMP_ONCHAIN=true      run the on-chain legs in sandbox too (they always run in production)
//   ELEMENTPAY_ENV=production            switches to ELEMENTPAY_URL / ELEMENTPAY_API_KEY (production is NOT ready, see buildQuoteCustomer)
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
import {transferTx} from "../Blockchain/erc20Functions";
import emailService from "../Lib/EmailService";
import { getCached, setCache } from "../Lib/cache";
import { treasuryTransferToUser } from "../Lib/pimlicoAgent";
import { checkOnrampKesAllowed, KYC_REQUIRED_CODE } from "../Lib/kycService";

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

// WARNING: Element Pay's Kenya corridor page says KE OffRamp uses Polygon USDT, while their sandbox
// test payloads use Base USDC for KE OffRamp. Confirm with Element Pay which asset your live key is
// enabled for. If it is not Base, the on-chain leg below (treasuryTransferToUser) cannot be used as-is,
// and initiateElementPayOfframp refuses to run it.
const OFFRAMP_ASSET = {
  token: process.env.ELEMENTPAY_OFFRAMP_ASSET_TOKEN || BASE_USDC_ASSET.token,
  currency: process.env.ELEMENTPAY_OFFRAMP_ASSET_CURRENCY || BASE_USDC_ASSET.currency,
  network: process.env.ELEMENTPAY_OFFRAMP_ASSET_NETWORK || BASE_USDC_ASSET.network,
};

// In sandbox, Element Pay auto-settles off-ramp orders via the "Successful" name trigger and expects NO
// on-chain deposit, so by default we skip debiting the user / sending crypto outside production.
const OFFRAMP_ONCHAIN = IS_PRODUCTION || process.env.ELEMENTPAY_OFFRAMP_ONCHAIN === "true";

const OFFRAMP_FEE_BPS: bigint = (() => {
  const n = Number(process.env.ELEMENTPAY_OFFRAMP_FEE_BPS ?? "150");
  return Number.isInteger(n) && n >= 0 && n < 10_000 ? BigInt(n) : 150n;
})();

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
    ? process.env.ELEMENTPAY_URL
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
  body?: unknown
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
        json?.data
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
    console.error("Element Pay error:", err.status, err.message, err.data ?? "");
    if (err.status === 401) {
      // our credentials problem, not the user's
      return res
        .status(502)
        .json({ success: false, error: "Payment provider authentication failed" });
    }
    const clientError = [400, 409, 410, 422].includes(err.status);
    return res
      .status(clientError ? 400 : err.status >= 500 ? 503 : 502)
      .json({ success: false, error: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, error: fallback });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Exact decimal math (BigInt). No floats anywhere on the money path.
//
// USDC has 6 decimals on-chain, so 1 micro-USDC (0.000001) is the smallest amount that can ever be
// sent. We therefore work in exact integer "units", FLOOR to 6 decimals (never round up, so we can
// never credit more than the rate allows), and keep the full-precision value for logs.
// ---------------------------------------------------------------------------

const USDC_DECIMALS = 6;
type Dec = { n: bigint; scale: number }; // value = n / 10^scale

function numberToPlain(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid decimal value: ${n}`);
  const s = String(n);
  return /e/i.test(s) ? n.toFixed(20).replace(/\.?0+$/, "") : s;
}

function parseDec(value: string | number): Dec {
  const s = typeof value === "number" ? numberToPlain(value) : String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid decimal value: ${value}`);
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
  return (a.n * 10n ** BigInt(b.scale + decimals)) / (b.n * 10n ** BigInt(a.scale));
}

// KES / rate -> USDC, exact, floored to `decimals` (6 = what can actually be sent on-chain)
function kesToUsdc(kes: number, rate: string, decimals = USDC_DECIMALS): bigint {
  return divDec({ n: BigInt(kes), scale: 0 }, parseDec(rate), decimals);
}

function ratioString(a: string | number, b: string | number, decimals: number): string | null {
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
  if (parseDec(raw).n === 0n) throw new Error("CHAMAPAY_RATE must be greater than zero");
  return raw;
}

function treasuryAddress(): string {
  const addr = process.env.TREASURY_WALLET;
  if (!addr) throw new Error("TREASURY_WALLET is not set in environment.");
  return addr;
}

// "25" | "25.5" | "25.123456" -> units. Rejects >6 decimals instead of silently rounding.
function parseUsdcInput(input: unknown): bigint | null {
  const s = typeof input === "number" ? (Number.isFinite(input) ? String(input) : "") : String(input ?? "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(s)) return null;
  const units = toUnits(s);
  return units > 0n ? units : null;
}

// Explicit withdrawal fee, rounded UP in the platform's favour. net is what is sent through Element Pay.
function splitOfframpAmount(gross: bigint) {
  const fee = (gross * OFFRAMP_FEE_BPS + 9_999n) / 10_000n;
  return { gross, fee, net: gross - fee };
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
      throw new ElementPayError(400, "Enter a valid Safaricom number (e.g. 0712345678)");
    }
    return phone;
  }
  return process.env.ELEMENTPAY_SANDBOX_TEST_PHONE || SANDBOX_SUCCESS_PHONE;
}

type OrderType = "OnRamp" | "OffRamp";
type Provider = { id: string; min?: number; max?: number };

// network_id must come from the catalog (never hardcode across environments).
// On-ramp and off-ramp provider ids are different, so they are looked up and cached separately.
async function getMpesaProvider(orderType: OrderType): Promise<Provider> {
  const pinned =
    orderType === "OnRamp"
      ? process.env.ELEMENTPAY_MPESA_NETWORK_ID
      : process.env.ELEMENTPAY_MPESA_OFFRAMP_NETWORK_ID;
  if (pinned) return { id: pinned };

  const cacheKey = `elementpay:ke-mpesa-provider:${orderType}`;
  const cached = getCached<Provider>(cacheKey);
  if (cached) return cached;

  const res = await epRequest("GET", `/partner/catalog?country=KE&order_type=${orderType}`);
  // response is keyed by direction: data.onramp / data.offramp
  const section = res?.data?.[orderType.toLowerCase()];
  const providers: any[] =
    section?.countries?.KE?.payment_methods?.mobile_money?.providers ?? [];
  const mpesa = providers.find(
    (p) => p?.enabled !== false && /m[\s_-]?pesa/i.test(`${p?.code} ${p?.name}`)
  );
  if (!mpesa?.id) {
    throw new ElementPayError(
      503,
      orderType === "OnRamp"
        ? "M-Pesa deposits are not available right now"
        : "M-Pesa withdrawals are not available right now"
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
    throw new ElementPayError(400, `Minimum deposit is KES ${provider.min}`);
  }
  if (provider.max && kes > provider.max) {
    throw new ElementPayError(400, `Maximum deposit is KES ${provider.max}`);
  }
}

// Quote needs either a vault `customer_id` (preferred, requires KYC with Element Pay)
// or the deprecated inline `customer`. Inline is only used for sandbox testing.
function buildQuoteCustomer(
  userId: number,
  user: { email?: string | null },
  phone: string,
  orderType: OrderType
): Record<string, unknown> {
  const vaultId = process.env.ELEMENTPAY_SANDBOX_CUSTOMER_ID;
  if (!IS_PRODUCTION && vaultId) return { customer_id: vaultId };

  if (IS_PRODUCTION) {
    // TODO(production): create/approve an Element Pay vault customer per Chamapay user
    // (POST /partner/customers -> documents -> submit), store the pcus_* id, send it here.
    throw new ElementPayError(
      501,
      "Production requires an approved Element Pay customer (not implemented yet)"
    );
  }

  // Sandbox off-ramp: the word in customer.name ("Successful" / "Failure") drives the auto-settle outcome.
  const name =
    orderType === "OffRamp"
      ? `${process.env.ELEMENTPAY_SANDBOX_OFFRAMP_OUTCOME || "Successful"} Chamapay User`
      : "Chamapay User"; // must be two+ words

  return {
    customer: {
      uid: `chamapay-${userId}-${Date.now()}`, // sandbox: new uid per run
      type: "user",
      name,
      country: "KE",
      phone,
      address: "Nairobi",
      dob: "01/01/1990", // mm/dd/yyyy
      email: user.email || `user${userId}@example.com`,
      id_number: "A1234567",
      id_type: "passport",
    },
  };
}

function onrampQuoteBody(
  userId: number,
  user: { email?: string | null },
  payPhone: string,
  kes: number,
  networkId: string,
  treasury: string
) {
  return {
    order_type: "OnRamp",
    currency: "KES",
    country: "KE",
    local_amount: kes,
    ...buildQuoteCustomer(userId, user, payPhone, "OnRamp"),
    asset: BASE_USDC_ASSET,
    payment_method: { type: "mobile_money", phone_number: payPhone, network_id: networkId },
    wallet_address: treasury, // USDC lands in the treasury; the user is credited from it
  };
}

function offrampQuoteBody(
  userId: number,
  user: { email?: string | null },
  payPhone: string,
  netUsdc: bigint,
  networkId: string,
  treasury: string
) {
  return {
    order_type: "OffRamp",
    currency: "KES",
    country: "KE",
    crypto_amount: Number(formatUnits(netUsdc, USDC_DECIMALS)),
    ...buildQuoteCustomer(userId, user, payPhone, "OffRamp"),
    asset: OFFRAMP_ASSET,
    payment_method: { type: "mobile_money", phone_number: payPhone, network_id: networkId },
    refund_address: treasury, // failed payouts come back to the treasury; we refund the user from there
  };
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
}

const quoteKey = (id: string) => `elementpay:quote:${id}`;

function rememberQuote(q: any, meta: Omit<CachedQuote, "createdAt" | "expiresAt">): number {
  const expiresAt = Date.parse(q?.expires_at) || Date.now() + QUOTE_FALLBACK_TTL_MS;
  const ttl = expiresAt - Date.now();
  if (ttl > 0) setCache(quoteKey(q.quote_id), { ...meta, createdAt: Date.now(), expiresAt }, ttl);
  return expiresAt;
}

function takeReusableQuote(
  quoteId: unknown,
  userId: number,
  type: "onramp" | "offramp",
  amountKey: string,
  phone: string
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
//     offramp: amount = USDC to withdraw, before our fee (max 6 decimals)
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
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    if (type !== "onramp" && type !== "offramp") {
      return res.status(400).json({ success: false, error: 'type must be "onramp" or "offramp"' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, email: true },
    });
    if (!user || !user.smartAddress) {
      return res.status(400).json({ success: false, error: "User wallet address not found" });
    }

    // A binding quote is tied to the payer's number, so production needs a valid phoneNo.
    const payPhone = resolvePayPhone(toKenyaE164(String(req.body?.phoneNo ?? "")));
    const treasury = treasuryAddress();

    if (type === "onramp") {
      const kes = Number(req.body?.amount);
      if (!Number.isInteger(kes) || kes < 1) {
        return res.status(400).json({ success: false, error: "Amount must be a whole number of KES" });
      }
      const provider = await getMpesaProvider("OnRamp");
      assertWithinLimits(provider, kes);

      const q = await createQuote(onrampQuoteBody(userId, user, payPhone, kes, provider.id, treasury));
      const treasuryUnits = receivesUnits(q);
      const expiresAt = rememberQuote(q, {
        userId,
        type: "onramp",
        amountKey: String(kes),
        phone: payPhone,
        usdcToTreasuryUnits: treasuryUnits === null ? null : treasuryUnits.toString(),
      });

      const rate = platformRate();
      const userUnits = kesToUsdc(kes, rate);
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
          usdcToTreasury: receivesRaw === undefined ? null : String(receivesRaw),
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

    // off-ramp
    const gross = parseUsdcInput(req.body?.amount);
    if (!gross) {
      return res
        .status(400)
        .json({ success: false, error: "Enter a USDC amount with at most 6 decimals" });
    }
    const { fee, net } = splitOfframpAmount(gross);
    if (net <= 0n) {
      return res.status(400).json({ success: false, error: "Amount is too small to withdraw" });
    }

    const provider = await getMpesaProvider("OffRamp");
    const q = await createQuote(offrampQuoteBody(userId, user, payPhone, net, provider.id, treasury));
    const expiresAt = rememberQuote(q, {
      userId,
      type: "offramp",
      amountKey: gross.toString(),
      phone: payPhone,
      usdcToTreasuryUnits: null,
    });
    const payout = q?.amounts?.user_receives; // KES the user is paid

    return res.status(200).json({
      success: true,
      type: "offramp",
      quoteId: q.quote_id,
      expiresAt: new Date(expiresAt).toISOString(),
      usdc: {
        gross: formatUnits(gross, USDC_DECIMALS),
        fee: formatUnits(fee, USDC_DECIMALS),
        net: formatUnits(net, USDC_DECIMALS),
        feePercent: (Number(OFFRAMP_FEE_BPS) / 100).toString(),
      },
      elementPay: {
        listedRate: q?.amounts?.rate ?? null,
        payout: payout ?? null,
        effectiveRate: payout ? ratioString(payout.amount, formatUnits(net, USDC_DECIMALS), 4) : null,
        fees: q?.amounts?.fees ?? null,
      },
    });
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
      return res.status(401).json({ success: false, error: "Authentication required" });
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
      return res
        .status(400)
        .json({ success: false, error: "Amount and phone number are required" });
    }

    const requestedKes = Number(amount);
    if (!Number.isInteger(requestedKes) || requestedKes < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Amount must be a whole number of KES" });
    }

    const phone = toKenyaE164(phoneNo);
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, error: "Enter a valid Safaricom number (e.g. 0712345678)" });
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

    // What we credit the user: exact integer math at CHAMAPAY_RATE, floored to the 6 decimals USDC supports.
    const rate = platformRate();
    const usdcUnits = kesToUsdc(requestedKes, rate);
    if (usdcUnits <= 0n) {
      return res.status(400).json({ success: false, error: "Amount is too small" });
    }
    const usdcToCredit = formatUnits(usdcUnits, USDC_DECIMALS);
    const fullPrecision = formatUnits(kesToUsdc(requestedKes, rate, 18), 18);

    const treasury = treasuryAddress();
    const provider = await getMpesaProvider("OnRamp");
    assertWithinLimits(provider, requestedKes);
    const payPhone = resolvePayPhone(phone);

    // 1) Quote (reuse the one the user was shown if it is still valid)
    let quoteId: string;
    let quotedAt: number;
    let treasuryUnits: bigint | null;
    const reuse = takeReusableQuote(clientQuoteId, userId, "onramp", String(requestedKes), payPhone);
    if (reuse) {
      quoteId = clientQuoteId;
      quotedAt = reuse.createdAt;
      treasuryUnits = reuse.usdcToTreasuryUnits === null ? null : BigInt(reuse.usdcToTreasuryUnits);
    } else {
      const q = await createQuote(onrampQuoteBody(userId, user, payPhone, requestedKes, provider.id, treasury));
      quoteId = q.quote_id;
      quotedAt = Date.now();
      treasuryUnits = receivesUnits(q);
    }

    // Visibility into FX-reserve exposure: what the treasury receives vs. what we owe the user
    if (treasuryUnits !== null && treasuryUnits < usdcUnits) {
      console.warn(
        `[elementpay] treasury shortfall on quote ${quoteId}: receives ${formatUnits(
          treasuryUnits,
          USDC_DECIMALS
        )} USDC, owes ${usdcToCredit} USDC (CHAMAPAY_RATE=${rate})`
      );
    }

    // 2) Accept -> triggers the M-Pesa STK push
    const acceptRes = await acceptQuote(quoteId, quotedAt);
    const orderId: string | undefined = acceptRes?.data?.order?.order_id;
    if (!orderId) {
      console.error(`[elementpay] accept returned no order_id for quote ${quoteId}`, acceptRes);
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
          goalId: parsedGoalId && Number.isFinite(parsedGoalId) ? parsedGoalId : null,
          message: `elementpay quote ${quoteId}`,
        } as any,
      });
    } catch (dbErr) {
      // The STK push is already on its way, so make this impossible to miss in logs.
      console.error(
        `[elementpay] CRITICAL: order ${orderId} (quote ${quoteId}) accepted but DB insert failed for user ${userId}`,
        dbErr
      );
      throw dbErr;
    }
    console.log(
      `[elementpay] on-ramp ${orderId}: KES ${requestedKes} @ ${rate} -> ${usdcToCredit} USDC (full precision ${fullPrecision})`
    );

    return res.status(200).json({
      success: true,
      message: "M-Pesa prompt sent. Enter your PIN on your phone to complete the deposit.",
      status: "PENDING",
      transactionCode: orderId,
      usdcAmount: usdcToCredit,
      transactionMessage: "M-Pesa prompt sent. Enter your PIN on your phone to complete the deposit.",
    });
  } catch (error) {
    return sendEpError(res, error, "Failed to initiate Element Pay on-ramp");
  }
}

// ---------------------------------------------------------------------------
// POST  off-ramp initiate   body: { usdcAmount, phoneNo, quoteId? }
//
// usdcAmount is what leaves the user's wallet (gross). We keep OFFRAMP_FEE_BPS and send the rest
// through Element Pay at its real rate, so the user sees an honest rate plus an explicit fee.
// ---------------------------------------------------------------------------

export async function initiateElementPayOfframp(req: Request, res: Response) {
  const { usdcAmount, phoneNo, quoteId: clientQuoteId } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, cdpWalletId: true, email: true },
    });
    if (!user || !user.smartAddress || !user.cdpWalletId) {
      return res.status(400).json({ success: false, error: "User wallet not found" });
    }

    if (!usdcAmount || !phoneNo) {
      return res
        .status(400)
        .json({ success: false, error: "Amount and phone number are required" });
    }

    const gross = parseUsdcInput(usdcAmount);
    if (!gross) {
      return res
        .status(400)
        .json({ success: false, error: "Enter a USDC amount with at most 6 decimals" });
    }
    const { fee, net } = splitOfframpAmount(gross);
    if (net <= 0n) {
      return res.status(400).json({ success: false, error: "Amount is too small to withdraw" });
    }

    const phone = toKenyaE164(phoneNo);
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, error: "Enter a valid Safaricom number (e.g. 0712345678)" });
    }

    if (OFFRAMP_ONCHAIN && OFFRAMP_ASSET.network.toUpperCase() !== "BASE") {
      throw new ElementPayError(
        501,
        `Off-ramp on ${OFFRAMP_ASSET.network} is not supported by the treasury transfer yet`
      );
    }

    // TODO: apply your KYC / withdrawal-limit gate here (the on-ramp uses checkOnrampKesAllowed).

    const treasury = treasuryAddress();
    const provider = await getMpesaProvider("OffRamp");
    const payPhone = resolvePayPhone(phone);

    // 1) Quote (reuse the one the user was shown if it is still valid)
    let quoteId: string;
    let quotedAt: number;
    const reuse = takeReusableQuote(clientQuoteId, userId, "offramp", gross.toString(), payPhone);
    if (reuse) {
      quoteId = clientQuoteId;
      quotedAt = reuse.createdAt;
    } else {
      const q = await createQuote(offrampQuoteBody(userId, user, payPhone, net, provider.id, treasury));
      quoteId = q.quote_id;
      quotedAt = Date.now();
    }

    // 2) Accept -> creates the order and (live) returns the per-order crypto deposit address
    const acceptRes = await acceptQuote(quoteId, quotedAt);
    const orderId: string | undefined = acceptRes?.data?.order?.order_id;
    if (!orderId) {
      console.error(`[elementpay] off-ramp accept returned no order_id for quote ${quoteId}`, acceptRes);
      throw new ElementPayError(502, "Element Pay did not return an order");
    }

    const deposit =
      acceptRes?.data?.accepted?.payment_instructions?.crypto_deposit ??
      acceptRes?.data?.payment_instructions?.crypto_deposit;
    const candidate = deposit?.address ?? deposit?.wallet_address ?? deposit?.deposit_address ?? deposit;
    const depositAddress =
      typeof candidate === "string" && /^0x[0-9a-fA-F]{40}$/.test(candidate) ? candidate : null;

    if (OFFRAMP_ONCHAIN) {
      if (!depositAddress) {
        console.error(`[elementpay] off-ramp ${orderId}: no crypto_deposit address in accept response`, acceptRes);
        throw new ElementPayError(502, "Element Pay did not return a deposit address");
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
            `[elementpay] CRITICAL: off-ramp ${orderId} deposit amount mismatch: expects ${deposit.amount}, we would send ${formatUnits(net, USDC_DECIMALS)}`
          );
          throw new ElementPayError(502, "Withdrawal amount mismatch. Nothing was debited.");
        }
      }
    }

    // 3) Persist
    const fiatAmount = Number(acceptRes?.data?.order?.amount_fiat);
    const epRate = Number(acceptRes?.data?.order?.exchange_rate);
    let row: any;
    try {
      row = await prisma.pretiumTransaction.create({
        data: {
          userId,
          transactionCode: orderId,
          isOnramp: false,
          shortcode: String(phoneNo),
          amount: Number.isFinite(fiatAmount) ? fiatAmount : 0, // KES the user will receive
          type: "offramp",
          status: "PENDING",
          isRealesed: false,
          cusdAmount: Number(formatUnits(gross, USDC_DECIMALS)), // gross USDC debited from the user
          exchangeRate: Number.isFinite(epRate) ? epRate : undefined, // real Element Pay rate
          walletAddress: user.smartAddress,
          message: `elementpay quote ${quoteId}; fee ${formatUnits(fee, USDC_DECIMALS)} USDC`,
        } as any,
      });
    } catch (dbErr) {
      console.error(
        `[elementpay] CRITICAL: off-ramp order ${orderId} (quote ${quoteId}) accepted but DB insert failed for user ${userId}. Nothing was debited; the order will expire.`,
        dbErr
      );
      throw dbErr;
    }

    // 4) Move the money (production). Sandbox auto-settles from the "Successful" name trigger.
    if (OFFRAMP_ONCHAIN) {
      await fundOfframpOrder(row, user.cdpWalletId, treasury, depositAddress as string, gross, net);
    } else {
      console.log(`[elementpay] sandbox off-ramp ${orderId}: on-chain legs skipped`);
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal started. You will receive the money on M-Pesa shortly.",
      status: "PENDING",
      transactionCode: orderId,
      usdc: {
        gross: formatUnits(gross, USDC_DECIMALS),
        fee: formatUnits(fee, USDC_DECIMALS),
        net: formatUnits(net, USDC_DECIMALS),
      },
      kesAmount: Number.isFinite(fiatAmount) ? fiatAmount : null,
    });
  } catch (error) {
    return sendEpError(res, error, "Failed to initiate Element Pay off-ramp");
  }
}

// Debit user -> treasury, then treasury -> Element Pay deposit address (NET). Every failure after the
// debit refunds the user in full. State: PENDING (nothing debited) -> processing (funds in flight).
async function fundOfframpOrder(
  t: any,
  cdpWalletId: string,
  treasury: string,
  depositAddress: string,
  gross: bigint,
  net: bigint
) {
  let debitTx: string;
  try {
    debitTx = await transferTx(cdpWalletId, formatUnits(gross, USDC_DECIMALS), treasury as `0x${string}`);
    if (!debitTx) throw new Error("Debit returned no result");
  } catch (err) {
    console.error(`[elementpay] off-ramp ${t.transactionCode}: could not debit user wallet`, err);
    await prisma.pretiumTransaction
      .updateMany({
        where: { id: t.id, status: "PENDING" },
        data: { status: "FAILED", message: "Could not debit wallet" },
      })
      .catch(() => {});
    throw new ElementPayError(400, "Could not debit your wallet. Check your balance and try again.");
  }

  await sleep(5000); // let RPC/CDP nodes see the new treasury balance

  // Claim "funds in flight". If a failure webhook already closed the order, give the money back.
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, status: "PENDING", isRealesed: false },
    data: {
      status: "processing",
      blockchainTxHash: String(debitTx),
      message: "Wallet debited. Sending to Element Pay",
    } as any,
  });
  if (claim.count === 0) {
    await refundOfframpUser(t, "Order closed before funding");
    throw new ElementPayError(409, "This withdrawal is no longer active. Your funds were returned.");
  }

  try {
    const sendTx = await treasuryTransferToUser(depositAddress as `0x${string}`, net);
    if (!sendTx) throw new Error("Transfer returned no result");
  } catch (err) {
    console.error(`[elementpay] off-ramp ${t.transactionCode}: treasury -> Element Pay failed`, err);
    await refundOfframpUser(t, "Could not forward funds to Element Pay");
    throw new ElementPayError(502, "Withdrawal could not be completed. Your funds were returned.");
  }

  await prisma.pretiumTransaction
    .update({
      where: { id: t.id },
      data: { message: "Sent to Element Pay. Waiting for M-Pesa payout" },
    })
    .catch(() => {});
}

// Refund the full gross amount from the treasury. Guarded by an atomic claim so a retry or a duplicate
// webhook can never refund twice.
async function refundOfframpUser(t: any, reason: string): Promise<boolean> {
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, isRealesed: false },
    data: { isRealesed: true, status: "FAILED", message: `Refunding: ${reason}`.slice(0, 250) },
  });
  if (claim.count === 0) {
    console.warn(`[elementpay] refund skipped for ${t.transactionCode}: already finalised`);
    return false;
  }

  try {
    const refundTx = await treasuryTransferToUser(
      t.walletAddress as `0x${string}`,
      toUnits(usdcOwed(t))
    );
    if (!refundTx) throw new Error("Refund transfer returned no result");
    await prisma.pretiumTransaction.update({
      where: { id: t.id },
      data: { message: `Refunded: ${reason}`.slice(0, 250) },
    });
    console.log(`↩️ Off-ramp ${t.transactionCode} refunded to user (${reason})`);
    return true;
  } catch (err) {
    console.error(
      `[elementpay] CRITICAL: refund failed for off-ramp ${t.transactionCode}; needs manual refund`,
      err
    );
    await prisma.pretiumTransaction
      .update({
        where: { id: t.id },
        data: {
          message: `REFUND_FAILED: ${(err as Error)?.message || "unknown error"}`.slice(0, 250),
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
      "[elementpay] raw body unavailable; re-serialising parsed JSON (signature may fail). Add captureRawBody to express.json({ verify })."
    );
    return Buffer.from(JSON.stringify(req.body));
  }
  return null;
}

// Header:  X-Webhook-Signature: t=<unix_ts>,v1=<base64 HMAC-SHA256 of `${t}.${rawBody}`>
function verifyWebhookSignature(
  raw: Buffer,
  header: string | undefined,
  secret: string
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
  if (Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${t}.`).update(raw).digest();
  const given = Buffer.from(v1, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function elementPayWebhook(req: Request, res: Response) {
  const secret = process.env.ELEMENT_PAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[elementpay] ELEMENT_PAY_WEBHOOK_SECRET is not set; rejecting webhook");
    return res.status(500).json({ received: false });
  }

  const raw = getRawBody(req);
  if (!raw) return res.status(400).json({ received: false, error: "Empty body" });

  if (!verifyWebhookSignature(raw, req.header("x-webhook-signature"), secret)) {
    console.warn("[elementpay] invalid webhook signature");
    return res.status(401).json({ received: false, error: "Invalid signature" });
  }

  let body: any;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ received: false, error: "Invalid JSON" });
  }

  // Ack fast (Element Pay wants a quick 2xx), process afterwards.
  res.status(200).json({ received: true });

  const event = req.header("x-webhook-event") || "";
  const webhookId = req.header("x-webhook-id") || "";
  console.log(`[elementpay] webhook ${event} id=${webhookId} order=${body?.order_id}`);

  try {
    await handleOrderEvent(event, body);
  } catch (err) {
    console.error("[elementpay] error processing webhook", err);
  }
}

// The webhook can beat our DB insert by a few ms, so retry the lookup briefly.
async function findTxWithRetry(orderId: string, attempts = 6, delayMs = 1500) {
  for (let i = 0; i < attempts; i++) {
    const tx = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode: orderId },
      include: { user: true },
    });
    if (tx) return tx;
    await sleep(delayMs);
  }
  return null;
}

async function handleOrderEvent(event: string, body: any) {
  if (!event.startsWith("order.")) return; // customer.* / account.* not used yet

  const orderId: string | undefined = body?.order_id;
  if (!orderId) return;

  const transaction = await findTxWithRetry(orderId);
  if (!transaction) {
    console.error(`[elementpay] no transaction found for order ${orderId}`);
    return;
  }

  // The row decides the direction; make sure the payload agrees before touching any money.
  const isOnramp = !!transaction.isOnramp;
  if (body.order_type && (String(body.order_type).toLowerCase() === "onramp") !== isOnramp) {
    console.error(
      `[elementpay] CRITICAL: order ${orderId} direction mismatch (payload ${body.order_type}, row isOnramp=${isOnramp}); ignoring`
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
        where: { id: transaction.id, isRealesed: false, status: { not: "COMPLETE" } },
        data: { status: "FAILED", message: `Payment ${label}` },
      });
      if (result.count === 0) {
        console.error(
          `[elementpay] CRITICAL: ${event} for order ${orderId} but the transaction was already released/complete. Manual review needed.`
        );
      } else {
        console.log(`❌ Element Pay order ${orderId} ${label}`);
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Off-ramp settlement
// ---------------------------------------------------------------------------

async function completeOfframp(t: any) {
  const claim = await prisma.pretiumTransaction.updateMany({
    where: { id: t.id, isRealesed: false, status: { in: ["PENDING", "processing"] } },
    data: { isRealesed: true, status: "COMPLETE", message: "Withdrawal complete" },
  });
  if (claim.count === 0) {
    console.log(`⚠️ Element Pay off-ramp already processed: ${t.transactionCode}`);
    return;
  }
  console.log(`✅ Off-ramp settled ${t.transactionCode}: M-Pesa paid`);

  // blockchainTxHash is only set when we really debited the user (not in sandbox with on-chain skipped)
  if (!t.blockchainTxHash) return;
  try {
    await prisma.payment.create({
      data: {
        amount: usdcOwed(t),
        description: "M-Pesa withdrawal",
        txHash: t.blockchainTxHash,
        userId: t.userId,
        receiver: "M-Pesa",
      },
    });
  } catch (err) {
    console.error(`[elementpay] could not record payment for off-ramp ${t.transactionCode}`, err);
  }
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
    console.log(`❌ Element Pay off-ramp ${t.transactionCode} ${label} (nothing had been debited)`);
    return;
  }

  // Status moved while we were reading it: re-check once.
  const fresh = await prisma.pretiumTransaction.findUnique({ where: { id: t.id } });
  if (fresh?.status === "processing") {
    await refundOfframpUser(fresh, `Payout ${label}`);
  } else if (fresh?.status === "COMPLETE") {
    console.error(
      `[elementpay] CRITICAL: ${event} for off-ramp ${t.transactionCode} but it is already COMPLETE. Manual review needed.`
    );
  } else {
    console.log(`[elementpay] ${event} for off-ramp ${t.transactionCode}: already ${fresh?.status}, no action`);
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
    return formatUnits(kesToUsdc(Math.trunc(Number(t.amount)), platformRate()), USDC_DECIMALS);
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

  console.log(`Element Pay settled ${t.type} ${t.transactionCode}. Initiating onchain transfer...`);

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
    console.error(`[elementpay] CRITICAL: no target address for ${t.transactionCode}`);
    return;
  }

  // Expected vs. delivered, for FX-reserve monitoring (webhook amount_crypto may carry fewer decimals)
  const bigintAmount = toUnits(usdcAmountToCredit);
  try {
    const delivered = toUnits(body.amount_crypto);
    if (delivered < bigintAmount) {
      console.warn(
        `[elementpay] treasury shortfall on ${t.transactionCode}: received ${body.amount_crypto} USDC, crediting ${usdcAmountToCredit} USDC`
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
        const chama = await prisma.chama.findUnique({ where: { id: t.chamaId } });
        if (chama) actualBlockchainId = Number(chama.blockchainId);
      }
      // Treasury -> payer, then payer -> chama contract
      await treasuryTransferToUser(t.user.smartAddress as `0x${string}`, bigintAmount);
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
              usdcAmountToCredit
            )
          : await bcDepositFundsToChama(
              t.user.cdpWalletId,
              BigInt(actualBlockchainId),
              usdcAmountToCredit
            );
    } else if (t.type === "moonwell") {
      await treasuryTransferToUser(targetAddress as `0x${string}`, bigintAmount);
      await sleep(5000);
      if (!t.user.cdpWalletId) {
        throw new Error("No CDP Wallet found for user to deposit to Moonwell");
      }
      txResult = await bcMoonwellDeposit(t.user.cdpWalletId, usdcAmountToCredit);
      description = "Moonwell Deposit via M-Pesa";
    } else if (t.type === "goal" && t.goalId) {
      const goal = await prisma.goal.findUnique({ where: { id: t.goalId } });
      if (!goal) throw new Error("Goal not found for pay-link contribution");

      txResult = await bcTreasuryGoalContribute(BigInt(goal.blockchainId), usdcAmountToCredit);
      description = "Goal contribution via M-Pesa";

      const msg = typeof t.message === "string" ? t.message : "";
      const isGuestPay = msg.startsWith("guest:");
      const payerAddr =
        t.user?.smartAddress || t.walletAddress || process.env.TREASURY_WALLET || "treasury";

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
      txResult = await treasuryTransferToUser(targetAddress as `0x${string}`, bigintAmount);
    }

    if (!txResult) throw new Error("Onchain transfer returned no result");

    if (t.type !== "goal") {
      const payerUserId = t.userId;
      const payerDescription =
        memberForId && description.includes("on behalf of")
          ? `Deposited for @${description.split("on behalf of @")[1] || "member"}`
          : description;
      const displayUsdc = t.cusdAmount ? t.cusdAmount.toString() : t.amount.toString();

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
      err
    );
    await prisma.pretiumTransaction
      .update({
        where: { id: t.id },
        data: {
          status: "processing",
          message: `ONCHAIN_FAILED: ${(err as Error)?.message || "unknown error"}`.slice(0, 250),
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
    const amountUsdc = t.cusdAmount ? t.cusdAmount.toString() : t.amount.toString();

    if (t.user.emailNotify && t.type === "deposit") {
      await emailService.sendMpesaDepositEmail(
        t.user.email,
        amountUsdc,
        t.user.location === "KE" ? t.amount.toString() : null,
        t.transactionCode, // Element Pay doesn't return an M-Pesa receipt; use the order id
        t.shortcode || "M-Pesa",
        timeStr
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
          const chama = await prisma.chama.findUnique({ where: { id: t.chamaId } });
          if (chama) chamaName = chama.name;
        }
        await emailService.sendPaidForSomeoneEmail(
          targetUser.email,
          t.user.userName || "Someone",
          amountUsdc,
          targetUser.location === "KE" ? t.amount.toString() : null,
          chamaName
        );
      }
    }
  } catch (emailErr) {
    console.error("[elementpay] email notification failed", emailErr);
  }
}