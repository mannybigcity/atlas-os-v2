import "server-only";

import {
  AFE_CRM_DEMO_SLUG,
  SAMPLE_DESK_DISPLAY_NAME,
  isForbiddenSampleDeskLoginEmail,
  isSisOrganization,
  normalizeLoginEmail,
} from "@/lib/client-portal/identity";
import { upsertSampleDeskRecords } from "@/lib/lions-den/sample-desk";
import { getConfiguredDemoLoginEmail, getDemoLoginPassword } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

export function sampleDeskLoginUnavailableRedirect() {
  return "/login?error=sample_desk_unavailable";
}

export function sampleDeskSignInFailedRedirect() {
  return "/login?error=sample_desk_signin_failed";
}

export type SampleDeskSignInCredentials =
  | { ok: true; email: string; password: string }
  | { ok: false; reason: "missing_email" | "forbidden_email" | "missing_password" };

export function getSampleDeskSignInCredentials(): SampleDeskSignInCredentials {
  const email = getConfiguredDemoLoginEmail();
  const password = getDemoLoginPassword();
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }
  if (isForbiddenSampleDeskLoginEmail(email)) {
    return { ok: false, reason: "forbidden_email" };
  }
  if (!password) {
    return { ok: false, reason: "missing_password" };
  }
  return { ok: true, email, password };
}

async function findAuthUserIdByEmail(service: ServiceClient, email: string) {
  const { data, error } = await service.rpc("find_auth_user_id_by_email", {
    p_email: email,
  });

  if (!error) {
    return typeof data === "string" && data.length > 0 ? data : null;
  }

  if (error.code !== "42883" && !/does not exist/i.test(error.message ?? "")) {
    throw error;
  }

  for (let page = 1; page <= 10; page += 1) {
    const listed = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const match = listed.data.users.find((user) => normalizeLoginEmail(user.email) === email);
    if (match) return match.id;
    if (listed.data.users.length < 200) break;
  }

  return null;
}

async function ensureSampleOrganization(service: ServiceClient) {
  const existing = await service
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", AFE_CRM_DEMO_SLUG)
    .maybeSingle();
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data?.id) {
    if (isSisOrganization(existing.data)) {
      throw new Error("Sample desk slug cannot point at SIS Custom Creations.");
    }
    if (existing.data.name !== SAMPLE_DESK_DISPLAY_NAME) {
      const renamed = await service
        .from("organizations")
        .update({ name: SAMPLE_DESK_DISPLAY_NAME })
        .eq("id", existing.data.id);
      if (renamed.error) throw new Error(renamed.error.message);
    }
    return String(existing.data.id);
  }

  const created = await service
    .from("organizations")
    .insert({ name: SAMPLE_DESK_DISPLAY_NAME, slug: AFE_CRM_DEMO_SLUG })
    .select("id")
    .maybeSingle();
  if (created.error || !created.data?.id) {
    throw new Error(created.error?.message ?? "Could not create the sample desk organization.");
  }
  return String(created.data.id);
}

async function ensureSampleDeskMembership(service: ServiceClient, userId: string, organizationId: string) {
  const existing = await service
    .from("organization_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data?.id) return;

  const inserted = await service.from("organization_memberships").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "owner",
  });
  if (inserted.error) {
    throw new Error(inserted.error.message);
  }
}

async function detachSampleDeskFromForbiddenUsers(service: ServiceClient, organizationId: string) {
  const memberships = await service
    .from("organization_memberships")
    .select("id, user_id")
    .eq("organization_id", organizationId);
  if (memberships.error) {
    throw new Error(memberships.error.message);
  }

  for (const row of memberships.data ?? []) {
    const { data, error } = await service.auth.admin.getUserById(String(row.user_id));
    if (error) continue;
    const email = normalizeLoginEmail(data.user?.email);
    if (isForbiddenSampleDeskLoginEmail(email)) {
      await service.from("organization_memberships").delete().eq("id", row.id);
    }
  }
}

export async function ensureSampleDeskAccess(userId: string, email: string) {
  const normalized = normalizeLoginEmail(email);
  if (!normalized || isForbiddenSampleDeskLoginEmail(normalized)) {
    return { ok: false as const, reason: "forbidden_email" };
  }
  if (normalized !== getConfiguredDemoLoginEmail()) {
    return { ok: false as const, reason: "not_sample_login" };
  }

  const service = createServiceClient();
  const organizationId = await ensureSampleOrganization(service);
  await detachSampleDeskFromForbiddenUsers(service, organizationId);
  await upsertSampleDeskRecords(service);
  await ensureSampleDeskMembership(service, userId, organizationId);
  return { ok: true as const, organizationId };
}

export async function provisionSampleDeskLoginUser() {
  const credentials = getSampleDeskSignInCredentials();
  if (!credentials.ok) {
    return { ok: false as const, reason: credentials.reason };
  }

  const service = createServiceClient();
  let userId = await findAuthUserIdByEmail(service, credentials.email);

  if (!userId) {
    const created = await service.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: {
        full_name: SAMPLE_DESK_DISPLAY_NAME,
        business_name: SAMPLE_DESK_DISPLAY_NAME,
        sample_desk: true,
      },
    });
    if (created.error || !created.data.user?.id) {
      throw new Error(created.error?.message ?? "Could not create the sample desk login.");
    }
    userId = created.data.user.id;
  } else {
    const updated = await service.auth.admin.updateUserById(userId, {
      password: credentials.password,
      email_confirm: true,
    });
    if (updated.error) {
      throw new Error(updated.error.message);
    }
  }

  await ensureSampleDeskAccess(userId, credentials.email);
  return { ok: true as const, userId };
}
