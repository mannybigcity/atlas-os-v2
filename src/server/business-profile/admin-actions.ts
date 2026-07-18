"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(formData: FormData, key: string, maxLength = 10000) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value.slice(0, maxLength) : null;
}

export async function saveAdminBusinessProfile(formData: FormData) {
  await requireSuperAdmin("/lions-den");
  const organizationId = String(
    formData.get("organizationId") ?? "",
  ).trim();

  if (!uuidPattern.test(organizationId)) {
    redirect("/lions-den?profile=invalid#client-intelligence");
  }

  const supabase = await createClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    redirect("/lions-den?profile=invalid#client-intelligence");
  }

  const { error } = await supabase.from("business_profiles").upsert({
    organization_id: organizationId,
    offer: textValue(formData, "offer"),
    target_customer: textValue(formData, "targetCustomer"),
    positioning: textValue(formData, "positioning"),
    current_goals: textValue(formData, "currentGoals"),
    constraints: textValue(formData, "constraints"),
  });

  redirect(
    `/lions-den?profile=${error ? "error" : "saved"}#client-intelligence`,
  );
}
