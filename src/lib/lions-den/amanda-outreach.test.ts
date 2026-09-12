import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AMANDA_OPT_OUT_EN,
  AMANDA_OPT_OUT_ES,
  AMANDA_STEP_DELAY_DAYS,
  amandaReplyAddress,
  amandaSequenceStatusCopy,
  amandaSequenceSteps,
  amandaStepSendAt,
  canOfferAmandaSequence,
  isAmandaStopRequest,
  parseAmandaReplyToken,
} from "./amanda-outreach.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

const business = {
  businessName: "Cypress Plumbing",
  trade: "plumbing",
  city: "Cypress",
  ownerName: "Manny",
  ownerPhone: "(281) 555-0199",
};
const prospect = { prospectName: "Cypress Property Management", contactName: "Dana Reyes", prospectType: "property management company" };

test("Amanda writes three short B2B emails, each with a plain opt-out and her signature", () => {
  const steps = amandaSequenceSteps({ business, prospect, spanish: false });
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map((step) => step.delayDays), [...AMANDA_STEP_DELAY_DAYS]);
  assert.equal(steps[0]!.subject, "Plumbing for Cypress Property Management");
  assert.match(steps[0]!.body, /^Hi Dana,/);
  assert.match(steps[0]!.body, /I'm Amanda\. I handle outreach for Cypress Plumbing, a plumbing company in Cypress\./);
  assert.match(steps[0]!.body, /Property management companies usually need plumbing/);
  assert.match(steps[0]!.body, /10-minute call with Manny/);
  assert.match(steps[1]!.body, /rate sheet/);
  assert.match(steps[2]!.body, /Last note from me\./);
  assert.match(steps[2]!.subject, /should I stop\?$/);
  for (const step of steps) {
    assert.ok(step.body.includes(AMANDA_OPT_OUT_EN) || /reply STOP/.test(step.body), `step ${step.step} has an opt-out`);
    assert.match(step.body, /Amanda\non behalf of Cypress Plumbing\nManny answers at \(281\) 555-0199$/);
    assert.ok(step.body.length < 900, `step ${step.step} fits on a phone`);
    assert.doesNotMatch(step.body, /discount|limited time|act now/i);
  }

  const es = amandaSequenceSteps({ business, prospect: { prospectName: "Inmobiliaria Katy" }, spanish: true });
  assert.match(es[0]!.body, /^Hola equipo de Inmobiliaria Katy,/);
  assert.ok(es[0]!.body.includes(AMANDA_OPT_OUT_ES));
  assert.match(es[0]!.body, /en nombre de Cypress Plumbing/);
});

test("schedule, reply routing, and stop detection", () => {
  const approved = new Date("2026-09-12T15:00:00.000Z");
  assert.equal(amandaStepSendAt(approved, 0).toISOString(), "2026-09-12T15:00:00.000Z");
  assert.equal(amandaStepSendAt(approved, 1).toISOString(), "2026-09-15T15:00:00.000Z");
  assert.equal(amandaStepSendAt(approved, 2).toISOString(), "2026-09-19T15:00:00.000Z");

  assert.equal(amandaReplyAddress("ab12-cd34", "reply.atlasforentrepreneurs.com"), "amanda+ab12cd34@reply.atlasforentrepreneurs.com");
  assert.equal(amandaReplyAddress("ab12", undefined), null);
  assert.equal(parseAmandaReplyToken(["Amanda <amanda+ABCDEF1234@reply.atlasforentrepreneurs.com>"]), "abcdef1234");
  assert.equal(parseAmandaReplyToken(["owner@example.com", null]), null);

  assert.equal(isAmandaStopRequest("STOP"), true);
  assert.equal(isAmandaStopRequest("please unsubscribe me"), true);
  assert.equal(isAmandaStopRequest("No me interesa, gracias"), true);
  assert.equal(isAmandaStopRequest("Yes, send the rate sheet. We stop by the office at 9."), false);
  assert.equal(isAmandaStopRequest("> reply STOP and I will not write again\nCall me Tuesday"), false);
});

test("Amanda only writes to businesses with a real email that are still in the outreach lane", () => {
  const base = { opportunityType: "partner", contactEmail: "office@cypresspm.com", stage: "qualified", metadata: {} };
  assert.equal(canOfferAmandaSequence(base), true);
  assert.equal(canOfferAmandaSequence({ ...base, stage: "contacted" }), true);
  assert.equal(canOfferAmandaSequence({ ...base, opportunityType: "customer" }), false);
  assert.equal(canOfferAmandaSequence({ ...base, metadata: { inbound: true } }), false);
  assert.equal(canOfferAmandaSequence({ ...base, metadata: { trial_seed: "v1" } }), false);
  assert.equal(canOfferAmandaSequence({ ...base, contactEmail: "sample@example.invalid" }), false);
  assert.equal(canOfferAmandaSequence({ ...base, contactEmail: null }), false);
  assert.equal(canOfferAmandaSequence({ ...base, stage: "responded" }), false);
  assert.equal(canOfferAmandaSequence({ ...base, stage: "won" }), false);
});

test("desk status line tells the owner where Amanda is", () => {
  const steps = { length: 3 };
  assert.match(amandaSequenceStatusCopy({ status: "approved", currentStep: 0, nextSendAt: null, stoppedReason: null, steps }, false), /Approved\. Amanda sends email 1 of 3 today\./);
  assert.match(amandaSequenceStatusCopy({ status: "sending", currentStep: 1, nextSendAt: "2026-09-15T15:00:00.000Z", stoppedReason: null, steps }, false), /Amanda sent 1 of 3\. Next goes out Sep 15\./);
  assert.match(amandaSequenceStatusCopy({ status: "paused", currentStep: 2, nextSendAt: null, stoppedReason: "replied", steps }, false), /They replied\. Amanda stopped; your turn to call\./);
  assert.match(amandaSequenceStatusCopy({ status: "paused", currentStep: 1, nextSendAt: null, stoppedReason: "stop_request", steps }, true), /Pidieron no recibir más correos/);
  assert.match(amandaSequenceStatusCopy({ status: "paused", currentStep: 1, nextSendAt: null, stoppedReason: "owner", steps }, false), /Stopped by you after 1 of 3\./);
  assert.match(amandaSequenceStatusCopy({ status: "done", currentStep: 3, nextSendAt: null, stoppedReason: null, steps }, false), /sent all 3 emails/);
});

test("desk wiring: approve is the only way anything sends, and the sender only reads approved rows", () => {
  const card = readRepo("src/components/lions-den/amanda-sequence-card.tsx");
  const board = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const page = readRepo("src/app/client/david/page.tsx");
  const actions = readRepo("src/server/outreach/actions.ts");
  const sender = readRepo("netlify/functions/amanda-outreach.mjs");
  const inbound = readRepo("netlify/functions/amanda-inbound.mjs");
  const toml = readRepo("netlify.toml");
  const migration = readRepo("supabase/migrations/20260912150000_amanda_outreach_sequences.sql");

  assert.match(card, /Amanda drafted \$\{steps\.length\} emails\. Nothing sends until you approve\./);
  assert.match(card, /data-amanda-control="approve"/);
  assert.match(card, /data-amanda-control="stop"/);
  assert.match(card, /data-amanda-control="preview"/);
  assert.match(board, /AmandaSequenceCard/);
  assert.match(board, /canOfferAmandaSequence/);
  assert.match(board, /amanda_approved/);
  assert.match(page, /getAmandaSequences/);
  assert.match(page, /amandaBusinessFromWorkspace/);

  assert.match(actions, /status: "approved"/);
  assert.match(actions, /stopped_reason === "stop_request"/);
  assert.match(card, /const closed = sequence\?\.stoppedReason === "stop_request"/);
  assert.match(board, /amanda_stop_requested/);
  assert.match(actions, /event_type: "follow_up_queued"/);
  assert.doesNotMatch(actions, /api\.resend\.com/);
  assert.doesNotMatch(actions, /twilio|sms:/i);

  assert.match(sender, /status=in\.\(approved,sending\)/);
  assert.match(sender, /Idempotency-Key/);
  assert.match(sender, /List-Unsubscribe/);
  assert.doesNotMatch(sender, /twilio/i);
  assert.match(toml, /\[functions\."amanda-outreach"\]\n\s+schedule = "0 15 \* \* \*"/);

  assert.match(inbound, /verifyResendSignature/);
  assert.match(inbound, /email\.received/);
  assert.match(inbound, /email\.bounced/);
  assert.match(inbound, /stage: "responded"/);
  assert.match(inbound, /event_type: stop \? "note_added" : "reply_received"/);

  assert.match(migration, /create table if not exists public\.organization_outreach_sequences/);
  assert.match(migration, /create table if not exists public\.organization_outreach_messages/);
  assert.match(migration, /check \(status in \('draft', 'approved', 'sending', 'paused', 'done'\)\)/);
  assert.match(migration, /enable row level security/);
});
