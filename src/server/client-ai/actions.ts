"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@/lib/supabase/server";
import { generateStructuredText } from "@/server/integrations/openai-responses";
import { isSuperAdminEmail } from "@/lib/env";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import { getClientDashboardData } from "@/server/client-dashboard/queries";
import {
  getClientAiRoleSpec,
  type ClientAiRole,
} from "@/server/client-ai/guardrails";
import {
  createSubmitClientAiRequest,
} from "@/server/client-ai/execute-request";
import type { ClientAiActionState } from "@/server/client-ai/types";
import {
  getClientAiDailyUsage,
  type ClientAiDailyUsage,
} from "@/server/client-ai/queries";
import {
  atlasAskUsageFromCounts,
  normalizeAtlasAskPlan,
} from "@/lib/lions-den/atlas-quota";

async function loadRoleMarkdown(role: ClientAiRole) {
  const spec = getClientAiRoleSpec(role);
  const markdownPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    spec.markdownPath,
  );
  return readFile(markdownPath, "utf8");
}

async function logClientAiRequest(input: {
  organizationId: string;
  requestedBy: string;
  role: ClientAiRole;
  scopeStatus: ClientAiActionState["scopeStatus"];
  status: "succeeded" | "blocked" | "failed";
  prompt: string;
  response: string;
  routedTo: ClientAiRole | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_ai_requests")
    .insert({
      organization_id: input.organizationId,
      requested_by: input.requestedBy,
      role: input.role,
      scope_status: input.scopeStatus,
      status: input.status,
      prompt: input.prompt,
      response: input.response,
      routed_to: input.routedTo,
    })
    .select("id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    createdAt: data.created_at as string,
  };
}

type ClientAiReservationRow = {
  allowed: boolean;
  plan: string;
  used: number;
  limit: number | null;
  remaining: number | null;
};

function reservationUsage(row: ClientAiReservationRow): ClientAiDailyUsage {
  return atlasAskUsageFromCounts(row.used, normalizeAtlasAskPlan(row.plan));
}

async function reserveClientAiQuestion(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_client_ai_daily_question", {
    p_organization_id: organizationId,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) return { error: error?.message ?? "AI usage is unavailable.", usage: null, allowed: false };

  const reservation = row as ClientAiReservationRow;
  return { error: null, usage: reservationUsage(reservation), allowed: reservation.allowed };
}

const executeClientAiRequest = createSubmitClientAiRequest({
  requireUser: () => requireUser("/client"),
  isSuperAdminEmail,
  getUserMemberships,
  getClientAiDailyUsage,
  reserveClientAiQuestion,
  generateStructuredText,
  getClientDashboardData,
  loadRoleMarkdown,
  logClientAiRequest,
});

export async function submitClientAiRequest(
  previousState: ClientAiActionState,
  formData: FormData,
) {
  return executeClientAiRequest(previousState, formData);
}
