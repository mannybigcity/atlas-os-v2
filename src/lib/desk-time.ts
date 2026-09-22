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

/**
 * UTC instant for a wall-clock time on a desk calendar day.
 * 9:00 in America/Chicago stays 9:00 Central whether the server is UTC or the
 * browser is somewhere else.
 */
export function deskWallClockIso(dateOnly: string, hour: number, minute = 0, timeZone = deskTimeZone()) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null;
  }
  try {
    const desiredUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute, 0);
    let instant = desiredUtc;
    for (let pass = 0; pass < 2; pass += 1) {
      instant = desiredUtc - zonedOffsetMs(new Date(instant), timeZone);
    }
    return new Date(instant).toISOString();
  } catch {
    return null;
  }
}

function zonedOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "NaN");
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour") % 24, value("minute"), value("second"));
  return asUtc - instant.getTime();
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
