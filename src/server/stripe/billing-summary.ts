import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { ACTIVE_PAID_ENTITLEMENT_STATUSES } from "@/server/stripe/billing-entitlement";

export type DeskBillingSummary = {
  planSlug: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  active: boolean;
};

export async function getDeskBillingSummary(userId: string): Promise<DeskBillingSummary | null> {
  const id = String(userId ?? "").trim();
  if (!id) return null;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("atlas_billing_entitlements")
      .select("plan_slug, status, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      plan_slug: string | null;
      status: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean | null;
      stripe_customer_id: string | null;
    };
    return {
      planSlug: row.plan_slug,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      stripeCustomerId: row.stripe_customer_id,
      active: Boolean(row.status) && (ACTIVE_PAID_ENTITLEMENT_STATUSES as readonly string[]).includes(String(row.status)),
    };
  } catch {
    return null;
  }
}
