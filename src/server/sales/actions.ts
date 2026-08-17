"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";
import {
  salesAssignedRoles,
  salesProspectStatuses,
} from "@/server/sales/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<string>(salesProspectStatuses);
const assignedRoles = new Set<string>(salesAssignedRoles);
const taskTypes = new Set(["follow_up", "call", "email", "meeting", "research", "review", "other"]);
const contactBases = new Set([
  "inbound_consent",
  "public_business_contact",
  "referral",
  "prior_relationship",
  "customer",
  "unknown",
]);

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function normalizeWebUrl(value: string | null) {
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      !parsed.hostname.includes(".")
    ) {
      return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function domainFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function redirectWithError(path: string, code: string): never {
  redirect(`${path}?crm=${encodeURIComponent(code)}`);
}

export async function createSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const businessName = field(formData, "businessName", 250);
  const websiteInput = field(formData, "website", 1000);
  const website = normalizeWebUrl(websiteInput);
  const sourceInput = field(formData, "sourceUrl", 2000);
  const sourceUrl = normalizeWebUrl(sourceInput);
  const contactEmail = field(formData, "contactEmail", 320)?.toLowerCase() ?? null;
  const contactBasis = field(formData, "contactBasis", 50) ?? "unknown";

  if (!businessName || businessName.length < 2) {
    redirectWithError("/lions-den/sales", "business_name_required");
  }
  if (websiteInput && !website) {
    redirectWithError("/lions-den/sales", "invalid_website");
  }
  if (sourceInput && !sourceUrl) {
    redirectWithError("/lions-den/sales", "invalid_source");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirectWithError("/lions-den/sales", "invalid_email");
  }
  if (!contactBases.has(contactBasis)) {
    redirectWithError("/lions-den/sales", "invalid_contact_basis");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atlas_sales_prospects")
    .insert({
      business_name: businessName,
      status: "researching",
      assigned_role: "hunter",
      industry: field(formData, "industry", 200),
      city: field(formData, "city", 150),
      region: field(formData, "region", 100),
      website,
      website_domain: domainFromUrl(website),
      contact_name: field(formData, "contactName", 200),
      contact_email: contactEmail,
      contact_phone: field(formData, "contactPhone", 50),
      social_media: field(formData, "socialMedia", 1500),
      contact_basis: contactBasis,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError("/lions-den/sales", "create_failed");
  }

  const { error: sourceError } = await supabase
    .from("atlas_sales_prospect_sources")
    .insert({
      prospect_id: data.id,
      source_type: sourceUrl ? "business_website" : "manual",
      source_url: sourceUrl,
      facts: { capture_method: "atlas_admin_entry" },
      created_by: user.id,
    });

  if (sourceError) {
    await supabase.from("atlas_sales_events").insert({
      prospect_id: data.id,
      actor_user_id: user.id,
      actor_role: "system",
      event_type: "note.added",
      direction: "internal",
      summary: "Prospect created, but source provenance needs review",
    });
  }

  redirect(`/lions-den/sales/${data.id}?crm=created`);
}

export async function createSalesTask(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const prospectId = field(formData, "prospectId", 36);
  const title = field(formData, "title", 250);
  const details = field(formData, "details", 5000);
  const taskType = field(formData, "taskType", 30) ?? "follow_up";
  const dueInput = field(formData, "dueAt", 40);
  const dueAt = dueInput ? `${dueInput}T17:00:00.000Z` : null;
  const returnToInput = field(formData, "returnTo", 200);
  const returnTo = returnToInput?.startsWith("/lions-den/sales") ? returnToInput : `/lions-den/sales/${prospectId ?? ""}`;
  if (!prospectId || !uuidPattern.test(prospectId) || !title || title.length < 2 || !taskTypes.has(taskType) || (dueInput && !/^\d{4}-\d{2}-\d{2}$/.test(dueInput))) {
    redirectWithError(returnTo, "invalid_task");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("atlas_sales_tasks").insert({ prospect_id: prospectId, title, details, task_type: taskType, due_at: dueAt, assigned_role: "david", created_by: user.id, updated_by: user.id });
  redirect(`${returnTo}?crm=${error ? "task_failed" : "task_created"}`);
}

export async function completeSalesTask(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const taskId = field(formData, "taskId", 36);
  const prospectId = field(formData, "prospectId", 36);
  if (!taskId || !uuidPattern.test(taskId) || !prospectId || !uuidPattern.test(prospectId)) redirectWithError(`/lions-den/sales/${prospectId ?? ""}`, "invalid_task");
  const supabase = await createClient();
  const { error } = await supabase.from("atlas_sales_tasks").update({ status: "completed", completed_at: new Date().toISOString(), updated_by: user.id }).eq("id", taskId).eq("prospect_id", prospectId);
  redirect(`/lions-den/sales/${prospectId}?crm=${error ? "task_failed" : "task_completed"}`);
}

export async function updateSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const prospectId = field(formData, "prospectId", 36);
  const businessName = field(formData, "businessName", 250);
  const status = field(formData, "status", 50);
  const assignedRole = field(formData, "assignedRole", 50);
  const websiteInput = field(formData, "website", 1000);
  const website = normalizeWebUrl(websiteInput);
  const contactEmail = field(formData, "contactEmail", 320)?.toLowerCase() ?? null;
  const fitScoreInput = field(formData, "fitScore", 3);
  const fitScore = fitScoreInput === null ? null : Number(fitScoreInput);
  const nextActionAtInput = field(formData, "nextActionAt", 40);
  const nextActionAt = nextActionAtInput
    ? `${nextActionAtInput}T17:00:00.000Z`
    : null;

  if (!prospectId || !uuidPattern.test(prospectId)) {
    redirectWithError("/lions-den/sales", "invalid_prospect");
  }
  if (!businessName || businessName.length < 2) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "business_name_required");
  }
  if (!status || !statuses.has(status) || !assignedRole || !assignedRoles.has(assignedRole)) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "invalid_stage");
  }
  if (websiteInput && !website) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "invalid_website");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "invalid_email");
  }
  if (fitScore !== null && (!Number.isInteger(fitScore) || fitScore < 0 || fitScore > 100)) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "invalid_fit_score");
  }
  if (nextActionAtInput && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionAtInput)) {
    redirectWithError(`/lions-den/sales/${prospectId}`, "invalid_next_action_date");
  }

  const supabase = await createClient();
  if (status === "approved_for_outreach") {
    const { data: existing } = await supabase
      .from("atlas_sales_prospects")
      .select("outreach_approved_at")
      .eq("id", prospectId)
      .maybeSingle();

    if (!existing?.outreach_approved_at) {
      redirectWithError(`/lions-den/sales/${prospectId}`, "approval_requires_gate");
    }
  }

  const { error } = await supabase
    .from("atlas_sales_prospects")
    .update({
      business_name: businessName,
      status,
      assigned_role: assignedRole,
      industry: field(formData, "industry", 200),
      address_line_1: field(formData, "addressLine1", 300),
      city: field(formData, "city", 150),
      region: field(formData, "region", 100),
      postal_code: field(formData, "postalCode", 30),
      website,
      website_domain: domainFromUrl(website),
      contact_name: field(formData, "contactName", 200),
      contact_email: contactEmail,
      contact_phone: field(formData, "contactPhone", 50),
      social_media: field(formData, "socialMedia", 1500),
      fit_score: fitScore,
      fit_reason: field(formData, "fitReason", 2000),
      research_summary: field(formData, "researchSummary", 5000),
      next_action: field(formData, "nextAction", 1000),
      next_action_at: nextActionAt,
      updated_by: user.id,
    })
    .eq("id", prospectId);

  redirect(`/lions-den/sales/${prospectId}?crm=${error ? "update_failed" : "updated"}`);
}

export async function addSalesNote(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const prospectId = field(formData, "prospectId", 36);
  const body = field(formData, "body", 10000);

  if (!prospectId || !uuidPattern.test(prospectId) || !body) {
    redirectWithError("/lions-den/sales", "invalid_note");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("atlas_sales_events").insert({
    prospect_id: prospectId,
    actor_user_id: user.id,
    actor_role: "david",
    event_type: "note.added",
    direction: "internal",
    summary: "DAVID CRM note added",
    body,
  });

  redirect(`/lions-den/sales/${prospectId}?crm=${error ? "note_failed" : "note_added"}`);
}

export async function approveSalesOutreach(formData: FormData) {
  await requireSuperAdmin("/lions-den/sales");
  const prospectId = field(formData, "prospectId", 36);
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((value) => ["email", "phone", "sms", "social"].includes(value));

  if (!prospectId || !uuidPattern.test(prospectId) || channels.length === 0) {
    redirectWithError("/lions-den/sales", "approval_requires_channel");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_atlas_sales_outreach", {
    p_prospect_id: prospectId,
    p_channels: channels,
  });

  redirect(`/lions-den/sales/${prospectId}?crm=${error ? "approval_blocked" : "approved"}`);
}

export async function suppressSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const prospectId = field(formData, "prospectId", 36);
  const reason = field(formData, "reason", 30) ?? "manual";
  const channel = field(formData, "channel", 20) ?? "all";

  if (
    !prospectId ||
    !uuidPattern.test(prospectId) ||
    !["opt_out", "complaint", "hard_bounce", "legal", "manual", "other"].includes(reason) ||
    !["all", "email", "phone", "sms", "social"].includes(channel)
  ) {
    redirectWithError("/lions-den/sales", "invalid_suppression");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("atlas_contact_suppressions").insert({
    prospect_id: prospectId,
    scope_type: "prospect",
    scope_value: prospectId,
    channel,
    reason,
    note: field(formData, "note", 2000),
    created_by: user.id,
  });

  redirect(`/lions-den/sales/${prospectId}?crm=${error ? "suppression_failed" : "suppressed"}`);
}
