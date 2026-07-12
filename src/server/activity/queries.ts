import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type ActivityEvent = {
  id: string;
  eventType: string;
  title: string;
  occurredAt: string;
};

type ActivityEventRow = {
  id: string;
  event_type: string;
  title: string;
  occurred_at: string;
};

export async function getOrganizationActivity(
  organizationId: string,
): Promise<WorkspaceQueryResult<ActivityEvent[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, event_type, title, occurred_at")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(15);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as ActivityEventRow[]).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      title: event.title,
      occurredAt: event.occurred_at,
    })),
    setupRequired: false,
    error: null,
  };
}

