import { createClient } from "@/lib/supabase/server";
import type { KingdomAgentRole } from "@/lib/kingdom-agents";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type AgentRunSummary = {
  id: string;
  prospectId: string | null;
  organizationId: string | null;
  role: KingdomAgentRole;
  workflow: string;
  provider: string;
  model: string | null;
  status: "succeeded" | "failed" | "blocked";
  requestUnits: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  estimatedCostMicrousd: number;
  resultCount: number;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

type AgentRunRow = {
  id: string;
  prospect_id: string | null;
  organization_id: string | null;
  role: KingdomAgentRole;
  workflow: string;
  provider: string;
  model: string | null;
  status: "succeeded" | "failed" | "blocked";
  request_units: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  estimated_cost_microusd: number;
  result_count: number;
  error_code: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
};

function normalizeRun(row: AgentRunRow): AgentRunSummary {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    organizationId: row.organization_id,
    role: row.role,
    workflow: row.workflow,
    provider: row.provider,
    model: row.model,
    status: row.status,
    requestUnits: row.request_units,
    inputTokens: row.input_tokens,
    cachedInputTokens: row.cached_input_tokens,
    outputTokens: row.output_tokens,
    reasoningTokens: row.reasoning_tokens,
    estimatedCostMicrousd: row.estimated_cost_microusd,
    resultCount: row.result_count,
    errorCode: row.error_code,
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export async function getRecentAgentRuns(
  limit = 50,
): Promise<WorkspaceQueryResult<AgentRunSummary[]>> {
  const supabase = await createClient();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await supabase
    .from("atlas_agent_runs")
    .select(
      `
        id,
        prospect_id,
        organization_id,
        role,
        workflow,
        provider,
        model,
        status,
        request_units,
        input_tokens,
        cached_input_tokens,
        output_tokens,
        reasoning_tokens,
        estimated_cost_microusd,
        result_count,
        error_code,
        metadata,
        occurred_at,
        created_at
      `,
    )
    .order("occurred_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as AgentRunRow[]).map(normalizeRun),
    setupRequired: false,
    error: null,
  };
}
