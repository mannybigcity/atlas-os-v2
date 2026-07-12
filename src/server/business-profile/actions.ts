"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";

const editableRoles = new Set(["owner", "admin"]);

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function saveBusinessProfile(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!organizationId) {
    redirect("/client?profile=missing_organization");
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership || !editableRoles.has(String(membership.role))) {
    redirect("/client?profile=denied");
  }

  const { error } = await supabase.from("business_profiles").upsert({
    organization_id: organizationId,
    offer: textValue(formData, "offer"),
    target_customer: textValue(formData, "targetCustomer"),
    positioning: textValue(formData, "positioning"),
    current_goals: textValue(formData, "currentGoals"),
    constraints: textValue(formData, "constraints"),
  });

  if (error) {
    redirect("/client?profile=error");
  }

  redirect("/client?profile=saved");
}
