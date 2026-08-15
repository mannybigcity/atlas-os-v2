"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ClientAccessRow = {
  organization_id: string;
  user_id: string;
  email: string;
};

function redirectWithAccessStatus(status: string): never {
  redirect(`/lions-den?access=${encodeURIComponent(status)}`);
}

export async function assignClientMembership(formData: FormData) {
  await requireSuperAdmin("/lions-den");

  const organizationId = String(
    formData.get("organizationId") ?? "",
  ).trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "member").trim();

  if (
    !uuidPattern.test(organizationId) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !["owner", "admin", "member"].includes(role)
  ) {
    redirectWithAccessStatus("invalid_membership");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_atlas_client_membership", {
    p_email: email,
    p_organization_id: organizationId,
    p_role: role,
  });

  if (error) {
    console.error("Atlas client membership assignment failed", {
      code: error.code,
      organizationId,
    });
    redirectWithAccessStatus(
      error.code === "P0002" ? "auth_user_not_found" : "membership_failed",
    );
  }

  redirectWithAccessStatus("membership_linked");
}

export async function sendClientLoginEmail(formData: FormData) {
  await requireSuperAdmin("/lions-den");

  const organizationId = String(
    formData.get("organizationId") ?? "",
  ).trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (
    !uuidPattern.test(organizationId) ||
    !uuidPattern.test(userId) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    redirectWithAccessStatus("invalid_request");
  }

  const supabase = await createClient();
  const { data: roster, error: rosterError } = await supabase.rpc(
    "get_atlas_client_access_roster",
  );
  const verifiedMember = ((roster ?? []) as ClientAccessRow[]).find(
    (row) =>
      row.organization_id === organizationId &&
      row.user_id === userId &&
      row.email.toLowerCase() === email,
  );

  if (rosterError || !verifiedMember) {
    redirectWithAccessStatus("membership_not_verified");
  }

  const requestHeaders = await headers();
  const origin = getSiteUrl(requestHeaders.get("origin"));
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/set-password`,
  });

  if (error) {
    console.error("Atlas client access email request failed", {
      code: error.code,
      status: error.status,
      organizationId,
      userId,
    });
    redirectWithAccessStatus("delivery_failed");
  }

  redirectWithAccessStatus("sent");
}
