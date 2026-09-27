import {
  isAfeCrmDemoOrganization,
  isFounderMailboxEmail,
  isQTimeWorkspaceSlug,
  isSisOrganization,
} from "../../lib/client-portal/identity.ts";
import { decideExpiredTrialAccess } from "../../lib/trials/expired-desk.ts";

export const ATLAS_PLAN_PRICE_ENV = {
  basic: "STRIPE_ATLAS_BASIC_PRICE_ID",
  grow: "STRIPE_ATLAS_GROW_PRICE_ID",
  unlimited: "STRIPE_ATLAS_UNLIMITED_PRICE_ID",
} as const;

export const STRIPE_BILLING_UNLOCK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export const ACTIVE_PAID_ENTITLEMENT_STATUSES = ["active", "paid", "trialing"] as const;

export type AtlasPaidPlanSlug = keyof typeof ATLAS_PLAN_PRICE_ENV;

export type BillingEventLedgerStatus = "processing" | "processed" | "unmapped" | "failed";

type OrganizationIdentity = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

export function configuredAtlasPriceIds(
  env: NodeJS.Dict<string> = process.env,
): ReadonlyArray<readonly [string, AtlasPaidPlanSlug]> {
  return (Object.entries(ATLAS_PLAN_PRICE_ENV) as Array<[AtlasPaidPlanSlug, string]>)
    .map(([plan, envName]) => [env[envName]?.trim() ?? "", plan] as const)
    .filter((entry): entry is readonly [string, AtlasPaidPlanSlug] => Boolean(entry[0]));
}

/**
 * Recurring prices on the live Payment Links. Elite has no entitlement key;
 * it receives the same plan_slug as Pro (`unlimited`). Setup-fee prices are
 * listed separately and never count as a plan.
 */
export const ATLAS_BUILTIN_RECURRING_PRICE_IDS = {
  basic: "price_1U7KdYFjJT8Kf4ati4rPvvJd",
  grow: "price_1U7KfFFjJT8Kf4atV1zSNVlG",
  unlimited: "price_1U7Kj3FjJT8Kf4atxzlMMwAb",
  elite: "price_1UKMyCFjJT8Kf4atvBVQqq5w",
} as const;

export const ATLAS_SETUP_FEE_PRICE_IDS = [
  "price_1UKMxIFjJT8Kf4atCImBHVqW",
  "price_1UKMxMFjJT8Kf4atgmDXoRoC",
  "price_1UKMxMFjJT8Kf4atm76jVtL2",
  "price_1UKMyCFjJT8Kf4at3dBmTlxA",
] as const;

const BUILTIN_PLAN_BY_RECURRING_PRICE: Record<string, AtlasPaidPlanSlug> = {
  [ATLAS_BUILTIN_RECURRING_PRICE_IDS.basic]: "basic",
  [ATLAS_BUILTIN_RECURRING_PRICE_IDS.grow]: "grow",
  [ATLAS_BUILTIN_RECURRING_PRICE_IDS.unlimited]: "unlimited",
  [ATLAS_BUILTIN_RECURRING_PRICE_IDS.elite]: "unlimited",
};

const SETUP_FEE_PRICE_ID_SET = new Set<string>(ATLAS_SETUP_FEE_PRICE_IDS);

export type CheckoutPriceRef = {
  id?: string | null;
  type?: string | null;
  recurring?: { interval?: string | null } | null;
};

export type CheckoutLineItemRef = {
  price?: CheckoutPriceRef | string | null;
  amount_total?: number | null;
  amount_subtotal?: number | null;
};

export function planForConfiguredPriceId(
  priceId: string | null | undefined,
  env: NodeJS.Dict<string> = process.env,
): AtlasPaidPlanSlug | null {
  if (!priceId) return null;
  if (SETUP_FEE_PRICE_ID_SET.has(priceId)) return null;
  const match = configuredAtlasPriceIds(env).find(([configuredId]) => configuredId === priceId);
  return match?.[1] ?? BUILTIN_PLAN_BY_RECURRING_PRICE[priceId] ?? null;
}

function checkoutPriceRef(price: CheckoutLineItemRef["price"]) {
  if (!price) return { id: null as string | null, kind: "unknown" as const };
  if (typeof price === "string") return { id: price, kind: "unknown" as const };
  const id = price.id ?? null;
  if (price.type === "one_time") return { id, kind: "one_time" as const };
  if (price.type === "recurring" || price.recurring) return { id, kind: "recurring" as const };
  return { id, kind: "unknown" as const };
}

/**
 * Pick the plan from a checkout session or subscription. A Payment Link session
 * has two line items (recurring plan + one-time setup). The plan comes from the
 * recurring price id, never from line-item order or the summed amount.
 */
export function planFromCheckoutLineItems(
  items: readonly CheckoutLineItemRef[],
  env: NodeJS.Dict<string> = process.env,
): { priceId: string; plan: AtlasPaidPlanSlug } | null {
  const parsed = items
    .map((item) => checkoutPriceRef(item.price))
    .filter((item): item is { id: string; kind: "recurring" | "one_time" | "unknown" } => Boolean(item.id));

  const match = (kind: "recurring" | "unknown") => {
    for (const item of parsed) {
      if (item.kind !== kind) continue;
      const plan = planForConfiguredPriceId(item.id, env);
      if (plan) return { priceId: item.id, plan };
    }
    return null;
  };

  return match("recurring") ?? match("unknown");
}

export function isActivePaidEntitlementStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return (ACTIVE_PAID_ENTITLEMENT_STATUSES as readonly string[]).includes(normalized);
}

export function shouldProcessStripeBillingEvent(existingStatus: string | null | undefined) {
  return existingStatus !== "processed";
}

export function canAttachPaidEntitlementToOrganization(
  organization?: OrganizationIdentity | null,
) {
  if (!organization) return false;
  if (isSisOrganization(organization) || isAfeCrmDemoOrganization(organization)) return false;
  if (isQTimeWorkspaceSlug(organization.slug)) return false;
  return Boolean(String(organization.slug ?? "").trim() || String(organization.name ?? "").trim());
}

export function shouldRefuseFounderMailboxSisAttachment(
  email?: string | null,
  organization?: OrganizationIdentity | null,
) {
  return isFounderMailboxEmail(email) && isSisOrganization(organization);
}

export function pickReusablePaidWorkspace<T extends OrganizationIdentity>(
  organizations: Array<T | null | undefined>,
) {
  return organizations.find((organization): organization is T =>
    canAttachPaidEntitlementToOrganization(organization),
  );
}

export function preservedCheckoutSessionId(
  incoming: string | null | undefined,
  existing: string | null | undefined,
) {
  return incoming ?? existing ?? null;
}

export function shouldBlockExpiredTrial(input: {
  trialEndsAt?: string | null;
  hasActivePaidEntitlement: boolean;
  now?: number;
  organization?: { name?: string | null; slug?: string | null } | null;
  isSisOrganization?: boolean;
}) {
  const organization = input.isSisOrganization
    ? { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" }
    : input.organization;
  return (
    decideExpiredTrialAccess({
      trialEndsAt: input.trialEndsAt,
      hasActivePaidEntitlement: input.hasActivePaidEntitlement,
      organization,
      now: input.now,
    }) === "readOnly"
  );
}
