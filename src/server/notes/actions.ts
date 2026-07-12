"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";

const editableRoles = new Set(["owner", "admin"]);

function includesAtlasMention(title: string | null, body: string | null) {
  return `${title ?? ""} ${body ?? ""}`.toLowerCase().includes("@atlas");
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

async function requireOrganizationMembership(
  organizationId: string,
  userId: string,
) {
  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !membership) {
    redirect("/client?note=denied");
  }

  return {
    role: String(membership.role),
    supabase,
  };
}

export async function createOrganizationNote(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const title = textValue(formData, "title");
  const body = textValue(formData, "body");

  if (!organizationId) {
    redirect("/client?note=missing_organization");
  }

  if (!title) {
    redirect("/client?note=missing_title");
  }

  const { supabase } = await requireOrganizationMembership(organizationId, user.id);
  const { error } = await supabase.from("organization_notes").insert({
    organization_id: organizationId,
    title,
    body,
    created_by: user.id,
    attention_requested: includesAtlasMention(title, body),
  });

  if (error) {
    redirect("/client?note=error");
  }

  redirect("/client?note=created");
}

export async function updateOrganizationNote(formData: FormData) {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const title = textValue(formData, "title");
  const body = textValue(formData, "body");

  if (!organizationId || !noteId) {
    redirect("/client?note=missing_note");
  }

  if (!title) {
    redirect("/client?note=missing_title");
  }

  const { role, supabase } = await requireOrganizationMembership(
    organizationId,
    user.id,
  );
  const { data: note, error: noteError } = await supabase
    .from("organization_notes")
    .select("created_by")
    .eq("id", noteId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (
    noteError ||
    !note ||
    (note.created_by !== user.id && !editableRoles.has(role))
  ) {
    redirect("/client?note=denied");
  }

  const { error } = await supabase
    .from("organization_notes")
    .update({
      title,
      body,
      attention_requested: includesAtlasMention(title, body),
    })
    .eq("id", noteId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect("/client?note=error");
  }

  redirect("/client?note=updated");
}
