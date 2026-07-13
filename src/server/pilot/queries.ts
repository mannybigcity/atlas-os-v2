import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type PilotPlan = {
  organizationId: string;
  thirtyDayGoal: string | null;
  successDefinition: string | null;
  nextCheckInAt: string | null;
  status: "active" | "paused" | "completed";
  updatedAt: string;
};

export type PilotAction = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "blocked" | "completed";
  priority: number;
  ownerLabel: string | null;
  dueDate: string | null;
  updatedAt: string;
};

export type DeliverableReview = {
  decision: "approved" | "changes_requested";
  note: string | null;
  reviewedByDisplayName: string;
  reviewedAt: string;
};

export type PilotDeliverable = {
  id: string;
  organizationId: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: "draft" | "ready_for_review" | "delivered" | "archived";
  updatedAt: string;
  review: DeliverableReview | null;
};

export type PilotWorkspace = {
  plan: PilotPlan | null;
  actions: PilotAction[];
  deliverables: PilotDeliverable[];
};

type PlanRow = {
  organization_id: string;
  thirty_day_goal: string | null;
  success_definition: string | null;
  next_check_in_at: string | null;
  status: PilotPlan["status"];
  updated_at: string;
};

type ActionRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: PilotAction["status"];
  priority: number;
  owner_label: string | null;
  due_date: string | null;
  updated_at: string;
};

type ReviewRow = {
  decision: DeliverableReview["decision"];
  note: string | null;
  reviewed_by_display_name: string;
  reviewed_at: string;
};

type DeliverableRow = {
  id: string;
  organization_id: string;
  title: string;
  summary: string | null;
  body: string | null;
  status: PilotDeliverable["status"];
  updated_at: string;
  organization_pilot_deliverable_reviews: ReviewRow | ReviewRow[] | null;
};

function firstReview(value: DeliverableRow["organization_pilot_deliverable_reviews"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getPilotWorkspace(
  organizationId: string,
): Promise<WorkspaceQueryResult<PilotWorkspace>> {
  const supabase = await createClient();
  const [planResult, actionsResult, deliverablesResult] = await Promise.all([
    supabase
      .from("organization_pilot_plans")
      .select(
        "organization_id, thirty_day_goal, success_definition, next_check_in_at, status, updated_at",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_pilot_actions")
      .select(
        "id, organization_id, title, description, status, priority, owner_label, due_date, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_pilot_deliverables")
      .select(
        `
          id,
          organization_id,
          title,
          summary,
          body,
          status,
          updated_at,
          organization_pilot_deliverable_reviews (
            decision,
            note,
            reviewed_by_display_name,
            reviewed_at
          )
        `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  const error = planResult.error ?? actionsResult.error ?? deliverablesResult.error;
  if (error) {
    return {
      data: { plan: null, actions: [], deliverables: [] },
      setupRequired: true,
      error: error.message,
    };
  }

  const planRow = planResult.data as PlanRow | null;
  const plan = planRow
    ? {
        organizationId: planRow.organization_id,
        thirtyDayGoal: planRow.thirty_day_goal,
        successDefinition: planRow.success_definition,
        nextCheckInAt: planRow.next_check_in_at,
        status: planRow.status,
        updatedAt: planRow.updated_at,
      }
    : null;

  const actions = ((actionsResult.data ?? []) as ActionRow[]).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerLabel: row.owner_label,
    dueDate: row.due_date,
    updatedAt: row.updated_at,
  }));

  const deliverables = ((deliverablesResult.data ?? []) as DeliverableRow[]).map(
    (row) => {
      const review = firstReview(row.organization_pilot_deliverable_reviews);
      return {
        id: row.id,
        organizationId: row.organization_id,
        title: row.title,
        summary: row.summary,
        body: row.body,
        status: row.status,
        updatedAt: row.updated_at,
        review: review
          ? {
              decision: review.decision,
              note: review.note,
              reviewedByDisplayName: review.reviewed_by_display_name,
              reviewedAt: review.reviewed_at,
            }
          : null,
      };
    },
  );

  return {
    data: { plan, actions, deliverables },
    setupRequired: false,
    error: null,
  };
}
