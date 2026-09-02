import "server-only";

import {
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
  canEnsureAfeOperatorDesk,
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isSisOrganization,
} from "@/lib/client-portal/identity";
import { getConfiguredDemoLoginEmail, isSuperAdminEmail } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAfeOperatorDeskOrganization,
  type OrganizationSummary,
} from "@/server/organizations/queries";

function asOrganizationSummary(row: {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  created_at?: unknown;
}): OrganizationSummary | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const organization = {
    id,
    name: String(row.name ?? AFE_OPERATOR_DESK_NAME),
    slug: row.slug == null ? AFE_OPERATOR_DESK_SLUG : String(row.slug),
    createdAt: String(row.created_at ?? ""),
  };
  if (isSisOrganization(organization) || isAfeCrmDemoOrganization(organization)) {
    return null;
  }
  if (!isAfeOperatorDeskOrganization(organization)) {
    return null;
  }
  return organization;
}

export async function ensureAfeOperatorDeskOrganization(): Promise<OrganizationSummary | null> {
  const existing = await getAfeOperatorDeskOrganization();
  if (existing?.id) return existing;

  try {
    const admin = createAdminClient();
    const found = await admin
      .from("organizations")
      .select("id, name, slug, created_at")
      .eq("slug", AFE_OPERATOR_DESK_SLUG)
      .maybeSingle();
    if (found.data) {
      return asOrganizationSummary(found.data as Record<string, unknown>);
    }

    const created = await admin
      .from("organizations")
      .insert({ name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG })
      .select("id, name, slug, created_at")
      .maybeSingle();
    if (created.data) {
      return asOrganizationSummary(created.data as Record<string, unknown>);
    }
  } catch (error) {
    console.error("Atlas operator desk lookup failed", error);
  }

  return null;
}

export async function ensureAfeOperatorDeskAccess(
  userId: string,
  email?: string | null,
): Promise<OrganizationSummary | null> {
  if (!canEnsureAfeOperatorDesk(email, getConfiguredDemoLoginEmail(), isSuperAdminEmail(email))) {
    return null;
  }

  const organization = await ensureAfeOperatorDeskOrganization();
  if (!organization?.id) return null;

  try {
    const admin = createAdminClient();
    const existing = await admin
      .from("organization_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!existing.data?.id) {
      const inserted = await admin.from("organization_memberships").insert({
        user_id: userId,
        organization_id: organization.id,
        role: "owner",
      });
      if (inserted.error && inserted.error.code !== "23505") {
        console.error("Atlas operator desk membership ensure failed", inserted.error.message);
      }
    }
  } catch (error) {
    console.error("Atlas operator desk membership ensure failed", error);
  }

  return organization;
}
