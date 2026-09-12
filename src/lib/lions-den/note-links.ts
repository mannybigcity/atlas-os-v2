/**
 * Notes that belong to a prospect or client. Pure: no I/O.
 *
 * A note on the Notes board can be "about" one record. The record page shows
 * the same notes, and a note of type follow-up with a date becomes that
 * record's dated next step (so it shows on Follow-up and Calendar too).
 */

export const NOTE_RECORD_KINDS = ["prospect", "client", "sis_customer"] as const;
export type NoteRecordKind = (typeof NOTE_RECORD_KINDS)[number];

export type NoteRecordRef = { kind: NoteRecordKind; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isNoteRecordKind(value: unknown): value is NoteRecordKind {
  return typeof value === "string" && (NOTE_RECORD_KINDS as readonly string[]).includes(value);
}

/** Form value "kind:uuid" → ref. Anything else (including "") → null. */
export function parseNoteRecord(value: unknown): NoteRecordRef | null {
  const raw = String(value ?? "").trim();
  const [kind, id] = raw.split(":");
  if (!isNoteRecordKind(kind) || !id || !UUID.test(id)) return null;
  return { kind, id };
}

export function noteRecordValue(ref: NoteRecordRef | null | undefined) {
  return ref ? `${ref.kind}:${ref.id}` : "";
}

export function noteRecordHref(ref: NoteRecordRef) {
  return ref.kind === "prospect" ? `/client/prospects/${ref.id}` : `/client/clients/${ref.id}`;
}

export function noteRecordKindLabel(kind: NoteRecordKind, spanish: boolean) {
  if (kind === "prospect") return spanish ? "Prospecto" : "Prospect";
  return spanish ? "Cliente" : "Client";
}

/** Which kind a live opportunity is for note purposes: won = client, otherwise prospect. */
export function noteRecordKindForStage(stage: string): NoteRecordKind {
  return stage === "won" ? "client" : "prospect";
}

export type NoteRecordOption = { value: string; label: string; kind: NoteRecordKind };

/** Grouped options for the "About" select: prospects first, then clients. */
export function noteRecordOptions(
  input: {
    opportunities?: Array<{ id: string; name: string; stage: string }>;
    sisCustomers?: Array<{ id: string; displayName: string; businessName?: string | null }>;
  },
  spanish: boolean,
) {
  const prospects: NoteRecordOption[] = [];
  const clients: NoteRecordOption[] = [];
  for (const item of input.opportunities ?? []) {
    if (item.stage === "archived") continue;
    const kind = noteRecordKindForStage(item.stage);
    (kind === "client" ? clients : prospects).push({ value: `${kind}:${item.id}`, label: item.name, kind });
  }
  for (const item of input.sisCustomers ?? []) {
    const label = item.businessName ? `${item.displayName} · ${item.businessName}` : item.displayName;
    clients.push({ value: `sis_customer:${item.id}`, label, kind: "sis_customer" });
  }
  const byLabel = (a: NoteRecordOption, b: NoteRecordOption) => a.label.localeCompare(b.label);
  return {
    prospects: prospects.sort(byLabel),
    clients: clients.sort(byLabel),
    prospectsLabel: spanish ? "Prospectos" : "Prospects",
    clientsLabel: spanish ? "Clientes" : "Clients",
  };
}

export type LinkedNote = {
  recordKind?: NoteRecordKind | null;
  recordId?: string | null;
};

export function notesForRecord<T extends LinkedNote>(notes: T[], ref: NoteRecordRef | null) {
  if (!ref) return notes;
  return notes.filter((note) => note.recordId === ref.id);
}

/** Notes written on a given local calendar day (YYYY-MM-DD), for "what I entered today". */
export function notesOnDay<T extends { createdAt: string }>(notes: T[], dayKey: string) {
  return notes.filter((note) => note.createdAt.slice(0, 10) === dayKey);
}

/** A follow-up note with a date becomes the record's dated next step. */
export function noteFollowUpPlan(input: { noteType: string; title: string; body: string; dueDate: unknown }) {
  if (input.noteType !== "follow-up") return null;
  const due = String(input.dueDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const title = input.title.replace(/^follow-up:\s*/i, "").trim();
  const nextAction = `${title}${input.body.trim() ? ` — ${input.body.trim()}` : ""}`.slice(0, 1200);
  return { nextAction: nextAction.length >= 5 ? nextAction : `${nextAction} (follow up)`, nextActionDue: due };
}

/** Summary for the record's Activity trail when a note is linked to it. */
export function linkedNoteEventSummary(title: string) {
  return `Note: ${title.trim()}`.slice(0, 500);
}
