"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateReviewLink } from "@/lib/lions-den/won-follow-through";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function recordPath(formData: FormData, status: string) {
  const opportunityId = text(formData, "opportunityId", 36);
  const base = uuidPattern.test(opportunityId) ? `/client/clients/${opportunityId}` : "/client/clients";
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  params.set("prospect", status);
  return `${base}?${params.toString()}`;
}

/** Saves the owner's Google review link once; every later win prefills the review ask with it. */
export async function saveDeskReviewLink(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const spanish = text(formData, "lang", 5) === "es";
  const { supabase } = await requireProspectOwner(organizationId, formData);
  const { link, error: validationError } = validateReviewLink(formData.get("reviewLink"), spanish);
  if (validationError) {
    redirect(recordPath(formData, "review_link_invalid"));
  }

  const { error } = await supabase
    .from("organization_desk_settings")
    .upsert(
      { organization_id: organizationId, review_link: link || null, updated_at: new Date().toISOString() },
      { onConflict: "organization_id" },
    );
  if (error) {
    console.error("Atlas save review link failed", error);
    redirect(recordPath(formData, "failed"));
  }

  const opportunityId = text(formData, "opportunityId", 36);
  if (uuidPattern.test(opportunityId)) {
    revalidatePath(`/client/clients/${opportunityId}`);
  }
  revalidatePath("/client/clients");
  redirect(recordPath(formData, "review_link_saved"));
}
