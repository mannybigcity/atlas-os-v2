import "server-only";

import type {
  AmandaBusiness,
  AmandaSequenceRecord,
  AmandaSequenceStatus,
  AmandaStep,
} from "@/lib/lions-den/amanda-outreach";
import { inferTrialDeskMarket } from "@/lib/lions-den/trial-desk-market";
import { createClient } from "@/lib/supabase/server";

/** What Amanda says about the owner's business, from signup data. Never invented. */
export function amandaBusinessFromWorkspace(input: {
  organizationName: string | null | undefined;
  userMetadata: Record<string, unknown> | null | undefined;
}): AmandaBusiness {
  const meta = input.userMetadata ?? {};
  const market = inferTrialDeskMarket({ businessName: input.organizationName, metadata: meta });
  return {
    businessName: market.businessName || String(input.organizationName ?? "").trim() || "our company",
    trade: market.serviceQuery,
    city: market.city || null,
    ownerName: String(meta.full_name ?? meta.name ?? "").trim() || null,
    ownerPhone: String(meta.phone ?? "").trim() || null,
  };
}

type SequenceRow = {
  id: string;
  opportunity_id: string;
  status: string;
  current_step: number;
  next_send_at: string | null;
  stopped_reason: string | null;
  steps: unknown;
  to_email: string;
};

function asSteps(value: unknown): AmandaStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      step: typeof item.step === "number" ? item.step : index,
      delayDays: typeof item.delayDays === "number" ? item.delayDays : 0,
      subject: String(item.subject ?? ""),
      body: String(item.body ?? ""),
    }));
}

/** Every Amanda sequence for the desk, keyed by prospect. Missing table reads as "not set up", never as an error page. */
export async function getAmandaSequences(organizationId: string): Promise<{
  data: Record<string, AmandaSequenceRecord>;
  setupRequired: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_outreach_sequences")
    .select("id, opportunity_id, status, current_step, next_send_at, stopped_reason, steps, to_email")
    .eq("organization_id", organizationId)
    .eq("channel", "email")
    .limit(200);

  if (error) {
    return { data: {}, setupRequired: true };
  }

  const map: Record<string, AmandaSequenceRecord> = {};
  for (const row of (data ?? []) as SequenceRow[]) {
    map[row.opportunity_id] = {
      id: row.id,
      opportunityId: row.opportunity_id,
      status: row.status as AmandaSequenceStatus,
      currentStep: row.current_step,
      nextSendAt: row.next_send_at,
      stoppedReason: row.stopped_reason,
      steps: asSteps(row.steps),
      toEmail: row.to_email,
    };
  }
  return { data: map, setupRequired: false };
}
