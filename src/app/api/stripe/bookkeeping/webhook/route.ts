import { isStripeBookkeepingEnabled, loadStripeBookkeepingConfig } from "@/server/stripe-bookkeeping/config";
import { applyStripeWebhookEvent } from "@/server/stripe-bookkeeping/jobs";
import { publicSyncError } from "@/server/stripe-bookkeeping/sync";
import { claimWebhookEvent, createStripeAdminClient } from "@/server/stripe-bookkeeping/store";
import { verifyStripeWebhookSignature } from "@/server/stripe-bookkeeping/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeBookkeepingEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const config = loadStripeBookkeepingConfig();
  const payload = await request.text();
  const verification = verifyAny(
    payload,
    request.headers.get("stripe-signature"),
    config.webhookSecrets,
  );

  if (!verification.ok) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { id?: unknown; type?: unknown };

  try {
    event = JSON.parse(payload) as { id?: unknown; type?: unknown };
  } catch {
    return new Response("Invalid event", { status: 400 });
  }

  if (typeof event.id !== "string" || !event.id.startsWith("evt_")) {
    return new Response("Invalid event", { status: 400 });
  }

  const client = createStripeAdminClient();
  const claim = await claimWebhookEvent(client, event.id, String(event.type ?? "unknown"));

  if (claim === "duplicate") {
    return new Response("ok");
  }

  try {
    await applyStripeWebhookEvent(event as Parameters<typeof applyStripeWebhookEvent>[0]);
  } catch (error) {
    console.error("stripe bookkeeping webhook failed", publicSyncError(error));
    return new Response("retry", { status: 500 });
  }

  return new Response("ok");
}

function verifyAny(payload: string, header: string | null, secrets: string[]) {
  if (secrets.length === 0) {
    return { ok: false as const, reason: "missing_header" as const };
  }

  let failure: ReturnType<typeof verifyStripeWebhookSignature> = {
    ok: false,
    reason: "invalid_signature",
  };

  for (const secret of secrets) {
    const result = verifyStripeWebhookSignature(payload, header, secret);

    if (result.ok) {
      return result;
    }

    failure = result;
  }

  return failure;
}
