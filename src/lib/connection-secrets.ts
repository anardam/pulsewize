import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const IV_LENGTH = 12;

function getSecretKey(): Buffer | null {
  const secret = process.env.CONNECTED_ACCOUNT_TOKEN_SECRET;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptConnectionToken(value: string | null | undefined): string | null {
  if (!value) return null;

  const key = getSecretKey();
  if (!key) {
    return value;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptConnectionToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const key = getSecretKey();
  if (!key) {
    throw new Error("CONNECTED_ACCOUNT_TOKEN_SECRET is not configured");
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivB64, authTagB64, encryptedB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Encrypted token payload is invalid");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
