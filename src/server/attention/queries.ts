import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type AttentionRequest = {
  id: string;
  organizationId: string;
  noteId: string;
  status: "open" | "acknowledged";
  requestedAt: string;
  organizationName: string;
  noteTitle: string;
};

type NamedRelation = { name: string };
type TitledRelation = { title: string };

type AttentionRequestRow = {
  id: string;
  organization_id: string;
  note_id: string;
  status: "open" | "acknowledged";
  requested_at: string;
  organizations: NamedRelation | NamedRelation[] | null;
  organization_notes: TitledRelation | TitledRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getActiveAttentionRequests(): Promise<
  WorkspaceQueryResult<AttentionRequest[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attention_requests")
    .select(
      `
        id,
        organization_id,
        note_id,
        status,
        requested_at,
        organizations (name),
        organization_notes (title)
      `,
    )
    .in("status", ["open", "acknowledged"])
    .order("requested_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as AttentionRequestRow[]).map((request) => ({
      id: request.id,
      organizationId: request.organization_id,
      noteId: request.note_id,
      status: request.status,
      requestedAt: request.requested_at,
      organizationName:
        firstRelation(request.organizations)?.name ?? "Unknown organization",
      noteTitle:
        firstRelation(request.organization_notes)?.title ?? "Untitled note",
    })),
    setupRequired: false,
    error: null,
  };
}
