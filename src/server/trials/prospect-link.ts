import "server-only";

import {
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
} from "@/lib/client-portal/identity";
import {
  isExcludedTrialInboxEmail,
  isExcludedTrialInboxOrganization,
} from "@/lib/lions-den/trial-inbox";
import {
  trialProspectInsertFields,
  trialProspectNameCandidates,
  type TrialProspectMetadata,
  type TrialProspectSource,
} from "@/lib/lions-den/trial-prospect";
import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type TrialProspectLink = { id: string; stage: string };

export type TrialProspectLinkResult =
  | { ok: true; prospectId: string; created: boolean }
  | {
      ok: false;
      error:
        | "operator_desk_missing"
        | "trial_profile_missing"
        | "trial_organization_missing"
        | "excluded"
        | "insert_failed";
      detail?: string;
    };

/**
 * The founder's own CRM lives in the atlas-for-entrepreneurs workspace.
 * Trial leads are written there so they show up on the Prospects and
 * Follow-up desks next to HUNTER finds.
 */
export async function findOperatorDeskOrganizationId(service: ServiceClient) {
  const found = await service
    .from("organizations")
    .select("id")
    .eq("slug", AFE_OPERATOR_DESK_SLUG)
    .maybeSingle();
  if (found.data?.id) return String(found.data.id);
  if (found.error) {
    console.error("Atlas operator desk lookup failed", found.error.message);
    return null;
  }

  const created = await service
    .from("organizations")
    .insert({ name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG })
    .select("id")
    .maybeSingle();
  if (created.data?.id) return String(created.data.id);
  if (created.error?.code === "23505") {
    const retry = await service
      .from("organizations")
      .select("id")
      .eq("slug", AFE_OPERATOR_DESK_SLUG)
      .maybeSingle();
    if (retry.data?.id) return String(retry.data.id);
  }
  console.error("Atlas operator desk create failed", created.error?.message);
  return null;
}

export async function loadTrialProspectLinks(
  service: ServiceClient,
  operatorDeskId: string,
  userIds: string[],
) {
  const links = new Map<string, TrialProspectLink>();
  if (userIds.length === 0) return links;

  const { data, error } = await service
    .from("organization_opportunities")
    .select("id, stage, metadata")
    .eq("organization_id", operatorDeskId)
    .in("metadata->>trial_user_id", userIds);

  if (error) {
    console.error("Atlas trial prospect link lookup failed", error.message);
    return links;
  }

  for (const row of (data ?? []) as Array<{ id: string; stage: string; metadata: unknown }>) {
    const metadata = (row.metadata ?? {}) as Partial<TrialProspectMetadata>;
    const userId = String(metadata.trial_user_id ?? "").trim();
    if (userId && !links.has(userId)) {
      links.set(userId, { id: row.id, stage: row.stage });
    }
  }
  return links;
}

async function findTrialProspect(service: ServiceClient, operatorDeskId: string, userId: string) {
  const links = await loadTrialProspectLinks(service, operatorDeskId, [userId]);
  return links.get(userId) ?? null;
}

async function loadTrialSource(
  service: ServiceClient,
  userId: string,
  organizationId: string,
): Promise<
  | { ok: true; source: TrialProspectSource }
  | { ok: false; error: "trial_profile_missing" | "trial_organization_missing" | "excluded" }
> {
  const [profile, organization] = await Promise.all([
    service
      .from("atlas_trial_profiles")
      .select(
        "user_id, full_name, business_name, email, phone, business_type, primary_growth_goal, trial_started_at, trial_ends_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    service
      .from("organizations")
      .select("id, name, slug, created_at")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (!organization.data) return { ok: false, error: "trial_organization_missing" };
  const organizationRow = organization.data as {
    id: string;
    name: string;
    slug: string | null;
    created_at: string;
  };
  if (isExcludedTrialInboxOrganization(organizationRow)) return { ok: false, error: "excluded" };

  const profileRow = profile.data as
    | {
        full_name: string | null;
        business_name: string | null;
        email: string | null;
        phone: string | null;
        business_type: string | null;
        primary_growth_goal: string | null;
        trial_started_at: string | null;
        trial_ends_at: string | null;
      }
    | null;

  let email = profileRow?.email ?? null;
  let fullName = profileRow?.full_name ?? null;
  if (!email || !fullName) {
    try {
      const { data } = await service.auth.admin.getUserById(userId);
      const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      email = email || data.user?.email || null;
      fullName = fullName || String(metadata.full_name ?? metadata.fullName ?? "").trim() || null;
    } catch {
      // The row can still be created from the organization + profile.
    }
  }

  if (!profileRow && !email) return { ok: false, error: "trial_profile_missing" };
  if (isExcludedTrialInboxEmail(email)) return { ok: false, error: "excluded" };

  return {
    ok: true,
    source: {
      userId,
      fullName,
      businessName: profileRow?.business_name?.trim() || organizationRow.name,
      email,
      phone: profileRow?.phone ?? null,
      businessType: profileRow?.business_type ?? null,
      primaryGrowthGoal: profileRow?.primary_growth_goal ?? null,
      trialStartedAt: organizationRow.created_at || profileRow?.trial_started_at || null,
      trialEndsAt: profileRow?.trial_ends_at ?? null,
      organizationId: organizationRow.id,
      organizationSlug: organizationRow.slug,
    },
  };
}

/**
 * Idempotently make sure a trial signup has a prospect row in the founder's
 * operator desk. Safe to call from provisioning and from the trial desk button.
 */
export async function ensureTrialProspect(
  input: {
    userId: string;
    organizationId: string;
    linkedFrom: TrialProspectMetadata["linked_from"];
  },
  service: ServiceClient = createServiceClient(),
): Promise<TrialProspectLinkResult> {
  const operatorDeskId = await findOperatorDeskOrganizationId(service);
  if (!operatorDeskId) return { ok: false, error: "operator_desk_missing" };
  if (operatorDeskId === input.organizationId) return { ok: false, error: "excluded" };

  const existing = await findTrialProspect(service, operatorDeskId, input.userId);
  if (existing) return { ok: true, prospectId: existing.id, created: false };

  const loaded = await loadTrialSource(service, input.userId, input.organizationId);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const fields = trialProspectInsertFields(loaded.source, input.linkedFrom);
  let lastError: string | undefined;

  for (const name of trialProspectNameCandidates(loaded.source)) {
    const inserted = await service
      .from("organization_opportunities")
      .insert({ ...fields, name, organization_id: operatorDeskId })
      .select("id")
      .single();

    if (!inserted.error && inserted.data?.id) {
      const prospectId = String(inserted.data.id);
      await service.from("organization_opportunity_events").insert({
        opportunity_id: prospectId,
        organization_id: operatorDeskId,
        event_type: "created",
        actor_role: "manual",
        summary:
          input.linkedFrom === "trial_signup"
            ? "7-day trial signup landed in Prospects automatically. Atlas has not contacted them."
            : "Added to Prospects from the 7 Day Trial desk. Atlas has not contacted them.",
        body: fields.research_summary,
      });
      return { ok: true, prospectId, created: true };
    }

    lastError = inserted.error?.message;
    if (inserted.error?.code !== "23505") break;

    // A concurrent call may have linked this trial while we were inserting.
    const raced = await findTrialProspect(service, operatorDeskId, input.userId);
    if (raced) return { ok: true, prospectId: raced.id, created: false };
  }

  console.error("Atlas trial prospect insert failed", { userId: input.userId, error: lastError });
  return { ok: false, error: "insert_failed", detail: lastError };
}
