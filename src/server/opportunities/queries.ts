import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type OpportunityType =
  | "sponsor"
  | "food_truck"
  | "venue"
  | "partner"
  | "media"
  | "customer"
  | "other";

export type OpportunityStage =
  | "researching"
  | "qualified"
  | "needs_client_input"
  | "ready_for_follow_up"
  | "follow_up_queued"
  | "contacted"
  | "responded"
  | "won"
  | "lost"
  | "archived";

export type OpportunityRole =
  | "atlas"
  | "hunter"
  | "micah"
  | "david"
  | "client"
  | "manual";

export type OpportunityEvent = {
  id: string;
  eventType:
    | "created"
    | "research_added"
    | "next_action_set"
    | "follow_up_queued"
    | "contacted"
    | "reply_received"
    | "won"
    | "lost"
    | "note_added";
  actorRole: OpportunityRole;
  summary: string;
  body: string | null;
  createdAt: string;
};

export type OpportunityMetadata = {
  hunter_review_item_id?: string;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  google_maps_attribution?: string;
  formatted_address?: string | null;
  website_url?: string | null;
  national_phone_number?: string | null;
  international_phone_number?: string | null;
  no_outreach_sent?: boolean;
  accepted_for_calling?: boolean;
  primary_type?: string | null;
  business_status?: string | null;
  [key: string]: unknown;
};

export type OrganizationOpportunity = {
  id: string;
  organizationId: string;
  name: string;
  opportunityType: OpportunityType;
  stage: OpportunityStage;
  fitScore: number;
  ownerRole: OpportunityRole;
  sourceLabel: string | null;
  sourceUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactSocial: string | null;
  researchSummary: string;
  fitReason: string | null;
  nextAction: string | null;
  nextActionDue: string | null;
  metadata: OpportunityMetadata;
  createdAt: string;
  updatedAt: string;
  events: OpportunityEvent[];
};

export type OrganizationOpportunityPipeline = {
  opportunities: OrganizationOpportunity[];
};

type OpportunityRow = {
  id: string;
  organization_id: string;
  name: string;
  opportunity_type: OpportunityType;
  stage: OpportunityStage;
  fit_score: number;
  owner_role: OpportunityRole;
  source_label: string | null;
  source_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_social: string | null;
  research_summary: string;
  fit_reason: string | null;
  next_action: string | null;
  next_action_due: string | null;
  metadata: OpportunityMetadata | null;
  created_at: string;
  updated_at: string;
  organization_opportunity_events: Array<{
    id: string;
    event_type: OpportunityEvent["eventType"];
    actor_role: OpportunityRole;
    summary: string;
    body: string | null;
    created_at: string;
  }> | null;
};

export function asOpportunityMetadata(value: unknown): OpportunityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as OpportunityMetadata;
}

function mapOpportunityRow(
  row: OpportunityRow | Omit<OpportunityRow, "organization_opportunity_events">,
): OrganizationOpportunity {
  const events =
    "organization_opportunity_events" in row
      ? (row.organization_opportunity_events ?? [])
          .map((event) => ({
            id: event.id,
            eventType: event.event_type,
            actorRole: event.actor_role,
            summary: event.summary,
            body: event.body,
            createdAt: event.created_at,
          }))
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      : [];

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    opportunityType: row.opportunity_type,
    stage: row.stage,
    fitScore: row.fit_score,
    ownerRole: row.owner_role,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactSocial: row.contact_social,
    researchSummary: row.research_summary,
    fitReason: row.fit_reason,
    nextAction: row.next_action,
    nextActionDue: row.next_action_due,
    metadata: asOpportunityMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

export async function getOpportunityPipeline(
  organizationId: string,
): Promise<WorkspaceQueryResult<OrganizationOpportunityPipeline>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      `
        id,
        organization_id,
        name,
        opportunity_type,
        stage,
        fit_score,
        owner_role,
        source_label,
        source_url,
        contact_name,
        contact_email,
        contact_phone,
        contact_social,
        research_summary,
        fit_reason,
        next_action,
        next_action_due,
        metadata,
        created_at,
        updated_at,
        organization_opportunity_events (
          id,
          event_type,
          actor_role,
          summary,
          body,
          created_at
        )
      `,
    )
    .eq("organization_id", organizationId)
    .neq("stage", "archived")
    .order("fit_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return {
      data: { opportunities: [] },
      setupRequired: true,
      error: error.message,
    };
  }

  const opportunities = ((data ?? []) as OpportunityRow[]).map(mapOpportunityRow);

  return {
    data: { opportunities },
    setupRequired: false,
    error: null,
  };
}

export async function getWonOpportunities(
  organizationId: string,
): Promise<WorkspaceQueryResult<OrganizationOpportunity[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      `
        id,
        organization_id,
        name,
        opportunity_type,
        stage,
        fit_score,
        owner_role,
        source_label,
        source_url,
        contact_name,
        contact_email,
        contact_phone,
        contact_social,
        research_summary,
        fit_reason,
        next_action,
        next_action_due,
        metadata,
        created_at,
        updated_at
      `,
    )
    .eq("organization_id", organizationId)
    .eq("stage", "won")
    .order("name", { ascending: true })
    .limit(200);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  const opportunities = ((data ?? []) as Omit<OpportunityRow, "organization_opportunity_events">[]).map(
    mapOpportunityRow,
  );

  return {
    data: opportunities,
    setupRequired: false,
    error: null,
  };
}

export async function getOrganizationOpportunity(
  organizationId: string,
  opportunityId: string,
): Promise<WorkspaceQueryResult<OrganizationOpportunity | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      `
        id,
        organization_id,
        name,
        opportunity_type,
        stage,
        fit_score,
        owner_role,
        source_label,
        source_url,
        contact_name,
        contact_email,
        contact_phone,
        contact_social,
        research_summary,
        fit_reason,
        next_action,
        next_action_due,
        metadata,
        created_at,
        updated_at,
        organization_opportunity_events (
          id,
          event_type,
          actor_role,
          summary,
          body,
          created_at
        )
      `,
    )
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: data ? mapOpportunityRow(data as OpportunityRow) : null,
    setupRequired: false,
    error: null,
  };
}
