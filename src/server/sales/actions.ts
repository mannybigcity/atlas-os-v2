"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/server/auth/guards";
import {
  salesAssignedRoles,
  salesProspectStatuses,
} from "@/server/sales/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<string>(salesProspectStatuses);
const assignedRoles = new Set<string>(salesAssignedRoles);
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

function returnToTarget(formData: FormData, fallback: string) {
  const candidate = String(formData.get("returnTo") ?? "").trim();

  if (!candidate) {
    return fallback;
  }

  if (/^\/(?:clients|lions-den\/sales)(?:[?#].*)?$/i.test(candidate)) {
    return candidate;
  }

  return fallback;
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

function parseLocalDateTime(
  dateValue: string | null,
  timeValue: string | null,
  fallbackHour = "17",
) {
  if (!dateValue) {
    return null;
  }

  if (dateValue.includes("T")) {
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const time = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : `${fallbackHour}:00`;
  const parsed = new Date(`${dateValue}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseOffsetMinutes(formData: FormData, fallback = 120) {
  const raw = String(formData.get("reminderOffsetMinutes") ?? "").trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 10080) {
    return fallback;
  }

  return value;
}

export async function createSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const returnTo = returnToTarget(formData, "/lions-den/sales");
  const businessName = field(formData, "businessName", 250);
  const websiteInput = field(formData, "website", 1000);
  const website = normalizeWebUrl(websiteInput);
  const sourceInput = field(formData, "sourceUrl", 2000);
  const sourceUrl = normalizeWebUrl(sourceInput);
  const contactEmail = field(formData, "contactEmail", 320)?.toLowerCase() ?? null;
  const contactBasis = field(formData, "contactBasis", 50) ?? "unknown";

  if (!businessName || businessName.length < 2) {
    redirectWithError(returnTo, "business_name_required");
  }
  if (websiteInput && !website) {
    redirectWithError(returnTo, "invalid_website");
  }
  if (sourceInput && !sourceUrl) {
    redirectWithError(returnTo, "invalid_source");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirectWithError(returnTo, "invalid_email");
  }
  if (!contactBases.has(contactBasis)) {
    redirectWithError(returnTo, "invalid_contact_basis");
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

  redirect(`${returnTo}?crm=created`);
}

export async function updateSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
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
  const nextActionDateInput = field(formData, "nextActionDate", 40);
  const nextActionTimeInput = field(formData, "nextActionTime", 5);
  const reminderOffsetMinutes = parseOffsetMinutes(formData, 120);
  const nextActionAt = parseLocalDateTime(
    nextActionAtInput ?? nextActionDateInput,
    nextActionTimeInput,
  );

  if (!prospectId || !uuidPattern.test(prospectId)) {
    redirectWithError(returnTo, "invalid_prospect");
  }
  if (!businessName || businessName.length < 2) {
    redirectWithError(returnTo, "business_name_required");
  }
  if (!status || !statuses.has(status) || !assignedRole || !assignedRoles.has(assignedRole)) {
    redirectWithError(returnTo, "invalid_stage");
  }
  if (websiteInput && !website) {
    redirectWithError(returnTo, "invalid_website");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirectWithError(returnTo, "invalid_email");
  }
  if (fitScore !== null && (!Number.isInteger(fitScore) || fitScore < 0 || fitScore > 100)) {
    redirectWithError(returnTo, "invalid_fit_score");
  }
  if (
    (nextActionAtInput || nextActionDateInput) &&
    !nextActionAt
  ) {
    redirectWithError(returnTo, "invalid_next_action_date");
  }

  const supabase = await createClient();
  if (status === "approved_for_outreach") {
    const { data: existing } = await supabase
      .from("atlas_sales_prospects")
      .select("outreach_approved_at")
      .eq("id", prospectId)
      .maybeSingle();

    if (!existing?.outreach_approved_at) {
      redirectWithError(returnTo, "approval_requires_gate");
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

  if (!error && nextActionAt) {
    await supabase.from("atlas_sales_events").insert({
      prospect_id: prospectId,
      actor_user_id: user.id,
      actor_role: "david",
      event_type: "follow_up.scheduled",
      direction: "internal",
      summary: "Follow-up scheduled",
      body: field(formData, "nextAction", 1000) ?? "Next follow-up scheduled",
      metadata: {
        reminder_offset_minutes: reminderOffsetMinutes,
        next_action_at: nextActionAt,
      },
      occurred_at: nextActionAt,
    });
  }

  redirect(`${returnTo}?crm=${error ? "update_failed" : "updated"}`);
}

export async function addSalesNote(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
  const prospectId = field(formData, "prospectId", 36);
  const body = field(formData, "body", 10000);

  if (!prospectId || !uuidPattern.test(prospectId) || !body) {
    redirectWithError(returnTo, "invalid_note");
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

  redirect(`${returnTo}?crm=${error ? "note_failed" : "note_added"}`);
}

export async function approveSalesOutreach(formData: FormData) {
  await requireSuperAdmin("/lions-den/sales");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
  const prospectId = field(formData, "prospectId", 36);
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((value) => ["email", "phone", "sms", "social"].includes(value));

  if (!prospectId || !uuidPattern.test(prospectId) || channels.length === 0) {
    redirectWithError(returnTo, "approval_requires_channel");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_atlas_sales_outreach", {
    p_prospect_id: prospectId,
    p_channels: channels,
  });

  redirect(`${returnTo}?crm=${error ? "approval_blocked" : "approved"}`);
}

export async function suppressSalesProspect(formData: FormData) {
  const user = await requireSuperAdmin("/lions-den/sales");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
  const prospectId = field(formData, "prospectId", 36);
  const reason = field(formData, "reason", 30) ?? "manual";
  const channel = field(formData, "channel", 20) ?? "all";

  if (
    !prospectId ||
    !uuidPattern.test(prospectId) ||
    !["opt_out", "complaint", "hard_bounce", "legal", "manual", "other"].includes(reason) ||
    !["all", "email", "phone", "sms", "social"].includes(channel)
  ) {
    redirectWithError(returnTo, "invalid_suppression");
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

  redirect(`${returnTo}?crm=${error ? "suppression_failed" : "suppressed"}`);
}

export async function logSalesFollowUp(formData: FormData) {
  const user = await requireSuperAdmin("/clients");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
  const prospectId = field(formData, "prospectId", 36);
  const summary = field(formData, "summary", 500) ?? "Follow-up logged";
  const note = field(formData, "note", 5000);
  const nextAction = field(formData, "nextAction", 1000);
  const nextActionAt = parseLocalDateTime(
    field(formData, "nextActionDate", 40) ?? field(formData, "nextActionAt", 40),
    field(formData, "nextActionTime", 5),
  );
  const reminderOffsetMinutes = parseOffsetMinutes(formData, 120);

  if (!prospectId || !uuidPattern.test(prospectId)) {
    redirectWithError(returnTo, "invalid_prospect");
  }

  const supabase = await createClient();
  const { error: prospectError } = await supabase
    .from("atlas_sales_prospects")
    .update({
      last_contacted_at: new Date().toISOString(),
      next_action: nextAction,
      next_action_at: nextActionAt,
      status: "contacted",
      updated_by: user.id,
    })
    .eq("id", prospectId);

  const { error: eventError } = await supabase.from("atlas_sales_events").insert({
    prospect_id: prospectId,
    actor_user_id: user.id,
    actor_role: "david",
    event_type: "follow_up.scheduled",
    direction: "internal",
    summary,
    body: note,
    metadata: {
      reminder_offset_minutes: reminderOffsetMinutes,
      next_action: nextAction,
      next_action_at: nextActionAt,
    },
    occurred_at: new Date().toISOString(),
  });

  redirect(
    `${returnTo}?crm=${
      prospectError || eventError ? "follow_up_failed" : "follow_up_logged"
    }`,
  );
}

export async function completeSalesFollowUp(formData: FormData) {
  const user = await requireSuperAdmin("/clients");
  const returnTo = returnToTarget(
    formData,
    `/lions-den/sales/${String(formData.get("prospectId") ?? "").trim()}`,
  );
  const prospectId = field(formData, "prospectId", 36);
  const summary = field(formData, "summary", 500) ?? "Follow-up completed";
  const note = field(formData, "note", 5000);
  const nextAction = field(formData, "nextAction", 1000);
  const nextActionAt = parseLocalDateTime(
    field(formData, "nextActionDate", 40) ?? field(formData, "nextActionAt", 40),
    field(formData, "nextActionTime", 5),
  );

  if (!prospectId || !uuidPattern.test(prospectId)) {
    redirectWithError(returnTo, "invalid_prospect");
  }

  const supabase = await createClient();
  const { error: prospectError } = await supabase
    .from("atlas_sales_prospects")
    .update({
      last_contacted_at: new Date().toISOString(),
      next_action: nextAction,
      next_action_at: nextActionAt,
      status: "contacted",
      updated_by: user.id,
    })
    .eq("id", prospectId);

  const { error: eventError } = await supabase.from("atlas_sales_events").insert({
    prospect_id: prospectId,
    actor_user_id: user.id,
    actor_role: "david",
    event_type: "contact.attempted",
    direction: "internal",
    summary,
    body: note,
    metadata: {
      completed: true,
      next_action: nextAction,
      next_action_at: nextActionAt,
    },
    occurred_at: new Date().toISOString(),
  });

  redirect(
    `${returnTo}?crm=${
      prospectError || eventError ? "follow_up_failed" : "follow_up_completed"
    }`,
  );
}

export async function convertSalesProspectToClient(formData: FormData) {
  const user = await requireSuperAdmin("/clients");
  const returnTo = returnToTarget(formData, "/clients");
  const prospectId = field(formData, "prospectId", 36);
  const targetOrganizationId = field(formData, "targetOrganizationId", 36);

  if (
    !prospectId ||
    !uuidPattern.test(prospectId) ||
    !targetOrganizationId ||
    !uuidPattern.test(targetOrganizationId)
  ) {
    redirectWithError(returnTo, "invalid_conversion");
  }

  const supabase = await createClient();
  const [{ data: organization }, { error: prospectError }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", targetOrganizationId)
      .maybeSingle(),
    supabase
      .from("atlas_sales_prospects")
      .update({
        converted_organization_id: targetOrganizationId,
        status: "won",
        updated_by: user.id,
      })
      .eq("id", prospectId),
  ]);

  if (!organization || prospectError) {
    redirectWithError(returnTo, "conversion_failed");
  }

  await supabase.from("atlas_sales_events").insert({
    prospect_id: prospectId,
    actor_user_id: user.id,
    actor_role: "manny",
    event_type: "prospect.converted",
    direction: "internal",
    summary: `Converted to ${organization.name}`,
    body: organization.slug ? `Linked to client workspace ${organization.slug}.` : null,
    metadata: {
      organization_id: organization.id,
      organization_name: organization.name,
      organization_slug: organization.slug,
    },
    occurred_at: new Date().toISOString(),
  });

  redirect(`${returnTo}?crm=converted`);
}

export async function deleteSalesProspect(formData: FormData) {
  await requireSuperAdmin("/clients");
  const returnTo = returnToTarget(formData, "/clients");
  const prospectId = field(formData, "prospectId", 36);
  const confirmName = field(formData, "confirmName", 250);

  if (!prospectId || !uuidPattern.test(prospectId)) {
    redirectWithError(returnTo, "invalid_prospect");
  }

  const supabase = createAdminClient();
  const { data: prospect, error: prospectLookupError } = await supabase
    .from("atlas_sales_prospects")
    .select("id, business_name")
    .eq("id", prospectId)
    .maybeSingle();

  if (prospectLookupError || !prospect) {
    redirectWithError(returnTo, "delete_missing");
  }

  if (confirmName && confirmName !== prospect.business_name) {
    redirectWithError(returnTo, "delete_mismatch");
  }

  const { data: blockingChildren, error: blockingChildrenError } = await supabase
    .from("atlas_sales_prospects")
    .select("id")
    .eq("duplicate_of", prospectId)
    .limit(1);

  if (blockingChildrenError) {
    redirectWithError(returnTo, "delete_failed");
  }

  if ((blockingChildren ?? []).length > 0) {
    redirectWithError(returnTo, "delete_blocked");
  }

  const cleanupTargets = [
    supabase.from("atlas_sales_events").delete().eq("prospect_id", prospectId),
    supabase.from("atlas_sales_prospect_sources").delete().eq("prospect_id", prospectId),
    supabase.from("atlas_contact_suppressions").delete().eq("prospect_id", prospectId),
    supabase.from("atlas_agent_runs").delete().eq("prospect_id", prospectId),
  ] as const;
  const cleanupResults = await Promise.all(cleanupTargets);
  if (cleanupResults.some(({ error }) => Boolean(error))) {
    redirectWithError(returnTo, "delete_failed");
  }

  const { error: deleteError } = await supabase
    .from("atlas_sales_prospects")
    .delete()
    .eq("id", prospectId);

  if (deleteError) {
    redirectWithError(returnTo, "delete_failed");
  }

  redirect(`${returnTo}?crm=deleted`);
}
