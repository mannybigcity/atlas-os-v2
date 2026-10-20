import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyStripeWebhookSignature } from "./webhook-signature.ts";

const secret = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_123", type: "charge.succeeded" });
const now = 1_700_000_000;

function headerFor(body: string, timestamp = now, signingSecret = secret) {
  const signature = createHmac("sha256", signingSecret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("accepts a current Stripe signature", () => {
  const result = verifyStripeWebhookSignature(payload, headerFor(payload), secret, now);

  assert.equal(result.ok, true);
});

test("rejects a tampered payload", () => {
  const result = verifyStripeWebhookSignature(`${payload} `, headerFor(payload), secret, now);

  assert.deepEqual(result, { ok: false, reason: "invalid_signature" });
});

test("rejects a stale timestamp", () => {
  const result = verifyStripeWebhookSignature(payload, headerFor(payload, now - 301), secret, now);

  assert.deepEqual(result, { ok: false, reason: "stale_timestamp" });
});

test("rejects a missing signature header", () => {
  const result = verifyStripeWebhookSignature(payload, null, secret, now);

  assert.deepEqual(result, { ok: false, reason: "missing_header" });
});
