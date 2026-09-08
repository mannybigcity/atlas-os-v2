"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { followUpDraftMailto } from "@/lib/lions-den/follow-up-drafts";
import { isSuperAdminEmail } from "@/lib/env";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import {
  eventTypeForTouch,
  isProspectStageMove,
  isProspectTouchChannel,
  isProspectTouchOutcome,
  stageAfterTouch,
  touchSummary,
} from "@/lib/lions-den/prospect-actions";
import { asOpportunityMetadata, type OpportunityStage } from "@/server/opportunities/queries";
import { getUserMemberships } from "@/server/organizations/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function followUpReturnPath(formData: FormData, status: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/david";
  const destination =
    safePath === "/client/david" || safePath.startsWith("/client/david")
      ? safePath
      : "/client/david";
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  const previewOrg = params.get("previewOrg");
  const workspace = params.get("workspace");
  if (
    previewOrg &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(previewOrg) &&
    !/^afe-crm-demo$/i.test(previewOrg)
  ) {
    next.set("previewOrg", previewOrg);
  }
  if (workspace && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(workspace)) {
    next.set("workspace", workspace);
  }
  next.set("followup", status);
  return `${destination}?${next.toString()}`;
}

async function requireAfeFollowUpOperator(organizationId: string, formData: FormData) {
  const user = await requireUser("/client/david");
  if (!uuidPattern.test(organizationId)) {
    redirect(followUpReturnPath(formData, "invalid"));
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  if (!organization) {
    redirect(followUpReturnPath(formData, "missing_organization"));
  }

  if (isSisOrganization(organization)) {
    redirect(followUpReturnPath(formData, "sis_blocked"));
  }

  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    const membership = memberships.data.find((item) => item.organization?.id === organizationId);
    if (!membership) {
      redirect("/client?access=denied");
    }
  }

  return { user, organization, supabase };
}

async function loadFollowUpDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  opportunityId: string,
) {
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      "id, organization_id, name, contact_name, contact_email, next_action, next_action_due, metadata",
    )
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function revalidateFollowUpDesk() {
  revalidatePath("/client");
  revalidatePath("/client/david");
  revalidatePath("/client/prospects");
}

export async function updateFollowUpDraft(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const draftBody = field(formData, "draftBody", 4000);
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId) || !draftBody) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      next_action: draftBody,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(followUpReturnPath(formData, "edit_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "next_action_set",
    actor_role: "client",
    summary: "Owner edited the follow-up draft. Atlas did not email, call, or text anyone.",
    body: draftBody,
  });

  revalidateFollowUpDesk();
  redirect(followUpReturnPath(formData, "edited"));
}

export async function openFollowUpOwnerSend(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId)) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const metadata = {
    ...asOpportunityMetadata(draft.metadata),
    owner_send_opened_at: new Date().toISOString(),
    no_outreach_sent: true,
  };
  await supabase
    .from("organization_opportunities")
    .update({ metadata })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "client",
    summary: "Owner opened send. Atlas did not email, call, or text anyone.",
    body: draft.next_action,
  });

  const mailto = followUpDraftMailto({
    email: draft.contact_email,
    prospectName: draft.name,
    contactName: draft.contact_name,
    body: String(draft.next_action ?? ""),
  });

  revalidateFollowUpDesk();
  redirect(followUpReturnPath(formData, mailto ? "send_opened" : "copy_draft"));
}

export async function deleteFollowUpDraft(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId)) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      next_action: null,
      next_action_due: null,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(followUpReturnPath(formData, "delete_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "next_action_set",
    actor_role: "client",
    summary: "Owner deleted the follow-up draft from the queue. Atlas did not contact anyone.",
    body: draft.next_action,
  });

  revalidateFollowUpDesk();
  redirect(followUpReturnPath(formData, "deleted"));
}

// ---------------------------------------------------------------------------
// Prospect record actions: the buttons on /client/prospects/[id].
// Every write is a human decision. Atlas never emails, texts, or calls.
// ---------------------------------------------------------------------------

const STAGES: OpportunityStage[] = [
  "researching",
  "qualified",
  "needs_client_input",
  "ready_for_follow_up",
  "follow_up_queued",
  "contacted",
  "responded",
  "won",
  "lost",
  "archived",
];

function prospectReturnPath(formData: FormData, status: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/prospects";
  const destination = safePath.startsWith("/client/prospects") ? safePath : "/client/prospects";
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
  next.set("status", status);
  return `${destination}?${next.toString()}`;
}

async function requireProspectOperator(organizationId: string, formData: FormData) {
  const user = await requireUser("/client/prospects");
  if (!uuidPattern.test(organizationId)) {
    redirect(prospectReturnPath(formData, "invalid"));
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  if (!organization) {
    redirect(prospectReturnPath(formData, "missing_prospect"));
  }

  if (isSisOrganization(organization)) {
    redirect(prospectReturnPath(formData, "sis_blocked"));
  }

  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    const membership = memberships.data.find((item) => item.organization?.id === organizationId);
    if (!membership) {
      redirect("/client?access=denied");
    }
  }

  return { user, organization, supabase };
}

async function loadProspect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  opportunityId: string,
) {
  if (!uuidPattern.test(opportunityId)) return null;
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      "id, organization_id, name, stage, contact_name, contact_email, contact_phone, research_summary, next_action, next_action_due, metadata",
    )
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    organization_id: string;
    name: string;
    stage: OpportunityStage;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    research_summary: string;
    next_action: string | null;
    next_action_due: string | null;
    metadata: unknown;
  };
}

function revalidateProspectDesks() {
  revalidatePath("/client");
  revalidatePath("/client/prospects");
  revalidatePath("/client/david");
  revalidatePath("/client/clients");
  revalidatePath("/client/trial-inbox");
}

function dateField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) ? value : null;
}

/** "Log a touch": the owner called, texted, emailed, or met the prospect. */
export async function logProspectTouch(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const channel = String(formData.get("channel") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const note = field(formData, "note", 2000);
  const nextAction = field(formData, "nextAction", 1200);
  const nextActionDue = dateField(formData, "nextActionDue");
  const { supabase } = await requireProspectOperator(organizationId, formData);

  if (!isProspectTouchChannel(channel) || !isProspectTouchOutcome(outcome)) {
    redirect(prospectReturnPath(formData, "invalid"));
  }

  const prospect = await loadProspect(supabase, organizationId, opportunityId);
  if (!prospect) {
    redirect(prospectReturnPath(formData, "missing_prospect"));
  }

  const now = new Date().toISOString();
  const stage = stageAfterTouch(prospect.stage, outcome);
  const update: Record<string, unknown> = {
    stage,
    metadata: {
      ...asOpportunityMetadata(prospect.metadata),
      last_contacted_at: now,
      last_contact_channel: channel,
      last_contact_outcome: outcome,
      no_outreach_sent: true,
    },
  };
  if (nextAction && nextAction.length >= 5) {
    update.next_action = nextAction;
    update.next_action_due = nextActionDue;
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update(update)
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(prospectReturnPath(formData, "save_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: eventTypeForTouch(outcome),
    actor_role: "client",
    summary: touchSummary(channel, outcome),
    body: [note, nextAction ? `Next step: ${nextAction}${nextActionDue ? ` (due ${nextActionDue})` : ""}` : null]
      .filter(Boolean)
      .join("\n\n") || null,
  });

  revalidateProspectDesks();
  redirect(prospectReturnPath(formData, "touch_logged"));
}

/** "Save contact": edit the name, phone, email, and notes on the record. */
export async function updateProspectContact(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const contactName = field(formData, "contactName", 180);
  const contactPhone = field(formData, "contactPhone", 80);
  const contactEmail = field(formData, "contactEmail", 320)?.toLowerCase() ?? null;
  const notes = field(formData, "notes", 3000);
  const { supabase } = await requireProspectOperator(organizationId, formData);

  const prospect = await loadProspect(supabase, organizationId, opportunityId);
  if (!prospect) {
    redirect(prospectReturnPath(formData, "missing_prospect"));
  }

  if (
    (contactName && contactName.length < 2) ||
    (contactPhone && contactPhone.length < 7) ||
    (contactEmail && (contactEmail.length < 5 || contactEmail.indexOf("@") < 1)) ||
    (notes && notes.length < 10)
  ) {
    redirect(prospectReturnPath(formData, "invalid"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      research_summary: notes ?? prospect.research_summary,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(prospectReturnPath(formData, "save_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "client",
    summary: "Owner edited the contact details on this record.",
    body: [
      contactName ? `Name: ${contactName}` : null,
      contactPhone ? `Phone: ${contactPhone}` : null,
      contactEmail ? `Email: ${contactEmail}` : null,
    ]
      .filter(Boolean)
      .join("\n") || null,
  });

  revalidateProspectDesks();
  redirect(prospectReturnPath(formData, "contact_saved"));
}

/** "Save next step": what the owner will do next and when. Shows on Follow-up. */
export async function setProspectNextAction(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const nextAction = field(formData, "nextAction", 1200);
  const nextActionDue = dateField(formData, "nextActionDue");
  const { supabase } = await requireProspectOperator(organizationId, formData);

  const prospect = await loadProspect(supabase, organizationId, opportunityId);
  if (!prospect) {
    redirect(prospectReturnPath(formData, "missing_prospect"));
  }

  if (nextAction && nextAction.length < 5) {
    redirect(prospectReturnPath(formData, "invalid"));
  }

  const clearing = !nextAction;
  const stage: OpportunityStage =
    !clearing &&
    ["researching", "qualified", "needs_client_input", "ready_for_follow_up"].includes(prospect.stage)
      ? "follow_up_queued"
      : prospect.stage;

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      next_action: clearing ? null : nextAction,
      next_action_due: clearing ? null : nextActionDue,
      stage,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(prospectReturnPath(formData, "save_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "next_action_set",
    actor_role: "client",
    summary: clearing
      ? "Owner cleared the next step."
      : `Owner set the next step${nextActionDue ? ` for ${nextActionDue}` : ""}. Atlas did not contact anyone.`,
    body: clearing ? prospect.next_action : nextAction,
  });

  revalidateProspectDesks();
  redirect(prospectReturnPath(formData, clearing ? "next_action_cleared" : "next_action_saved"));
}

/** Stage buttons: Mark won, Not a fit, Back to call list, Remove from desk. */
export async function setProspectStage(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const move = String(formData.get("stage") ?? "").trim();
  const { supabase } = await requireProspectOperator(organizationId, formData);

  if (!isProspectStageMove(move) || !STAGES.includes(move)) {
    redirect(prospectReturnPath(formData, "invalid"));
  }

  const prospect = await loadProspect(supabase, organizationId, opportunityId);
  if (!prospect) {
    redirect(prospectReturnPath(formData, "missing_prospect"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({ stage: move })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(prospectReturnPath(formData, "save_failed"));
  }

  const eventType = move === "won" ? "won" : move === "lost" ? "lost" : "note_added";
  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: eventType,
    actor_role: "client",
    summary:
      move === "won"
        ? "Owner marked this prospect won."
        : move === "lost"
          ? "Owner marked this prospect not a fit."
          : move === "archived"
            ? "Owner removed this prospect from the desk. History is kept."
            : "Owner moved this prospect back to the call list.",
    body: null,
  });

  revalidateProspectDesks();
  if (move === "archived") {
    const listPath = prospectReturnPath(formData, "stage_archived").replace(/\/client\/prospects\/[^?]+/, "/client/prospects");
    redirect(listPath);
  }
  redirect(prospectReturnPath(formData, `stage_${move}`));
}
