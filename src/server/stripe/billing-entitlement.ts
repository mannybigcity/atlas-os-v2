import {
  isAfeCrmDemoOrganization,
  isFounderMailboxEmail,
  isQTimeWorkspaceSlug,
  isSisOrganization,
} from "../../lib/client-portal/identity.ts";

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

export function planForConfiguredPriceId(
  priceId: string | null | undefined,
  env: NodeJS.Dict<string> = process.env,
): AtlasPaidPlanSlug | null {
  if (!priceId) return null;
  const match = configuredAtlasPriceIds(env).find(([configuredId]) => configuredId === priceId);
  return match?.[1] ?? null;
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
}) {
  if (input.hasActivePaidEntitlement) return false;
  if (!input.trialEndsAt) return false;
  return new Date(input.trialEndsAt).getTime() <= (input.now ?? Date.now());
}
