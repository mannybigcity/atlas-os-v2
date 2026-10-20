import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

export type WebhookVerification =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing_header" | "missing_timestamp" | "stale_timestamp" | "invalid_signature" };

export function verifyStripeWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Date.now() / 1000,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): WebhookVerification {
  if (!header?.trim() || !secret) {
    return { ok: false, reason: "missing_header" };
  }

  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);
  const timestamp = Number(timestampPart?.slice(2));

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { ok: false, reason: "missing_timestamp" };
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const valid = signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");

    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });

  if (!valid) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true, timestamp };
}
