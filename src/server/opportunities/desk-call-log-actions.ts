"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDailyCallGoal } from "@/lib/lions-den/call-log";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function deskPath(formData: FormData, status?: string) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  const callDay = text(formData, "callDay", 10);
  const lang = text(formData, "lang", 2);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  if (dayPattern.test(callDay)) params.set("callDay", callDay);
  if (lang === "es" || lang === "en") params.set("lang", lang);
  if (status) params.set("prospect", status);
  const query = params.toString();
  return query ? `/client?${query}` : "/client";
}

/** Inline edit on the Calls to make counter. Does not contact anyone. */
export async function setDailyCallGoal(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  if (!uuidPattern.test(organizationId)) {
    redirect(deskPath(formData, "invalid"));
  }
  const { supabase } = await requireProspectOwner(organizationId, formData);
  const goal = parseDailyCallGoal(text(formData, "dailyCallGoal", 8));
  if (goal === null) {
    redirect(deskPath(formData, "goal_invalid"));
  }
  const { error } = await supabase.from("organization_desk_settings").upsert(
    {
      organization_id: organizationId,
      daily_call_goal: goal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) {
    console.error("Daily call goal save failed", error);
    redirect(deskPath(formData, "goal_failed"));
  }
  revalidatePath("/client");
  redirect(deskPath(formData, "goal_saved"));
}
