import { DEFAULT_DESK_TIMEZONE, deskWallClockIso, shiftDateOnly } from "../desk-time.ts";

/**
 * SIS Custom Creations paint-party blocks.
 * AM 9:00–1:00 and PM 2:00–6:00 America/Chicago, one party each.
 * Follow-up dates and device reminders are not holds.
 */

export const SIS_PARTY_SLOT_MIGRATION = "supabase/migrations/20260922140000_sis_party_slot_holds.sql";

export const PARTY_SLOTS = ["am", "pm"] as const;
export type PartySlot = (typeof PARTY_SLOTS)[number];

export type PartyDayShade = "bright" | "light";

export type PartyHoldSource = {
  id: string;
  hostName: string;
  preferredDate: string | null;
  partySlot: string | null;
  calendarStatus: string;
};

export type PartyHold = {
  id: string;
  hostName: string;
  preferredDate: string;
  partySlot: PartySlot;
  calendarStatus: "tentative" | "confirmed";
};

export type PartySlotSuggestion = {
  date: string;
  slot: PartySlot;
};

export type PartySlotActionResult = {
  ok: boolean;
  code: "idle" | "held" | "cancelled" | "conflict" | "invalid" | "error";
  message: string;
  suggestions: PartySlotSuggestion[];
};

export const idlePartySlotResult: PartySlotActionResult = {
  ok: false,
  code: "idle",
  message: "",
  suggestions: [],
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const SUGGESTION_HORIZON_DAYS = 56;

export function isPartySlot(value: string | null | undefined): value is PartySlot {
  return value === "am" || value === "pm";
}

export function partySlotLabel(slot: PartySlot) {
  return slot === "am" ? "AM 9:00–1:00" : "PM 2:00–6:00";
}

/** Block start in the desk timezone. AM is 9:00, PM is 2:00. */
export function partyBlockStartIso(dateOnly: string, slot: PartySlot, timeZone = DEFAULT_DESK_TIMEZONE) {
  return deskWallClockIso(dateOnly, slot === "am" ? 9 : 14, 0, timeZone);
}

export function partySlotColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = `${error.code ?? ""} ${error.message ?? ""}`;
  return /party_slot/i.test(message) || /PGRST204/.test(message);
}

export function activePartyHolds(rows: readonly PartyHoldSource[]): PartyHold[] {
  const seen = new Set<string>();
  const holds: PartyHold[] = [];
  for (const row of rows) {
    if (row.calendarStatus !== "tentative" && row.calendarStatus !== "confirmed") continue;
    if (!isPartySlot(row.partySlot) || !row.preferredDate || !DATE_ONLY.test(row.preferredDate)) continue;
    const key = `${row.preferredDate}:${row.partySlot}`;
    if (seen.has(key)) continue;
    seen.add(key);
    holds.push({
      id: row.id,
      hostName: row.hostName,
      preferredDate: row.preferredDate,
      partySlot: row.partySlot,
      calendarStatus: row.calendarStatus,
    });
  }
  return holds;
}

/** Bright purple: 0 or 1 block held. Light purple: AM and PM both held. */
export function partyDayShade(rows: readonly PartyHoldSource[], date: string): PartyDayShade {
  const held = activePartyHolds(rows).filter((hold) => hold.preferredDate === date).length;
  return held >= 2 ? "light" : "bright";
}

export function holdOnSlot(holds: readonly PartyHold[], date: string, slot: PartySlot) {
  return holds.find((hold) => hold.preferredDate === date && hold.partySlot === slot) ?? null;
}

export function dateOnlyWeekday(dateOnly: string) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const match = MONTH_KEY.exec(monthKey);
  if (!match || !Number.isInteger(delta)) return monthKey;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${month}`;
}

export function monthGrid(monthKey: string) {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) return [] as Array<{ date: string; inMonth: boolean }>;
  const first = `${match[1]}-${match[2]}-01`;
  const weekday = dateOnlyWeekday(first);
  if (weekday === null) return [];
  return Array.from({ length: 42 }, (_, index) => {
    const date = shiftDateOnly(first, index - weekday);
    return { date, inMonth: date.slice(0, 7) === monthKey };
  });
}

/**
 * Next open blocks. Saturdays first, then weekday afternoons, then anything else.
 * Does not email anyone.
 */
export function suggestOpenSlots(input: {
  holds: readonly PartyHold[];
  fromDate: string;
  count?: number;
  horizonDays?: number;
  avoid?: { date: string; slot: PartySlot } | null;
}): PartySlotSuggestion[] {
  const count = input.count ?? 3;
  const horizon = input.horizonDays ?? SUGGESTION_HORIZON_DAYS;
  if (!DATE_ONLY.test(input.fromDate) || count <= 0 || horizon <= 0) return [];
  const taken = new Set(input.holds.map((hold) => `${hold.preferredDate}:${hold.partySlot}`));
  if (input.avoid) taken.add(`${input.avoid.date}:${input.avoid.slot}`);
  const candidates: Array<PartySlotSuggestion & { rank: number; offset: number }> = [];
  for (let offset = 0; offset < horizon; offset += 1) {
    const date = shiftDateOnly(input.fromDate, offset);
    const weekday = dateOnlyWeekday(date);
    if (weekday === null) continue;
    for (const slot of PARTY_SLOTS) {
      if (taken.has(`${date}:${slot}`)) continue;
      const rank = weekday === 6 ? 0 : weekday >= 1 && weekday <= 5 && slot === "pm" ? 1 : 2;
      candidates.push({ date, slot, rank, offset });
    }
  }
  candidates.sort((left, right) => left.rank - right.rank || left.offset - right.offset || slotOrder(left.slot, right.slot));
  return candidates.slice(0, count).map(({ date, slot }) => ({ date, slot }));
}

function slotOrder(left: PartySlot, right: PartySlot) {
  if (left === right) return 0;
  return left === "am" ? -1 : 1;
}

export function encodeSuggestions(slots: readonly PartySlotSuggestion[]) {
  return slots.map((slot) => `${slot.date}.${slot.slot}`).join(",");
}

export function decodeSuggestions(value: string | null | undefined): PartySlotSuggestion[] {
  const slots: PartySlotSuggestion[] = [];
  for (const part of String(value ?? "").split(",")) {
    const match = /^(\d{4}-\d{2}-\d{2})\.(am|pm)$/.exec(part.trim());
    if (!match) continue;
    slots.push({ date: match[1], slot: match[2] as PartySlot });
    if (slots.length === 3) break;
  }
  return slots;
}
