/**
 * Every "today", "tomorrow", and due date on the desk is the owner's day, not
 * the server's. Netlify runs in UTC; a plumber in Cypress, TX working at 8pm
 * is still on Monday when UTC has moved to Tuesday. One timezone for the desk
 * (DESK_TIMEZONE, default America/Chicago) until owners can pick their own.
 */
export const DEFAULT_DESK_TIMEZONE = "America/Chicago";

export function deskTimeZone() {
  const configured = String(process.env.DESK_TIMEZONE ?? "").trim();
  if (!configured) return DEFAULT_DESK_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: configured });
    return configured;
  } catch {
    return DEFAULT_DESK_TIMEZONE;
  }
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** YYYY-MM-DD for the instant, as the owner's wall calendar reads it. */
export function deskDateOnly(date: Date = new Date(), timeZone = deskTimeZone()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Shift a YYYY-MM-DD by whole days without touching time zones at all. */
export function shiftDateOnly(dateOnly: string, days: number) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return dateOnly;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return shifted.toISOString().slice(0, 10);
}

/** The owner's date N days from now (or from `from`). */
export function deskDateInDays(days: number, input: { from?: Date; timeZone?: string } = {}) {
  return shiftDateOnly(deskDateOnly(input.from ?? new Date(), input.timeZone ?? deskTimeZone()), days);
}

/**
 * Normalize a stored due value to the owner's YYYY-MM-DD. Date-only strings are
 * already a calendar day and pass through; timestamps are read in the desk zone.
 */
export function deskDayKey(value: string | null | undefined, timeZone = deskTimeZone()) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (DATE_ONLY.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return deskDateOnly(parsed, timeZone);
}

/** Weekday name ("Friday" / "viernes") as the owner experienced it. */
export function deskWeekday(date: Date, spanish: boolean, timeZone = deskTimeZone()) {
  return new Intl.DateTimeFormat(spanish ? "es" : "en", { weekday: "long", timeZone }).format(date);
}

/** Short date label for a YYYY-MM-DD ("Tue, Sep 15") with no time-zone drift. */
export function deskDateLabel(dateOnly: string, spanish: boolean, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return dateOnly;
  return new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)),
  );
}
