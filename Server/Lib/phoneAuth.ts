/**
 * Normalize phones to E.164 digits (no +), e.g. 254712345678.
 * @param raw user input (local or full)
 * @param dialCode country calling code without +, default 254 (Kenya)
 */
export function normalizePhoneE164(
  raw: string,
  dialCode = "254"
): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  const cc = String(dialCode).replace(/\D/g, "") || "254";

  // Already includes dial code
  if (digits.startsWith(cc) && digits.length >= cc.length + 7) {
    if (digits.length > 15) return null;
    return digits;
  }

  // Strip leading 0 (common local format)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  const full = `${cc}${digits}`;
  if (full.length < 10 || full.length > 15) return null;
  return full;
}

/** Synthetic unique email for phone-only accounts (email column stays required). */
export function phonePlaceholderEmail(phoneE164: string): string {
  return `phone.${phoneE164}@phone.chamapay.local`;
}

export function isPhonePlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@phone.chamapay.local");
}
