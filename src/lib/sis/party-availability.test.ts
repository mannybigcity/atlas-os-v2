import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { deskWallClockIso } from "../desk-time.ts";
import {
  activePartyHolds,
  decodeSuggestions,
  encodeSuggestions,
  monthGrid,
  partyBlockStartIso,
  partyDayShade,
  shiftMonthKey,
  SIS_PARTY_SLOT_MIGRATION,
  suggestOpenSlots,
  type PartyHold,
  type PartyHoldSource,
} from "./party-availability.ts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function hold(date: string, slot: "am" | "pm", status: PartyHoldSource["calendarStatus"] = "tentative", id = `${date}-${slot}`): PartyHoldSource {
  return {
    id,
    hostName: id,
    preferredDate: date,
    partySlot: slot,
    calendarStatus: status,
  };
}

test("Chicago block starts stay on the desk clock across daylight saving", () => {
  assert.equal(deskWallClockIso("2026-09-22", 9, 0, "America/Chicago"), "2026-09-22T14:00:00.000Z");
  assert.equal(deskWallClockIso("2026-09-22", 14, 0, "America/Chicago"), "2026-09-22T19:00:00.000Z");
  assert.equal(deskWallClockIso("2026-01-15", 9, 0, "America/Chicago"), "2026-01-15T15:00:00.000Z");
  assert.equal(deskWallClockIso("2026-01-15", 14, 0, "America/Chicago"), "2026-01-15T20:00:00.000Z");
  assert.equal(partyBlockStartIso("2026-09-26", "am"), "2026-09-26T14:00:00.000Z");
  assert.equal(partyBlockStartIso("2026-09-26", "pm"), "2026-09-26T19:00:00.000Z");
  assert.equal(deskWallClockIso("nope", 9), null);
});

test("day shade is bright while a block is open and light only when both are held", () => {
  const date = "2026-09-26";
  assert.equal(partyDayShade([], date), "bright");
  assert.equal(partyDayShade([hold(date, "am")], date), "bright");
  assert.equal(partyDayShade([hold(date, "pm", "confirmed")], date), "bright");
  assert.equal(partyDayShade([hold(date, "am"), hold(date, "pm", "confirmed")], date), "light");
  assert.equal(partyDayShade([hold(date, "am", "cancelled"), hold(date, "pm")], date), "bright");
  assert.equal(partyDayShade([hold(date, "am", "not_scheduled"), hold(date, "pm", "not_scheduled")], date), "bright");
  assert.equal(
    partyDayShade(
      [
        { id: "plain", hostName: "Follow-up", preferredDate: date, partySlot: null, calendarStatus: "tentative" },
        { id: "other", hostName: "Also not a slot", preferredDate: date, partySlot: null, calendarStatus: "confirmed" },
      ],
      date,
    ),
    "bright",
  );
  assert.equal(partyDayShade([hold(date, "am"), hold("2026-09-27", "am"), hold("2026-09-27", "pm")], date), "bright");
});

test("a second row on the same block does not paint the day full", () => {
  const rows = [hold("2026-09-26", "am", "tentative", "a"), hold("2026-09-26", "am", "confirmed", "b")];
  assert.equal(activePartyHolds(rows).length, 1);
  assert.equal(partyDayShade(rows, "2026-09-26"), "bright");
});

test("open-slot suggestions prefer Saturday, then weekday afternoons", () => {
  assert.deepEqual(suggestOpenSlots({ holds: [], fromDate: "2026-09-22", count: 3 }), [
    { date: "2026-09-26", slot: "am" },
    { date: "2026-09-26", slot: "pm" },
    { date: "2026-10-03", slot: "am" },
  ]);

  const takenSaturdayMorning = activePartyHolds([hold("2026-09-26", "am")]);
  assert.deepEqual(
    suggestOpenSlots({
      holds: takenSaturdayMorning,
      fromDate: "2026-09-22",
      avoid: { date: "2026-09-26", slot: "am" },
      count: 3,
    })[0],
    { date: "2026-09-26", slot: "pm" },
  );

  const saturdays: PartyHold[] = [];
  for (let offset = 0; offset < 56; offset += 1) {
    const date = shiftDate(offset);
    if (new Date(`${date}T00:00:00.000Z`).getUTCDay() !== 6) continue;
    saturdays.push(...(activePartyHolds([hold(date, "am"), hold(date, "pm")]) as PartyHold[]));
  }
  assert.deepEqual(suggestOpenSlots({ holds: saturdays, fromDate: "2026-09-22", count: 3 }), [
    { date: "2026-09-22", slot: "pm" },
    { date: "2026-09-23", slot: "pm" },
    { date: "2026-09-24", slot: "pm" },
  ]);
  assert.deepEqual(suggestOpenSlots({ holds: [], fromDate: "2026-10-03", count: 1 }), [{ date: "2026-10-03", slot: "am" }]);
  assert.deepEqual(suggestOpenSlots({ holds: [], fromDate: "not-a-date" }), []);
});

test("suggestion query text round-trips three blocks", () => {
  const slots = [
    { date: "2026-09-26", slot: "pm" as const },
    { date: "2026-10-03", slot: "am" as const },
    { date: "2026-10-03", slot: "pm" as const },
  ];
  assert.deepEqual(decodeSuggestions(encodeSuggestions(slots)), slots);
  assert.deepEqual(decodeSuggestions("nope,2026-09-26.pm,2026-09-01.xx"), [{ date: "2026-09-26", slot: "pm" }]);
});

test("the month grid is a Sunday-start desk calendar, not a browser clock", () => {
  const grid = monthGrid("2026-09");
  assert.equal(grid.length, 42);
  assert.deepEqual(grid[0], { date: "2026-08-30", inMonth: false });
  assert.deepEqual(grid[2], { date: "2026-09-01", inMonth: true });
  assert.equal(shiftMonthKey("2026-12", 1), "2027-01");
  assert.equal(shiftMonthKey("2026-01", -1), "2025-12");
});

test("SIS calendar availability stays off the AFE follow-up calendar", () => {
  const page = read("src/app/client/calendar/page.tsx");
  assert.match(page, /const sisDesk = Boolean\(organization && isSisOrganization\(organization\)\);/);
  assert.match(page, /sisDesk && organization[\s\S]{0,120}getSisPartyCalendar\(organization\.id\)/);
  assert.match(page, /variant="follow-up"/);
  assert.match(page, /SisPartyAvailabilityCalendar/);

  const followUpCalendar = read("src/components/lions-den/lions-den-calendar.tsx");
  assert.match(followUpCalendar, /Only dates already in the workspace/);
  assert.doesNotMatch(followUpCalendar, /SisPartyAvailabilityCalendar|partyDayShade|7C3AED/);
  assert.doesNotMatch(read("src/components/clients-calendar.tsx"), /partyDayShade|party_slot|7C3AED|E9D5FF/);
  assert.doesNotMatch(read("src/components/lions-den/lions-den-overview.tsx"), /SisPartyAvailabilityCalendar/);

  const availability = read("src/components/lions-den/sis-party-availability-calendar.tsx");
  assert.match(availability, /bg-\[#7C3AED\]/);
  assert.match(availability, /bg-\[#E9D5FF\]/);
  assert.doesNotMatch(availability, /localStorage|nextActionDue|next_action_due/);
});

test("slot holds are written on the party event and conflicts do not send email", () => {
  const actions = read("src/server/sis-workspace/actions.ts");
  assert.match(actions, /preferred_date: preferredDate/);
  assert.match(actions, /party_slot: partySlot/);
  assert.match(actions, /calendar_status: calendarStatus/);
  assert.match(actions, /calendar_status: "tentative"/);
  assert.match(actions, /calendar_status: "cancelled"/);
  assert.match(actions, /partyBlockStartIso/);
  assert.match(actions, /suggestOpenSlots/);
  assert.match(actions, /getSisManager/);
  assert.doesNotMatch(actions, /resend|sendMail|nodemailer|mailto:/i);

  const overview = read("src/components/lions-den/lions-den-overview.tsx");
  assert.match(overview, /name="preferredDate"/);
  assert.match(overview, /name="partySlot"/);
  assert.match(overview, /value="am"/);
  assert.match(overview, /value="pm"/);

  const sql = read(SIS_PARTY_SLOT_MIGRATION);
  assert.match(sql, /party_slot text/);
  assert.match(sql, /party_slot in \('am', 'pm'\)/);
  assert.match(sql, /calendar_status in \('tentative', 'confirmed'\)/);
  assert.match(sql, /organization_sis_party_events_open_slot_uidx/);
  assert.doesNotMatch(sql, /organization_opportunities|afe_/i);
});

function shiftDate(days: number) {
  const shifted = new Date(Date.UTC(2026, 8, 22 + days));
  return shifted.toISOString().slice(0, 10);
}
