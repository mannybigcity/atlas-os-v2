import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type BusinessProfile = {
  organizationId: string;
  offer: string | null;
  targetCustomer: string | null;
  positioning: string | null;
  currentGoals: string | null;
  constraints: string | null;
  updatedAt: string;
};

type BusinessProfileRow = {
  organization_id: string;
  offer: string | null;
  target_customer: string | null;
  positioning: string | null;
  current_goals: string | null;
  constraints: string | null;
  updated_at: string;
};

function normalizeBusinessProfile(row: BusinessProfileRow): BusinessProfile {
  return {
    organizationId: row.organization_id,
    offer: row.offer,
    targetCustomer: row.target_customer,
    positioning: row.positioning,
    currentGoals: row.current_goals,
    constraints: row.constraints,
    updatedAt: row.updated_at,
  };
}

export async function getBusinessProfile(
  organizationId: string,
): Promise<WorkspaceQueryResult<BusinessProfile | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_profiles")
    .select(
      "organization_id, offer, target_customer, positioning, current_goals, constraints, updated_at",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: data ? normalizeBusinessProfile(data as BusinessProfileRow) : null,
    setupRequired: false,
    error: null,
  };
}
