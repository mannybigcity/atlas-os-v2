import {
  AFE_CRM_DEMO_SLUG,
  escapeIlikeExact,
  findOrganizationByPreviewSlug,
  isAfeCrmDemoOrganization,
  isAfeCrmDemoSlug,
  isSisOrganization,
  isSisWorkspaceSlug,
  organizationSlugsMatch,
} from "@/lib/client-portal/identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
};

export type MembershipSummary = {
  id: string;
  role: "owner" | "admin" | "member";
  organization: OrganizationSummary | null;
};

export type ClientAccessSummary = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  membershipRole: "owner" | "admin" | "member";
  userId: string;
  email: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
};

export type WorkspaceQueryResult<T> =
  | {
      data: T;
      setupRequired: false;
      error: null;
    }
  | {
      data: T;
      setupRequired: true;
      error: string;
    };

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

type MembershipRow = {
  id: string;
  role: "owner" | "admin" | "member";
  organizations: OrganizationRow | OrganizationRow[] | null;
};

type ClientAccessRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  membership_role: "owner" | "admin" | "member";
  user_id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
};

function normalizeOrganization(row: OrganizationRow): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  };
}

function getRelatedOrganization(
  value: MembershipRow["organizations"],
): OrganizationRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getUserMemberships(
  userId: string,
): Promise<WorkspaceQueryResult<MembershipSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      `
        id,
        role,
        organizations (
          id,
          name,
          slug,
          created_at
        )
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as MembershipRow[]).map((membership) => {
      const organization = getRelatedOrganization(membership.organizations);

      return {
        id: membership.id,
        role: membership.role,
        organization: organization ? normalizeOrganization(organization) : null,
      };
    }),
    setupRequired: false,
    error: null,
  };
}

function withoutSampleDesk(organizations: OrganizationSummary[]) {
  return organizations.filter((organization) => !isAfeCrmDemoOrganization(organization));
}

export async function getOrganizationsForSuperAdmin(): Promise<
  WorkspaceQueryResult<OrganizationSummary[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: withoutSampleDesk(((data ?? []) as OrganizationRow[]).map(normalizeOrganization)),
    setupRequired: false,
    error: null,
  };
}

async function lookupOrganizationBySlug(
  client: { from: (table: string) => any },
  requested: string,
): Promise<OrganizationSummary | null> {
  const { data, error } = await client
    .from("organizations")
    .select("id, name, slug, created_at")
    .eq("slug", requested)
    .maybeSingle();

  if (!error && data) {
    return normalizeOrganization(data as OrganizationRow);
  }

  const insensitive = await client
    .from("organizations")
    .select("id, name, slug, created_at")
    .ilike("slug", escapeIlikeExact(requested))
    .limit(5);

  if (!insensitive.error) {
    const rows = (insensitive.data ?? []) as OrganizationRow[];
    const match =
      rows.find((row) => organizationSlugsMatch(row.slug, requested)) ??
      (isSisWorkspaceSlug(requested)
        ? rows.find((row) => isSisOrganization(row))
        : undefined) ??
      rows[0];
    if (match) {
      return normalizeOrganization(match);
    }
  }

  return null;
}

function pickOrganizationFromDirectory(
  requested: string,
  organizations: OrganizationSummary[],
) {
  return (
    findOrganizationByPreviewSlug(requested, organizations) ??
    (isSisWorkspaceSlug(requested)
      ? organizations.find((organization) => isSisOrganization(organization))
      : undefined) ??
    (isAfeCrmDemoSlug(requested)
      ? organizations.find((organization) => isAfeCrmDemoOrganization(organization))
      : undefined) ??
    null
  );
}

export async function listOrganizationsForOperator(): Promise<OrganizationSummary[]> {
  const viaUser = await getOrganizationsForSuperAdmin();
  if (!viaUser.setupRequired && viaUser.data.some((organization) => organization.id)) {
    const missingProtectedDesk = !viaUser.data.some((organization) => isSisOrganization(organization));
    if (missingProtectedDesk) {
      const viaAdmin = withoutSampleDesk(await listOrganizationsWithServiceRole());
      if (viaAdmin.some((organization) => isSisOrganization(organization))) {
        return viaAdmin;
      }
    }
    return withoutSampleDesk(viaUser.data);
  }

  const viaAdmin = withoutSampleDesk(await listOrganizationsWithServiceRole());
  return viaAdmin.length > 0 ? viaAdmin : withoutSampleDesk(viaUser.data);
}

async function listOrganizationsWithServiceRole(): Promise<OrganizationSummary[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });
    if (error || !data) {
      return [];
    }
    return (data as OrganizationRow[]).map(normalizeOrganization);
  } catch {
    return [];
  }
}

export async function getOrganizationBySlugForSuperAdmin(
  slug: string,
): Promise<WorkspaceQueryResult<OrganizationSummary | null>> {
  const requested = slug.trim();
  const supabase = await createClient();
  const fromUser = await lookupOrganizationBySlug(supabase, requested);
  if (fromUser) {
    return {
      data: fromUser,
      setupRequired: false,
      error: null,
    };
  }

  try {
    const fromAdminSlug = await lookupOrganizationBySlug(createAdminClient(), requested);
    if (fromAdminSlug) {
      return {
        data: fromAdminSlug,
        setupRequired: false,
        error: null,
      };
    }
  } catch {
    // Service-role lookup is best-effort; fall through to directory scans.
  }

  const organizations = await getOrganizationsForSuperAdmin();
  if (!organizations.setupRequired) {
    const fallback = pickOrganizationFromDirectory(requested, organizations.data);
    if (fallback) {
      return {
        data: fallback,
        setupRequired: false,
        error: null,
      };
    }
  }

  const viaAdmin = await listOrganizationsWithServiceRole();
  if (viaAdmin.length > 0) {
    const fromAdminDirectory = pickOrganizationFromDirectory(requested, viaAdmin);
    if (fromAdminDirectory) {
      return {
        data: fromAdminDirectory,
        setupRequired: false,
        error: null,
      };
    }
  }

  if (organizations.setupRequired && viaAdmin.length === 0) {
    return {
      data: null,
      setupRequired: true,
      error: organizations.error,
    };
  }

  return {
    data: null,
    setupRequired: false,
    error: null,
  };
}

export async function getAfeCrmDemoOrganization(): Promise<OrganizationSummary | null> {
  const bySlug = await getOrganizationBySlugForSuperAdmin(AFE_CRM_DEMO_SLUG);
  if (
    bySlug.data?.id &&
    !isSisOrganization(bySlug.data) &&
    (isAfeCrmDemoOrganization(bySlug.data) ||
      organizationSlugsMatch(bySlug.data.slug, AFE_CRM_DEMO_SLUG))
  ) {
    return bySlug.data;
  }

  const directory = await listOrganizationsForOperator();
  return (
    directory.find(
      (organization) =>
        Boolean(organization.id) &&
        !isSisOrganization(organization) &&
        isAfeCrmDemoOrganization(organization),
    ) ?? null
  );
}

export async function getClientAccessRoster(): Promise<
  WorkspaceQueryResult<ClientAccessSummary[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_atlas_client_access_roster",
  );

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as ClientAccessRow[]).map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationSlug: row.organization_slug,
      membershipRole: row.membership_role,
      userId: row.user_id,
      email: row.email,
      emailConfirmedAt: row.email_confirmed_at,
      lastSignInAt: row.last_sign_in_at,
    })),
    setupRequired: false,
    error: null,
  };
}
