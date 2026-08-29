import {
  escapeIlikeExact,
  findOrganizationByPreviewSlug,
  organizationSlugsMatch,
} from "@/lib/client-portal/identity";
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
    data: ((data ?? []) as OrganizationRow[]).map(normalizeOrganization),
    setupRequired: false,
    error: null,
  };
}

export async function getOrganizationBySlugForSuperAdmin(
  slug: string,
): Promise<WorkspaceQueryResult<OrganizationSummary | null>> {
  const requested = slug.trim();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .eq("slug", requested)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      setupRequired: true,
      error: error.message,
    };
  }

  if (data) {
    return {
      data: normalizeOrganization(data as OrganizationRow),
      setupRequired: false,
      error: null,
    };
  }

  const insensitive = await supabase
    .from("organizations")
    .select("id, name, slug, created_at")
    .ilike("slug", escapeIlikeExact(requested))
    .limit(2);

  if (!insensitive.error) {
    const rows = (insensitive.data ?? []) as OrganizationRow[];
    const match =
      rows.find((row) => organizationSlugsMatch(row.slug, requested)) ?? rows[0];
    if (match) {
      return {
        data: normalizeOrganization(match),
        setupRequired: false,
        error: null,
      };
    }
  }

  const organizations = await getOrganizationsForSuperAdmin();
  if (organizations.setupRequired) {
    return {
      data: null,
      setupRequired: true,
      error: organizations.error,
    };
  }

  const fallback = findOrganizationByPreviewSlug(requested, organizations.data);
  return {
    data: fallback ?? null,
    setupRequired: false,
    error: null,
  };
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
