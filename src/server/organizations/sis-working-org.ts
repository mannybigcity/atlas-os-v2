import "server-only";

import {
  SIS_LIONS_DEN_PREVIEW_SLUG,
  SIS_WORKING_ORG_NAME,
  canEnsureSisWorkingOrg,
  isAfeCrmDemoOrganization,
  isSisOrganization,
} from "@/lib/client-portal/identity";
import { getConfiguredDemoLoginEmail } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSisProtectedOrganization,
  type OrganizationSummary,
} from "@/server/organizations/queries";

function asSisOrganizationSummary(row: {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  created_at?: unknown;
}): OrganizationSummary | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const organization = {
    id,
    name: String(row.name ?? SIS_WORKING_ORG_NAME),
    slug: row.slug == null ? SIS_LIONS_DEN_PREVIEW_SLUG : String(row.slug),
    createdAt: String(row.created_at ?? ""),
  };
  if (isAfeCrmDemoOrganization(organization)) return null;
  if (!isSisOrganization(organization)) return null;
  return organization;
}

async function lookupSisOrganization(): Promise<OrganizationSummary | null> {
  const existing = await getSisProtectedOrganization();
  if (existing?.id && isSisOrganization(existing) && !isAfeCrmDemoOrganization(existing)) {
    return existing;
  }

  try {
    const admin = createAdminClient();
    const bySlug = await admin
      .from("organizations")
      .select("id, name, slug, created_at")
      .eq("slug", SIS_LIONS_DEN_PREVIEW_SLUG)
      .maybeSingle();
    if (bySlug.data) {
      const matched = asSisOrganizationSummary(bySlug.data as Record<string, unknown>);
      if (matched) return matched;
    }

    const listed = await admin
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    const match = ((listed.data ?? []) as Array<Record<string, unknown>>).find((row) =>
      isSisOrganization({
        name: String(row.name ?? ""),
        slug: row.slug == null ? null : String(row.slug),
      }),
    );
    if (match) {
      return asSisOrganizationSummary(match);
    }
  } catch (error) {
    console.error("SIS working org lookup failed", error);
  }

  return null;
}

export async function ensureSisWorkingOrganization(): Promise<OrganizationSummary | null> {
  const existing = await lookupSisOrganization();
  if (existing?.id) return existing;

  try {
    const admin = createAdminClient();
    const created = await admin
      .from("organizations")
      .insert({ name: SIS_WORKING_ORG_NAME, slug: SIS_LIONS_DEN_PREVIEW_SLUG })
      .select("id, name, slug, created_at")
      .maybeSingle();
    if (created.data) {
      return asSisOrganizationSummary(created.data as Record<string, unknown>);
    }
    if (created.error?.code === "23505") {
      return lookupSisOrganization();
    }
    if (created.error) {
      console.error("SIS working org create failed", created.error.message);
    }
  } catch (error) {
    console.error("SIS working org create failed", error);
  }

  return lookupSisOrganization();
}

export async function ensureSisWorkingOrgAccess(
  userId: string,
  email?: string | null,
): Promise<OrganizationSummary | null> {
  if (!canEnsureSisWorkingOrg(email, getConfiguredDemoLoginEmail())) {
    return null;
  }

  const organization = await ensureSisWorkingOrganization();
  if (!organization?.id || isAfeCrmDemoOrganization(organization) || !isSisOrganization(organization)) {
    return null;
  }

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
        console.error("SIS working org membership ensure failed", inserted.error.message);
      }
    }
  } catch (error) {
    console.error("SIS working org membership ensure failed", error);
  }

  return organization;
}
