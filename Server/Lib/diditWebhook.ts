import crypto from "crypto";

/**
 * Didit webhook signature helpers (X-Signature-V2).
 * @see https://docs.didit.me/integration/webhooks
 */

/** Match Didit's float normalisation: whole-valued floats serialise as ints. */
export function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        shortenFloats(value),
      ])
    );
  }
  if (typeof data === "number" && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

/** Sort object keys recursively before re-stringifying. */
export function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isTimestampFresh(timestampHeader: string, maxSkewSec = 300): boolean {
  const ts = parseInt(timestampHeader, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= maxSkewSec;
}

export function verifySignatureV2(
  jsonBody: unknown,
  signatureHeader: string,
  timestampHeader: string,
  secret: string
): boolean {
  if (!isTimestampFresh(timestampHeader)) return false;
  const canonical = JSON.stringify(sortKeys(shortenFloats(jsonBody)));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(canonical, "utf8")
    .digest("hex");
  return timingSafeEqualHex(expected, signatureHeader);
}

export function verifySignatureSimple(
  jsonBody: Record<string, unknown>,
  signatureHeader: string,
  timestampHeader: string,
  secret: string
): boolean {
  if (!isTimestampFresh(timestampHeader)) return false;
  const canonical = [
    jsonBody.timestamp ?? "",
    jsonBody.session_id ?? "",
    jsonBody.status ?? "",
    jsonBody.webhook_type ?? "",
  ].join(":");
  const expected = crypto.createHmac("sha256", secret).update(canonical).digest("hex");
  return timingSafeEqualHex(expected, signatureHeader);
}

export function verifySignatureRaw(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  secret: string
): boolean {
  if (!isTimestampFresh(timestampHeader)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqualHex(expected, signatureHeader);
}
