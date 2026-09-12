import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { deskDateInDays, deskDateLabel, deskDateOnly, deskDayKey, deskTimeZone, deskWeekday, shiftDateOnly } from "./desk-time.ts";
import { bucketFollowUpQueues } from "./lions-den/desk-queue.ts";
import { followUpSentCheckIn } from "./lions-den/follow-up-drafts.ts";

const root = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(root, path), "utf8");

// 8:30pm Monday Sep 14 in Texas = 01:30 UTC Tuesday Sep 15.
const lateMondayTexas = new Date("2026-09-15T01:30:00.000Z");

test("the desk day is the owner's day in Texas, not the server's UTC day", () => {
  assert.equal(deskTimeZone(), "America/Chicago");
  assert.equal(deskDateOnly(lateMondayTexas, "America/Chicago"), "2026-09-14");
  assert.equal(deskDateOnly(lateMondayTexas, "UTC"), "2026-09-15");
  assert.equal(deskDateInDays(3, { from: lateMondayTexas, timeZone: "America/Chicago" }), "2026-09-17");
  assert.equal(deskDateInDays(1, { from: new Date("2026-10-01T02:00:00.000Z"), timeZone: "America/Chicago" }), "2026-10-01", "Sept 30 evening + 1 = Oct 1");
  assert.equal(shiftDateOnly("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDateOnly("junk", 1), "junk");
  assert.equal(deskWeekday(lateMondayTexas, false, "America/Chicago"), "Monday");
  assert.equal(deskWeekday(lateMondayTexas, true, "America/Chicago"), "lunes");
  assert.equal(deskDateLabel("2026-09-15", false), "Tue, Sep 15");
  assert.equal(deskDayKey("2026-09-15"), "2026-09-15");
  assert.equal(deskDayKey("2026-09-15T01:30:00.000Z", "America/Chicago"), "2026-09-14");
  assert.equal(deskDayKey(""), null);
  assert.equal(deskDayKey("not a date"), null);
});

test("a check-in due tomorrow does not show under Today at 8pm Texas time", () => {
  const items = [
    { id: "tue", title: "Due Tuesday", detail: null, dueAt: "2026-09-15" },
    { id: "mon", title: "Due Monday", detail: null, dueAt: "2026-09-14" },
    { id: "sun", title: "Due Sunday", detail: null, dueAt: "2026-09-13" },
    { id: "stamp", title: "Timestamp late Monday", detail: null, dueAt: "2026-09-15T01:00:00.000Z" },
  ];
  const texas = bucketFollowUpQueues(items, lateMondayTexas, "America/Chicago");
  assert.deepEqual(texas.overdue.map((item) => item.id), ["sun"]);
  assert.deepEqual(texas.today.map((item) => item.id), ["mon", "stamp"]);
  assert.deepEqual(texas.tomorrow.map((item) => item.id), ["tue"]);
  const utc = bucketFollowUpQueues(items, lateMondayTexas, "UTC");
  assert.deepEqual(utc.today.map((item) => item.id), ["tue", "stamp"], "the old behavior, for contrast");
});

test("the 'I sent this' check-in names the owner's weekday and lands three owner-days out", () => {
  const checkIn = followUpSentCheckIn({ contactName: null, spanish: false, sentAt: lateMondayTexas });
  assert.match(checkIn.nextAction, /from Monday/);
  assert.equal(checkIn.nextActionDue, "2026-09-17");
});

test("no desk code computes a calendar day from the server clock any more", () => {
  for (const path of [
    "lib/lions-den/desk-queue.ts",
    "lib/lions-den/follow-up-drafts.ts",
    "lib/lions-den/sample-desk.ts",
    "lib/lions-den/trial-desk-seed.ts",
    "server/sis-workspace/actions.ts",
  ]) {
    const source = read(path);
    assert.match(source, /desk-time/, path);
    assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/, path);
    assert.doesNotMatch(source, /setHours\(0, 0, 0, 0\)/, path);
  }
});

test("the founder hears about broken desks: one email per error per hour, nothing without a mailbox", () => {
  const report = read("server/observability/report-error.ts");
  assert.match(report, /FOUNDER_MAILBOX_EMAIL/);
  assert.match(report, /RESEND_API_KEY/);
  assert.match(report, /idempotencyKey: `atlas-error:\$\{hourBucket\(now\)\}/);
  assert.match(report, /QUIET_MS = 60 \* 60 \* 1000/);
  const instrumentation = read("instrumentation.ts");
  assert.match(instrumentation, /export const onRequestError/);
  assert.match(instrumentation, /reportDeskError\(/);
  const boundary = read("app/client/error.tsx");
  assert.match(boundary, /^"use client";/);
  assert.match(boundary, /Nothing was sent and nothing was lost/);
  assert.match(boundary, /Try again/);
  for (const path of ["server/leads/actions.ts", "server/opportunities/actions.ts", "server/outreach/actions.ts"]) {
    assert.match(read(path), /reportDeskError\(/, path);
  }
});
