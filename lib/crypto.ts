import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const DEFAULT_KEY = "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"; // 32 character fallback

function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  // Generate a 32-byte key from the secret string via SHA-256
  return crypto.createHash("sha256").update(keyStr).digest();
}

/**
 * Encrypts a plain text string into a URL-safe hex string.
 * @param text The plain text to encrypt.
 */
export function encryptToken(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Prepend IV to the encrypted hex (IV is 16 bytes = 32 hex characters)
  return iv.toString("hex") + encrypted;
}

/**
 * Decrypts a hex string back into its original plain text.
 * @param cipherText The hex string containing IV + encrypted text.
 */
export function decryptToken(cipherText: string): string {
  try {
    const key = getEncryptionKey();
    if (!cipherText || cipherText.length <= 32) {
      throw new Error("Formato de token inválido");
    }
    const ivHex = cipherText.substring(0, 32);
    const encryptedHex = cipherText.substring(32);
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Error decrypting token:", error);
    throw new Error("Enlace de firma no válido o alterado");
  }
}
