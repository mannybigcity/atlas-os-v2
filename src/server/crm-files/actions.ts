"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CRM_FILES_BUCKET,
  crmFileContentType,
  crmFileStoragePath,
  isAllowedCrmRecordFile,
  isCrmFileUuid,
  parseCrmFileLabel,
  parseCrmFileRecordTable,
} from "@/lib/lions-den/crm-record-files";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

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

function parentTable(recordTable: "opportunity" | "sis_customer") {
  return recordTable === "sis_customer" ? "organization_sis_customers" : "organization_opportunities";
}

async function requireRecord(
  formData: FormData,
  organizationId: string,
  recordId: string,
  recordTable: "opportunity" | "sis_customer",
) {
  const { supabase, user } = await requireProspectOwner(organizationId, formData);
  if (!isCrmFileUuid(recordId)) redirect(backTo(formData, "missing"));
  const { data: existing } = await supabase
    .from(parentTable(recordTable))
    .select("id")
    .eq("id", recordId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) redirect(backTo(formData, "missing"));
  return { supabase, user };
}

function revalidateRecord(recordId: string) {
  revalidatePath(`/client/clients/${recordId}`);
  revalidatePath(`/client/prospects/${recordId}`);
}

/**
 * Stores a file on the CRM card. Does not email anyone.
 */
export async function uploadCrmRecordFile(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const recordId = text(formData, "recordId", 36);
  const recordTable = parseCrmFileRecordTable(formData.get("recordTable"));
  if (!recordTable) redirect(backTo(formData, "file_invalid"));

  const { supabase, user } = await requireRecord(formData, organizationId, recordId, recordTable);
  const uploaded = formData.get("file");
  if (!(typeof File !== "undefined" && uploaded instanceof File) || !isAllowedCrmRecordFile(uploaded)) {
    redirect(backTo(formData, "file_invalid"));
  }

  const fileId = crypto.randomUUID();
  const storagePath = crmFileStoragePath({
    organizationId,
    recordTable,
    recordId,
    fileId,
    fileName: uploaded.name,
  });
  const contentType = crmFileContentType(uploaded);
  const bytes = Buffer.from(await uploaded.arrayBuffer());

  const { error: storageError } = await supabase.storage.from(CRM_FILES_BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: false,
  });
  if (storageError) {
    console.error("Atlas CRM file upload failed", { code: storageError.message });
    redirect(backTo(formData, "file_failed"));
  }

  const { error } = await supabase.from("crm_record_files").insert({
    id: fileId,
    organization_id: organizationId,
    record_table: recordTable,
    record_id: recordId,
    storage_path: storagePath,
    file_name: uploaded.name.trim().slice(0, 240) || "file",
    content_type: contentType,
    byte_size: uploaded.size,
    label: parseCrmFileLabel(formData.get("label")),
    created_by: user.id,
  });
  if (error) {
    console.error("Atlas CRM file metadata insert failed", { code: error.code });
    await supabase.storage.from(CRM_FILES_BUCKET).remove([storagePath]);
    redirect(backTo(formData, "file_failed"));
  }

  revalidateRecord(recordId);
  redirect(backTo(formData, "file_uploaded"));
}

/**
 * Short-lived signed URL, then leave the desk page. Never a public path.
 */
export async function downloadCrmRecordFile(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const recordId = text(formData, "recordId", 36);
  const fileId = text(formData, "fileId", 36);
  const recordTable = parseCrmFileRecordTable(formData.get("recordTable"));
  if (!recordTable || !isCrmFileUuid(fileId)) redirect(backTo(formData, "missing"));

  const { supabase } = await requireRecord(formData, organizationId, recordId, recordTable);
  const { data: row } = await supabase
    .from("crm_record_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("organization_id", organizationId)
    .eq("record_id", recordId)
    .eq("record_table", recordTable)
    .maybeSingle();
  if (!row) redirect(backTo(formData, "missing"));

  const { data, error } = await supabase.storage.from(CRM_FILES_BUCKET).createSignedUrl(row.storage_path, 120);
  if (error || !data?.signedUrl) {
    console.error("Atlas CRM file signed URL failed", { message: error?.message });
    redirect(backTo(formData, "file_failed"));
  }
  redirect(data.signedUrl);
}

/**
 * Removes the object and the metadata row. Confirm in the UI first.
 */
export async function deleteCrmRecordFile(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const recordId = text(formData, "recordId", 36);
  const fileId = text(formData, "fileId", 36);
  const recordTable = parseCrmFileRecordTable(formData.get("recordTable"));
  if (!recordTable || !isCrmFileUuid(fileId)) redirect(backTo(formData, "missing"));

  const { supabase } = await requireRecord(formData, organizationId, recordId, recordTable);
  const { data: row } = await supabase
    .from("crm_record_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("organization_id", organizationId)
    .eq("record_id", recordId)
    .eq("record_table", recordTable)
    .maybeSingle();
  if (!row) redirect(backTo(formData, "missing"));

  const { error: storageError } = await supabase.storage.from(CRM_FILES_BUCKET).remove([row.storage_path]);
  if (storageError) {
    console.error("Atlas CRM file storage delete failed", { message: storageError.message });
    redirect(backTo(formData, "file_failed"));
  }

  const { error } = await supabase
    .from("crm_record_files")
    .delete()
    .eq("id", fileId)
    .eq("organization_id", organizationId)
    .eq("record_id", recordId)
    .eq("record_table", recordTable);
  if (error) {
    console.error("Atlas CRM file metadata delete failed", { code: error.code });
    redirect(backTo(formData, "file_failed"));
  }

  revalidateRecord(recordId);
  redirect(backTo(formData, "file_deleted"));
}
