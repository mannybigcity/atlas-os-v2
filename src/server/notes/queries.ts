import { createClient } from "@/lib/supabase/server";
import type { NoteRecordKind } from "@/lib/lions-den/note-links";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type OrganizationNote = {
  id: string;
  organizationId: string;
  title: string;
  body: string | null;
  createdBy: string | null;
  attentionRequested: boolean;
  createdAt: string;
  updatedAt: string;
  recordKind: NoteRecordKind | null;
  recordId: string | null;
  recordName: string | null;
  noteType: string | null;
  dueDate: string | null;
};

type OrganizationNoteRow = {
  id: string;
  organization_id: string;
  title: string;
  body: string | null;
  created_by: string | null;
  attention_requested: boolean | null;
  created_at: string;
  updated_at: string;
  record_kind?: NoteRecordKind | null;
  record_id?: string | null;
  record_name?: string | null;
  note_type?: string | null;
  due_date?: string | null;
};

const BASE_COLUMNS = "id, organization_id, title, body, created_by, attention_requested, created_at, updated_at";
const LINK_COLUMNS = `${BASE_COLUMNS}, record_kind, record_id, record_name, note_type, due_date`;

function normalizeOrganizationNote(row: OrganizationNoteRow): OrganizationNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    body: row.body,
    createdBy: row.created_by,
    attentionRequested: Boolean(row.attention_requested),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recordKind: row.record_kind ?? null,
    recordId: row.record_id ?? null,
    recordName: row.record_name ?? null,
    noteType: row.note_type ?? null,
    dueDate: row.due_date ?? null,
  };
}

/**
 * Notes for the desk, newest first. Pass `recordId` to get only the notes
 * about one prospect or client. Falls back to the old column set when the
 * link migration has not been applied yet, so the board never goes blank.
 */
export async function getOrganizationNotes(
  organizationId: string,
  options: { recordId?: string | null; limit?: number } = {},
): Promise<WorkspaceQueryResult<OrganizationNote[]>> {
  const supabase = await createClient();
  const limit = options.limit ?? 50;

  const run = (columns: string) => {
    let query = supabase.from("organization_notes").select(columns).eq("organization_id", organizationId);
    if (options.recordId) query = query.eq("record_id", options.recordId);
    return query.order("created_at", { ascending: false }).limit(limit);
  };

  let { data, error } = await run(LINK_COLUMNS);
  if (error && !options.recordId) {
    ({ data, error } = await run(BASE_COLUMNS));
  }

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as unknown as OrganizationNoteRow[]).map(normalizeOrganizationNote),
    setupRequired: false,
    error: null,
  };
}
