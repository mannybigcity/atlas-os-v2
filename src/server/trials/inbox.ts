import "server-only";

import {
  selectTrialInboxRows,
  trialInboxWindowStart,
  type TrialInboxCandidate,
  type TrialInboxRow,
} from "@/lib/lions-den/trial-inbox";
import { createServiceClient } from "@/lib/supabase/service";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

type ServiceClient = ReturnType<typeof createServiceClient>;

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

type MembershipRow = {
  user_id: string;
  role: string;
  organization_id: string;
};

type TrialProfileRow = {
  user_id: string;
  full_name: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

type BillingRow = {
  organization_id: string | null;
  provisioning_status: string | null;
};

export type { TrialInboxRow };

export async function getAfeTrialInbox(
  now = new Date(),
): Promise<WorkspaceQueryResult<TrialInboxRow[]>> {
  try {
    const service = createServiceClient();
    const cutoff = trialInboxWindowStart(now).toISOString();
    const organizations = await service
      .from("organizations")
      .select("id, name, slug, created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (organizations.error) {
      return { data: [], setupRequired: true, error: organizations.error.message };
    }

    const organizationRows = (organizations.data ?? []) as OrganizationRow[];
    if (organizationRows.length === 0) {
      return { data: [], setupRequired: false, error: null };
    }

    const organizationIds = organizationRows.map((row) => row.id);
    const memberships = await service
      .from("organization_memberships")
      .select("user_id, role, organization_id")
      .in("organization_id", organizationIds)
      .eq("role", "owner");

    if (memberships.error) {
      return { data: [], setupRequired: true, error: memberships.error.message };
    }

    const membershipRows = (memberships.data ?? []) as MembershipRow[];
    const userIds = [...new Set(membershipRows.map((row) => row.user_id))];
    const [owners, trialProfiles, billing] = await Promise.all([
      loadOwnerIdentities(service, userIds),
      loadTrialProfiles(service, userIds),
      loadLinkedBilling(service, organizationIds),
    ]);

    const orgById = new Map(organizationRows.map((row) => [row.id, row]));
    const candidates: TrialInboxCandidate[] = [];

    for (const membership of membershipRows) {
      const organization = orgById.get(membership.organization_id);
      if (!organization) continue;
      const owner = owners.get(membership.user_id);
      const profile = trialProfiles.get(membership.user_id);
      candidates.push({
        userId: membership.user_id,
        ownerName: owner?.fullName || profile?.full_name || null,
        email: owner?.email || null,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        organizationCreatedAt: organization.created_at,
        trialStartedAt: profile?.trial_started_at || null,
        trialEndsAt: profile?.trial_ends_at || null,
        membershipRole: membership.role,
        emailConfirmedAt: owner?.emailConfirmedAt || null,
        lastSignInAt: owner?.lastSignInAt || null,
        upgraded: billing.has(organization.id),
      });
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

async function loadOwnerIdentities(service: ServiceClient, userIds: string[]) {
  const owners = new Map<
    string,
    {
      email: string | null;
      fullName: string | null;
      emailConfirmedAt: string | null;
      lastSignInAt: string | null;
    }
  >();

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data, error } = await service.auth.admin.getUserById(userId);
        if (error || !data.user) return;
        const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
        const fullName = String(metadata.full_name ?? metadata.fullName ?? "").trim();
        owners.set(userId, {
          email: data.user.email ?? null,
          fullName: fullName || null,
          emailConfirmedAt: data.user.email_confirmed_at ?? null,
          lastSignInAt: data.user.last_sign_in_at ?? null,
        });
      } catch {
        // Leave the owner missing. The row can still render company + slug.
      }
    }),
  );

  return owners;
}

async function loadTrialProfiles(service: ServiceClient, userIds: string[]) {
  const profiles = new Map<string, TrialProfileRow>();
  if (userIds.length === 0) return profiles;

  try {
    const result = await service
      .from("atlas_trial_profiles")
      .select("user_id, full_name, trial_started_at, trial_ends_at")
      .in("user_id", userIds);
    if (result.error) return profiles;
    for (const row of (result.data ?? []) as TrialProfileRow[]) {
      profiles.set(row.user_id, row);
    }
  } catch {
    // Optional enrichment only.
  }

  return profiles;
}

async function loadLinkedBilling(service: ServiceClient, organizationIds: string[]) {
  const linked = new Set<string>();
  if (organizationIds.length === 0) return linked;

  try {
    const result = await service
      .from("atlas_billing_entitlements")
      .select("organization_id, provisioning_status")
      .in("organization_id", organizationIds);
    if (result.error) return linked;
    for (const row of (result.data ?? []) as BillingRow[]) {
      if (row.organization_id && row.provisioning_status === "linked") {
        linked.add(row.organization_id);
      }
    }
  } catch {
    // Missing billing table should not hide trial rows.
  }

  return linked;
}
