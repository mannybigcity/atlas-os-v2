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
  | { ok: false; error: "lookup_failed" | "create_failed" | "membership_failed" | "missing_identity" };

function cleanBusinessName(value: string) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}&.'’\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function logSupabaseError(scope: string, error: { code?: string; message?: string; details?: string; hint?: string }) {
  console.error(scope, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

async function findExistingMembershipOrganizationId(
  service: ServiceClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await service
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError("Atlas trial workspace membership lookup failed", error);
    return null;
  }

  const organizationId = data?.organization_id;
  return typeof organizationId === "string" && organizationId.length > 0 ? organizationId : null;
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
    if (error?.code !== "23505") {
      logSupabaseError("Atlas trial organization insert failed", error ?? { message: "unknown" });
      throw error ?? new Error("Could not create the trial workspace.");
    }
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
  const existingOrganizationId = await findExistingMembershipOrganizationId(service, input.userId);
  if (existingOrganizationId) {
    return { ok: true, organizationId: existingOrganizationId };
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
      const racedOrganizationId = await findExistingMembershipOrganizationId(service, input.userId);
      if (racedOrganizationId) {
        return { ok: true, organizationId: racedOrganizationId };
      }

      logSupabaseError("Atlas trial membership creation failed", insertMembershipError);
      return { ok: false, error: "membership_failed" };
    }

    return { ok: true, organizationId };
  } catch (error) {
    const racedOrganizationId = await findExistingMembershipOrganizationId(service, input.userId);
    if (racedOrganizationId) {
      return { ok: true, organizationId: racedOrganizationId };
    }

    if (error && typeof error === "object" && "code" in error) {
      logSupabaseError("Atlas trial workspace creation failed", error as { code?: string; message?: string });
    } else {
      console.error("Atlas trial workspace creation failed", error);
    }
    return { ok: false, error: "create_failed" };
  }
}
