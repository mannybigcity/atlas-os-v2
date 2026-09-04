import "server-only";

import { assertNotProvisioningProtectedOrganization } from "@/lib/client-portal/protected-organization";
import { createServiceClient } from "@/lib/supabase/service";
import {
  nextWorkspaceSlugCandidate,
  workspaceSlugFromIdentity,
} from "@/server/stripe/paid-workspace-identity";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type TrialWorkspaceInput = {
  userId: string;
  businessName: string;
  email: string;
};

export type TrialWorkspaceResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

function cleanBusinessName(value: string) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}&.'’\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function createUniqueOrganization(service: ServiceClient, name: string, desiredSlug: string) {
  assertNotProvisioningProtectedOrganization({ name, slug: desiredSlug });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = nextWorkspaceSlugCandidate(desiredSlug, attempt);
    const { data, error } = await service
      .from("organizations")
      .insert({ name, slug })
      .select("id")
      .single();

    if (!error && data?.id) return data.id as string;
    if (error?.code !== "23505") throw error ?? new Error("Could not create the trial workspace.");
  }

  throw new Error("Could not allocate a unique trial workspace slug.");
}

export async function ensureTrialWorkspace(input: TrialWorkspaceInput): Promise<TrialWorkspaceResult> {
  const businessName = cleanBusinessName(input.businessName);
  const email = String(input.email ?? "").trim().toLowerCase();

  if (!businessName || !email) {
    return { ok: false, error: "missing_identity" };
  }

  const service = createServiceClient();
  const { data: memberships, error: membershipError } = await service
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) {
    console.error("Atlas trial workspace lookup failed", { code: membershipError.code });
    return { ok: false, error: "lookup_failed" };
  }

  if (memberships?.[0]?.organization_id) {
    return { ok: true, organizationId: memberships[0].organization_id as string };
  }

  const desiredSlug = workspaceSlugFromIdentity({
    name: businessName,
    email,
    uniqueness: input.userId.slice(0, 8),
  });

  try {
    const organizationId = await createUniqueOrganization(service, businessName, desiredSlug);
    const { error: insertMembershipError } = await service.from("organization_memberships").insert({
      organization_id: organizationId,
      user_id: input.userId,
      role: "owner",
    });

    if (insertMembershipError) {
      const raced = await service
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (raced.data?.organization_id) {
        return { ok: true, organizationId: raced.data.organization_id as string };
      }

      console.error("Atlas trial membership creation failed", { code: insertMembershipError.code });
      return { ok: false, error: "membership_failed" };
    }

    return { ok: true, organizationId };
  } catch (error) {
    console.error("Atlas trial workspace creation failed", error);
    return { ok: false, error: "create_failed" };
  }
}
