import { normalizePhoneForHref } from "./contact-links.ts";

export const TRIAL_PROSPECT_SOURCE_LABEL = "7 Day Trial signup";
export const TRIAL_PROSPECT_OPPORTUNITY_TYPE = "customer" as const;

export type TrialProspectSource = {
  userId: string;
  fullName: string | null;
  businessName: string;
  email: string | null;
  phone: string | null;
  businessType: string | null;
  primaryGrowthGoal: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  organizationId: string;
  organizationSlug: string | null;
};

export type TrialProspectMetadata = {
  trial_user_id: string;
  trial_organization_id: string;
  trial_organization_slug: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  business_type: string | null;
  primary_growth_goal: string | null;
  no_outreach_sent: true;
  accepted_for_calling: boolean;
  linked_from: "trial_signup" | "trial_desk";
};

function clean(value: string | null | undefined, max: number) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function formatDay(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dueDay(startedAt: string | null | undefined) {
  const base = startedAt ? new Date(startedAt) : new Date();
  const ms = Number.isFinite(base.getTime()) ? base.getTime() : Date.now();
  return new Date(ms + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function trialProspectResearchSummary(source: TrialProspectSource) {
  const parts = [
    `Signed up for the 7-day trial${formatDay(source.trialStartedAt) ? ` on ${formatDay(source.trialStartedAt)}` : ""}.`,
    `Business: ${clean(source.businessName, 200) ?? "unknown"}${clean(source.businessType, 100) ? ` (${clean(source.businessType, 100)})` : ""}.`,
    clean(source.primaryGrowthGoal, 1000) ? `Goal in their words: ${clean(source.primaryGrowthGoal, 1000)}.` : null,
    source.organizationSlug ? `Trial workspace: ${source.organizationSlug}.` : null,
    "Atlas has not contacted them.",
  ].filter(Boolean);
  return parts.join(" ").slice(0, 3000);
}

export function trialProspectNextAction(source: TrialProspectSource) {
  const goal = clean(source.primaryGrowthGoal, 160);
  const callable = Boolean(normalizePhoneForHref(source.phone));
  if (!callable) {
    return "No usable phone on the trial form. Email them to welcome them and ask for a good number. Atlas has not contacted them.";
  }
  return `Welcome call within 24 hours.${goal ? ` Ask about: ${goal}.` : ""} Atlas has not contacted them.`.slice(0, 1200);
}

/**
 * Column values for a new organization_opportunities row in the founder's
 * operator desk, built from a trial signup. Pure so it can be unit tested.
 */
export function trialProspectInsertFields(
  source: TrialProspectSource,
  linkedFrom: TrialProspectMetadata["linked_from"],
) {
  const phone = clean(source.phone, 80);
  const callable = Boolean(normalizePhoneForHref(phone));
  const email = clean(source.email, 320)?.toLowerCase() ?? null;
  const contactName = clean(source.fullName, 180);
  const metadata: TrialProspectMetadata = {
    trial_user_id: source.userId,
    trial_organization_id: source.organizationId,
    trial_organization_slug: source.organizationSlug,
    trial_started_at: source.trialStartedAt,
    trial_ends_at: source.trialEndsAt,
    business_type: clean(source.businessType, 100),
    primary_growth_goal: clean(source.primaryGrowthGoal, 1000),
    no_outreach_sent: true,
    accepted_for_calling: callable,
    linked_from: linkedFrom,
  };

  return {
    name: (clean(source.businessName, 220) ?? "Trial signup").padEnd(2, "."),
    opportunity_type: TRIAL_PROSPECT_OPPORTUNITY_TYPE,
    stage: callable ? ("ready_for_follow_up" as const) : ("needs_client_input" as const),
    fit_score: 80,
    owner_role: "manual" as const,
    source_label: TRIAL_PROSPECT_SOURCE_LABEL,
    source_url: null,
    contact_name: contactName && contactName.length >= 2 ? contactName : null,
    contact_email: email && email.includes("@") && email.length >= 5 ? email : null,
    contact_phone: phone && phone.length >= 7 ? phone : null,
    contact_social: null,
    research_summary: trialProspectResearchSummary(source),
    fit_reason:
      "Warm inbound lead. They filled out the trial form and created their own workspace, so they already want help growing.",
    next_action: trialProspectNextAction(source),
    next_action_due: dueDay(source.trialStartedAt),
    metadata,
  };
}

/** Name variants tried in order when (organization, name, type) is already taken. */
export function trialProspectNameCandidates(source: TrialProspectSource) {
  const base = clean(source.businessName, 200) ?? "Trial signup";
  const owner = clean(source.fullName, 80);
  const slug = clean(source.organizationSlug, 80);
  return [
    base,
    owner ? `${base} · ${owner}` : null,
    slug ? `${base} (${slug})` : null,
    `${base} · ${source.userId.slice(0, 8)}`,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 220));
}

export function trialUserIdFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).trial_user_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function trialLinkFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const userId = trialUserIdFromMetadata(record);
  if (!userId) return null;
  const text = (key: string) => {
    const value = record[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  return {
    userId,
    organizationId: text("trial_organization_id"),
    organizationSlug: text("trial_organization_slug"),
    startedAt: text("trial_started_at"),
    endsAt: text("trial_ends_at"),
    businessType: text("business_type"),
    primaryGrowthGoal: text("primary_growth_goal"),
  };
}

export function trialDaysLeft(endsAt: string | null | undefined, now = new Date()) {
  if (!endsAt) return null;
  const ends = new Date(endsAt).getTime();
  if (!Number.isFinite(ends)) return null;
  return Math.max(0, Math.ceil((ends - now.getTime()) / (24 * 60 * 60 * 1000)));
}
