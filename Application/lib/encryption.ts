// Simple encryption utility for chama sharing URLs
// In production, you'd want to use a more robust encryption method

const ENCRYPTION_KEY = "chamapay-share-key-2025"; // In production, use environment variable

// Base64-like character set for more varied output
const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Simple character substitution cipher with varied output
function simpleEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const encryptedChar = textChar ^ keyChar;
    // Convert to 2-character base62 representation
    const char1 = encryptedChar % 62;
    const char2 = Math.floor(encryptedChar / 62) % 62;
    result += CHARSET[char1] + CHARSET[char2];
  }
  return result;
}

function simpleDecrypt(encryptedText: string, key: string): string {
  let result = '';
  // Process in pairs of characters
  for (let i = 0; i < encryptedText.length; i += 2) {
    if (i + 1 < encryptedText.length) {
      const char1 = CHARSET.indexOf(encryptedText[i]);
      const char2 = CHARSET.indexOf(encryptedText[i + 1]);
      const encryptedChar = char1 + (char2 * 62);
      const keyChar = key.charCodeAt((i / 2) % key.length);
      const decryptedChar = encryptedChar ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
  }
  return result;
}

// Generate encrypted chama identifier from slug
export function encryptChamaSlug(slug: string): string {
  try {
    return simpleEncrypt(slug, ENCRYPTION_KEY);
  } catch (error) {
    console.error('Encryption error:', error);
    return slug; // Fallback to original slug
  }
}

// Decrypt chama identifier to get original slug
export function decryptChamaSlug(encryptedSlug: string): string {
  try {
    return simpleDecrypt(encryptedSlug, ENCRYPTION_KEY);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedSlug; // Fallback to encrypted slug
  }
}

// Generate shareable URL
export function generateChamaShareUrl(slug: string): string {
  const encryptedSlug = encryptChamaSlug(slug);
  return `https://chamapay.com/chama/${encryptedSlug}`;
}

// Parse shareable URL to extract encrypted slug
export function parseChamaShareUrl(url: string): string | null {
  try {
    // Handle various URL formats
    const cleanUrl = url.trim();
    
    // Extract the encrypted slug from different URL patterns
    const patterns = [
      /https?:\/\/chamapay\.com\/chama\/([a-zA-Z0-9]+)/i,
      /chamapay\.com\/chama\/([a-zA-Z0-9]+)/i,
      /\/chama\/([a-zA-Z0-9]+)/i,
      /^([a-zA-Z0-9]+)$/i, // Just the encrypted slug
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('URL parsing error:', error);
    return null;
  }
}
