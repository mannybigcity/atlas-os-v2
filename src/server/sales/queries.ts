import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export const salesProspectStatuses = [
  "new",
  "researching",
  "review_ready",
  "approved_for_outreach",
  "contacted",
  "replied",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
  "disqualified",
  "duplicate",
] as const;

export const salesAssignedRoles = [
  "manny",
  "atlas",
  "hunter",
  "micah",
  "david",
] as const;

export type SalesProspectStatus = (typeof salesProspectStatuses)[number];
export type SalesAssignedRole = (typeof salesAssignedRoles)[number];

export type SalesProspect = {
  id: string;
  assessmentSubmissionId: string | null;
  convertedOrganizationId: string | null;
  businessName: string;
  status: SalesProspectStatus;
  assignedRole: SalesAssignedRole;
  industry: string | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  website: string | null;
  websiteDomain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialMedia: string | null;
  contactBasis:
    | "inbound_consent"
    | "public_business_contact"
    | "referral"
    | "prior_relationship"
    | "customer"
    | "unknown";
  fitScore: number | null;
  fitReason: string | null;
  researchSummary: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  lastContactedAt: string | null;
  outreachApprovedAt: string | null;
  approvedChannels: string[];
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalesProspectSource = {
  id: string;
  prospectId: string;
  sourceType: string;
  externalId: string | null;
  sourceUrl: string | null;
  searchQuery: string | null;
  retrievedAt: string;
  facts: Record<string, unknown>;
  createdAt: string;
};

export type SalesEvent = {
  id: string;
  prospectId: string;
  actorRole: string;
  eventType: string;
  channel: string | null;
  direction: string | null;
  summary: string;
  body: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type ContactSuppression = {
  id: string;
  prospectId: string | null;
  scopeType: string;
  scopeValue: string;
  channel: string;
  reason: string;
  note: string | null;
  createdAt: string;
  liftedAt: string | null;
  liftReason: string | null;
};

type ProspectRow = {
  id: string;
  assessment_submission_id: string | null;
  converted_organization_id: string | null;
  business_name: string;
  status: SalesProspectStatus;
  assigned_role: SalesAssignedRole;
  industry: string | null;
  address_line_1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  website: string | null;
  website_domain: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_media: string | null;
  contact_basis: SalesProspect["contactBasis"];
  fit_score: number | null;
  fit_reason: string | null;
  research_summary: string | null;
  next_action: string | null;
  next_action_at: string | null;
  last_contacted_at: string | null;
  outreach_approved_at: string | null;
  approved_channels: string[];
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
};

const prospectColumns =
  "id, assessment_submission_id, converted_organization_id, business_name, status, assigned_role, industry, address_line_1, city, region, postal_code, country_code, website, website_domain, contact_name, contact_email, contact_phone, social_media, contact_basis, fit_score, fit_reason, research_summary, next_action, next_action_at, last_contacted_at, outreach_approved_at, approved_channels, duplicate_of, created_at, updated_at";

function mapProspect(row: ProspectRow): SalesProspect {
  return {
    id: row.id,
    assessmentSubmissionId: row.assessment_submission_id,
    convertedOrganizationId: row.converted_organization_id,
    businessName: row.business_name,
    status: row.status,
    assignedRole: row.assigned_role,
    industry: row.industry,
    addressLine1: row.address_line_1,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    website: row.website,
    websiteDomain: row.website_domain,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    socialMedia: row.social_media,
    contactBasis: row.contact_basis,
    fitScore: row.fit_score,
    fitReason: row.fit_reason,
    researchSummary: row.research_summary,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    lastContactedAt: row.last_contacted_at,
    outreachApprovedAt: row.outreach_approved_at,
    approvedChannels: row.approved_channels,
    duplicateOf: row.duplicate_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSalesProspects(): Promise<
  WorkspaceQueryResult<SalesProspect[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("atlas_sales_prospects")
    .select(prospectColumns)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return { data: [], setupRequired: true, error: error.message };
  }

  return {
    data: ((data ?? []) as ProspectRow[]).map(mapProspect),
    setupRequired: false,
    error: null,
  };
}

export type SalesProspectDetail = {
  prospect: SalesProspect;
  sources: SalesProspectSource[];
  events: SalesEvent[];
  suppressions: ContactSuppression[];
};

export async function getSalesProspect(
  prospectId: string,
): Promise<WorkspaceQueryResult<SalesProspectDetail | null>> {
  const supabase = await createClient();
  const [prospectResult, sourceResult, eventResult, suppressionResult] =
    await Promise.all([
      supabase
        .from("atlas_sales_prospects")
        .select(prospectColumns)
        .eq("id", prospectId)
        .maybeSingle(),
      supabase
        .from("atlas_sales_prospect_sources")
        .select(
          "id, prospect_id, source_type, external_id, source_url, search_query, retrieved_at, facts, created_at",
        )
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("atlas_sales_events")
        .select(
          "id, prospect_id, actor_role, event_type, channel, direction, summary, body, metadata, occurred_at",
        )
        .eq("prospect_id", prospectId)
        .order("occurred_at", { ascending: false })
        .limit(250),
      supabase
        .from("atlas_contact_suppressions")
        .select(
          "id, prospect_id, scope_type, scope_value, channel, reason, note, created_at, lifted_at, lift_reason",
        )
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false }),
    ]);

  const error =
    prospectResult.error ??
    sourceResult.error ??
    eventResult.error ??
    suppressionResult.error;

  if (error) {
    return { data: null, setupRequired: true, error: error.message };
  }

  if (!prospectResult.data) {
    return { data: null, setupRequired: false, error: null };
  }

  type SourceRow = {
    id: string;
    prospect_id: string;
    source_type: string;
    external_id: string | null;
    source_url: string | null;
    search_query: string | null;
    retrieved_at: string;
    facts: Record<string, unknown>;
    created_at: string;
  };
  type EventRow = {
    id: string;
    prospect_id: string;
    actor_role: string;
    event_type: string;
    channel: string | null;
    direction: string | null;
    summary: string;
    body: string | null;
    metadata: Record<string, unknown>;
    occurred_at: string;
  };
  type SuppressionRow = {
    id: string;
    prospect_id: string | null;
    scope_type: string;
    scope_value: string;
    channel: string;
    reason: string;
    note: string | null;
    created_at: string;
    lifted_at: string | null;
    lift_reason: string | null;
  };

  return {
    data: {
      prospect: mapProspect(prospectResult.data as ProspectRow),
      sources: ((sourceResult.data ?? []) as SourceRow[]).map((row) => ({
        id: row.id,
        prospectId: row.prospect_id,
        sourceType: row.source_type,
        externalId: row.external_id,
        sourceUrl: row.source_url,
        searchQuery: row.search_query,
        retrievedAt: row.retrieved_at,
        facts: row.facts,
        createdAt: row.created_at,
      })),
      events: ((eventResult.data ?? []) as EventRow[]).map((row) => ({
        id: row.id,
        prospectId: row.prospect_id,
        actorRole: row.actor_role,
        eventType: row.event_type,
        channel: row.channel,
        direction: row.direction,
        summary: row.summary,
        body: row.body,
        metadata: row.metadata,
        occurredAt: row.occurred_at,
      })),
      suppressions: ((suppressionResult.data ?? []) as SuppressionRow[]).map(
        (row) => ({
          id: row.id,
          prospectId: row.prospect_id,
          scopeType: row.scope_type,
          scopeValue: row.scope_value,
          channel: row.channel,
          reason: row.reason,
          note: row.note,
          createdAt: row.created_at,
          liftedAt: row.lifted_at,
          liftReason: row.lift_reason,
        }),
      ),
    },
    setupRequired: false,
    error: null,
  };
}
