import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("every Call, WhatsApp, and Email from the record queues a dated check-in instead of a dead end", () => {
  const contact = read("server/opportunities/desk-contact-actions.ts");
  const email = read("server/opportunities/desk-email-actions.ts");
  for (const [name, source] of [["contact", contact], ["email", email]] as const) {
    assert.match(source, /deskContactCheckIn\(/, name);
    assert.match(source, /next_action_due: checkIn\.nextActionDue/, name);
    assert.match(source, /next_action: checkIn\.nextAction/, name);
    assert.doesNotMatch(source, /Wait for a reply, then follow up/, name);
    assert.doesNotMatch(source, /api\.resend\.com|twilio|sms:/i, `${name} must not send anything`);
  }
  // A won or lost record is never dragged back into the queue by a phone call.
  assert.match(contact, /STAGES_CLOSED/);
  assert.match(email, /closed\s*\?\s*\{\}/);
  // The compose box tells the action which language the check-in draft should be in.
  assert.match(read("components/lions-den/desk-email-compose.tsx"), /name="lang"/);
});

test("stage buttons that promise a follow-up in a few days put a date on it", () => {
  const actions = read("server/opportunities/prospect-actions.ts");
  assert.match(actions, /FOLLOW_UP_CHECK_IN_DAYS/);
  assert.match(actions, /stage === "contacted"\s*\?\s*localDateInDays\(FOLLOW_UP_CHECK_IN_DAYS\)/);
  assert.match(actions, /stage === "responded"\s*\?\s*localDateInDays\(1\)/);
  assert.match(actions, /next_action_due: nextActionDue/);
});

test("the record asks how the call went and turns the answer into the next step", () => {
  const actions = read("server/opportunities/desk-contact-actions.ts");
  const controls = read("components/lions-den/prospect-controls.tsx");
  const detail = read("components/lions-den/lions-den-prospect-detail.tsx");
  const list = read("components/lions-den/lions-den-prospects.tsx");

  assert.match(actions, /export async function logDeskContactOutcome/);
  assert.match(actions, /isDeskContactOutcome\(outcome\)/);
  assert.match(actions, /deskContactOutcomePlan\(/);
  assert.match(actions, /event_type: plan\.eventType/);
  assert.match(actions, /outcomeAt: now\.toISOString\(\)/);
  assert.match(actions, /"outcome_wrong_number" : "outcome_saved"/);

  assert.match(controls, /export function DeskContactOutcomeForm/);
  assert.match(controls, /data-contact-outcome/);
  assert.match(controls, /How did the call go\?/);
  assert.match(controls, /¿Cómo fue la llamada\?/);
  assert.match(controls, /name="outcome"/);
  assert.match(controls, /What did they say\? \(optional\)/);
  assert.match(controls, /action=\{logDeskContactOutcome\}/);

  assert.match(detail, /needsDeskContactOutcome\(lastContact\)/);
  assert.match(detail, /<DeskContactOutcomeForm/);
  assert.match(detail, /data-next-action-due/);
  assert.match(detail, /Shows on the Follow-up desk that day/);

  assert.match(list, /needsDeskContactOutcome\(lastContact\)/);
  assert.match(list, /data-contact-outcome-link/);
  assert.match(list, /How did the call go\?/);
});

test("the owner can drop a note on the timeline without editing the whole record", () => {
  const actions = read("server/opportunities/desk-contact-actions.ts");
  const controls = read("components/lions-den/prospect-controls.tsx");
  const detail = read("components/lions-den/lions-den-prospect-detail.tsx");
  assert.match(actions, /export async function addProspectNote/);
  assert.match(actions, /prospectNoteEvent\(/);
  assert.match(actions, /event_type: "note_added"/);
  assert.match(controls, /export function ProspectNoteForm/);
  assert.match(controls, /data-prospect-note/);
  assert.match(controls, /Save note/);
  assert.match(controls, /Guardar nota/);
  assert.match(detail, /<ProspectNoteForm/);
});

test("Call and WhatsApp buttons cannot be double-tapped into two log lines", () => {
  const button = read("components/lions-den/desk-contact-button.tsx");
  assert.match(button, /useFormStatus/);
  assert.match(button, /disabled=\{pending\}/);
  assert.match(button, /window\.location\.assign\(href\)/);
  assert.match(button, /window\.open\(href/);
});
