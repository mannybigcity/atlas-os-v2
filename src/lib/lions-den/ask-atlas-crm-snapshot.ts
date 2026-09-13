import { deskDateOnly, deskDayKey, deskTimeZone } from "../desk-time.ts";
import { publishedPlacePhone } from "./prospect-places.ts";

/** Fact label for the model and EN UI. Never invent a number. */
export const PHONE_NOT_PUBLISHED_EN = "Phone not published";
export const PHONE_NOT_PUBLISHED_ES = "Teléfono no publicado";

export const ASK_ATLAS_CRM_LIST_CAP = 6;
export const ASK_ATLAS_NOTE_SNIPPET_CHARS = 160;

const TO_CALL_STAGES = new Set([
  "ready_for_follow_up",
  "needs_client_input",
  "follow_up_queued",
]);
const CONTACTED_STAGES = new Set(["contacted"]);
const CLOSED_STAGES = new Set(["won", "lost", "archived"]);

export type AskAtlasCrmOpportunityInput = {
  name?: string | null;
  stage?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  nextAction?: string | null;
  nextActionDue?: string | null;
  researchSummary?: string | null;
};

export type AskAtlasCrmNoteInput = {
  title?: string | null;
  body?: string | null;
};

export type AskAtlasCrmProspect = {
  name: string;
  contactName: string | null;
  stage: string;
  nextAction: string | null;
  dueDate: string | null;
  phone: string;
  noteSnippet: string | null;
};

export type AskAtlasCrmSnapshot = {
  dueToday: AskAtlasCrmProspect[];
  overdue: AskAtlasCrmProspect[];
  toCall: AskAtlasCrmProspect[];
  contactedFollowUp: AskAtlasCrmProspect[];
  topNextActions: AskAtlasCrmProspect[];
};

export function phoneNotPublishedLabel(spanish = false) {
  return spanish ? PHONE_NOT_PUBLISHED_ES : PHONE_NOT_PUBLISHED_EN;
}

/** Published number only. Empty, whitespace, and "Google did not publish…" become the fact label. */
export function atlasPublishedPhone(phone: string | null | undefined, spanish = false) {
  return publishedPlacePhone(phone) ?? phoneNotPublishedLabel(spanish);
}

export function truncateAskAtlasSnippet(
  value: string | null | undefined,
  max = ASK_ATLAS_NOTE_SNIPPET_CHARS,
) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  if (raw.length <= max) return raw;
  return `${raw.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function cleanName(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function noteSnippetFor(opportunity: AskAtlasCrmOpportunityInput, notes: AskAtlasCrmNoteInput[]) {
  const name = cleanName(opportunity.name)?.toLowerCase();
  const matched = name
    ? notes.find((note) => {
        const hay = `${note.title ?? ""} ${note.body ?? ""}`.toLowerCase();
        return hay.includes(name);
      })
    : undefined;
  return truncateAskAtlasSnippet(matched?.body ?? matched?.title ?? opportunity.researchSummary);
}

function toProspect(
  opportunity: AskAtlasCrmOpportunityInput,
  notes: AskAtlasCrmNoteInput[],
  timeZone: string,
): AskAtlasCrmProspect | null {
  const name = cleanName(opportunity.name);
  if (!name) return null;
  return {
    name,
    contactName: cleanName(opportunity.contactName),
    stage: String(opportunity.stage ?? "").trim() || "unknown",
    nextAction: truncateAskAtlasSnippet(opportunity.nextAction, 180),
    dueDate: deskDayKey(opportunity.nextActionDue, timeZone),
    phone: atlasPublishedPhone(opportunity.contactPhone),
    noteSnippet: noteSnippetFor(opportunity, notes),
  };
}

function capList(items: AskAtlasCrmProspect[]) {
  return items.slice(0, ASK_ATLAS_CRM_LIST_CAP);
}

function dueSort(left?: AskAtlasCrmProspect, right?: AskAtlasCrmProspect) {
  if (!left || !right) return 0;
  return (
    (left.dueDate ?? "9999-99-99").localeCompare(right.dueDate ?? "9999-99-99") ||
    left.name.localeCompare(right.name)
  );
}

/**
 * Compact CRM facts for Ask Atlas. Buckets use the owner's desk calendar
 * (same day-key rules as the follow-up queue). Phones are published or
 * "Phone not published" — never invented.
 */
export function buildAskAtlasCrmSnapshot(input: {
  opportunities?: AskAtlasCrmOpportunityInput[] | null;
  notes?: AskAtlasCrmNoteInput[] | null;
  now?: Date;
  timeZone?: string;
} = {}): AskAtlasCrmSnapshot {
  const timeZone = input.timeZone ?? deskTimeZone();
  const now = input.now ?? new Date();
  const today = deskDateOnly(now, timeZone);
  const notes = input.notes ?? [];
  const dueToday: AskAtlasCrmProspect[] = [];
  const overdue: AskAtlasCrmProspect[] = [];
  const toCall: AskAtlasCrmProspect[] = [];
  const contactedFollowUp: AskAtlasCrmProspect[] = [];
  const withNextAction: AskAtlasCrmProspect[] = [];

  for (const row of input.opportunities ?? []) {
    const prospect = toProspect(row, notes, timeZone);
    if (!prospect) continue;
    if (CLOSED_STAGES.has(prospect.stage)) continue;

    if (prospect.dueDate && prospect.dueDate < today) overdue.push(prospect);
    else if (prospect.dueDate === today) dueToday.push(prospect);

    if (TO_CALL_STAGES.has(prospect.stage)) toCall.push(prospect);
    if (CONTACTED_STAGES.has(prospect.stage)) contactedFollowUp.push(prospect);
    if (prospect.nextAction) withNextAction.push(prospect);
  }

  dueToday.sort(dueSort);
  overdue.sort(dueSort);
  toCall.sort(dueSort);
  contactedFollowUp.sort(dueSort);
  withNextAction.sort(dueSort);

  return {
    dueToday: capList(dueToday),
    overdue: capList(overdue),
    toCall: capList(toCall),
    contactedFollowUp: capList(contactedFollowUp),
    topNextActions: capList(withNextAction),
  };
}

function prospectLine(prospect: AskAtlasCrmProspect) {
  const who = prospect.contactName ? `${prospect.name} / ${prospect.contactName}` : prospect.name;
  const due = prospect.dueDate ? ` due ${prospect.dueDate}` : "";
  const next = prospect.nextAction ? ` next: ${prospect.nextAction}` : "";
  return `${who} (${prospect.stage}) ${prospect.phone}${due}${next}`;
}

/** Compact English fragment for the model. Does not invent phones or claim a send. */
export function formatAskAtlasCrmSnapshot(snapshot: AskAtlasCrmSnapshot) {
  const sections = ["CRM snapshot. Never invent phones. Advise only; do not send."];
  const add = (label: string, items: AskAtlasCrmProspect[]) => {
    if (items.length === 0) return;
    sections.push(`${label}: ${items.map(prospectLine).join(" | ")}`);
  };
  add("Due today", snapshot.dueToday);
  add("Overdue", snapshot.overdue);
  add("To call", snapshot.toCall);
  add("Contacted follow-up", snapshot.contactedFollowUp);
  add("Top next actions", snapshot.topNextActions);
  if (sections.length === 1) {
    sections.push("No open call or follow-up items on this desk.");
  }
  return sections.join(" ");
}
