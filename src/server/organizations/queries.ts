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
