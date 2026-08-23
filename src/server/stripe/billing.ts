import "server-only";

import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getAtlasStripeClient } from "@/server/stripe/client";

const PLAN_PRICE_ENV: Record<string, string> = {
  basic: "STRIPE_ATLAS_BASIC_PRICE_ID",
  grow: "STRIPE_ATLAS_GROW_PRICE_ID",
  unlimited: "STRIPE_ATLAS_UNLIMITED_PRICE_ID",
};

const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

type PlanSlug = "basic" | "grow" | "unlimited";

function configuredPriceIds() {
  return Object.entries(PLAN_PRICE_ENV)
    .map(([plan, envName]) => [process.env[envName]?.trim(), plan] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0]));
}

function planForPrice(priceId: string | null | undefined): PlanSlug | null {
  if (!priceId) return null;
  const match = configuredPriceIds().find(([configuredId]) => configuredId === priceId);
  return match?.[1] as PlanSlug | undefined ?? null;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function subscriptionId(value: string | Stripe.Subscription | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function emailFromSession(session: Stripe.Checkout.Session) {
  return (session.customer_details?.email ?? session.customer_email ?? "").trim().toLowerCase() || null;
}

async function markEvent(event: Stripe.Event) {
  const service = createServiceClient();
  const inserted = await service.from("atlas_billing_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    status: "processing",
    event_created_at: new Date(event.created * 1000).toISOString(),
  });

  if (!inserted.error) return true;
  if (inserted.error.code !== "23505") throw inserted.error;

  const existing = await service
    .from("atlas_billing_events")
    .select("status")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.status === "processed") return false;

  const retry = await service
    .from("atlas_billing_events")
    .update({ status: "processing", error_message: null })
    .eq("stripe_event_id", event.id);
  if (retry.error) throw retry.error;
  return true;
}

async function finishEvent(eventId: string, status: "processed" | "unmapped" | "failed", errorMessage?: string) {
  const service = createServiceClient();
  const { error } = await service
    .from("atlas_billing_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage?.slice(0, 500) ?? null,
    })
    .eq("stripe_event_id", eventId);
  if (error) throw error;
}

async function upsertEntitlement(input: {
  email: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  checkoutSessionId: string | null;
  priceId: string | null;
  plan: PlanSlug;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  provisioningStatus?: "pending" | "linked" | "suspended";
  event: Stripe.Event;
}) {
  const service = createServiceClient();
  const lookup = input.subscriptionId
    ? service.from("atlas_billing_entitlements").select("id,email,provisioning_status").eq("stripe_subscription_id", input.subscriptionId).maybeSingle()
    : input.checkoutSessionId
      ? service.from("atlas_billing_entitlements").select("id,email,provisioning_status").eq("stripe_checkout_session_id", input.checkoutSessionId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
  const existing = await lookup;
  if (existing.error) throw existing.error;

  const payload = {
    email: input.email ?? existing.data?.email ?? null,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    stripe_checkout_session_id: input.checkoutSessionId,
    stripe_price_id: input.priceId,
    plan_slug: input.plan,
    status: input.status,
    current_period_end: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000).toISOString() : null,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    last_stripe_event_id: input.event.id,
    updated_at: new Date().toISOString(),
  };

  const insertPayload = { ...payload, provisioning_status: input.provisioningStatus ?? "pending" };
  const updatePayload = input.provisioningStatus
    ? { ...payload, provisioning_status: input.provisioningStatus }
    : payload;

  const result = existing.data
    ? await service.from("atlas_billing_entitlements").update(updatePayload).eq("id", existing.data.id)
    : await service.from("atlas_billing_entitlements").insert(insertPayload);
  if (result.error) throw result.error;
}

async function handleCheckoutCompleted(event: Stripe.Event, session: Stripe.Checkout.Session) {
  const stripe = getAtlasStripeClient();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is required to resolve checkout line items.");

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id ?? null;
  const plan = planForPrice(priceId);
  if (!plan) {
    await finishEvent(event.id, "unmapped", `No AFE plan is configured for Stripe price ${priceId ?? "unknown"}.`);
    return;
  }

  const subscription = subscriptionId(session.subscription);
  let currentPeriodEnd: number | null = null;
  let status = session.mode === "subscription" ? "active" : "paid";
  let cancelAtPeriodEnd = false;
  if (subscription) {
    const record = await stripe.subscriptions.retrieve(subscription);
    currentPeriodEnd = record.items.data[0]?.current_period_end ?? null;
    status = record.status;
    cancelAtPeriodEnd = record.cancel_at_period_end;
  }

  await upsertEntitlement({
    email: emailFromSession(session),
    customerId: customerId(session.customer),
    subscriptionId: subscription,
    checkoutSessionId: session.id,
    priceId,
    plan,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    event,
  });
}

async function handleSubscription(event: Stripe.Event, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planForPrice(priceId);
  if (!plan) {
    await finishEvent(event.id, "unmapped", `No AFE plan is configured for Stripe price ${priceId ?? "unknown"}.`);
    return;
  }

  await upsertEntitlement({
    email: null,
    customerId: customerId(subscription.customer),
    subscriptionId: subscription.id,
    checkoutSessionId: null,
    priceId,
    plan,
    status: subscription.status,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    provisioningStatus: event.type === "customer.subscription.deleted" ? "suspended" : undefined,
    event,
  });
}

export async function processStripeBillingEvent(event: Stripe.Event) {
  const shouldProcess = await markEvent(event);
  if (!shouldProcess) return { duplicate: true as const };
  if (!SUPPORTED_EVENTS.has(event.type)) {
    await finishEvent(event.id, "processed");
    return { duplicate: false as const, handled: false as const };
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event, event.data.object as Stripe.Checkout.Session);
    } else if (event.type.startsWith("customer.subscription.")) {
      await handleSubscription(event, event.data.object as Stripe.Subscription);
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = subscriptionId(invoice.parent?.subscription_details?.subscription);
      if (subscription) {
        const service = createServiceClient();
        const { error } = await service
          .from("atlas_billing_entitlements")
          .update({ status: event.type === "invoice.paid" ? "active" : "past_due", last_stripe_event_id: event.id, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription);
        if (error) throw error;
      }
    }

    await finishEvent(event.id, "processed");
    return { duplicate: false as const, handled: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe billing event failed.";
    await finishEvent(event.id, "failed", message);
    throw error;
  }
}
