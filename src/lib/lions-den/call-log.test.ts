import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEFAULT_DAILY_CALL_GOAL,
  buildDeskCallLogInsert,
  callGoalProgress,
  countCallsOnLocalDay,
  dailyCallGoalOrDefault,
  deskDayBounds,
  formatDeskCallTime,
  isMissingDeskCallLogTable,
  parseDailyCallGoal,
} from "./call-log.ts";
import { deskDayKey } from "../desk-time.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const CHICAGO = "America/Chicago";

function deskDayKeyFromBounds(day: string, timeZone: string) {
  const bounds = deskDayBounds(day, timeZone);
  assert.ok(bounds, day);
  return bounds;
}

test("the daily counter resets at Chicago midnight, not UTC midnight", () => {
  const sep = deskDayKeyFromBounds("2026-09-15", CHICAGO);
  assert.equal(sep.start.toISOString(), "2026-09-15T05:00:00.000Z");
  assert.equal(sep.end.toISOString(), "2026-09-16T05:00:00.000Z");

  const winter = deskDayKeyFromBounds("2026-01-15", CHICAGO);
  assert.equal(winter.start.toISOString(), "2026-01-15T06:00:00.000Z");

  const spring = deskDayKeyFromBounds("2026-03-08", CHICAGO);
  assert.equal(spring.start.toISOString(), "2026-03-08T06:00:00.000Z");
  assert.equal(spring.end.toISOString(), "2026-03-09T05:00:00.000Z");

  const fall = deskDayKeyFromBounds("2026-11-01", CHICAGO);
  assert.equal(fall.start.toISOString(), "2026-11-01T05:00:00.000Z");
  assert.equal(fall.end.toISOString(), "2026-11-02T06:00:00.000Z");

  const lateMonday = new Date(sep.start.getTime() - 1).toISOString();
  const firstTuesday = sep.start.toISOString();
  const entries = [
    { loggedAt: lateMonday, prospectName: "Still Monday" },
    { loggedAt: firstTuesday, prospectName: "Tuesday" },
  ];
  assert.equal(deskDayKey(lateMonday, CHICAGO), "2026-09-14");
  assert.equal(deskDayKey(firstTuesday, CHICAGO), "2026-09-15");
  assert.equal(deskDayKey(new Date(sep.end.getTime() - 1).toISOString(), CHICAGO), "2026-09-15");
  assert.equal(deskDayKey(sep.end.toISOString(), CHICAGO), "2026-09-16");
  assert.equal(countCallsOnLocalDay(entries, "2026-09-14", CHICAGO), 1);
  assert.equal(countCallsOnLocalDay(entries, "2026-09-15", CHICAGO), 1);
  assert.equal(countCallsOnLocalDay(entries, "2026-09-15", "UTC"), 2);
});

test("logging a call appends company, time, and an optional note onto that local day", () => {
  const first = buildDeskCallLogInsert({
    organizationId: "org-1",
    opportunityId: "opp-1",
    prospectName: "  Blaze N Ace Asphalt  ",
    note: "  Left a voicemail  ",
    loggedAt: "2026-09-15T04:59:00.000Z",
  });
  assert.ok(first);
  assert.deepEqual(first, {
    organization_id: "org-1",
    opportunity_id: "opp-1",
    prospect_name: "Blaze N Ace Asphalt",
    note: "Left a voicemail",
    logged_at: "2026-09-15T04:59:00.000Z",
  });

  const second = buildDeskCallLogInsert({
    organizationId: "org-1",
    opportunityId: "opp-2",
    prospectName: "Texas Paintless Dent Repair",
    note: "   ",
    loggedAt: "2026-09-15T05:00:00.000Z",
  });
  assert.equal(second?.note, null);
  assert.equal(buildDeskCallLogInsert({
    organizationId: "org-1",
    opportunityId: "opp-3",
    prospectName: "   ",
    loggedAt: "2026-09-15T05:00:00.000Z",
  }), null);

  const before = [
    { loggedAt: first.logged_at, prospectName: first.prospect_name, note: first.note },
  ];
  const appended = [
    { loggedAt: second!.logged_at, prospectName: second!.prospect_name, note: second!.note },
    ...before,
  ];
  assert.equal(appended[0]?.prospectName, "Texas Paintless Dent Repair");
  assert.equal(appended[0]?.note, null);
  assert.equal(countCallsOnLocalDay(before, "2026-09-14", CHICAGO), 1);
  assert.equal(countCallsOnLocalDay(before, "2026-09-15", CHICAGO), 0);
  assert.equal(countCallsOnLocalDay(appended, "2026-09-14", CHICAGO), 1);
  assert.equal(countCallsOnLocalDay(appended, "2026-09-15", CHICAGO), 1);
  assert.equal(formatDeskCallTime(second!.logged_at, false, CHICAGO), "12:00 AM");
});

test("the daily goal defaults to 100 and only saves a whole number from 1 to 500", () => {
  assert.equal(DEFAULT_DAILY_CALL_GOAL, 100);
  assert.equal(dailyCallGoalOrDefault(undefined), 100);
  assert.equal(dailyCallGoalOrDefault(null), 100);
  assert.equal(dailyCallGoalOrDefault(""), 100);
  assert.equal(dailyCallGoalOrDefault("nope"), 100);
  assert.equal(parseDailyCallGoal(""), null);
  assert.equal(parseDailyCallGoal(0), null);
  assert.equal(parseDailyCallGoal(501), null);
  assert.equal(parseDailyCallGoal(12.5), null);
  assert.equal(parseDailyCallGoal("12"), 12);
  assert.equal(parseDailyCallGoal(100), 100);
  assert.deepEqual(callGoalProgress(12, 100), { calls: 12, goal: 100, percent: 12 });
  assert.equal(callGoalProgress(150, 100).percent, 100);
  assert.equal(callGoalProgress(3, 0).goal, 100);
});

test("Log call and Save note append the org call log; the counter and goal stay on the AFE Calls to make desk", () => {
  const actions = read("src/server/opportunities/desk-contact-actions.ts");
  const overview = read("src/components/lions-den/lions-den-overview.tsx");
  const panel = read("src/components/lions-den/afe-call-log.tsx");
  const page = read("src/app/client/page.tsx");
  const migration = read("supabase/migrations/20260921180000_afe_desk_call_log.sql");
  const start = actions.indexOf("export async function addProspectNote");
  const notePath = actions.slice(start);
  assert.match(notePath, /appendDeskCallLog\(/);
  assert.match(notePath, /buildDeskCallLogInsert|prospectName: String\(data\.name/);
  assert.doesNotMatch(notePath, /if \(logCall\)[\s\S]{0,240}appendDeskCallLog/);
  assert.doesNotMatch(actions, /twilio|api\.resend\.com/i);

  assert.match(overview, /!sisDesk && callDesk && organizationId/);
  assert.match(overview, /<AfeCallLogDesk/);
  assert.match(panel, /Calls today:/);
  assert.match(panel, /Llamadas hoy:/);
  assert.match(panel, /\/ \$\{progress\.goal\} today/);
  assert.match(panel, /data-afe-call-log/);
  assert.match(panel, /data-calls-today/);
  assert.match(panel, /name="dailyCallGoal"/);
  assert.match(panel, /name="callDay"/);
  assert.match(panel, /setDailyCallGoal/);
  assert.doesNotMatch(panel, /twilio|Twilio|auto-dial/i);

  assert.match(page, /!isSisWorkspace/);
  assert.match(page, /getAfeCallDesk\(/);
  assert.match(migration, /organization_desk_call_logs/);
  assert.match(migration, /daily_call_goal integer not null default 100/);
  assert.match(migration, /enable row level security/);
  assert.equal(isMissingDeskCallLogTable({ code: "PGRST205", message: "schema cache" }), true);
  assert.equal(isMissingDeskCallLogTable({ code: "42P01", message: "relation does not exist" }), true);
  assert.equal(isMissingDeskCallLogTable(null), false);
});
