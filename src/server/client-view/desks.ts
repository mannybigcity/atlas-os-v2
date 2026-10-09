import "server-only";

import {
  selectClientViewDesks,
  type ClientViewDeskRow,
} from "@/lib/lions-den/client-view";
import { createServiceClient } from "@/lib/supabase/service";
import {
  listOrganizationsForOperator,
  type WorkspaceQueryResult,
} from "@/server/organizations/queries";

export async function listAfeClientViewDesks(): Promise<WorkspaceQueryResult<ClientViewDeskRow[]>> {
  try {
    const organizations = await listOrganizationsForOperator();
    const linked = await loadLinkedBillingIds(organizations.map((organization) => organization.id));
    return {
      data: selectClientViewDesks(organizations, linked),
      setupRequired: false,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      setupRequired: true,
      error: error instanceof Error ? error.message : "client_view_unavailable",
    };
  }
}

async function loadLinkedBillingIds(organizationIds: string[]) {
  const linked = new Set<string>();
  if (organizationIds.length === 0) return linked;

  try {
    const service = createServiceClient();
    const result = await service
      .from("atlas_billing_entitlements")
      .select("organization_id, provisioning_status")
      .in("organization_id", organizationIds);
    if (result.error) return linked;
    for (const row of (result.data ?? []) as Array<{
      organization_id?: string | null;
      provisioning_status?: string | null;
    }>) {
      if (row.organization_id && row.provisioning_status === "linked") {
        linked.add(row.organization_id);
      }
    }
  } catch {
    // A missing billing table still lists the desks. They stay labeled as trials.
  }

  return linked;
}
