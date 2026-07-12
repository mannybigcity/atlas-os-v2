import { createClient } from "@/lib/supabase/server";
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
};

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
  };
}

export async function getOrganizationNotes(
  organizationId: string,
): Promise<WorkspaceQueryResult<OrganizationNote[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_notes")
    .select(
      "id, organization_id, title, body, created_by, attention_requested, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as OrganizationNoteRow[]).map(normalizeOrganizationNote),
    setupRequired: false,
    error: null,
  };
}
