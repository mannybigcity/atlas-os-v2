import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";
import type { ClientAiRole } from "@/server/client-ai/guardrails";

export type ClientAiRequest = {
  id: string;
  organizationId: string;
  requestedBy: string | null;
  role: ClientAiRole;
  scopeStatus: "in_scope" | "needs_input" | "rerouted" | "declined";
  status: "succeeded" | "blocked" | "failed";
  prompt: string;
  response: string;
  routedTo: ClientAiRole | null;
  createdAt: string;
};

type ClientAiRequestRow = {
  id: string;
  organization_id: string;
  requested_by: string | null;
  role: ClientAiRole;
  scope_status: ClientAiRequest["scopeStatus"];
  status: ClientAiRequest["status"];
  prompt: string;
  response: string;
  routed_to: ClientAiRole | null;
  created_at: string;
};

export async function getClientAiRequests(
  organizationId: string,
  limit = 10,
): Promise<WorkspaceQueryResult<ClientAiRequest[]>> {
  const supabase = await createClient();
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const { data, error } = await supabase
    .from("organization_ai_requests")
    .select(
      "id, organization_id, requested_by, role, scope_status, status, prompt, response, routed_to, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as ClientAiRequestRow[]).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      requestedBy: row.requested_by,
      role: row.role,
      scopeStatus: row.scope_status,
      status: row.status,
      prompt: row.prompt,
      response: row.response,
      routedTo: row.routed_to,
      createdAt: row.created_at,
    })),
    setupRequired: false,
    error: null,
  };
}

