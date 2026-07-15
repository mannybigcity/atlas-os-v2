"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";

const statuses = new Set([
  "new",
  "contacted",
  "qualified",
  "not_a_fit",
  "converted",
]);

export async function updateBusinessAssessmentStatus(formData: FormData) {
  await requireSuperAdmin("/lions-den");

  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(assessmentId) || !statuses.has(status)) {
    redirect("/lions-den?assessment=error");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_assessment_submissions")
    .update({ status })
    .eq("id", assessmentId);

  redirect(`/lions-den?assessment=${error ? "error" : "updated"}`);
}
