"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { persistMicahGalleryCaption } from "./gallery-caption-persist.ts";
import { persistMicahDesk } from "./desk-persist.ts";
import { type MicahDeskActionState } from "./desk-save.ts";

export type { MicahDeskActionState } from "./desk-save.ts";

function requiredText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function reviewContentDraft(formData: FormData) {
  await requireUser("/client");
  const organizationId = requiredText(formData, "organizationId");
  const draftId = requiredText(formData, "draftId");
  const decision = requiredText(formData, "decision");
  const note = requiredText(formData, "note");

  if (
    !organizationId ||
    !draftId ||
    !["approved", "changes_requested"].includes(decision)
  ) {
    redirect("/client?content=review_error#content-studio");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_content_draft_review", {
    p_draft_id: draftId,
    p_organization_id: organizationId,
    p_decision: decision,
    p_note: note || null,
  });

  redirect(
    `/client/micah?content=${error ? "review_error" : "review_saved"}#content-studio`,
  );
}

export async function saveMicahBrandSetup(
  _previousState: MicahDeskActionState,
  formData: FormData,
) {
  formData.set("intent", "save");
  return persistMicahDesk(formData);
}

export async function buildMicahWeekFromDesk(
  _previousState: MicahDeskActionState,
  formData: FormData,
) {
  formData.set("intent", "build");
  return persistMicahDesk(formData);
}

export async function updateMicahGalleryCaption(
  _previousState: MicahDeskActionState,
  formData: FormData,
) {
  return persistMicahGalleryCaption(formData);
}
