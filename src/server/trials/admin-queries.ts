import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type TrialStage =
  | "pending_confirmation"
  | "active"
  | "expiring"
  | "expired"
  | "converted";

export type TrialRosterEntry = {
  userId: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  businessType: string;
  primaryGrowthGoal: string;
  trialStartedAt: string;
  trialEndsAt: string;
  extensionCount: number;
  convertedOrganizationId: string | null;
  convertedOrganizationSlug: string | null;
  convertedAt: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  prospectId: string | null;
  prospectStatus: string | null;
  prospectNextAction: string | null;
  prospectNextActionAt: string | null;
  prospectLastContactedAt: string | null;
  daysLeft: number;
  stage: TrialStage;
};

type TrialRosterRow = {
  user_id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  business_type: string;
  primary_growth_goal: string;
  trial_started_at: string;
  trial_ends_at: string;
  extension_count: number;
  converted_organization_id: string | null;
  converted_organization_slug: string | null;
  converted_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  prospect_id: string | null;
  prospect_status: string | null;
  prospect_next_action: string | null;
  prospect_next_action_at: string | null;
  prospect_last_contacted_at: string | null;
};

const DAY_MS = 86_400_000;

export function trialStage(
  row: Pick<TrialRosterRow, "trial_ends_at" | "converted_organization_id" | "email_confirmed_at">,
  now: number,
): { stage: TrialStage; daysLeft: number } {
  const daysLeft = Math.ceil((new Date(row.trial_ends_at).getTime() - now) / DAY_MS);

  if (row.converted_organization_id) return { stage: "converted", daysLeft };
  if (daysLeft <= 0) return { stage: "expired", daysLeft: 0 };
  if (!row.email_confirmed_at) return { stage: "pending_confirmation", daysLeft };
  if (daysLeft <= 2) return { stage: "expiring", daysLeft };
  return { stage: "active", daysLeft };
}

function mapRow(row: TrialRosterRow, now: number): TrialRosterEntry {
  const { stage, daysLeft } = trialStage(row, now);

  return {
    userId: row.user_id,
    fullName: row.full_name,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    businessType: row.business_type,
    primaryGrowthGoal: row.primary_growth_goal,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    extensionCount: row.extension_count,
    convertedOrganizationId: row.converted_organization_id,
    convertedOrganizationSlug: row.converted_organization_slug,
    convertedAt: row.converted_at,
    emailConfirmedAt: row.email_confirmed_at,
    lastSignInAt: row.last_sign_in_at,
    prospectId: row.prospect_id,
    prospectStatus: row.prospect_status,
    prospectNextAction: row.prospect_next_action,
    prospectNextActionAt: row.prospect_next_action_at,
    prospectLastContactedAt: row.prospect_last_contacted_at,
    daysLeft,
    stage,
  };
}

export async function getTrialRoster(): Promise<WorkspaceQueryResult<TrialRosterEntry[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_atlas_trial_roster");

  if (error) {
    return { data: [], setupRequired: true, error: error.message };
  }

  const now = Date.now();
  return {
    data: ((data ?? []) as TrialRosterRow[]).map((row) => mapRow(row, now)),
    setupRequired: false,
    error: null,
  };
}

export async function getTrialForUser(
  userId: string,
): Promise<WorkspaceQueryResult<TrialRosterEntry | null>> {
  const roster = await getTrialRoster();

  if (roster.setupRequired) {
    return { data: null, setupRequired: true, error: roster.error };
  }

  return {
    data: roster.data.find((entry) => entry.userId === userId) ?? null,
    setupRequired: false,
    error: null,
  };
}
