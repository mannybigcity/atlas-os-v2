"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/server/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getUserMemberships } from "@/server/organizations/queries";

const stages = ["new_inquiry", "contact_within_24_hours", "qualified", "quote_sent", "deposit_pending", "booked", "prep_in_progress", "party_complete", "diy_subscription_offered", "won_follow_up"] as const;
type PartyStage = (typeof stages)[number];

function text(formData: FormData, key: string, max: number) { return String(formData.get(key) ?? "").trim().slice(0, max); }
function date(formData: FormData, key: string) { const value = text(formData, key, 10); return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

async function getSisManager() {
  const user = await getVerifiedUser();
  if (!user) throw new Error("Unauthorized");
  const memberships = await getUserMemberships(user.id);
  const membership = memberships.data.find((item) => item.organization?.slug === "sis-custom-creations");
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) throw new Error("SIS manager access required");
  return { user, organizationId: membership.organization!.id };
}

export async function createSisPartyEvent(formData: FormData) {
  const { user, organizationId } = await getSisManager();
  const hostName = text(formData, "hostName", 220);
  const nextAction = text(formData, "nextAction", 1200);
  const nextActionDue = date(formData, "nextActionDue");
  if (hostName.length < 2 || nextAction.length < 2 || !nextActionDue) throw new Error("Host name and a dated next action are required.");
  if (nextActionDue < new Date().toISOString().slice(0, 10)) throw new Error("Next action cannot be in the past.");
  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase.from("organization_sis_customers").insert({ organization_id: organizationId, display_name: hostName, email: text(formData, "email", 320) || null, phone: text(formData, "phone", 80) || null, source_label: "SIS operations", created_by: user.id }).select("id").single();
  if (customerError || !customer) throw new Error(customerError?.message ?? "Unable to create customer.");
  const { data: lead, error: leadError } = await supabase.from("organization_sis_leads").insert({ organization_id: organizationId, customer_id: customer.id, offer: "Adult door-hanger paint party", status: "new", owner_user_id: user.id, next_action: nextAction, next_action_due: nextActionDue, created_by: user.id }).select("id").single();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Unable to create party lead.");
  const { error } = await supabase.from("organization_sis_party_events").insert({ organization_id: organizationId, lead_id: lead.id, host_name: hostName, stage: "new_inquiry", owner_user_id: user.id, next_action: nextAction, next_action_due: nextActionDue, preferred_contact_method: text(formData, "contactMethod", 10) || null, party_type: text(formData, "partyType", 120) || "Adult door-hanger paint party", guest_count: Number(formData.get("guestCount")) || null, created_by: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/client");
}

export async function advanceSisPartyStage(formData: FormData) {
  const { organizationId } = await getSisManager();
  const partyEventId = text(formData, "partyEventId", 80);
  const stage = text(formData, "stage", 80) as PartyStage;
  const nextAction = text(formData, "nextAction", 1200);
  const nextActionDue = date(formData, "nextActionDue");
  if (!partyEventId || !stages.includes(stage) || !nextAction || !nextActionDue) throw new Error("A valid stage and next action are required.");
  if (nextActionDue < new Date().toISOString().slice(0, 10)) throw new Error("Next action cannot be in the past.");
  const supabase = await createClient();
  const { error } = await supabase.from("organization_sis_party_events").update({ stage, next_action: nextAction, next_action_due: nextActionDue }).eq("organization_id", organizationId).eq("id", partyEventId);
  if (error) throw new Error(error.message);
  revalidatePath("/client"); revalidatePath(`/client/sis/party/${partyEventId}`);
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
