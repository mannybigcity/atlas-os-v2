"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { isSuperAdminEmail } from "@/lib/env";
import {
  JOB_VALUE_METADATA_KEY,
  isOwnerProspectStage,
  normalizeWebsite,
  parseJobValue,
  validateProspectEditor,
  type ProspectEditorValues,
} from "@/lib/lions-den/prospect-stages";
import { CALL_PROSPECT_NEXT_ACTION, NO_PHONE_PROSPECT_NEXT_ACTION } from "@/lib/lions-den/prospect-places";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { asOpportunityMetadata } from "@/server/opportunities/queries";
import { getUserMemberships } from "@/server/organizations/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function scopedPath(base: string, formData: FormData, status?: string) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  if (status) params.set("prospect", status);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function listPath(formData: FormData, status?: string) {
  return scopedPath("/client/prospects", formData, status);
}

function detailPath(opportunityId: string, formData: FormData, status?: string) {
  return scopedPath(`/client/prospects/${opportunityId}`, formData, status);
}

async function requireProspectOwner(organizationId: string, formData: FormData) {
  const user = await requireUser("/client/prospects");
  if (!uuidPattern.test(organizationId)) {
    redirect(listPath(formData, "invalid"));
  }
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization || isSisOrganization(organization)) {
    redirect(listPath(formData, "invalid"));
  }
  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    if (!memberships.data.some((item) => item.organization?.id === organizationId)) {
      redirect("/client?access=denied");
    }
  }
  return { user, supabase };
}

function revalidateProspectDesk(opportunityId?: string) {
  for (const path of ["/client", "/client/prospects", "/client/clients", "/client/david", "/client/hunter"]) {
    revalidatePath(path);
  }
  if (opportunityId) revalidatePath(`/client/prospects/${opportunityId}`);
}

function editorValues(formData: FormData): ProspectEditorValues {
  return {
    name: text(formData, "name", 240),
    contactName: text(formData, "contactName", 200),
    phone: text(formData, "phone", 100),
    email: text(formData, "email", 340),
    address: text(formData, "address", 600),
    website: text(formData, "website", 2100),
    notes: text(formData, "notes", 2600),
  };
}

function editorColumns(values: ProspectEditorValues) {
  const phone = values.phone.trim() || null;
  const website = normalizeWebsite(values.website) || null;
  const address = values.address.trim() || null;
  const notes = values.notes.trim();
  return {
    name: values.name.trim(),
    contact_name: values.contactName.trim() || null,
    contact_email: values.email.trim().toLowerCase() || null,
    contact_phone: phone,
    contact_social: website,
    phone,
    website,
    address,
    notes,
  };
}

function ownerResearchSummary(input: { name: string; address: string | null; phone: string | null; website: string | null; notes: string }) {
  const parts = [
    `Added by the owner.`,
    input.address ? `Address: ${input.address}.` : null,
    input.phone ? `Phone: ${input.phone}.` : null,
    input.website ? `Website: ${input.website}.` : null,
    input.notes ? input.notes : null,
    `Atlas has not emailed, called, or texted ${input.name}.`,
  ].filter(Boolean);
  return parts.join(" ").slice(0, 3000);
}

export async function createProspect(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const { supabase } = await requireProspectOwner(organizationId, formData);
  const values = editorValues(formData);
  if (Object.keys(validateProspectEditor(values, false)).length > 0) {
    redirect(listPath(formData, "invalid"));
  }
  const columns = editorColumns(values);
  const { data, error } = await supabase
    .from("organization_opportunities")
    .insert({
      organization_id: organizationId,
      name: columns.name,
      opportunity_type: "customer",
      stage: columns.phone ? "ready_for_follow_up" : "needs_client_input",
      fit_score: 0,
      owner_role: "client",
      source_label: "Added by owner",
      source_url: columns.website && columns.website.length >= 8 ? columns.website.slice(0, 2000) : null,
      contact_name: columns.contact_name,
      contact_email: columns.contact_email,
      contact_phone: columns.phone,
      contact_social: columns.website,
      research_summary: ownerResearchSummary({
        name: columns.name,
        address: columns.address,
        phone: columns.phone,
        website: columns.website,
        notes: columns.notes,
      }),
      next_action: columns.phone ? CALL_PROSPECT_NEXT_ACTION : NO_PHONE_PROSPECT_NEXT_ACTION,
      metadata: {
        manual_entry: true,
        formatted_address: columns.address,
        website_url: columns.website,
        owner_notes: columns.notes || null,
        no_outreach_sent: true,
        accepted_for_calling: Boolean(columns.phone),
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Atlas create prospect failed", error);
    redirect(listPath(formData, "failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: data.id,
    organization_id: organizationId,
    event_type: "created",
    actor_role: "client",
    summary: "Owner added this prospect by hand. Atlas did not contact anyone.",
    body: columns.notes || null,
  });

  revalidateProspectDesk(data.id);
  redirect(detailPath(data.id, formData, "created"));
}

export async function updateProspect(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(listPath(formData, "invalid"));
  }
  const values = editorValues(formData);
  if (Object.keys(validateProspectEditor(values, false)).length > 0) {
    redirect(detailPath(opportunityId, formData, "invalid"));
  }

  const { data: existing } = await supabase
    .from("organization_opportunities")
    .select("id, stage, metadata, next_action")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) {
    redirect(listPath(formData, "missing"));
  }

  const columns = editorColumns(values);
  const metadata = {
    ...asOpportunityMetadata(existing.metadata),
    formatted_address: columns.address,
    website_url: columns.website,
    owner_notes: columns.notes || null,
    // The owner typed this number; it now outranks whatever Google published.
    national_phone_number: columns.phone,
    owner_edited_at: new Date().toISOString(),
  };

  // Adding a phone to a "Needs phone" prospect puts it on the call list.
  const stage =
    existing.stage === "needs_client_input" && columns.phone
      ? "ready_for_follow_up"
      : existing.stage === "ready_for_follow_up" && !columns.phone
        ? "needs_client_input"
        : existing.stage;
  const nextAction =
    existing.stage !== stage
      ? columns.phone
        ? CALL_PROSPECT_NEXT_ACTION
        : NO_PHONE_PROSPECT_NEXT_ACTION
      : existing.next_action;

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      name: columns.name,
      contact_name: columns.contact_name,
      contact_email: columns.contact_email,
      contact_phone: columns.phone,
      contact_social: columns.website,
      research_summary: ownerResearchSummary({
        name: columns.name,
        address: columns.address,
        phone: columns.phone,
        website: columns.website,
        notes: columns.notes,
      }),
      stage,
      next_action: nextAction,
      metadata,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Atlas update prospect failed", error);
    redirect(detailPath(opportunityId, formData, "failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "client",
    summary: "Owner edited the prospect details. Atlas did not contact anyone.",
    body: columns.notes || null,
  });

  revalidateProspectDesk(opportunityId);
  redirect(detailPath(opportunityId, formData, "updated"));
}

export async function deleteProspect(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(listPath(formData, "invalid"));
  }

  await supabase.from("organization_opportunity_events").delete().eq("opportunity_id", opportunityId).eq("organization_id", organizationId);
  // Let HUNTER offer the listing again instead of pointing at a deleted row.
  await supabase
    .from("organization_hunter_review_items")
    .update({ accepted_opportunity_id: null, status: "dismissed" })
    .eq("organization_id", organizationId)
    .eq("accepted_opportunity_id", opportunityId);

  const { error } = await supabase
    .from("organization_opportunities")
    .delete()
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Atlas delete prospect failed", error);
    redirect(detailPath(opportunityId, formData, "failed"));
  }

  revalidateProspectDesk(opportunityId);
  redirect(listPath(formData, "deleted"));
}

export async function setProspectStage(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const stage = text(formData, "stage", 40);
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId) || !isOwnerProspectStage(stage)) {
    redirect(listPath(formData, "invalid"));
  }

  const { data: existing } = await supabase
    .from("organization_opportunities")
    .select("id, name, stage, metadata, contact_phone")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) {
    redirect(listPath(formData, "missing"));
  }

  const metadata = { ...asOpportunityMetadata(existing.metadata) };
  const jobValue = stage === "won" ? parseJobValue(formData.get("jobValue")) : null;
  if (stage === "won") {
    if (jobValue != null) metadata[JOB_VALUE_METADATA_KEY] = jobValue;
    metadata.won_at = new Date().toISOString();
  }
  if (stage === "lost") metadata.lost_at = new Date().toISOString();
  if (stage === "contacted") metadata.owner_contacted_at = new Date().toISOString();

  const nextAction =
    stage === "won"
      ? "Client. Deliver the job and ask for a review or referral."
      : stage === "lost"
        ? "Not now. Check back in a few months if it still fits."
        : stage === "responded"
          ? "They replied. Book the job or send a quote."
          : stage === "contacted"
            ? "You reached out. Follow up in 2 to 3 days if there is no reply."
            : existing.contact_phone
              ? CALL_PROSPECT_NEXT_ACTION
              : NO_PHONE_PROSPECT_NEXT_ACTION;

  const { error } = await supabase
    .from("organization_opportunities")
    .update({ stage, next_action: nextAction, metadata })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Atlas stage change failed", error);
    redirect(detailPath(opportunityId, formData, "failed"));
  }

  const eventType =
    stage === "won" ? "won" : stage === "lost" ? "lost" : stage === "contacted" ? "contacted" : stage === "responded" ? "reply_received" : "next_action_set";
  const money = jobValue != null ? ` Job value ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(jobValue)}.` : "";
  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: eventType,
    actor_role: "client",
    summary: `Owner moved ${existing.name} to ${stage.replaceAll("_", " ")}.${money} Atlas did not contact anyone.`,
    body: null,
  });

  revalidateProspectDesk(opportunityId);
  const returnTo = text(formData, "returnTo", 20);
  const status = stage === "won" ? "won" : stage === "lost" ? "lost" : "staged";
  redirect(returnTo === "list" ? listPath(formData, status) : detailPath(opportunityId, formData, status));
}
