import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";

export type ContentDraftStatus =
  | "draft"
  | "ready_for_review"
  | "approved"
  | "changes_requested"
  | "scheduled"
  | "published"
  | "archived";

export type ContentDraftEvent = {
  id: string;
  eventType: "created" | "approved" | "changes_requested" | "scheduled" | "published";
  note: string | null;
  actorLabel: string;
  createdAt: string;
};

export type ContentDraft = {
  id: string;
  draftDate: string;
  campaign: string;
  title: string;
  headline: string;
  supportingText: string | null;
  caption: string;
  callToAction: string | null;
  platforms: string[];
  visualStyle: string;
  imageUrl: string | null;
  imageSvg: string | null;
  status: ContentDraftStatus;
  generatedBy: string;
  generationSource: string;
  createdAt: string;
  updatedAt: string;
  events: ContentDraftEvent[];
};

export type ContentStudio = {
  automation: {
    enabled: boolean;
    timezone: string;
    dailyLimit: number;
    lastSuccessfulRunAt: string | null;
  } | null;
  drafts: ContentDraft[];
};

type DraftRow = {
  id: string;
  draft_date: string;
  campaign: string;
  title: string;
  headline: string;
  supporting_text: string | null;
  caption: string;
  call_to_action: string | null;
  platforms: string[];
  visual_style: string;
  image_url: string | null;
  image_svg: string | null;
  status: ContentDraftStatus;
  generated_by: string;
  generation_source: string;
  created_at: string;
  updated_at: string;
  organization_content_draft_events: Array<{
    id: string;
    event_type: ContentDraftEvent["eventType"];
    note: string | null;
    actor_label: string;
    created_at: string;
  }> | null;
};

export async function getContentStudio(
  organizationId: string,
): Promise<WorkspaceQueryResult<ContentStudio>> {
  const supabase = await createClient();
  const [draftsResult, automationResult] = await Promise.all([
    supabase
      .from("organization_content_drafts")
      .select(`
        id,
        draft_date,
        campaign,
        title,
        headline,
        supporting_text,
        caption,
        call_to_action,
        platforms,
        visual_style,
        image_url,
        image_svg,
        status,
        generated_by,
        generation_source,
        created_at,
        updated_at,
        organization_content_draft_events (
          id,
          event_type,
          note,
          actor_label,
          created_at
        )
      `)
      .eq("organization_id", organizationId)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("organization_content_automations")
      .select("enabled, timezone, daily_limit, last_successful_run_at")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  const error = draftsResult.error ?? automationResult.error;
  if (error) {
    return {
      data: { automation: null, drafts: [] },
      setupRequired: true,
      error: error.message,
    };
  }

  const drafts = ((draftsResult.data ?? []) as DraftRow[]).map((row) => ({
    id: row.id,
    draftDate: row.draft_date,
    campaign: row.campaign,
    title: row.title,
    headline: row.headline,
    supportingText: row.supporting_text,
    caption: row.caption,
    callToAction: row.call_to_action,
    platforms: row.platforms,
    visualStyle: row.visual_style,
    imageUrl: row.image_url,
    imageSvg: row.image_svg,
    status: row.status,
    generatedBy: row.generated_by,
    generationSource: row.generation_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: (row.organization_content_draft_events ?? [])
      .map((event) => ({
        id: event.id,
        eventType: event.event_type,
        note: event.note,
        actorLabel: event.actor_label,
        createdAt: event.created_at,
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  }));

  const automationRow = automationResult.data;
  return {
    data: {
      automation: automationRow
        ? {
            enabled: Boolean(automationRow.enabled),
            timezone: String(automationRow.timezone),
            dailyLimit: Number(automationRow.daily_limit),
            lastSuccessfulRunAt: automationRow.last_successful_run_at
              ? String(automationRow.last_successful_run_at)
              : null,
          }
        : null,
      drafts,
    },
    setupRequired: false,
    error: null,
  };
}
