import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type NoteMessage = {
  id: string;
  noteId: string;
  authorKind: "client" | "atlas_admin";
  authorDisplayName: string;
  body: string;
  attentionRequested: boolean;
  createdAt: string;
};

type NoteMessageRow = {
  id: string;
  note_id: string;
  author_kind: "client" | "atlas_admin";
  author_display_name: string;
  body: string;
  attention_requested: boolean;
  created_at: string;
};

export async function getNoteMessages(
  organizationId: string,
): Promise<WorkspaceQueryResult<NoteMessage[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_messages")
    .select(
      "id, note_id, author_kind, author_display_name, body, attention_requested, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return { data: [], setupRequired: true, error: error.message };
  }

  return {
    data: ((data ?? []) as NoteMessageRow[]).map((message) => ({
      id: message.id,
      noteId: message.note_id,
      authorKind: message.author_kind,
      authorDisplayName: message.author_display_name,
      body: message.body,
      attentionRequested: message.attention_requested,
      createdAt: message.created_at,
    })),
    setupRequired: false,
    error: null,
  };
}

export async function getMessagesForNotes(
  noteIds: string[],
): Promise<WorkspaceQueryResult<NoteMessage[]>> {
  if (noteIds.length === 0) {
    return { data: [], setupRequired: false, error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_messages")
    .select(
      "id, note_id, author_kind, author_display_name, body, attention_requested, created_at",
    )
    .in("note_id", noteIds)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    return { data: [], setupRequired: true, error: error.message };
  }

  return {
    data: ((data ?? []) as NoteMessageRow[]).map((message) => ({
      id: message.id,
      noteId: message.note_id,
      authorKind: message.author_kind,
      authorDisplayName: message.author_display_name,
      body: message.body,
      attentionRequested: message.attention_requested,
      createdAt: message.created_at,
    })),
    setupRequired: false,
    error: null,
  };
}
