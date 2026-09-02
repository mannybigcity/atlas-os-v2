import {
  getClientPortalName,
  getClientPortalOrgLabel,
  isAfeCrmDemoName,
  isAfeCrmDemoOrganization,
} from "../client-portal/identity.ts";

export const AFE_LIVE_DESK_COMPANIES = ["ABC Plumbing", "123 Catering", "XYZ Electric"] as const;

export const ATLAS_STAFF_EMPTY_EN =
  "Ask about follow-up, prospects on this desk, or what is due today.";
export const ATLAS_STAFF_EMPTY_ES =
  "Pregunta por el seguimiento, los prospectos o lo que toca hoy en este escritorio.";

export function isAfeLiveDesk(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  return isAfeCrmDemoOrganization(organization) || isAfeCrmDemoName(organization?.name);
}

export function stripVisibleDemoLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s*\(\s*demo\s*\)/gi, "")
    .replace(/(^|[\s>])demo\s*:\s*/gi, "$1")
    .replace(/\bdemo\+/gi, "")
    .replace(/\bdemo\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,:.\-—]+/, "")
    .trim();
}

export function presentLiveDeskText(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  value: string | null | undefined,
): string {
  const raw = String(value ?? "");
  if (!isAfeLiveDesk(organization)) {
    return raw;
  }

  return stripVisibleDemoLabel(raw)
    .replace(/\bfake\b/gi, "")
    .replace(/\bsample\b/gi, "")
    .replace(/\bpreview desk\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,:.\-—]+/, "")
    .trim();
}

function presentOptionalText(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  value: string | null | undefined,
) {
  if (value == null) return value ?? null;
  const next = presentLiveDeskText(organization, value);
  return next || null;
}

export function presentLiveDeskOpportunity<
  T extends {
    name: string;
    sourceLabel?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    researchSummary?: string;
    fitReason?: string | null;
    nextAction?: string | null;
    events?: Array<{ summary: string; body: string | null }>;
  },
>(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  opportunity: T,
): T {
  if (!isAfeLiveDesk(organization)) return opportunity;

  return {
    ...opportunity,
    name: presentLiveDeskText(organization, opportunity.name) || opportunity.name,
    sourceLabel: presentOptionalText(organization, opportunity.sourceLabel),
    contactName: presentOptionalText(organization, opportunity.contactName),
    contactEmail: presentOptionalText(organization, opportunity.contactEmail),
    researchSummary:
      presentLiveDeskText(organization, opportunity.researchSummary) || opportunity.researchSummary,
    fitReason: presentOptionalText(organization, opportunity.fitReason),
    nextAction: presentOptionalText(organization, opportunity.nextAction),
    events: (opportunity.events ?? []).map((event) => ({
      ...event,
      summary: presentLiveDeskText(organization, event.summary) || event.summary,
      body: presentOptionalText(organization, event.body),
    })),
  };
}

export function presentLiveDeskNote<T extends { title: string; body?: string | null }>(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  note: T,
): T {
  if (!isAfeLiveDesk(organization)) return note;

  return {
    ...note,
    title: presentLiveDeskText(organization, note.title) || note.title,
    body: presentOptionalText(organization, note.body),
  };
}

export function presentLiveDeskDraft<
  T extends {
    campaign: string;
    title: string;
    headline: string;
    supportingText?: string | null;
    caption: string;
    callToAction?: string | null;
    imageSvg?: string | null;
    events?: Array<{ note: string | null; actorLabel: string }>;
  },
>(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  draft: T,
): T {
  if (!isAfeLiveDesk(organization)) return draft;

  return {
    ...draft,
    campaign: presentLiveDeskText(organization, draft.campaign) || draft.campaign,
    title: presentLiveDeskText(organization, draft.title) || draft.title,
    headline: presentLiveDeskText(organization, draft.headline) || draft.headline,
    supportingText: presentOptionalText(organization, draft.supportingText),
    caption: presentLiveDeskText(organization, draft.caption) || draft.caption,
    callToAction: presentOptionalText(organization, draft.callToAction),
    imageSvg: presentOptionalText(organization, draft.imageSvg),
    events: (draft.events ?? []).map((event) => ({
      ...event,
      note: presentOptionalText(organization, event.note),
      actorLabel: presentLiveDeskText(organization, event.actorLabel) || event.actorLabel,
    })),
  };
}

export function presentLiveDeskReviewItem<
  T extends {
    name: string;
    formattedAddress?: string | null;
    searchQuery: string;
    businessStatus?: string | null;
  },
>(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  item: T,
): T {
  if (!isAfeLiveDesk(organization)) return item;

  return {
    ...item,
    name: presentLiveDeskText(organization, item.name) || item.name,
    formattedAddress: presentOptionalText(organization, item.formattedAddress),
    searchQuery: presentLiveDeskText(organization, item.searchQuery) || item.searchQuery,
    businessStatus: presentOptionalText(organization, item.businessStatus),
  };
}

export function presentLiveDeskAiRequest<T extends { prompt: string; response: string }>(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  request: T,
): T {
  if (!isAfeLiveDesk(organization)) return request;

  return {
    ...request,
    prompt: presentLiveDeskText(organization, request.prompt) || request.prompt,
    response: presentLiveDeskText(organization, request.response) || request.response,
  };
}

export function lionsDenHubChromeCopy(
  organization?: { name?: string | null; slug?: string | null } | null,
  spanish = false,
) {
  return {
    portalName: getClientPortalName(organization?.name, organization),
    orgLabel: getClientPortalOrgLabel(organization),
    atlasEmpty: spanish ? ATLAS_STAFF_EMPTY_ES : ATLAS_STAFF_EMPTY_EN,
  };
}
