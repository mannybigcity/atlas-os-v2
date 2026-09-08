"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function safeReturnTo(formData: FormData, fallback = "/lions-den/trials") {
  const value = field(formData, "returnTo", 200);
  return value && value.startsWith("/lions-den") && !value.includes("?") ? value : fallback;
}

function redirectWithStatus(path: string, code: string): never {
  redirect(`${path}?trial=${encodeURIComponent(code)}`);
}

export async function extendTrial(formData: FormData) {
  await requireSuperAdmin("/lions-den/trials");
  const returnTo = safeReturnTo(formData);
  const userId = field(formData, "userId", 36);
  const days = Number(field(formData, "days", 3) ?? "7");

  if (!userId || !uuidPattern.test(userId) || !Number.isInteger(days) || days < 1 || days > 30) {
    redirectWithStatus(returnTo, "invalid_extension");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("extend_atlas_trial", {
    p_user_id: userId,
    p_days: days,
  });

  if (error) {
    console.error("Atlas trial extension failed", { code: error.code });
    redirectWithStatus(returnTo, error.code === "22023" ? "already_converted" : "extend_failed");
  }

  redirectWithStatus(returnTo, "extended");
}

export async function convertTrialToClient(formData: FormData) {
  await requireSuperAdmin("/lions-den/trials");
  const returnTo = safeReturnTo(formData);
  const userId = field(formData, "userId", 36);
  const organizationName = field(formData, "organizationName", 200);

  if (!userId || !uuidPattern.test(userId)) {
    redirectWithStatus(returnTo, "invalid_request");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("convert_atlas_trial_to_client", {
    p_user_id: userId,
    p_organization_name: organizationName,
  });

  if (error) {
    console.error("Atlas trial conversion failed", { code: error.code });
    redirectWithStatus(returnTo, error.code === "22023" ? "already_converted" : "convert_failed");
  }

  redirectWithStatus(returnTo, "converted");
}

export async function syncTrialToCrm(formData: FormData) {
  await requireSuperAdmin("/lions-den/trials");
  const returnTo = safeReturnTo(formData);
  const userId = field(formData, "userId", 36);

  if (!userId || !uuidPattern.test(userId)) {
    redirectWithStatus(returnTo, "invalid_request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("atlas_admin_sync_trial_prospect", {
    p_user_id: userId,
  });

  if (error || !data) {
    console.error("Atlas trial CRM sync failed", { code: error?.code });
    redirectWithStatus(returnTo, "sync_failed");
  }

  redirect(`/lions-den/sales/${data}?crm=trial_linked`);
}
