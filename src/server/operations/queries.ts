import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type OrganizationProject = {
  id: string;
  organizationId: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: "planned" | "active" | "on_hold" | "completed" | "archived";
  priority: number;
  ownerLabel: string | null;
  sourceType: "manual" | "assessment" | "crm" | "obsidian" | "system";
  sourceReference: string | null;
  startsOn: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMission = {
  id: string;
  organizationId: string;
  projectId: string | null;
  title: string;
  objective: string | null;
  status: "planned" | "ready" | "in_progress" | "blocked" | "completed" | "cancelled";
  priority: number;
  ownerLabel: string | null;
  sourceType: OrganizationProject["sourceType"];
  sourceReference: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationCashEntry = {
  id: string;
  organizationId: string;
  entryDirection: "inflow" | "outflow";
  paymentStatus: "pending" | "authorized" | "settled" | "failed" | "refunded" | "voided" | "unknown";
  verificationStatus: "unverified" | "verified" | "rejected";
  amountMinor: string;
  currency: string;
  sourceType: "manual" | "invoice" | "payment_provider" | "bank_statement" | "adjustment" | "other";
  externalReference: string | null;
  description: string | null;
  counterpartyLabel: string | null;
  verificationSource: string | null;
  occurredAt: string;
  clearedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type OperationsSnapshot = {
  projects: OrganizationProject[];
  missions: OrganizationMission[];
  cashEntries: OrganizationCashEntry[];
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: OrganizationProject["name"];
  slug: string | null;
  description: string | null;
  status: OrganizationProject["status"];
  priority: number;
  owner_label: string | null;
  source_type: OrganizationProject["sourceType"];
  source_reference: string | null;
  starts_on: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

type MissionRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  title: string;
  objective: string | null;
  status: OrganizationMission["status"];
  priority: number;
  owner_label: string | null;
  source_type: OrganizationMission["sourceType"];
  source_reference: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CashEntryRow = {
  id: string;
  organization_id: string;
  entry_direction: OrganizationCashEntry["entryDirection"];
  payment_status: OrganizationCashEntry["paymentStatus"];
  verification_status: OrganizationCashEntry["verificationStatus"];
  amount_minor: number | string;
  currency: string;
  source_type: OrganizationCashEntry["sourceType"];
  external_reference: string | null;
  description: string | null;
  counterparty_label: string | null;
  verification_source: string | null;
  occurred_at: string;
  cleared_at: string | null;
  verified_at: string | null;
  created_at: string;
};

const emptySnapshot: OperationsSnapshot = {
  projects: [],
  missions: [],
  cashEntries: [],
};

export async function getOperationsSnapshot(): Promise<
  WorkspaceQueryResult<OperationsSnapshot>
> {
  const supabase = await createClient();
  const [projectsResult, missionsResult, cashEntriesResult] = await Promise.all([
    supabase
      .from("organization_projects")
      .select(
        "id, organization_id, name, slug, description, status, priority, owner_label, source_type, source_reference, starts_on, target_date, created_at, updated_at",
      )
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("organization_missions")
      .select(
        "id, organization_id, project_id, title, objective, status, priority, owner_label, source_type, source_reference, due_date, started_at, completed_at, created_at, updated_at",
      )
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("organization_cash_entries")
      .select(
        "id, organization_id, entry_direction, payment_status, verification_status, amount_minor, currency, source_type, external_reference, description, counterparty_label, verification_source, occurred_at, cleared_at, verified_at, created_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);

  const error =
    projectsResult.error ?? missionsResult.error ?? cashEntriesResult.error;
  if (error) {
    return {
      data: emptySnapshot,
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: {
      projects: ((projectsResult.data ?? []) as ProjectRow[]).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        status: row.status,
        priority: row.priority,
        ownerLabel: row.owner_label,
        sourceType: row.source_type,
        sourceReference: row.source_reference,
        startsOn: row.starts_on,
        targetDate: row.target_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      missions: ((missionsResult.data ?? []) as MissionRow[]).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        title: row.title,
        objective: row.objective,
        status: row.status,
        priority: row.priority,
        ownerLabel: row.owner_label,
        sourceType: row.source_type,
        sourceReference: row.source_reference,
        dueDate: row.due_date,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      cashEntries: ((cashEntriesResult.data ?? []) as CashEntryRow[]).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        entryDirection: row.entry_direction,
        paymentStatus: row.payment_status,
        verificationStatus: row.verification_status,
        amountMinor: String(row.amount_minor),
        currency: row.currency,
        sourceType: row.source_type,
        externalReference: row.external_reference,
        description: row.description,
        counterpartyLabel: row.counterparty_label,
        verificationSource: row.verification_source,
        occurredAt: row.occurred_at,
        clearedAt: row.cleared_at,
        verifiedAt: row.verified_at,
        createdAt: row.created_at,
      })),
    },
    setupRequired: false,
    error: null,
  };
}
