import "server-only";

import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type AtlasPaidPlanSlug,
  planForConfiguredPriceId,
  preservedCheckoutSessionId,
  shouldProcessStripeBillingEvent,
  STRIPE_BILLING_UNLOCK_EVENTS,
} from "@/server/stripe/billing-entitlement";
import { getAtlasStripeClient } from "@/server/stripe/client";
import {
  findExistingPaidWorkspaceLink,
  provisionPaidAtlasWorkspace,
  resolveCheckoutEmail,
} from "@/server/stripe/paid-workspace";
import {
  normalizeCheckoutEmail,
  provisioningStatusForCheckoutEmail,
} from "@/server/stripe/paid-workspace-identity";

const SUPPORTED_EVENTS = new Set<string>(STRIPE_BILLING_UNLOCK_EVENTS);

type PlanSlug = AtlasPaidPlanSlug;

function planForPrice(priceId: string | null | undefined): PlanSlug | null {
  return planForConfiguredPriceId(priceId);
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function subscriptionId(value: string | Stripe.Subscription | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
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
  if (!shouldProcessStripeBillingEvent(existing.data?.status)) return false;

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
  provisioningStatus?: "pending" | "linked" | "suspended" | "failed";
  userId?: string | null;
  organizationId?: string | null;
  event: Stripe.Event;
}) {
  const service = createServiceClient();
  const lookup = input.subscriptionId
    ? service.from("atlas_billing_entitlements").select("id,email,provisioning_status,user_id,organization_id,stripe_checkout_session_id").eq("stripe_subscription_id", input.subscriptionId).maybeSingle()
    : input.checkoutSessionId
      ? service.from("atlas_billing_entitlements").select("id,email,provisioning_status,user_id,organization_id,stripe_checkout_session_id").eq("stripe_checkout_session_id", input.checkoutSessionId).maybeSingle()
      : Promise.resolve({ data: null, error: null });
  const existing = await lookup;
  if (existing.error) throw existing.error;

  const payload = {
    email: input.email ?? existing.data?.email ?? null,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    stripe_checkout_session_id: preservedCheckoutSessionId(
      input.checkoutSessionId,
      existing.data?.stripe_checkout_session_id,
    ),
    stripe_price_id: input.priceId,
    plan_slug: input.plan,
    status: input.status,
    current_period_end: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000).toISOString() : null,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    last_stripe_event_id: input.event.id,
    updated_at: new Date().toISOString(),
    ...(input.userId !== undefined ? { user_id: input.userId } : {}),
    ...(input.organizationId !== undefined ? { organization_id: input.organizationId } : {}),
  };

  const insertPayload = { ...payload, provisioning_status: input.provisioningStatus ?? "pending" };
  const updatePayload = input.provisioningStatus
    ? { ...payload, provisioning_status: input.provisioningStatus }
    : payload;

  const result = existing.data
    ? await service.from("atlas_billing_entitlements").update(updatePayload).eq("id", existing.data.id)
    : await service.from("atlas_billing_entitlements").insert(insertPayload);
  if (!result.error) return;
  if (result.error.code !== "23505") throw result.error;

  const raced = input.subscriptionId
    ? await service.from("atlas_billing_entitlements").select("id").eq("stripe_subscription_id", input.subscriptionId).maybeSingle()
    : input.checkoutSessionId
      ? await service.from("atlas_billing_entitlements").select("id").eq("stripe_checkout_session_id", input.checkoutSessionId).maybeSingle()
      : { data: null, error: null };
  if (raced.error) throw raced.error;
  if (!raced.data?.id) throw result.error;
  const retry = await service.from("atlas_billing_entitlements").update(updatePayload).eq("id", raced.data.id);
  if (retry.error) throw retry.error;
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

  const email = await resolveCheckoutEmail(stripe, session);
  const billing = {
    email,
    customerId: customerId(session.customer),
    subscriptionId: subscription,
    checkoutSessionId: session.id,
    priceId,
    plan,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    event,
  };

  await upsertEntitlement({
    ...billing,
    provisioningStatus: provisioningStatusForCheckoutEmail(email),
  });

  const workspace = await provisionPaidAtlasWorkspace({ email, session });
  await upsertEntitlement({
    ...billing,
    provisioningStatus: workspace.status === "linked" ? "linked" : "failed",
    userId: workspace.status === "linked" ? workspace.userId : undefined,
    organizationId: workspace.status === "linked" ? workspace.organizationId : undefined,
  });
}

async function emailFromSubscription(subscription: Stripe.Subscription) {
  const customer = subscription.customer;
  if (customer && typeof customer === "object" && !("deleted" in customer && customer.deleted)) {
    const fromCustomer = normalizeCheckoutEmail(customer.email);
    if (fromCustomer) return fromCustomer;
  }

  const stripe = getAtlasStripeClient();
  const id = customerId(subscription.customer);
  if (!stripe || !id) return null;

  const record = await stripe.customers.retrieve(id);
  if ("deleted" in record && record.deleted) return null;
  return normalizeCheckoutEmail(record.email);
}

async function handleSubscription(event: Stripe.Event, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planForPrice(priceId);
  if (!plan) {
    await finishEvent(event.id, "unmapped", `No AFE plan is configured for Stripe price ${priceId ?? "unknown"}.`);
    return;
  }

  const email = await emailFromSubscription(subscription);
  const workspace =
    event.type === "customer.subscription.deleted"
      ? { status: "missing" as const }
      : await findExistingPaidWorkspaceLink(email);

  await upsertEntitlement({
    email,
    customerId: customerId(subscription.customer),
    subscriptionId: subscription.id,
    checkoutSessionId: null,
    priceId,
    plan,
    status: subscription.status,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    provisioningStatus:
      event.type === "customer.subscription.deleted"
        ? "suspended"
        : workspace.status === "linked"
          ? "linked"
          : undefined,
    userId: workspace.status === "linked" ? workspace.userId : undefined,
    organizationId: workspace.status === "linked" ? workspace.organizationId : undefined,
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
