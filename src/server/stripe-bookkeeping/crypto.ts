import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

export function encryptSecret(plaintext: string, key: Buffer) {
  assertKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, key: Buffer) {
  assertKey(key);
  const [version, ivPart, tagPart, dataPart] = payload.split(".");

  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Stripe token ciphertext is not in the expected format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function decodeEncryptionKey(value: string) {
  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error("STRIPE_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64.");
  }

  return key;
}

function assertKey(key: Buffer) {
  if (key.length !== 32) {
    throw new Error("Stripe token encryption key must be 32 bytes.");
  }
}
