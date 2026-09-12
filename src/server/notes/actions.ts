"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import {
  linkedNoteEventSummary,
  noteFollowUpPlan,
  noteRecordHref,
  parseNoteRecord,
  type NoteRecordRef,
} from "@/lib/lions-den/note-links";
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
  if (previewOrg && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(previewOrg) && !/^afe-crm-demo$/i.test(previewOrg)) {
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
  const noteType = String(formData.get("noteType") ?? "general").trim().toLowerCase();
  const attention = String(formData.get("attention") ?? "desk").trim().toLowerCase();
  let title = textValue(formData, "title");
  let body = textValue(formData, "body");

  if (!organizationId) {
    redirect(notesReturnPath(formData, "missing_organization"));
  }

  if (!title) {
    redirect(notesReturnPath(formData, "missing_title"));
  }

  if (!body) {
    redirect(notesReturnPath(formData, "missing_body"));
  }

  const typeLabel =
    noteType === "follow-up"
      ? "Follow-up"
      : noteType === "call"
        ? "Call"
        : noteType === "meeting"
          ? "Meeting"
          : null;
  if (typeLabel && !title.toLowerCase().startsWith(`${typeLabel.toLowerCase()}:`)) {
    title = `${typeLabel}: ${title}`;
  }
  if (attention === "atlas" && !includesAtlasMention(body)) {
    body = `${body}\n\n@Atlas`;
  }

  const supabase = await requireOrganizationMembership(organizationId, user);
  const { data: noteId, error } = await supabase.rpc("create_note_thread", {
    p_organization_id: organizationId,
    p_title: title,
    p_body: body,
  });

  if (error) {
    redirect(notesReturnPath(formData, "error"));
  }

  const record = parseNoteRecord(formData.get("record"));
  const plan = noteFollowUpPlan({ noteType, title, body, dueDate: formData.get("dueDate") });
  await linkNoteToRecord({
    supabase,
    organizationId,
    noteId: typeof noteId === "string" ? noteId : null,
    noteType,
    title,
    body,
    record,
    plan,
  });

  redirect(notesReturnPath(formData, record ? "linked" : "created"));
}

type LinkNoteInput = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string;
  noteId: string | null;
  noteType: string;
  title: string;
  body: string;
  record: NoteRecordRef | null;
  plan: ReturnType<typeof noteFollowUpPlan>;
};

/**
 * Ties the note to its prospect or client and mirrors it onto that record:
 * an Activity line on opportunities, and (for a dated follow-up) the record's
 * next step so it shows on Follow-up and Calendar. Best effort: a failure here
 * never loses the note itself.
 */
async function linkNoteToRecord({ supabase, organizationId, noteId, noteType, title, body, record, plan }: LinkNoteInput) {
  if (!noteId) return;
  let recordName: string | null = null;

  if (record && record.kind !== "sis_customer") {
    const { data: opportunity } = await supabase
      .from("organization_opportunities")
      .select("id, name, stage")
      .eq("id", record.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!opportunity) return;
    recordName = opportunity.name;

    await supabase.from("organization_opportunity_events").insert({
      opportunity_id: record.id,
      organization_id: organizationId,
      event_type: "note_added",
      actor_role: "client",
      summary: linkedNoteEventSummary(title),
      body: body.slice(0, 3000),
      metadata: { note_id: noteId },
    });

    if (plan && !["won", "lost", "archived"].includes(opportunity.stage)) {
      await supabase
        .from("organization_opportunities")
        .update({ next_action: plan.nextAction, next_action_due: plan.nextActionDue })
        .eq("id", record.id)
        .eq("organization_id", organizationId);
    }
  } else if (record) {
    const { data: customer } = await supabase
      .from("organization_sis_customers")
      .select("id, display_name")
      .eq("id", record.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!customer) return;
    recordName = customer.display_name;
  }

  const { error } = await supabase
    .from("organization_notes")
    .update({
      record_kind: record?.kind ?? null,
      record_id: record?.id ?? null,
      record_name: recordName,
      note_type: noteType,
      due_date: plan?.nextActionDue ?? null,
    })
    .eq("id", noteId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Atlas note link failed", { code: error.code, noteId });
  }

  if (record) {
    revalidatePath(noteRecordHref(record));
    revalidatePath("/client/follow-up");
    revalidatePath("/client/calendar");
  }
  revalidatePath("/client/notes");
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
