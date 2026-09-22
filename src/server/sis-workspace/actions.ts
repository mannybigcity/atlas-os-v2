"use server";

import { deskDateLabel, deskDateOnly } from "@/lib/desk-time";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/server/auth/guards";
import { isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { isArchivedDeskClient, withArchivedDeskClient } from "@/lib/lions-den/desk-clients";
import {
  activePartyHolds,
  encodeSuggestions,
  isPartySlot,
  partyBlockStartIso,
  partySlotColumnMissing,
  partySlotLabel,
  SIS_PARTY_SLOT_MIGRATION,
  suggestOpenSlots,
  type PartyHoldSource,
  type PartySlot,
  type PartySlotActionResult,
} from "@/lib/sis/party-availability";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";
import { getOrganizationsForSuperAdmin, getUserMemberships } from "@/server/organizations/queries";

const stages = ["new_inquiry", "contact_within_24_hours", "qualified", "quote_sent", "deposit_pending", "booked", "prep_in_progress", "party_complete", "diy_subscription_offered", "won_follow_up"] as const;
type PartyStage = (typeof stages)[number];

function text(formData: FormData, key: string, max: number) { return String(formData.get(key) ?? "").trim().slice(0, max); }
function date(formData: FormData, key: string) { const value = text(formData, key, 10); return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

async function getSisManager() {
  const user = await getVerifiedUser();
  if (!user) throw new Error("Unauthorized");
  if (isSuperAdminEmail(user.email)) {
    const organizations = await getOrganizationsForSuperAdmin();
    const sis = organizations.data.find((organization) => isSisOrganization(organization));
    if (!sis) throw new Error("SIS manager access required");
    return { user, organizationId: sis.id };
  }
  const memberships = await getUserMemberships(user.id);
  const membership = memberships.data.find((item) => isSisOrganization(item.organization));
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) throw new Error("SIS manager access required");
  return { user, organizationId: membership.organization!.id };
}

export async function createSisPartyEvent(formData: FormData) {
  const { user, organizationId } = await getSisManager();
  const hostName = text(formData, "hostName", 220);
  const nextAction = text(formData, "nextAction", 1200);
  const nextActionDue = date(formData, "nextActionDue");
  if (hostName.length < 2 || nextAction.length < 2 || !nextActionDue) throw new Error("Host name and a dated next action are required.");
  if (nextActionDue < deskDateOnly()) throw new Error("Next action cannot be in the past.");
  const requestedDate = date(formData, "preferredDate");
  const requestedSlot = text(formData, "partySlot", 2);
  const partySlot = isPartySlot(requestedSlot) ? requestedSlot : null;
  if ((requestedDate && !partySlot) || (!requestedDate && partySlot)) {
    throw new Error("To hold a block, choose both a date and AM or PM. Leave both empty to save the inquiry without a date.");
  }

  let hold: { preferred_date: string; party_slot: PartySlot; party_starts_at: string; calendar_status: "tentative" } | null = null;
  let suggestions = [] as PartySlotActionResult["suggestions"];
  let slotConflict = false;
  if (requestedDate && partySlot) {
    const listed = await readSlotRows(organizationId);
    if (listed.error) throw new Error(slotReadError(listed.error));
    const holds = activePartyHolds(listed.rows);
    if (holds.some((item) => item.preferredDate === requestedDate && item.partySlot === partySlot)) {
      slotConflict = true;
      suggestions = suggestOpenSlots({ holds, fromDate: deskDateOnly(), avoid: { date: requestedDate, slot: partySlot } });
    } else {
      const partyStartsAt = partyBlockStartIso(requestedDate, partySlot);
      if (!partyStartsAt) throw new Error("That party date is not valid.");
      hold = { preferred_date: requestedDate, party_slot: partySlot, party_starts_at: partyStartsAt, calendar_status: "tentative" };
    }
  }

  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase.from("organization_sis_customers").insert({ organization_id: organizationId, display_name: hostName, email: text(formData, "email", 320) || null, phone: text(formData, "phone", 80) || null, source_label: "SIS operations", created_by: user.id }).select("id").single();
  if (customerError || !customer) throw new Error(customerError?.message ?? "Unable to create customer.");
  const { data: lead, error: leadError } = await supabase.from("organization_sis_leads").insert({ organization_id: organizationId, customer_id: customer.id, offer: "Adult door-hanger paint party", status: "new", owner_user_id: user.id, next_action: nextAction, next_action_due: nextActionDue, created_by: user.id }).select("id").single();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Unable to create party lead.");
  const party = {
    organization_id: organizationId,
    lead_id: lead.id,
    host_name: hostName,
    stage: "new_inquiry",
    owner_user_id: user.id,
    next_action: nextAction,
    next_action_due: nextActionDue,
    preferred_contact_method: text(formData, "contactMethod", 10) || null,
    party_type: text(formData, "partyType", 120) || "Adult door-hanger paint party",
    guest_count: Number(formData.get("guestCount")) || null,
    created_by: user.id,
  };
  let { error } = await supabase.from("organization_sis_party_events").insert({ ...party, ...(hold ?? {}) });
  if (error && hold && isSlotUniqueViolation(error)) {
    slotConflict = true;
    suggestions = suggestOpenSlots({
      holds: activePartyHolds((await readSlotRows(organizationId)).rows),
      fromDate: deskDateOnly(),
      avoid: { date: hold.preferred_date, slot: hold.party_slot },
    });
    hold = null;
    const retry = await supabase.from("organization_sis_party_events").insert(party);
    error = retry.error;
  }
  if (error) throw new Error(error.message);
  revalidatePath("/client");
  revalidatePath("/client/calendar");
  if (slotConflict) redirect(withDeskParams(formData, "/client", { party: "slot_taken", open: encodeSuggestions(suggestions) }));
  if (hold) redirect(withDeskParams(formData, "/client", { party: "slot_held" }));
}

export async function bookSisPartySlot(_prev: PartySlotActionResult, formData: FormData): Promise<PartySlotActionResult> {
  const spanish = text(formData, "lang", 2) === "es";
  const manager = await sisManagerResult(spanish);
  if (manager.result) return manager.result;
  const organizationId = manager.organizationId;
  const partyEventId = text(formData, "partyEventId", 80);
  const preferredDate = date(formData, "preferredDate");
  const requestedSlot = text(formData, "partySlot", 2);
  const calendarStatus = text(formData, "calendarStatus", 20);
  const partySlot = isPartySlot(requestedSlot) ? requestedSlot : null;
  if (!partyEventId || !preferredDate || !partySlot || (calendarStatus !== "tentative" && calendarStatus !== "confirmed")) {
    return slotResult(false, "invalid", spanish ? "Elige una fiesta, una fecha y AM o PM." : "Choose a party, a date, and AM or PM.");
  }
  const listed = await readSlotRows(organizationId);
  if (listed.error) return slotResult(false, "error", slotReadError(listed.error));
  const holds = activePartyHolds(listed.rows);
  const taken = holds.find((item) => item.preferredDate === preferredDate && item.partySlot === partySlot && item.id !== partyEventId);
  if (taken) {
    return {
      ok: false,
      code: "conflict",
      message: spanish ? "Ese bloque ya está apartado. No se reservó dos veces." : "That block is already held. It was not double-booked.",
      suggestions: suggestOpenSlots({ holds, fromDate: deskDateOnly(), avoid: { date: preferredDate, slot: partySlot } }),
    };
  }
  const partyStartsAt = partyBlockStartIso(preferredDate, partySlot);
  if (!partyStartsAt) return slotResult(false, "invalid", spanish ? "Esa fecha no es válida." : "That party date is not valid.");
  const { data: updated, error } = await listed.supabase
    .from("organization_sis_party_events")
    .update({
      preferred_date: preferredDate,
      party_slot: partySlot,
      calendar_status: calendarStatus,
      party_starts_at: partyStartsAt,
    })
    .eq("organization_id", organizationId)
    .eq("id", partyEventId)
    .select("id, host_name")
    .maybeSingle();
  if (error && isSlotUniqueViolation(error)) {
    const latest = activePartyHolds((await readSlotRows(organizationId)).rows);
    return {
      ok: false,
      code: "conflict",
      message: spanish ? "Ese bloque ya está apartado. No se reservó dos veces." : "That block is already held. It was not double-booked.",
      suggestions: suggestOpenSlots({ holds: latest, fromDate: deskDateOnly(), avoid: { date: preferredDate, slot: partySlot } }),
    };
  }
  if (error) return slotResult(false, "error", error.message);
  if (!updated) return slotResult(false, "invalid", spanish ? "Esa fiesta no está en este escritorio." : "That party is not on this SIS desk.");
  revalidateParty(partyEventId);
  const when = `${partySlotLabel(partySlot)} · ${deskDateLabel(preferredDate, spanish)}`;
  return slotResult(
    true,
    "held",
    spanish ? `${when} quedó apartado para ${updated.host_name}.` : `${when} is held for ${updated.host_name}.`,
  );
}

export async function cancelSisPartySlot(_prev: PartySlotActionResult, formData: FormData): Promise<PartySlotActionResult> {
  const spanish = text(formData, "lang", 2) === "es";
  const manager = await sisManagerResult(spanish);
  if (manager.result) return manager.result;
  const outcome = await cancelPartyHold(manager.organizationId, text(formData, "partyEventId", 80));
  if (!outcome.ok) return slotResult(false, "error", spanish ? "Ese bloque ya estaba libre." : outcome.message);
  return slotResult(true, "cancelled", spanish ? "Reserva cancelada. El bloque quedó libre." : "Hold cancelled. That block is open again.");
}

export async function releaseSisPartySlotForm(formData: FormData) {
  const { organizationId } = await getSisManager();
  const partyEventId = text(formData, "partyEventId", 80);
  const outcome = await cancelPartyHold(organizationId, partyEventId);
  const returnTo = safePartyReturn(text(formData, "returnTo", 160));
  redirect(withDeskParams(formData, returnTo, { slot: outcome.ok ? "cancelled" : "cancel_failed" }));
}

export async function advanceSisPartyStage(formData: FormData) {
  const { organizationId } = await getSisManager();
  const partyEventId = text(formData, "partyEventId", 80);
  const stage = text(formData, "stage", 80) as PartyStage;
  const nextAction = text(formData, "nextAction", 1200);
  const nextActionDue = date(formData, "nextActionDue");
  if (!partyEventId || !stages.includes(stage) || !nextAction || !nextActionDue) throw new Error("A valid stage and next action are required.");
  if (nextActionDue < deskDateOnly()) throw new Error("Next action cannot be in the past.");
  const supabase = await createClient();
  const { error } = await supabase.from("organization_sis_party_events").update({ stage, next_action: nextAction, next_action_due: nextActionDue }).eq("organization_id", organizationId).eq("id", partyEventId);
  if (error) throw new Error(error.message);
  revalidatePath("/client"); revalidatePath(`/client/sis/party/${partyEventId}`);
}

export async function updateSisCustomer(formData: FormData) {
  const { organizationId } = await getSisManager();
  const customerId = text(formData, "customerId", 80);
  const displayName = text(formData, "displayName", 220);
  const businessName = text(formData, "businessName", 220);
  const email = text(formData, "email", 320).toLowerCase();
  const phone = text(formData, "phone", 80);
  const notes = text(formData, "notes", 4000);
  if (!customerId || displayName.length < 2) throw new Error("A client name is required.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_sis_customers")
    .update({
      display_name: displayName,
      business_name: businessName || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    })
    .eq("organization_id", organizationId)
    .eq("id", customerId);
  if (error) throw new Error(error.message);
  revalidatePath("/client/clients");
  revalidatePath(`/client/clients/${customerId}`);
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg) params.set("previewOrg", previewOrg);
  if (workspace) params.set("workspace", workspace);
  params.set("prospect", "updated");
  redirect(`/client/clients/${customerId}?${params.toString()}`);
}

function clientsListPath(formData: FormData, status: string) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg) params.set("previewOrg", previewOrg);
  if (workspace) params.set("workspace", workspace);
  params.set("prospect", status);
  return `/client/clients?${params.toString()}`;
}

/**
 * Hides a SIS client from the Clients board. Related party rows stay put.
 * Available on every SIS sign-in.
 */
export async function deleteSisCustomer(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const customerId = text(formData, "customerId", 80);
  formData.set("clientRecord", "1");
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!customerId) redirect(clientsListPath(formData, "invalid"));

  const { data: existing } = await supabase
    .from("organization_sis_customers")
    .select("id, metadata")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing || isArchivedDeskClient(existing.metadata)) {
    redirect(clientsListPath(formData, "missing"));
  }

  const { error } = await supabase
    .from("organization_sis_customers")
    .update({ metadata: withArchivedDeskClient(existing.metadata) })
    .eq("id", customerId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Atlas delete SIS client failed", error);
    redirect(clientsListPath(formData, "failed"));
  }

  revalidatePath("/client/clients");
  revalidatePath(`/client/clients/${customerId}`);
  redirect(clientsListPath(formData, "client_deleted"));
}

export async function completeSisPartyTask(formData: FormData) {
  const { organizationId } = await getSisManager();
  const taskId = text(formData, "taskId", 80);
  if (!taskId) throw new Error("Task is required.");
  const supabase = await createClient();
  const { error } = await supabase.from("organization_sis_party_tasks").update({ status: "complete", completed_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("id", taskId).eq("status", "open");
  if (error) throw new Error(error.message);
  revalidatePath("/client");
}

type SlotRow = {
  id: string;
  host_name: string;
  preferred_date: string | null;
  party_slot: string | null;
  calendar_status: string;
};

async function readSlotRows(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_sis_party_events")
    .select("id, host_name, preferred_date, party_slot, calendar_status")
    .eq("organization_id", organizationId)
    .in("calendar_status", ["tentative", "confirmed"])
    .limit(500);
  return {
    supabase,
    error,
    rows: ((data ?? []) as SlotRow[]).map((row) => ({
      id: row.id,
      hostName: row.host_name,
      preferredDate: row.preferred_date,
      partySlot: row.party_slot,
      calendarStatus: row.calendar_status,
    })) satisfies PartyHoldSource[],
  };
}

function slotReadError(error: { message?: string; code?: string }) {
  if (partySlotColumnMissing(error)) {
    return `Party availability needs the SIS calendar migration. Run ${SIS_PARTY_SLOT_MIGRATION} in the Supabase SQL editor, then try again.`;
  }
  return error.message ?? "Unable to read party availability.";
}

function isSlotUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "23505" || /open_slot_uidx|duplicate key/i.test(error.message ?? "");
}

function slotResult(ok: boolean, code: PartySlotActionResult["code"], message: string): PartySlotActionResult {
  return { ok, code, message, suggestions: [] };
}

async function sisManagerResult(spanish: boolean): Promise<
  { organizationId: string; result?: undefined } | { organizationId?: undefined; result: PartySlotActionResult }
> {
  try {
    const manager = await getSisManager();
    return { organizationId: manager.organizationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized" || message === "SIS manager access required") {
      return {
        result: slotResult(
          false,
          "error",
          spanish
            ? "Solo un dueño o administrador de SIS puede apartar o cancelar un bloque."
            : "Only an SIS owner or admin can hold or cancel a block.",
        ),
      };
    }
    throw error;
  }
}

async function cancelPartyHold(organizationId: string, partyEventId: string) {
  if (!partyEventId) return { ok: false, message: "That block is already open." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_sis_party_events")
    .update({ calendar_status: "cancelled" })
    .eq("organization_id", organizationId)
    .eq("id", partyEventId)
    .in("calendar_status", ["tentative", "confirmed"])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "That block is already open." };
  revalidateParty(partyEventId);
  return { ok: true, message: "Hold cancelled." };
}

function revalidateParty(partyEventId: string) {
  revalidatePath("/client");
  revalidatePath("/client/calendar");
  revalidatePath(`/client/sis/party/${partyEventId}`);
}

function withDeskParams(formData: FormData, path: string, extra: Record<string, string>) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg) params.set("previewOrg", previewOrg);
  if (workspace) params.set("workspace", workspace);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function safePartyReturn(value: string) {
  if (value === "/client" || value === "/client/calendar" || /^\/client\/sis\/party\/[A-Za-z0-9-]+$/.test(value)) return value;
  return "/client/calendar";
}
