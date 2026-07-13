"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, requireUser } from "@/server/auth/guards";

function requiredText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = requiredText(formData, key);
  return value || null;
}

export async function savePilotPlan(formData: FormData) {
  const user = await requireSuperAdmin();
  const organizationId = requiredText(formData, "organizationId");
  const thirtyDayGoal = optionalText(formData, "thirtyDayGoal");

  if (!organizationId || !thirtyDayGoal) {
    redirect("/lions-den?pilot=missing_plan");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_pilot_plans").upsert({
    organization_id: organizationId,
    thirty_day_goal: thirtyDayGoal,
    success_definition: optionalText(formData, "successDefinition"),
    next_check_in_at: optionalText(formData, "nextCheckInAt"),
    status: requiredText(formData, "status") || "active",
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) redirect("/lions-den?pilot=error");
  redirect("/lions-den?pilot=plan_saved");
}

export async function createPilotAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const organizationId = requiredText(formData, "organizationId");
  const title = requiredText(formData, "title");

  if (!organizationId || !title) {
    redirect("/lions-den?pilot=missing_action");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_pilot_actions").insert({
    organization_id: organizationId,
    title,
    description: optionalText(formData, "description"),
    status: requiredText(formData, "status") || "not_started",
    priority: Number(requiredText(formData, "priority") || "1"),
    owner_label: optionalText(formData, "ownerLabel"),
    due_date: optionalText(formData, "dueDate"),
    created_by: user.id,
  });

  if (error) redirect("/lions-den?pilot=error");
  redirect("/lions-den?pilot=action_created");
}

export async function updatePilotAction(formData: FormData) {
  await requireSuperAdmin();
  const actionId = requiredText(formData, "actionId");
  const status = requiredText(formData, "status");

  if (!actionId || !status) redirect("/lions-den?pilot=error");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_pilot_actions")
    .update({ status })
    .eq("id", actionId);

  if (error) redirect("/lions-den?pilot=error");
  redirect("/lions-den?pilot=action_updated");
}

export async function createPilotDeliverable(formData: FormData) {
  const user = await requireSuperAdmin();
  const organizationId = requiredText(formData, "organizationId");
  const title = requiredText(formData, "title");

  if (!organizationId || !title) {
    redirect("/lions-den?pilot=missing_deliverable");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_pilot_deliverables").insert({
    organization_id: organizationId,
    title,
    summary: optionalText(formData, "summary"),
    body: optionalText(formData, "body"),
    status: requiredText(formData, "status") || "draft",
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) redirect("/lions-den?pilot=error");
  redirect("/lions-den?pilot=deliverable_created");
}

export async function updatePilotDeliverable(formData: FormData) {
  const user = await requireSuperAdmin();
  const deliverableId = requiredText(formData, "deliverableId");
  const status = requiredText(formData, "status");

  if (!deliverableId || !["draft", "ready_for_review", "delivered", "archived"].includes(status)) {
    redirect("/lions-den?pilot=error");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_pilot_deliverables")
    .update({ status, updated_by: user.id })
    .eq("id", deliverableId);

  if (error) redirect("/lions-den?pilot=error");
  redirect("/lions-den?pilot=deliverable_updated");
}

export async function reviewPilotDeliverable(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = requiredText(formData, "organizationId");
  const deliverableId = requiredText(formData, "deliverableId");
  const decision = requiredText(formData, "decision");

  if (
    !organizationId ||
    !deliverableId ||
    !["approved", "changes_requested"].includes(decision)
  ) {
    redirect("/client?pilot=review_error");
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    !["owner", "admin"].includes(String(membership.role))
  ) {
    redirect("/client?pilot=review_denied");
  }

  const { error } = await supabase
    .from("organization_pilot_deliverable_reviews")
    .upsert({
      deliverable_id: deliverableId,
      organization_id: organizationId,
      decision,
      note: optionalText(formData, "note"),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });

  if (error) redirect("/client?pilot=review_error");
  redirect("/client?pilot=review_saved");
}
