import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { ACTIVE_PAID_ENTITLEMENT_STATUSES } from "@/server/stripe/billing-entitlement";

export async function userHasActivePaidEntitlement(userId: string) {
  const id = String(userId ?? "").trim();
  if (!id) return false;

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("atlas_billing_entitlements")
      .select("id")
      .eq("user_id", id)
      .eq("provisioning_status", "linked")
      .in("status", [...ACTIVE_PAID_ENTITLEMENT_STATUSES])
      .limit(1)
      .maybeSingle();
    return Boolean(data?.id) && !error;
  } catch {
    return false;
  }
}
