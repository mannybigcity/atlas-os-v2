"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientProfileFromForm, withClientProfile } from "@/lib/lions-den/client-profile";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function backTo(formData: FormData, status: string) {
  const base = text(formData, "returnPath", 200);
  const path = /^\/client\/(prospects|clients)\/[0-9a-f-]{36}$/i.test(base) ? base : "/client/clients";
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  params.set("prospect", status);
  return `${path}?${params.toString()}`;
}

/**
 * Saves the extra fields (address, how they like to be reached, what we do for
 * them, referred by, best time, tags) under metadata.client_profile on either
 * a prospect/client (organization_opportunities) or an SIS customer.
 */
export async function saveClientProfile(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const recordId = text(formData, "recordId", 36);
  const table = text(formData, "recordTable", 40) === "sis_customer" ? "organization_sis_customers" : "organization_opportunities";
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(recordId)) redirect(backTo(formData, "invalid"));

  const { data: existing } = await supabase
    .from(table)
    .select("id, metadata")
    .eq("id", recordId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) redirect(backTo(formData, "missing"));

  const profile = clientProfileFromForm((name) => formData.get(name));
  const { error } = await supabase
    .from(table)
    .update({ metadata: withClientProfile(existing.metadata, profile) })
    .eq("id", recordId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Atlas client profile save failed", { code: error.code, table });
    redirect(backTo(formData, "failed"));
  }

  revalidatePath(`/client/clients/${recordId}`);
  revalidatePath(`/client/prospects/${recordId}`);
  redirect(backTo(formData, "profile_saved"));
}
