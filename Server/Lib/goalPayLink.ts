/** Obfuscated goal pay-link tokens (same scheme as chama share URLs). */

const ENCRYPTION_KEY = "chamapay-share-key-2025";
const CHARSET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Canonical web app host for invite + pay links */
export const APP_WEB_ORIGIN = "https://app.chamapay.xyz";

function simpleEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const encryptedChar = textChar ^ keyChar;
    const char1 = encryptedChar % 62;
    const char2 = Math.floor(encryptedChar / 62) % 62;
    result += CHARSET[char1] + CHARSET[char2];
  }
  return result;
}

function simpleDecrypt(encryptedText: string, key: string): string {
  let result = "";
  for (let i = 0; i < encryptedText.length; i += 2) {
    if (i + 1 < encryptedText.length) {
      const char1 = CHARSET.indexOf(encryptedText[i]);
      const char2 = CHARSET.indexOf(encryptedText[i + 1]);
      if (char1 < 0 || char2 < 0) return "";
      const encryptedChar = char1 + char2 * 62;
      const keyChar = key.charCodeAt((i / 2) % key.length);
      result += String.fromCharCode(encryptedChar ^ keyChar);
    }
  }
  return result;
}

export function encryptGoalSlug(slug: string): string {
  try {
    return simpleEncrypt(slug, ENCRYPTION_KEY);
  } catch {
    return slug;
  }
}

export function decryptGoalSlug(token: string): string {
  try {
    return simpleDecrypt(token, ENCRYPTION_KEY);
  } catch {
    return token;
  }
}

export function generateGoalPayUrl(slug: string): string {
  return `${APP_WEB_ORIGIN}/Goal/pay/${encryptGoalSlug(slug)}`;
}

export function generateChamaShareUrl(slug: string): string {
  return `${APP_WEB_ORIGIN}/invite/${encryptGoalSlug(slug)}`;
}
