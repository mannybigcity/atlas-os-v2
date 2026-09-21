import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { prospectBelongsOnCallsToMake, prospectHasBeenContacted } from "./calls-to-make.ts";
import { visibleLionsDenBoards } from "./client-hub.ts";
import type { OrganizationOpportunity } from "../../server/opportunities/queries.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function prospect(overrides: Partial<OrganizationOpportunity> = {}): OrganizationOpportunity {
  return {
    id: "opp-1",
    organizationId: "org-1",
    name: "Dent Free Image Mobile Paintless Dent Repair",
    opportunityType: "customer",
    stage: "ready_for_follow_up",
    fitScore: 0,
    ownerRole: "client",
    sourceLabel: "HUNTER Google Maps",
    sourceUrl: null,
    contactName: null,
    contactEmail: null,
    contactPhone: "(210) 744-3464",
    contactSocial: null,
    researchSummary: "Call this prospect. Atlas has not contacted them.",
    fitReason: null,
    nextAction: "Call this prospect. Atlas has not contacted them.",
    nextActionDue: null,
    metadata: {},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    events: [],
    ...overrides,
  };
}

test("Calls to make is only phone + never contacted; no-phone and already-called stay off", () => {
  const uncalled = prospect();
  assert.equal(prospectBelongsOnCallsToMake(uncalled), true);

  const noPhone = prospect({
    name: "Dent Republic LLC",
    contactPhone: null,
    nextAction: "No phone on file. Open Maps, add a number, or follow up another way. Atlas has not contacted them.",
  });
  assert.equal(prospectBelongsOnCallsToMake(noPhone), false);

  const blaze = prospect({
    name: "Blaze N Ace Asphalt Paving LLC",
    contactPhone: "(832) 764-1228",
    stage: "responded",
    nextAction: "Good talking with you on Monday. Let me know when you want to take the next step.",
    metadata: {
      owner_contacted_at: "2026-09-15T16:00:00.000Z",
      last_desk_contact: { channel: "call", at: "2026-09-15T16:00:00.000Z", outcome: "talked" },
    },
  });
  assert.equal(prospectHasBeenContacted(blaze), true);
  assert.equal(prospectBelongsOnCallsToMake(blaze), false);

  const texas = prospect({
    name: "Texas Paintless Dent Repair",
    contactPhone: "(281) 844-3832",
    stage: "contacted",
    nextAction: "Tried you on Monday and missed you. When is a good time to talk?",
    metadata: {
      last_desk_contact: { channel: "call", at: "2026-09-15T17:00:00.000Z", outcome: "no_answer" },
    },
  });
  assert.equal(prospectBelongsOnCallsToMake(texas), false);
});

test("an owner post-call note counts as contacted even without a stamp yet", () => {
  const noted = prospect({
    events: [
      {
        id: "evt-1",
        eventType: "note_added",
        actorRole: "client",
        summary: "Good talking with you on Monday. Let me know when you want to take the next step.",
        body: "Good talking with you on Monday.",
        createdAt: "2026-09-15T16:05:00.000Z",
      },
    ],
  });
  assert.equal(prospectHasBeenContacted(noted), true);
  assert.equal(prospectBelongsOnCallsToMake(noted), false);

  const hunterAccept = prospect({
    events: [
      {
        id: "evt-2",
        eventType: "created",
        actorRole: "hunter",
        summary: "Owner accepted this HUNTER find into Prospects. No contact was sent.",
        body: "Atlas has not contacted them.",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  });
  assert.equal(prospectHasBeenContacted(hunterAccept), false);
  assert.equal(prospectBelongsOnCallsToMake(hunterAccept), true);
});

test("AFE tab says Calls to make; SIS keeps Summary; route stays /client", () => {
  const afe = visibleLionsDenBoards({
    name: "Atlas For Entrepreneurs",
    slug: "atlas-for-entrepreneurs",
  });
  const sis = visibleLionsDenBoards({
    name: "SIS Custom Creations",
    slug: "sis-diy-big-complete-showcase",
  });
  assert.equal(afe.find((board) => board.id === "overview")?.label, "Calls to make");
  assert.equal(afe.find((board) => board.id === "overview")?.labelEs, "Llamadas por hacer");
  assert.equal(afe.find((board) => board.id === "overview")?.href, "/client");
  assert.equal(sis.find((board) => board.id === "overview")?.label, "Summary");
  assert.equal(sis.find((board) => board.id === "overview")?.labelEs, "Resumen");
});

test("Calls to make UI filters the overview list and logs the call without touching Prospects", () => {
  const overview = readRepo("components/lions-den/lions-den-overview.tsx");
  const list = readRepo("components/lions-den/lions-den-prospects.tsx");
  const detail = readRepo("components/lions-den/lions-den-prospect-detail.tsx");
  const actions = readRepo("server/opportunities/desk-contact-actions.ts");
  const hub = readRepo("lib/lions-den/client-hub.ts");

  assert.match(overview, /prospectBelongsOnCallsToMake/);
  assert.match(overview, /Calls to make/);
  assert.match(overview, /Llamadas por hacer/);
  assert.match(overview, /variant="log-call"/);
  assert.match(overview, /data-calls-to-make/);
  assert.doesNotMatch(overview, /twilio|Twilio|auto-send/i);

  assert.doesNotMatch(list, /prospectBelongsOnCallsToMake/);
  assert.match(list, /Businesses the salesman can call/);

  assert.match(detail, /prospectBelongsOnCallsToMake/);
  assert.match(detail, /data-log-call/);
  assert.match(detail, /variant="log-call"/);

  assert.match(actions, /owner_contacted_at/);
  assert.match(actions, /last_desk_contact: existingContact \?\? stamp/);
  assert.match(actions, /stage: "contacted"/);
  assert.match(actions, /reachedOutFollowUp/);
  assert.match(actions, /name="logCall"|logCall \? "contact_logged"/);
  assert.doesNotMatch(actions, /api\.resend\.com|twilio|sms:/i);

  assert.match(hub, /label: "Summary"/);
  assert.match(hub, /label: "Calls to make"/);
  assert.match(hub, /isSisOrganization\(organization\)\) return boards/);
});
