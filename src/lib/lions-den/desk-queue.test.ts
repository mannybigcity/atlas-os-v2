import assert from "node:assert/strict";
import test from "node:test";
import { bucketFollowUpQueues, parseDeskDate } from "./desk-queue.ts";

test("date-only follow-up strings stay on the local calendar day", () => {
  const parsed = parseDeskDate("2026-08-29");
  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 7);
  assert.equal(parsed.getDate(), 29);
});

test("empty and invalid dates do not invent a queue item", () => {
  assert.equal(parseDeskDate(null), null);
  assert.equal(parseDeskDate(""), null);
  assert.equal(parseDeskDate("not-a-date"), null);
});

test("today and tomorrow queues use real due dates only", () => {
  const now = new Date(2026, 7, 29, 15, 30);
  const queues = bucketFollowUpQueues(
    [
      { id: "overdue", title: "Call host", detail: "Confirm deposit", dueAt: "2026-08-28" },
      { id: "today", title: "Follow FLEA YE PESTS", detail: "Call after lunch", dueAt: "2026-08-29" },
      { id: "tomorrow", title: "Send quote", detail: null, dueAt: "2026-08-30T17:00:00" },
      { id: "later", title: "Check back", detail: null, dueAt: "2026-09-04" },
      { id: "undated", title: "Missing date", detail: null, dueAt: "" },
    ],
    now,
  );

  assert.deepEqual(queues.overdue.map((item) => item.id), ["overdue"]);
  assert.deepEqual(queues.today.map((item) => item.id), ["today"]);
  assert.deepEqual(queues.tomorrow.map((item) => item.id), ["tomorrow"]);
  assert.deepEqual(queues.later.map((item) => item.id), ["later"]);
});

test("an empty workspace produces empty queues, not fake contacts", () => {
  const queues = bucketFollowUpQueues([]);
  assert.equal(queues.overdue.length + queues.today.length + queues.tomorrow.length + queues.later.length, 0);
});
