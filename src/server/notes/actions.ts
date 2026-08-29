"use server";

import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, requireUser } from "@/server/auth/guards";
import { safeRedirectPath } from "@/lib/paths";

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function includesAtlasMention(body: string) {
  return body.toLowerCase().includes("@atlas");
}

async function requireOrganizationMembership(
  organizationId: string,
  user: { id: string; email?: string | null },
) {
  const supabase = await createClient();
  if (isSuperAdminEmail(user.email)) {
    return supabase;
  }

  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    redirect("/client?message=denied");
  }

  return supabase;
}

function notesReturnPath(formData: FormData, status: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/notes";
  const destination = safePath === "/client" || safePath.startsWith("/client/")
    ? safePath
    : "/client/notes";
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  const previewOrg = params.get("previewOrg");
  const workspace = params.get("workspace");
  if (previewOrg && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(previewOrg)) {
    next.set("previewOrg", previewOrg);
  }
  if (workspace && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(workspace)) {
    next.set("workspace", workspace);
  }
  next.set("note", status);
  return `${destination}?${next.toString()}`;
}

export async function createOrganizationNote(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const title = textValue(formData, "title");
  const body = textValue(formData, "body");

  if (!organizationId) {
    redirect(notesReturnPath(formData, "missing_organization"));
  }

  if (!title) {
    redirect(notesReturnPath(formData, "missing_title"));
  }

  if (!body) {
    redirect(notesReturnPath(formData, "missing_body"));
  }

  const supabase = await requireOrganizationMembership(organizationId, user);
  const { error } = await supabase.rpc("create_note_thread", {
    p_organization_id: organizationId,
    p_title: title,
    p_body: body,
  });

  if (error) {
    redirect(notesReturnPath(formData, "error"));
  }

  redirect(notesReturnPath(formData, "created"));
}

export async function createClientNoteMessage(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const body = textValue(formData, "body");

  if (!organizationId || !noteId || !body) {
    redirect("/client?message=missing_body");
  }

  const supabase = await requireOrganizationMembership(organizationId, user);
  const { error } = await supabase.from("note_messages").insert({
    organization_id: organizationId,
    note_id: noteId,
    author_user_id: user.id,
    author_kind: "client",
    author_display_name: "Pending",
    body,
    attention_requested: includesAtlasMention(body),
  });

  if (error) {
    redirect("/client?message=error");
  }

  redirect("/client?message=created");
}

export async function createAdminNoteMessage(formData: FormData) {
  const user = await requireSuperAdmin();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const body = textValue(formData, "body");

  if (!noteId || !body) {
    redirect("/lions-den?message=missing_body");
  }

  const supabase = await createClient();
  const { data: note, error: noteError } = await supabase
    .from("organization_notes")
    .select("organization_id")
    .eq("id", noteId)
    .maybeSingle();

  if (noteError || !note) {
    redirect("/lions-den?message=error");
  }

  const { error } = await supabase.from("note_messages").insert({
    organization_id: note.organization_id,
    note_id: noteId,
    author_user_id: user.id,
    author_kind: "atlas_admin",
    author_display_name: "Atlas Admin",
    body,
    attention_requested: false,
  });

  if (error) {
    redirect("/lions-den?message=error");
  }

  redirect("/lions-den?message=created");
}
