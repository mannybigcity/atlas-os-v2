import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { contactLinks, mailtoHref, smsHref, telHref } from "./contact-links.ts";
import {
  eventTypeForTouch,
  stageAfterTouch,
  trialDeskStatusMessage,
} from "./prospect-actions.ts";
import {
  trialLinkFromMetadata,
  trialProspectInsertFields,
  trialProspectNameCandidates,
  trialUserIdFromMetadata,
  type TrialProspectSource,
} from "./trial-prospect.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function source(overrides: Partial<TrialProspectSource> = {}): TrialProspectSource {
  return {
    userId: "2f4c1a9e-1111-4222-8333-444455556666",
    fullName: "Carlos Reyes",
    businessName: "Cypress Pest Pros",
    email: "Carlos@CypressPest.example",
    phone: "(713) 555-0142",
    businessType: "Pest control",
    primaryGrowthGoal: "Book 10 more recurring accounts a month",
    trialStartedAt: "2026-09-07T14:00:00.000Z",
    trialEndsAt: "2026-09-14T14:00:00.000Z",
    organizationId: "9b8a7c6d-1111-4222-8333-444455556666",
    organizationSlug: "cypress-pest-pros-2f4c1a9e",
    ...overrides,
  };
}

test("a trial signup becomes a callable customer prospect on the founder desk", () => {
  const fields = trialProspectInsertFields(source(), "trial_signup");

  assert.equal(fields.name, "Cypress Pest Pros");
  assert.equal(fields.opportunity_type, "customer");
  assert.equal(fields.stage, "ready_for_follow_up");
  assert.equal(fields.owner_role, "manual");
  assert.equal(fields.source_label, "7 Day Trial signup");
  assert.equal(fields.contact_name, "Carlos Reyes");
  assert.equal(fields.contact_email, "carlos@cypresspest.example");
  assert.equal(fields.contact_phone, "(713) 555-0142");
  assert.equal(fields.next_action_due, "2026-09-08");
  assert.match(fields.research_summary, /Signed up for the 7-day trial on Sep 7, 2026/);
  assert.match(fields.research_summary, /Pest control/);
  assert.match(fields.research_summary, /Book 10 more recurring accounts/);
  assert.match(fields.research_summary, /Atlas has not contacted them/);
  assert.match(fields.next_action, /Welcome call within 24 hours/);
  assert.equal(fields.metadata.trial_user_id, source().userId);
  assert.equal(fields.metadata.trial_organization_slug, "cypress-pest-pros-2f4c1a9e");
  assert.equal(fields.metadata.no_outreach_sent, true);
  assert.equal(fields.metadata.accepted_for_calling, true);
  assert.equal(fields.metadata.linked_from, "trial_signup");
  assert.ok(fields.research_summary.length >= 10 && fields.research_summary.length <= 3000);
  assert.ok(fields.next_action.length >= 5 && fields.next_action.length <= 1200);
});

test("a trial with a junk phone needs owner input instead of a call", () => {
  const fields = trialProspectInsertFields(source({ phone: "n/a" }), "trial_desk");
  assert.equal(fields.stage, "needs_client_input");
  assert.equal(fields.contact_phone, null);
  assert.equal(fields.metadata.accepted_for_calling, false);
  assert.match(fields.next_action, /No usable phone/);
});

test("name candidates disambiguate two trials with the same business name", () => {
  const names = trialProspectNameCandidates(source());
  assert.equal(names[0], "Cypress Pest Pros");
  assert.equal(names[1], "Cypress Pest Pros · Carlos Reyes");
  assert.equal(names[2], "Cypress Pest Pros (cypress-pest-pros-2f4c1a9e)");
  assert.match(names[3], /Cypress Pest Pros · 2f4c1a9e/);
  assert.ok(names.every((name) => name.length <= 220));
});

test("trial metadata round-trips back to a trial link", () => {
  const fields = trialProspectInsertFields(source(), "trial_signup");
  assert.equal(trialUserIdFromMetadata(fields.metadata), source().userId);
  const link = trialLinkFromMetadata(fields.metadata);
  assert.equal(link?.organizationSlug, "cypress-pest-pros-2f4c1a9e");
  assert.equal(link?.endsAt, "2026-09-14T14:00:00.000Z");
  assert.equal(trialLinkFromMetadata({ google_place_id: "abc" }), null);
  assert.equal(trialUserIdFromMetadata(null), null);
});

test("contact links open the owner's own phone and mail apps", () => {
  assert.equal(telHref("(713) 555-0142"), "tel:+17135550142");
  assert.equal(telHref("+52 55 1234 5678"), "tel:+525512345678");
  assert.equal(telHref("12345"), null);
  assert.equal(smsHref("713-555-0142"), "sms:+17135550142");
  assert.match(smsHref("713-555-0142", "Hi there") ?? "", /^sms:\+17135550142\?&body=Hi%20there$/);
  assert.equal(mailtoHref("not-an-email"), null);
  assert.equal(mailtoHref("carlos@example.com"), "mailto:carlos@example.com");
  assert.match(
    mailtoHref("carlos@example.com", { subject: "Your trial", body: "Hi Carlos" }) ?? "",
    /^mailto:carlos@example\.com\?subject=Your%20trial&body=Hi%20Carlos$/,
  );
  const links = contactLinks({ phone: null, email: "Owner@Example.com" });
  assert.equal(links.tel, null);
  assert.equal(links.sms, null);
  assert.equal(links.email, "owner@example.com");
});

test("logging a touch moves the stage forward and never downgrades a win", () => {
  assert.equal(stageAfterTouch("ready_for_follow_up", "reached"), "contacted");
  assert.equal(stageAfterTouch("ready_for_follow_up", "no_answer"), "contacted");
  assert.equal(stageAfterTouch("contacted", "replied"), "responded");
  assert.equal(stageAfterTouch("contacted", "booked"), "responded");
  assert.equal(stageAfterTouch("responded", "left_message"), "responded");
  assert.equal(stageAfterTouch("contacted", "not_interested"), "lost");
  assert.equal(stageAfterTouch("won", "not_interested"), "won");
  assert.equal(eventTypeForTouch("reached"), "contacted");
  assert.equal(eventTypeForTouch("replied"), "reply_received");
  assert.equal(eventTypeForTouch("not_interested"), "lost");
});

test("trial desk status copy reports sync counts", () => {
  assert.equal(trialDeskStatusMessage({ trial: "synced", added: "3", failed: "0" }), "3 trials added to Prospects.");
  assert.equal(
    trialDeskStatusMessage({ trial: "synced", added: "1", failed: "2" }),
    "1 trial added to Prospects. 2 could not be added.",
  );
  assert.match(trialDeskStatusMessage({ trial: "add_failed", reason: "trial_profile_missing" }) ?? "", /trial profile missing/);
  assert.equal(trialDeskStatusMessage(undefined), null);
});

test("the 7 Day Trial desk has real buttons and the prospect record can be worked", () => {
  const board = readFileSync(join(root, "src/components/lions-den/lions-den-trial-inbox.tsx"), "utf8");
  const detail = readFileSync(join(root, "src/components/lions-den/lions-den-prospect-detail.tsx"), "utf8");
  const actions = readFileSync(join(root, "src/server/opportunities/actions.ts"), "utf8");
  const workspace = readFileSync(join(root, "src/server/trials/workspace.ts"), "utf8");
  const buttons = readFileSync(join(root, "src/components/lions-den/contact-buttons.tsx"), "utf8");

  assert.match(board, /data-trial-action="add-to-prospects"/);
  assert.match(board, /data-trial-action="open-prospect"/);
  assert.match(board, /data-trial-action="open-desk"/);
  assert.match(board, /data-trial-action="sync-all"/);
  assert.match(board, /<ContactButtons/);
  assert.match(board, /addTrialToProspects/);
  assert.match(board, /syncTrialsToProspects/);
  assert.match(board, /row\.phone/);
  assert.match(board, /primaryGrowthGoal/);

  assert.match(detail, /data-prospect-action="log-touch"/);
  assert.match(detail, /data-prospect-action="save-contact"/);
  assert.match(detail, /data-prospect-action="save-next-step"/);
  assert.match(detail, /data-prospect-action=\{`stage-\$\{move\}`\}/);
  assert.match(detail, /prospect\.events/);
  assert.match(detail, /trialLinkFromMetadata/);

  assert.match(actions, /export async function logProspectTouch/);
  assert.match(actions, /export async function updateProspectContact/);
  assert.match(actions, /export async function setProspectNextAction/);
  assert.match(actions, /export async function setProspectStage/);
  assert.doesNotMatch(actions, /\.delete\(\)/);

  assert.match(workspace, /ensureTrialProspect/);

  // Owner-gated device links only. No provider ever sends on the owner's behalf.
  assert.match(buttons, /tel:|links\.tel/);
  assert.match(buttons, /links\.sms/);
  assert.match(buttons, /links\.mailto/);
  assert.doesNotMatch(buttons, /resend|sendgrid|postmark|twilio|auto-?send/i);
  assert.doesNotMatch(board, /resend|sendgrid|postmark|twilio|auto-?send/i);
  assert.doesNotMatch(detail, /resend|sendgrid|postmark|twilio|auto-?send/i);
});
