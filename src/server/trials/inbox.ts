import "server-only";

import { selectTrialInboxRows, type TrialInboxCandidate, type TrialInboxRow } from "@/lib/lions-den/trial-inbox";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientAccessRoster, type WorkspaceQueryResult } from "@/server/organizations/queries";

type ServiceClient = ReturnType<typeof createServiceClient>;

type TrialProfileRow = {
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

type MembershipRow = {
  user_id: string;
  role: string;
  organization_id: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

export type { TrialInboxRow };

export async function getAfeTrialInbox(
  now = new Date(),
): Promise<WorkspaceQueryResult<TrialInboxRow[]>> {
  try {
    const service = createServiceClient();
    const profiles = await service
      .from("atlas_trial_profiles")
      .select("user_id, full_name, business_name, email, trial_started_at, trial_ends_at")
      .order("trial_started_at", { ascending: false });

    if (profiles.error) {
      return { data: [], setupRequired: true, error: profiles.error.message };
    }

    const profileRows = (profiles.data ?? []) as TrialProfileRow[];
    if (profileRows.length === 0) {
      return { data: [], setupRequired: false, error: null };
    }

    const userIds = [...new Set(profileRows.map((row) => row.user_id))];
    const memberships = await service
      .from("organization_memberships")
      .select("user_id, role, organization_id")
      .in("user_id", userIds)
      .eq("role", "owner");

    if (memberships.error) {
      return { data: [], setupRequired: true, error: memberships.error.message };
    }

    const membershipRows = (memberships.data ?? []) as MembershipRow[];
    const organizationIds = [...new Set(membershipRows.map((row) => row.organization_id))];
    const organizations = organizationIds.length
      ? await service.from("organizations").select("id, name, slug, created_at").in("id", organizationIds)
      : { data: [] as OrganizationRow[], error: null };

    if (organizations.error) {
      return { data: [], setupRequired: true, error: organizations.error.message };
    }

    const orgById = new Map(
      ((organizations.data ?? []) as OrganizationRow[]).map((row) => [row.id, row]),
    );
    const membershipsByUser = new Map<string, MembershipRow[]>();
    for (const membership of membershipRows) {
      const list = membershipsByUser.get(membership.user_id) ?? [];
      list.push(membership);
      membershipsByUser.set(membership.user_id, list);
    }

    const confirmByUser = await loadEmailConfirmations(service, userIds);
    const candidates: TrialInboxCandidate[] = [];

    for (const profile of profileRows) {
      const owned = membershipsByUser.get(profile.user_id) ?? [];
      for (const membership of owned) {
        const organization = orgById.get(membership.organization_id);
        if (!organization) continue;
        candidates.push({
          userId: profile.user_id,
          ownerName: profile.full_name,
          email: profile.email,
          businessName: profile.business_name,
          trialStartedAt: profile.trial_started_at,
          trialEndsAt: profile.trial_ends_at,
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          organizationCreatedAt: organization.created_at,
          membershipRole: membership.role,
          emailConfirmedAt: confirmByUser.get(profile.user_id) ?? null,
        });
      }
    }

    return {
      data: selectTrialInboxRows(candidates, now),
      setupRequired: false,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      setupRequired: true,
      error: error instanceof Error ? error.message : "trial_inbox_unavailable",
    };
  }
}

export async function getAfeTrialInboxCount(now = new Date()) {
  const inbox = await getAfeTrialInbox(now);
  if (inbox.setupRequired) return 0;
  return inbox.data.length;
}

async function loadEmailConfirmations(service: ServiceClient, userIds: string[]) {
  const confirmed = new Map<string, string | null>();

  try {
    const roster = await getClientAccessRoster();
    if (!roster.setupRequired) {
      for (const row of roster.data) {
        if (userIds.includes(row.userId)) {
          confirmed.set(row.userId, row.emailConfirmedAt);
        }
      }
    }
  } catch {
    // Roster is optional. Auth admin lookup below is the fallback.
  }

  const missing = userIds.filter((userId) => !confirmed.has(userId));
  await Promise.all(
    missing.map(async (userId) => {
      try {
        const { data, error } = await service.auth.admin.getUserById(userId);
        confirmed.set(userId, error ? null : data.user?.email_confirmed_at ?? null);
      } catch {
        confirmed.set(userId, null);
      }
    }),
  );

  return confirmed;
}
