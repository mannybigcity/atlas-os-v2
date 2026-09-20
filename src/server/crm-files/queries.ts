import { createClient } from "@/lib/supabase/server";
import {
  parseCrmFileLabel,
  parseCrmFileRecordTable,
  type CrmFileLabel,
  type CrmFileRecordTable,
} from "@/lib/lions-den/crm-record-files";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type CrmRecordFile = {
  id: string;
  organizationId: string;
  recordTable: CrmFileRecordTable;
  recordId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  label: CrmFileLabel;
  createdBy: string | null;
  createdAt: string;
};

type CrmRecordFileRow = {
  id: string;
  organization_id: string;
  record_table: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  label: string;
  created_by: string | null;
  created_at: string;
};

function normalize(row: CrmRecordFileRow): CrmRecordFile | null {
  const recordTable = parseCrmFileRecordTable(row.record_table);
  if (!recordTable) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    recordTable,
    recordId: row.record_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    label: parseCrmFileLabel(row.label),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Files on one prospect or client. Empty when the migration is not applied
 * yet so the record page still renders.
 */
export async function getCrmRecordFiles(
  organizationId: string,
  recordTable: CrmFileRecordTable,
  recordId: string,
): Promise<WorkspaceQueryResult<CrmRecordFile[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_record_files")
    .select(
      "id, organization_id, record_table, record_id, storage_path, file_name, content_type, byte_size, label, created_by, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("record_table", recordTable)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as CrmRecordFileRow[]).map(normalize).filter((row): row is CrmRecordFile => Boolean(row)),
    setupRequired: false,
    error: null,
  };
}
