import { deskDateOnly, deskDayKey, deskTimeZone, shiftDateOnly } from "../desk-time.ts";

/** Founder default until the desk goal is edited. */
export const DEFAULT_DAILY_CALL_GOAL = 100;
export const MIN_DAILY_CALL_GOAL = 1;
export const MAX_DAILY_CALL_GOAL = 500;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DeskCallLogEntry = {
  id: string;
  organizationId: string;
  opportunityId: string | null;
  prospectName: string;
  note: string | null;
  loggedAt: string;
};

export type DeskCallLogInsert = {
  organization_id: string;
  opportunity_id: string;
  prospect_name: string;
  note: string | null;
  logged_at: string;
};

export function isDateOnlyDay(value: string | null | undefined) {
  return DATE_ONLY.test(String(value ?? "").trim());
}

/** A typed goal in range, or null when the founder sent something we should not save. */
export function parseDailyCallGoal(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= MIN_DAILY_CALL_GOAL && value <= MAX_DAILY_CALL_GOAL ? value : null;
  }
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const goal = Number(raw);
  if (!Number.isInteger(goal) || goal < MIN_DAILY_CALL_GOAL || goal > MAX_DAILY_CALL_GOAL) return null;
  return goal;
}

/** Missing or unreadable settings stay on the default of 100. */
export function dailyCallGoalOrDefault(value: unknown) {
  return parseDailyCallGoal(value) ?? DEFAULT_DAILY_CALL_GOAL;
}

export function callGoalProgress(calls: number, goal: number) {
  const safeGoal = dailyCallGoalOrDefault(goal);
  const safeCalls = Number.isFinite(calls) ? Math.max(0, Math.floor(calls)) : 0;
  return {
    calls: safeCalls,
    goal: safeGoal,
    percent: Math.min(100, Math.round((safeCalls / safeGoal) * 100)),
  };
}

export function normalizeCallNote(note: string | null | undefined) {
  const trimmed = String(note ?? "").replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 3000) : null;
}

/** Row written when Log call or Save note stamps the prospect contacted. */
export function buildDeskCallLogInsert(input: {
  organizationId: string;
  opportunityId: string;
  prospectName: string;
  note?: string | null;
  loggedAt: string;
}): DeskCallLogInsert | null {
  const prospectName = String(input.prospectName ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
  const loggedAt = new Date(input.loggedAt);
  if (prospectName.length < 1 || Number.isNaN(loggedAt.getTime())) return null;
  return {
    organization_id: input.organizationId,
    opportunity_id: input.opportunityId,
    prospect_name: prospectName,
    note: normalizeCallNote(input.note),
    logged_at: loggedAt.toISOString(),
  };
}

export function callsOnLocalDay<T extends { loggedAt: string }>(entries: T[], day: string, timeZone = deskTimeZone()) {
  if (!isDateOnlyDay(day)) return [];
  return entries.filter((entry) => deskDayKey(entry.loggedAt, timeZone) === day);
}

export function countCallsOnLocalDay<T extends { loggedAt: string }>(entries: T[], day: string, timeZone = deskTimeZone()) {
  return callsOnLocalDay(entries, day, timeZone).length;
}

function readZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? Number.NaN);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** UTC instant for a wall-clock time on a desk-local calendar day. */
export function deskWallTimeUtc(day: string, hours: number, minutes: number, seconds: number, timeZone = deskTimeZone()) {
  const match = DATE_ONLY.exec(day);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  let utc = Date.UTC(year, month - 1, date, hours, minutes, seconds);
  for (let pass = 0; pass < 4; pass += 1) {
    const zoned = readZonedParts(new Date(utc), timeZone);
    if ([zoned.year, zoned.month, zoned.day, zoned.hour, zoned.minute, zoned.second].some((part) => Number.isNaN(part))) {
      return null;
    }
    const zonedAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour % 24, zoned.minute, zoned.second);
    const desired = Date.UTC(year, month - 1, date, hours, minutes, seconds);
    const delta = desired - zonedAsUtc;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

/** Half-open UTC window [start, end) for one desk-local calendar day. */
export function deskDayBounds(day: string, timeZone = deskTimeZone()) {
  if (!isDateOnlyDay(day)) return null;
  const start = deskWallTimeUtc(day, 0, 0, 0, timeZone);
  const end = deskWallTimeUtc(shiftDateOnly(day, 1), 0, 0, 0, timeZone);
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  return { start, end };
}

export function isMissingDeskCallLogTable(
  error: { code?: string | null; message?: string | null } | null | undefined,
) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "");
  if (code === "42P01" || code === "PGRST205") return true;
  return /organization_desk_call_logs/i.test(message) && /does not exist|could not find|schema cache/i.test(message);
}

export function formatDeskCallTime(loggedAt: string, spanish: boolean, timeZone = deskTimeZone()) {
  const date = new Date(loggedAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function selectedCallLogDay(requested: string | null | undefined, now = new Date(), timeZone = deskTimeZone()) {
  const today = deskDateOnly(now, timeZone);
  const raw = String(requested ?? "").trim();
  return isDateOnlyDay(raw) ? raw : today;
}
