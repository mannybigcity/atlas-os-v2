import { readSisCustomerPayPalFields } from "@/lib/lions-den/sis-customers";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type SisLeadSummary = {
  id: string;
  offer: string;
  status: string;
  sourceLabel: string | null;
  dueDate: string | null;
  createdAt: string;
};

export type SisCustomer = {
  id: string;
  displayName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sourceLabel: string | null;
  lastDate: string | null;
  invoiceTotal: number | null;
  paymentTotal: number | null;
  createdAt: string;
};

export type SisDashboardData = {
  counts: {
    customers: number;
    leads: number;
    openLeads: number;
    quotes: number;
    orders: number;
    paidOrders: number;
    fulfillment: number;
  };
  recentLeads: SisLeadSummary[];
  partyEvents: SisPartyEventSummary[];
  inboxTasks: SisInboxTask[];
};

export type SisPartyEventSummary = {
  id: string;
  hostName: string;
  stage: string;
  partyStartsAt: string | null;
  depositStatus: string;
  nextAction: string | null;
  nextActionDue: string | null;
};

export type SisInboxTask = {
  id: string;
  title: string;
  dueAt: string | null;
  kind: string;
  party: { hostName: string; stage: string } | null;
};

export type SisPartyEventDetail = SisPartyEventSummary & {
  partyType: string | null;
  guestCount: number | null;
  address: string | null;
  city: string | null;
  venueType: string | null;
  doorHangerTheme: string | null;
  totalDue: number | null;
  amountPaid: number;
  calendarStatus: string;
  customerConfirmationStatus: string;
  activities: Array<{ id: string; summary: string; eventType: string; createdAt: string }>;
  tasks: SisInboxTask[];
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

type SisCustomerRow = {
  id: string;
  display_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source_label: string | null;
  metadata: unknown;
  created_at: string;
};

function normalizeCustomer(row: SisCustomerRow): SisCustomer {
  const paypal = readSisCustomerPayPalFields(row.metadata);
  return {
    id: row.id,
    displayName: row.display_name,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    sourceLabel: row.source_label,
    lastDate: paypal.lastDate,
    invoiceTotal: paypal.invoiceTotal,
    paymentTotal: paypal.paymentTotal,
    createdAt: row.created_at,
  };
}

function normalizeLead(row: {
  id: string;
  offer: string;
  status: string;
  source_label: string | null;
  due_date: string | null;
  created_at: string;
}): SisLeadSummary {
  return {
    id: row.id,
    offer: row.offer,
    status: row.status,
    sourceLabel: row.source_label,
    dueDate: row.due_date,
    createdAt: row.created_at,
  };
}

async function countRows(
  table: string,
  organizationId: string,
  filters: Array<[string, string]> = [],
): Promise<CountResult> {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  return { count, error };
}

export async function getSisDashboardData(
  organizationId: string,
): Promise<WorkspaceQueryResult<SisDashboardData>> {
  const supabase = await createClient();
  const [customers, leads, openLeads, quotes, orders, paidOrders, fulfillment, recentLeads, partyEvents, inboxTasks] =
    await Promise.all([
      countRows("organization_sis_customers", organizationId),
      countRows("organization_sis_leads", organizationId),
      countRows("organization_sis_leads", organizationId, [["status", "new"]]),
      countRows("organization_sis_quotes", organizationId),
      countRows("organization_sis_orders", organizationId),
      countRows("organization_sis_orders", organizationId, [["payment_status", "paid"]]),
      countRows("organization_sis_fulfillment_jobs", organizationId, [["status", "ready_for_production"]]),
      supabase
        .from("organization_sis_leads")
        .select("id, offer, status, source_label, due_date, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("organization_sis_party_events")
        .select("id, host_name, stage, party_starts_at, deposit_status, next_action, next_action_due")
        .eq("organization_id", organizationId)
        .order("next_action_due", { ascending: true, nullsFirst: false })
        .limit(24),
      supabase
        .from("organization_sis_party_tasks")
        .select("id, title, due_at, kind, organization_sis_party_events(host_name, stage)")
        .eq("organization_id", organizationId)
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(12),
    ]);

  const countErrors = [customers, leads, openLeads, quotes, orders, paidOrders, fulfillment]
    .map((result) => result.error)
    .filter(Boolean);

  if (countErrors.length > 0 || recentLeads.error || partyEvents.error || inboxTasks.error) {
    return {
      data: {
        counts: { customers: 0, leads: 0, openLeads: 0, quotes: 0, orders: 0, paidOrders: 0, fulfillment: 0 },
        recentLeads: [],
        partyEvents: [],
        inboxTasks: [],
      },
      setupRequired: true,
      error: countErrors[0]?.message ?? recentLeads.error?.message ?? partyEvents.error?.message ?? inboxTasks.error?.message ?? "SIS workspace query failed.",
    };
  }

  return {
    data: {
      counts: {
        customers: customers.count ?? 0,
        leads: leads.count ?? 0,
        openLeads: openLeads.count ?? 0,
        quotes: quotes.count ?? 0,
        orders: orders.count ?? 0,
        paidOrders: paidOrders.count ?? 0,
        fulfillment: fulfillment.count ?? 0,
      },
      recentLeads: ((recentLeads.data ?? []) as Array<{
        id: string;
        offer: string;
        status: string;
        source_label: string | null;
        due_date: string | null;
        created_at: string;
      }>).map(normalizeLead),
      partyEvents: ((partyEvents.data ?? []) as Array<{
        id: string; host_name: string; stage: string; party_starts_at: string | null;
        deposit_status: string; next_action: string | null; next_action_due: string | null;
      }>).map((event) => ({
        id: event.id, hostName: event.host_name, stage: event.stage,
        partyStartsAt: event.party_starts_at, depositStatus: event.deposit_status,
        nextAction: event.next_action, nextActionDue: event.next_action_due,
      })),
      inboxTasks: ((inboxTasks.data ?? []) as Array<{
        id: string; title: string; due_at: string | null; kind: string;
        organization_sis_party_events: { host_name: string; stage: string } | { host_name: string; stage: string }[] | null;
      }>).map((task) => {
        const party = Array.isArray(task.organization_sis_party_events)
          ? task.organization_sis_party_events[0] ?? null
          : task.organization_sis_party_events;
        return { id: task.id, title: task.title, dueAt: task.due_at, kind: task.kind,
          party: party ? { hostName: party.host_name, stage: party.stage } : null };
      }),
    },
    setupRequired: false,
    error: null,
  };
}

export async function getSisCustomers(
  organizationId: string,
): Promise<WorkspaceQueryResult<SisCustomer[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_sis_customers")
    .select("id, display_name, business_name, email, phone, notes, source_label, metadata, created_at")
    .eq("organization_id", organizationId)
    .order("display_name", { ascending: true })
    .limit(200);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as SisCustomerRow[]).map(normalizeCustomer),
    setupRequired: false,
    error: null,
  };
}

export async function getSisPartyEventDetail(
  organizationId: string,
  partyEventId: string,
): Promise<WorkspaceQueryResult<SisPartyEventDetail | null>> {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("organization_sis_party_events")
    .select("id, host_name, stage, party_starts_at, deposit_status, next_action, next_action_due, party_type, guest_count, address, city, venue_type, door_hanger_theme, total_due, amount_paid, calendar_status, customer_confirmation_status")
    .eq("organization_id", organizationId)
    .eq("id", partyEventId)
    .maybeSingle();

  if (error) return { data: null, setupRequired: true, error: error.message };
  if (!event) return { data: null, setupRequired: false, error: null };

  const [activities, tasks] = await Promise.all([
    supabase.from("organization_sis_activity_events").select("id, summary, event_type, created_at").eq("organization_id", organizationId).eq("entity_id", partyEventId).order("created_at", { ascending: false }).limit(50),
    supabase.from("organization_sis_party_tasks").select("id, title, due_at, kind, organization_sis_party_events(host_name, stage)").eq("organization_id", organizationId).eq("party_event_id", partyEventId).order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  if (activities.error || tasks.error) return { data: null, setupRequired: true, error: activities.error?.message ?? tasks.error?.message ?? "Unable to load party record." };

  const taskRows = (tasks.data ?? []) as Array<{ id: string; title: string; due_at: string | null; kind: string; organization_sis_party_events: { host_name: string; stage: string } | { host_name: string; stage: string }[] | null }>;
  return { data: {
    id: event.id, hostName: event.host_name, stage: event.stage, partyStartsAt: event.party_starts_at,
    depositStatus: event.deposit_status, nextAction: event.next_action, nextActionDue: event.next_action_due,
    partyType: event.party_type, guestCount: event.guest_count, address: event.address, city: event.city,
    venueType: event.venue_type, doorHangerTheme: event.door_hanger_theme, totalDue: event.total_due,
    amountPaid: event.amount_paid, calendarStatus: event.calendar_status,
    customerConfirmationStatus: event.customer_confirmation_status,
    activities: ((activities.data ?? []) as Array<{ id: string; summary: string; event_type: string; created_at: string }>).map((activity) => ({ id: activity.id, summary: activity.summary, eventType: activity.event_type, createdAt: activity.created_at })),
    tasks: taskRows.map((task) => { const party = Array.isArray(task.organization_sis_party_events) ? task.organization_sis_party_events[0] ?? null : task.organization_sis_party_events; return { id: task.id, title: task.title, dueAt: task.due_at, kind: task.kind, party: party ? { hostName: party.host_name, stage: party.stage } : null }; }),
  }, setupRequired: false, error: null };
}
