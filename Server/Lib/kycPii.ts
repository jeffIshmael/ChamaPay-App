import Encryption from "./Encryption";

const DOC_NUM_PREFIX = "enc:v1:";

type MasterPayload = {
  encrypted: string;
  iv: string;
  algorithm: string;
};

/**
 * Encrypt KYC document / national ID number at rest (AES via ENCRYPTION_MASTER_KEY).
 * Other OCR fields stay plaintext by product choice.
 */
export function encryptKycDocumentNumber(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const value = String(plain).trim();
  if (!value) return null;
  if (value.startsWith(DOC_NUM_PREFIX)) return value;

  const payload = Encryption.encryptWithMasterKey(value);
  return DOC_NUM_PREFIX + Encryption.encodeEncryptedText(JSON.stringify(payload));
}

/**
 * Decrypt stored document number. Legacy plaintext rows pass through unchanged.
 */
export function decryptKycDocumentNumber(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const value = String(stored).trim();
  if (!value) return null;
  if (!value.startsWith(DOC_NUM_PREFIX)) return value;

  try {
    const json = Encryption.decodeEncryptedText(value.slice(DOC_NUM_PREFIX.length));
    const payload = JSON.parse(json) as MasterPayload;
    if (!payload?.encrypted || !payload?.iv) return null;
    return Encryption.decryptWithMasterKey(payload);
  } catch (e) {
    console.error("[KYC] Failed to decrypt document number:", e);
    return null;
  }
}
