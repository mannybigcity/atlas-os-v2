import { deskDateOnly, shiftDateOnly } from "../desk-time.ts";
import { shiftMonthKey, suggestOpenSlots, type PartyHold, type PartySlot, type PartySlotSuggestion } from "./party-availability.ts";

/** Starts that still finish a 2.5 hour party inside the 4 hour block. */
export const PUBLIC_PARTY_STARTS = {
  am: ["09:00", "09:30", "10:00", "10:30"],
  pm: ["14:00", "14:30", "15:00", "15:30"],
} as const;

export const PUBLIC_PARTY_TYPES = [
  "Adult Paint Parties",
  "Kids Paint Parties",
  "Schools / Daycares",
  "Splatter Paint Experiences",
] as const;

export type PublicPartyType = (typeof PUBLIC_PARTY_TYPES)[number];
export type PublicSlotState = "open" | "held";

export type PublicPartyDay = {
  date: string;
  shade: "bright" | "light";
  am: PublicSlotState;
  pm: PublicSlotState;
  bookable: boolean;
};

export type PublicHoldInput = {
  requestId: string;
  hostName: string;
  email: string;
  phone: string | null;
  partyType: PublicPartyType;
  guestCount: number | null;
  date: string;
  slot: PartySlot;
  startTime: string;
  zip: string | null;
  notes: string | null;
  sourceUrl: string | null;
};

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP = /^\d{5}(?:-\d{4})?$/;

export function monthBounds(monthKey: string) {
  if (!MONTH_KEY.test(monthKey)) return null;
  const month = Number(monthKey.slice(5, 7));
  if (month < 1 || month > 12) return null;
  const from = `${monthKey}-01`;
  const to = shiftDateOnly(`${shiftMonthKey(monthKey, 1)}-01`, -1);
  return { from, to };
}

export function publicAvailabilityDays(input: {
  monthKey: string;
  today: string;
  holds: ReadonlyArray<{ date: string; slot: string | null | undefined }>;
}): PublicPartyDay[] | null {
  const bounds = monthBounds(input.monthKey);
  if (!bounds || !DATE_ONLY.test(input.today)) return null;
  const held = new Set(
    input.holds
      .filter((hold) => hold.slot === "am" || hold.slot === "pm")
      .map((hold) => `${hold.date}:${hold.slot}`),
  );
  const days: PublicPartyDay[] = [];
  for (let date = bounds.from; date <= bounds.to; date = shiftDateOnly(date, 1)) {
    const am: PublicSlotState = held.has(`${date}:am`) ? "held" : "open";
    const pm: PublicSlotState = held.has(`${date}:pm`) ? "held" : "open";
    const past = date < input.today;
    days.push({
      date,
      shade: am === "held" && pm === "held" ? "light" : "bright",
      am,
      pm,
      bookable: !past && (am === "open" || pm === "open"),
    });
  }
  return days;
}

export function publicAvailabilityResponse(input: {
  monthKey: string;
  today?: string;
  holds: ReadonlyArray<{ date: string; slot: string | null | undefined }>;
}) {
  const today = input.today ?? deskDateOnly();
  const days = publicAvailabilityDays({ monthKey: input.monthKey, today, holds: input.holds });
  if (!days) return null;
  return {
    ok: true as const,
    mode: "live" as const,
    timezone: "America/Chicago",
    month: input.monthKey,
    maxPartiesPerDay: 2,
    partyLengthHours: "2–2.5",
    blocks: {
      am: { label: "AM 9:00–1:00", starts: [...PUBLIC_PARTY_STARTS.am] },
      pm: { label: "PM 2:00–6:00", starts: [...PUBLIC_PARTY_STARTS.pm] },
    },
    days,
  };
}

export function publicHoldsFromSlotRows(rows: ReadonlyArray<{ date: string; slot: string | null | undefined }>): PartyHold[] {
  const seen = new Set<string>();
  const holds: PartyHold[] = [];
  for (const row of rows) {
    if (row.slot !== "am" && row.slot !== "pm") continue;
    const key = `${row.date}:${row.slot}`;
    if (seen.has(key)) continue;
    seen.add(key);
    holds.push({
      id: key,
      hostName: "",
      preferredDate: row.date,
      partySlot: row.slot,
      calendarStatus: "tentative",
    });
  }
  return holds;
}

export function suggestPublicSlots(input: {
  holds: readonly PartyHold[];
  fromDate: string;
  avoid?: { date: string; slot: PartySlot } | null;
}): PartySlotSuggestion[] {
  return suggestOpenSlots({ holds: input.holds, fromDate: input.fromDate, avoid: input.avoid ?? null });
}

export function parsePublicPartyHold(body: unknown, requestIdOverride?: string | null):
  | { ok: true; value: PublicHoldInput }
  | { ok: false; honeypot: true }
  | { ok: false; honeypot: false; issues: string[] } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, honeypot: false, issues: ["body"] };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.companyWebsite === "string" && record.companyWebsite.trim()) {
    return { ok: false, honeypot: true };
  }
  const issues: string[] = [];
  const requestId = String(requestIdOverride ?? record.requestId ?? "").trim();
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(requestId)) issues.push("requestId");
  const hostName = String(record.name ?? record.hostName ?? "").trim();
  if (hostName.length < 2 || hostName.length > 220) issues.push("name");
  const email = String(record.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 320) issues.push("email");
  const phoneRaw = String(record.phone ?? "").trim();
  const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
  let phone: string | null = null;
  if (phoneRaw) {
    if (phoneRaw.length < 7 || phoneRaw.length > 80 || phoneDigits.length < 10 || phoneDigits.length > 15) issues.push("phone");
    else phone = phoneRaw;
  }
  const partyType = String(record.partyType ?? "").trim();
  if (!PUBLIC_PARTY_TYPES.includes(partyType as PublicPartyType)) issues.push("partyType");
  let guestCount: number | null = null;
  if (record.guestCount !== undefined && record.guestCount !== null && record.guestCount !== "") {
    const parsed = Number(record.guestCount);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) issues.push("guestCount");
    else guestCount = parsed;
  }
  const date = String(record.date ?? "").trim();
  if (!DATE_ONLY.test(date)) issues.push("date");
  const slot = String(record.slot ?? "").trim();
  if (slot !== "am" && slot !== "pm") issues.push("slot");
  const startTime = String(record.startTime ?? "").trim();
  const allowedStarts: readonly string[] = slot === "am" || slot === "pm" ? PUBLIC_PARTY_STARTS[slot] : [];
  if (!allowedStarts.includes(startTime)) issues.push("startTime");
  const zipRaw = String(record.zip ?? "").trim();
  let zip: string | null = null;
  if (zipRaw) {
    if (!ZIP.test(zipRaw)) issues.push("zip");
    else zip = zipRaw;
  }
  const notesRaw = String(record.notes ?? "").trim();
  if (notesRaw.length > 2000) issues.push("notes");
  if (record.consent !== true) issues.push("consent");
  if (issues.length) return { ok: false, honeypot: false, issues };
  const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl.trim().slice(0, 500) : null;
  return {
    ok: true,
    value: {
      requestId,
      hostName,
      email,
      phone,
      partyType: partyType as PublicPartyType,
      guestCount,
      date,
      slot: slot as PartySlot,
      startTime,
      zip,
      notes: notesRaw || null,
      sourceUrl: sourceUrl || null,
    },
  };
}
