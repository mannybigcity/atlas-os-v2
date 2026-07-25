import type { BusinessProfile } from "@/server/business-profile/queries";
import { getBusinessProfile } from "@/server/business-profile/queries";
import type { ActivityEvent } from "@/server/activity/queries";
import { getOrganizationActivity } from "@/server/activity/queries";
import type { ContentStudio } from "@/server/content-studio/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import type { ClientAiRequest } from "@/server/client-ai/queries";
import { getClientAiRequests } from "@/server/client-ai/queries";
import type { OrganizationNote } from "@/server/notes/queries";
import { getOrganizationNotes } from "@/server/notes/queries";
import type { OrganizationOpportunityPipeline } from "@/server/opportunities/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import type { PilotWorkspace } from "@/server/pilot/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type ClientDashboardData = {
  businessProfile: WorkspaceQueryResult<BusinessProfile | null>;
  pilot: WorkspaceQueryResult<PilotWorkspace>;
  contentStudio: WorkspaceQueryResult<ContentStudio>;
  opportunityPipeline: WorkspaceQueryResult<OrganizationOpportunityPipeline>;
  activity: WorkspaceQueryResult<ActivityEvent[]>;
  notes: WorkspaceQueryResult<OrganizationNote[]>;
  aiRequests: WorkspaceQueryResult<ClientAiRequest[]>;
  weeklyCounts: {
    activity: number;
    aiRequests: number;
  };
};

export async function getClientDashboardData(
  organizationId: string,
): Promise<ClientDashboardData> {
  const [
    businessProfile,
    pilot,
    contentStudio,
    opportunityPipeline,
    activity,
    notes,
    aiRequests,
  ] = await Promise.all([
    getBusinessProfile(organizationId),
    getPilotWorkspace(organizationId),
    getContentStudio(organizationId),
    getOpportunityPipeline(organizationId),
    getOrganizationActivity(organizationId),
    getOrganizationNotes(organizationId),
    getClientAiRequests(organizationId),
  ]);

  return {
    businessProfile,
    pilot,
    contentStudio,
    opportunityPipeline,
    activity,
    notes,
    aiRequests,
    weeklyCounts: {
      activity: countWithinDays(activity.setupRequired ? [] : activity.data, 7, "occurredAt"),
      aiRequests: countWithinDays(aiRequests.setupRequired ? [] : aiRequests.data, 7, "createdAt"),
    },
  };
}

function countWithinDays<T extends { [key in K]: string }, K extends string>(
  rows: T[],
  days: number,
  key: K,
) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return rows.filter((row) => new Date(row[key]).getTime() >= cutoff).length;
}
