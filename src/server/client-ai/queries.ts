import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";
import type { ClientAiRole } from "@/server/client-ai/guardrails";
import {
  ATLAS_ASK_LIMITS,
  atlasAskUsageFromCounts,
  normalizeAtlasAskPlan,
  type AtlasAskPlan,
} from "@/lib/lions-den/atlas-quota";

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

export type ClientAiPlan = AtlasAskPlan;

export type ClientAiDailyUsage = {
  plan: ClientAiPlan;
  planLabel: string;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export const clientAiPlanLimits: Record<ClientAiPlan, number | null> = {
  ...ATLAS_ASK_LIMITS,
};

export function defaultClientAiDailyUsage(): ClientAiDailyUsage {
  return atlasAskUsageFromCounts(0, "basic");
}

type ClientAiDailyUsageRow = {
  plan: string;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export async function getClientAiDailyUsage(
  organizationId: string,
): Promise<WorkspaceQueryResult<ClientAiDailyUsage>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_ai_daily_usage", {
    p_organization_id: organizationId,
  });

  if (error || !data) {
    return {
      data: defaultClientAiDailyUsage(),
      setupRequired: true,
      error: error?.message ?? "AI usage is unavailable.",
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as ClientAiDailyUsageRow | null;
  if (!row) {
    return {
      data: defaultClientAiDailyUsage(),
      setupRequired: true,
      error: "AI usage is unavailable.",
    };
  }
  const used = Math.max(0, Number(row.used) || 0);
  const plan = normalizeAtlasAskPlan(row.plan);

  return {
    data: atlasAskUsageFromCounts(used, plan),
    setupRequired: false,
    error: null,
  };
}

/** @deprecated Use getClientAiDailyUsage for plan-aware quota handling. */
export async function getClientAiDailyQuestionCount(organizationId: string) {
  const usage = await getClientAiDailyUsage(organizationId);
  return {
    count: usage.data.used,
    error: usage.setupRequired ? usage.error : null,
  };
}

/** @deprecated Basic is the safe default; use clientAiPlanLimits for plan-aware logic. */
export const starterDailyQuestionLimit = clientAiPlanLimits.basic ?? 5;

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
