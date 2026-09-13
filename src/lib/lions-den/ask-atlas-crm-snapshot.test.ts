import assert from "node:assert/strict";
import test from "node:test";
import {
  ASK_ATLAS_CRM_LIST_CAP,
  ASK_ATLAS_NOTE_SNIPPET_CHARS,
  PHONE_NOT_PUBLISHED_EN,
  PHONE_NOT_PUBLISHED_ES,
  atlasPublishedPhone,
  buildAskAtlasCrmSnapshot,
  formatAskAtlasCrmSnapshot,
  phoneNotPublishedLabel,
  truncateAskAtlasSnippet,
} from "./ask-atlas-crm-snapshot.ts";

const NOW = new Date("2026-09-13T15:00:00.000Z");
const TZ = "America/Chicago";

test("published phones stay as written; blanks become Phone not published", () => {
  assert.equal(atlasPublishedPhone("(281) 555-0101"), "(281) 555-0101");
  assert.equal(atlasPublishedPhone("  +1 713 555 0199  "), "+1 713 555 0199");
  assert.equal(atlasPublishedPhone(null), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone(""), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone("   "), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone("Google did not publish a phone number."), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone("Google did not publish a phone."), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone("no publicó un teléfono"), PHONE_NOT_PUBLISHED_EN);
  assert.equal(atlasPublishedPhone(null, true), PHONE_NOT_PUBLISHED_ES);
  assert.equal(phoneNotPublishedLabel(true), "Teléfono no publicado");
  assert.doesNotMatch(atlasPublishedPhone(undefined), /\d{3}/);
});

test("due today, overdue, and to-call buckets use the desk calendar", () => {
  const snapshot = buildAskAtlasCrmSnapshot({
    now: NOW,
    timeZone: TZ,
    opportunities: [
      {
        name: "ABC Plumbing",
        stage: "ready_for_follow_up",
        contactName: "Jordan Hale",
        contactPhone: "(555) 010-0101",
        nextAction: "Call Jordan about the referral.",
        nextActionDue: "2026-09-13",
        researchSummary: "Plumbing shop that asked about hats.",
      },
      {
        name: "Overdue Roofing",
        stage: "follow_up_queued",
        contactPhone: "713-555-2222",
        nextAction: "Check in on the quote.",
        nextActionDue: "2026-09-10",
      },
      {
        name: "Later Electric",
        stage: "qualified",
        contactPhone: "713-555-3333",
        nextAction: "Send the one-pager next week.",
        nextActionDue: "2026-09-20",
      },
      {
        name: "Won Client",
        stage: "won",
        contactPhone: "713-555-4444",
        nextAction: "Kickoff",
        nextActionDue: "2026-09-13",
      },
    ],
  });

  assert.deepEqual(
    snapshot.dueToday.map((item) => item.name),
    ["ABC Plumbing"],
  );
  assert.equal(snapshot.dueToday[0]?.phone, "(555) 010-0101");
  assert.equal(snapshot.dueToday[0]?.contactName, "Jordan Hale");
  assert.deepEqual(
    snapshot.overdue.map((item) => item.name),
    ["Overdue Roofing"],
  );
  assert.deepEqual(
    snapshot.toCall.map((item) => item.name),
    ["Overdue Roofing", "ABC Plumbing"],
  );
  assert.equal(snapshot.toCall.some((item) => item.name === "Won Client"), false);
  assert.equal(snapshot.dueToday.some((item) => item.name === "Won Client"), false);
});

test("contacted follow-up and missing phones never invent a number", () => {
  const snapshot = buildAskAtlasCrmSnapshot({
    now: NOW,
    timeZone: TZ,
    notes: [{ title: "Bayou HVAC", body: "Asked for a Tuesday check-in after the first visit." }],
    opportunities: [
      {
        name: "Bayou HVAC",
        stage: "contacted",
        contactPhone: null,
        nextAction: "Wait three days, then check in.",
        nextActionDue: "2026-09-13",
        researchSummary: "Long research writeup that should be trimmed if a matching note exists.",
      },
    ],
  });

  const emptyName = buildAskAtlasCrmSnapshot({
    now: NOW,
    timeZone: TZ,
    opportunities: [{ name: "   ", stage: "ready_for_follow_up", contactPhone: "713-555-0000" }],
  });
  assert.equal(emptyName.toCall.length, 0);

  assert.equal(snapshot.contactedFollowUp.length, 1);
  assert.equal(snapshot.contactedFollowUp[0]?.phone, PHONE_NOT_PUBLISHED_EN);
  assert.equal(snapshot.dueToday[0]?.phone, PHONE_NOT_PUBLISHED_EN);
  assert.match(String(snapshot.dueToday[0]?.noteSnippet), /Tuesday check-in/);
  assert.doesNotMatch(JSON.stringify(snapshot), /713-555-0000/);
  assert.doesNotMatch(formatAskAtlasCrmSnapshot(snapshot), /\b555-01|\b713-555-0000\b/);
  assert.match(formatAskAtlasCrmSnapshot(snapshot), /Phone not published/);
  assert.match(formatAskAtlasCrmSnapshot(snapshot), /Advise only; do not send/);
});

test("lists stay compact and note snippets are truncated", () => {
  const longNote = "x".repeat(400);
  const opportunities = Array.from({ length: 12 }, (_, index) => ({
    name: `Shop ${String(index + 1).padStart(2, "0")}`,
    stage: "ready_for_follow_up" as const,
    contactPhone: index === 0 ? "Google did not publish a phone number." : `(281) 555-01${String(index).padStart(2, "0")}`,
    nextAction: `Call shop ${String(index + 1).padStart(2, "0")}`,
    nextActionDue: "2026-09-13",
    researchSummary: longNote,
  }));

  const snapshot = buildAskAtlasCrmSnapshot({
    now: NOW,
    timeZone: TZ,
    opportunities,
  });

  assert.equal(snapshot.dueToday.length, ASK_ATLAS_CRM_LIST_CAP);
  assert.equal(snapshot.toCall.length, ASK_ATLAS_CRM_LIST_CAP);
  assert.equal(snapshot.topNextActions.length, ASK_ATLAS_CRM_LIST_CAP);
  assert.ok((snapshot.dueToday[0]?.noteSnippet?.length ?? 0) <= ASK_ATLAS_NOTE_SNIPPET_CHARS);
  assert.equal(snapshot.dueToday[0]?.phone, PHONE_NOT_PUBLISHED_EN);
  assert.equal(truncateAskAtlasSnippet(longNote)?.endsWith("…"), true);
  const formatted = formatAskAtlasCrmSnapshot(snapshot);
  assert.ok(formatted.length < 4000);
  assert.match(formatted, /Due today/);
  assert.doesNotMatch(formatted, /Shop 12/);
  assert.match(formatted, /Shop 01/);
  assert.match(formatted, /Shop 06/);
});

test("empty desk snapshot does not invent sample prospects", () => {
  const snapshot = buildAskAtlasCrmSnapshot({ now: NOW, timeZone: TZ, opportunities: [] });
  assert.deepEqual(snapshot, {
    dueToday: [],
    overdue: [],
    toCall: [],
    contactedFollowUp: [],
    topNextActions: [],
  });
  assert.match(formatAskAtlasCrmSnapshot(snapshot), /No open call or follow-up items/);
  assert.doesNotMatch(formatAskAtlasCrmSnapshot(snapshot), /ABC Plumbing|sample/i);
});
