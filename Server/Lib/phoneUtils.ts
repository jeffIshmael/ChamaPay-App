/** Normalize Kenyan phone input to local 9-digit form (without 0/254). */
export function normalizeKenyaPhoneLocal(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = p.slice(1);
  if (p.startsWith("254")) p = p.slice(3);
  return p;
}

/** Pretium / M-Pesa often expect local 07xxxxxxxx */
export function toKenyaLocal07(phone: string): string {
  return `0${normalizeKenyaPhoneLocal(phone)}`;
}

export function toKenyaE164(phone: string): string {
  return `254${normalizeKenyaPhoneLocal(phone)}`;
}

export function isValidKenyaPhone(phone: string): boolean {
  const local = normalizeKenyaPhoneLocal(phone);
  return /^[17]\d{8}$/.test(local);
}
