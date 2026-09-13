import {
  getClientPortalName,
  getClientPortalOrgLabel,
  isAfeClientDeskOrganization,
  isAfeCrmDemoName,
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
} from "../client-portal/identity.ts";

export const AFE_LIVE_DESK_COMPANIES = ["ABC Plumbing", "123 Catering", "XYZ Electric"] as const;

export const ATLAS_STAFF_EMPTY_EN = "Ask about who to call today, what to say, or what is due.";
export const ATLAS_STAFF_EMPTY_ES = "Pregunta a quién llamar hoy, qué decir o qué toca hoy.";

export const ATLAS_STAFF_SAMPLE_EMPTY_EN =
  "Ask about who to call today, ABC Plumbing, 123 Catering, XYZ Electric, or what is due.";
export const ATLAS_STAFF_SAMPLE_EMPTY_ES =
  "Pregunta a quién llamar hoy, ABC Plumbing, 123 Catering, XYZ Electric o qué toca hoy.";

export function isAfeLiveDesk(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization || isAfeCrmDemoOrganization(organization) || isAfeCrmDemoName(organization.name)) {
    return false;
  }

  return isAfeOperatorDeskOrganization(organization) || isAfeClientDeskOrganization(organization);
}

export function isSampleLabeledSeedText(value: string | null | undefined) {
  return /\bSAMPLE\b/.test(String(value ?? ""));
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

function tidyPresentedText(value: string) {
  return value
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\s*\./g, ".")
    .replace(/^[\s,:.\-—·]+/, "")
    .replace(/[\s,:\-—·]+$/, "")
    .trim();
}

const LIVE_DESK_METADATA_TEXT_KEYS = [
  "formatted_address",
  "business_status",
  "instagram_caption",
  "linkedin_caption",
] as const;

export function stripVisibleSampleChrome(value: string | null | undefined): string {
  return tidyPresentedText(
    String(value ?? "")
      .replace(/#SampleDraft\b/gi, "")
      .replace(/\bSampleDraft\b/gi, "")
      .replace(/\bSAMPLE\s+DRAFT\b/gi, "")
      .replace(/\bSAMPLE\s+placeholder\b/gi, "")
      .replace(/\bis a draft slot only\.?/gi, "")
      .replace(/\bCopy or download when you are ready\.?/gi, "")
      .replace(/SAMPLE address — ([^.]+)\.\s*Not a real location\.\s*Do not visit or contact\./gi, "$1")
      .replace(/SAMPLE trial review pile — ([^—]+) — no live Places search/gi, "$1")
      .replace(/SAMPLE accepted find — ([^—]+) — no live Places search/gi, "$1")
      .replace(/^SAMPLE\s*[·:.—-]+\s*/gim, "")
      .replace(/\s*[·]\s*SAMPLE\b/gi, "")
      .replace(/\bSAMPLE\b/gi, "")
      .replace(/\s*Not a real location\.?/gi, " ")
      .replace(/\s*Not a real business\.?/gi, " ")
      .replace(/\s*Do not visit or contact\.?/gi, " ")
      .replace(/\bgallery placeholder\.?/gi, " "),
  );
}

export function presentLiveDeskText(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  value: string | null | undefined,
): string {
  const raw = String(value ?? "");
  if (!isAfeLiveDesk(organization)) {
    return raw;
  }

  return tidyPresentedText(
    stripVisibleSampleChrome(stripVisibleDemoLabel(raw))
      .replace(/\bfake\b/gi, "")
      .replace(/\bsample\b/gi, "")
      .replace(/\bpreview desk\b/gi, ""),
  );
}

function presentOptionalText(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  value: string | null | undefined,
) {
  if (value == null) return value ?? null;
  const next = presentLiveDeskText(organization, value);
  return next || null;
}

function presentLiveDeskMetadata(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!metadata || !isAfeLiveDesk(organization)) return metadata;

  let changed = false;
  const next: Record<string, unknown> = { ...metadata };
  for (const key of LIVE_DESK_METADATA_TEXT_KEYS) {
    const value = next[key];
    if (typeof value !== "string") continue;
    const presented = presentOptionalText(organization, value);
    if (presented !== value) {
      next[key] = presented;
      changed = true;
    }
  }
  return changed ? next : metadata;
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
    formattedAddress?: string | null;
    metadata?: Record<string, unknown> | null;
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
    ...(opportunity.formattedAddress !== undefined
      ? { formattedAddress: presentOptionalText(organization, opportunity.formattedAddress) }
      : {}),
    ...(opportunity.metadata
      ? { metadata: presentLiveDeskMetadata(organization, opportunity.metadata) }
      : {}),
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
    metadata?: Record<string, unknown> | null;
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
    ...(draft.metadata ? { metadata: presentLiveDeskMetadata(organization, draft.metadata) } : {}),
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
  const sampleDesk = isAfeCrmDemoOrganization(organization) || isAfeCrmDemoName(organization?.name);
  return {
    portalName: getClientPortalName(organization?.name, organization),
    orgLabel: getClientPortalOrgLabel(organization),
    atlasEmpty: spanish
      ? sampleDesk
        ? ATLAS_STAFF_SAMPLE_EMPTY_ES
        : ATLAS_STAFF_EMPTY_ES
      : sampleDesk
        ? ATLAS_STAFF_SAMPLE_EMPTY_EN
        : ATLAS_STAFF_EMPTY_EN,
  };
}
