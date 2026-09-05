#!/usr/bin/env node
/**
 * Provision the isolated sample-desk Auth user and membership.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEMO_LOGIN_PASSWORD
 *
 * Optional:
 *   DEMO_LOGIN_EMAIL  (defaults to atlasforentrepreneurs+demo@gmail.com)
 *
 * Never set DEMO_LOGIN_EMAIL to atlasforentrepreneurs@gmail.com.
 * Do not commit passwords. Do not run this against production from CI.
 */

import { createClient } from "@supabase/supabase-js";

const SAMPLE_SLUG = "afe-crm-demo";
const SAMPLE_NAME = "Sample desk";
const DEFAULT_EMAIL = "atlasforentrepreneurs+demo@gmail.com";
const FOUNDER_MAILBOX = "atlasforentrepreneurs@gmail.com";

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function forbidden(email) {
  const value = normalizeEmail(email);
  return !value || value === FOUNDER_MAILBOX || value.endsWith("@atlasforentrepreneurs.com");
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const password = process.env.DEMO_LOGIN_PASSWORD?.trim();
  const requestedEmail = normalizeEmail(process.env.DEMO_LOGIN_EMAIL) || DEFAULT_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  if (!password) {
    throw new Error("DEMO_LOGIN_PASSWORD is required and must stay out of git.");
  }
  if (forbidden(requestedEmail)) {
    throw new Error("DEMO_LOGIN_EMAIL cannot be the founder mailbox or an Atlas-domain mailbox.");
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId = null;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => normalizeEmail(user.email) === requestedEmail);
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < 200) break;
  }

  if (!userId) {
    const created = await service.auth.admin.createUser({
      email: requestedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: SAMPLE_NAME, business_name: SAMPLE_NAME, sample_desk: true },
    });
    if (created.error || !created.data.user?.id) {
      throw new Error(created.error?.message ?? "Could not create the sample desk login.");
    }
    userId = created.data.user.id;
  } else {
    const updated = await service.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updated.error) throw new Error(updated.error.message);
  }

  const existingOrg = await service
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", SAMPLE_SLUG)
    .maybeSingle();
  if (existingOrg.error) throw new Error(existingOrg.error.message);

  let organizationId = existingOrg.data?.id;
  if (!organizationId) {
    const createdOrg = await service
      .from("organizations")
      .insert({ name: SAMPLE_NAME, slug: SAMPLE_SLUG })
      .select("id")
      .maybeSingle();
    if (createdOrg.error || !createdOrg.data?.id) {
      throw new Error(createdOrg.error?.message ?? "Could not create Sample desk.");
    }
    organizationId = createdOrg.data.id;
  }

  const memberships = await service
    .from("organization_memberships")
    .select("id, user_id")
    .eq("organization_id", organizationId);
  if (memberships.error) throw new Error(memberships.error.message);

  for (const row of memberships.data ?? []) {
    const { data, error } = await service.auth.admin.getUserById(String(row.user_id));
    if (error) continue;
    const email = normalizeEmail(data.user?.email);
    if (email !== requestedEmail) {
      const removed = await service.from("organization_memberships").delete().eq("id", row.id);
      if (removed.error) throw new Error(removed.error.message);
    }
  }

  const membership = await service.from("organization_memberships").upsert(
    { user_id: userId, organization_id: organizationId, role: "owner" },
    { onConflict: "organization_id,user_id" },
  );
  if (membership.error) throw new Error(membership.error.message);

  console.log(`Sample desk login ready for ${requestedEmail} on ${SAMPLE_SLUG}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
