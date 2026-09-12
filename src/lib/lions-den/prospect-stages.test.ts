import assert from "node:assert/strict";
import test from "node:test";
import {
  DESK_CONTACT_OUTCOMES,
  deskContactCheckIn,
  deskContactOutcomeOptions,
  deskContactOutcomePlan,
  isDeskContactOutcome,
  isOwnerProspectStage,
  needsDeskContactOutcome,
  normalizeWebsite,
  parseJobValue,
  lastDeskContactLabel,
  deskContactStamp,
  deskContactSummary,
  prospectContactLinks,
  prospectNoteEvent,
  prospectNoticeCopy,
  readLastDeskContact,
  sisDeskActivityLines,
  prospectStageActions,
  prospectStageLabel,
  readJobValue,
  sumJobValues,
  validateProspectEditor,
} from "./prospect-stages.ts";

test("owners can only move prospects between the customer-facing stages", () => {
  for (const stage of ["ready_for_follow_up", "contacted", "responded", "won", "lost"]) {
    assert.equal(isOwnerProspectStage(stage), true, stage);
  }
  for (const stage of ["researching", "qualified", "follow_up_queued", "archived", "", null, "WON"]) {
    assert.equal(isOwnerProspectStage(stage), false, String(stage));
  }
});

test("stage labels read like a salesman talks, in both languages", () => {
  assert.equal(prospectStageLabel("ready_for_follow_up", false), "To call");
  assert.equal(prospectStageLabel("ready_for_follow_up", true), "Por llamar");
  assert.equal(prospectStageLabel("needs_client_input", false), "Needs phone");
  assert.equal(prospectStageLabel("won", false), "Won · Client");
  assert.equal(prospectStageLabel("mystery_stage", false), "mystery stage");
});

test("stage buttons always leave a way back and never offer the current stage", () => {
  const fresh = prospectStageActions("ready_for_follow_up", false).map((item) => item.stage);
  assert.deepEqual(fresh, ["contacted", "responded", "won", "lost"]);
  const contacted = prospectStageActions("contacted", false).map((item) => item.stage);
  assert.deepEqual(contacted, ["responded", "won", "lost", "ready_for_follow_up"]);
  assert.deepEqual(prospectStageActions("won", false).map((item) => item.stage), ["ready_for_follow_up"]);
  assert.deepEqual(prospectStageActions("lost", true).map((item) => item.label), ["Volver a la lista de llamadas"]);
  for (const stage of ["ready_for_follow_up", "contacted", "responded", "won", "lost", "needs_client_input"]) {
    assert.ok(!prospectStageActions(stage, false).some((item) => item.stage === stage), stage);
  }
});

test("job value accepts human money input and rejects junk", () => {
  assert.equal(parseJobValue("1,200"), 1200);
  assert.equal(parseJobValue("$1200.50"), 1200.5);
  assert.equal(parseJobValue(" 350 "), 350);
  assert.equal(parseJobValue(""), null);
  assert.equal(parseJobValue("-40"), null);
  assert.equal(parseJobValue("free"), null);
  assert.equal(parseJobValue("1.234"), null);
  assert.equal(parseJobValue("99999999"), null);
  assert.equal(readJobValue({ job_value_usd: 850 }), 850);
  assert.equal(readJobValue({ job_value_usd: "2,000" }), 2000);
  assert.equal(readJobValue({}), null);
  assert.equal(readJobValue(null), null);
  assert.equal(sumJobValues([{ jobValue: 100 }, { jobValue: null }, {}, { jobValue: 250.5 }]), 350.5);
});

test("contact links open the owner's own phone and email apps, never invent numbers", () => {
  const links = prospectContactLinks({ contactPhone: "(713) 555-0100", contactEmail: "owner@example.com" });
  assert.equal(links.tel, "tel:7135550100");
  assert.equal(links.whatsapp, "https://wa.me/17135550100");
  assert.equal(links.sms, links.whatsapp);
  assert.equal(links.mailto, "mailto:owner@example.com");

  const fromMetadata = prospectContactLinks({ contactPhone: null, metadata: { national_phone_number: "+1 281-555-0199" } });
  assert.equal(fromMetadata.tel, "tel:+12815550199");

  const unpublished = prospectContactLinks({ contactPhone: "Google did not publish a phone number.", contactEmail: "not-an-email" });
  assert.equal(unpublished.phone, null);
  assert.equal(unpublished.tel, null);
  assert.equal(unpublished.sms, null);
  assert.equal(unpublished.whatsapp, null);
  assert.equal(unpublished.mailto, null);
});

test("last desk contact is a call, WhatsApp, or email stamp for management", () => {
  assert.equal(readLastDeskContact(null), null);
  assert.equal(readLastDeskContact({ last_desk_contact: { channel: "fax", at: "2026-09-12T12:00:00.000Z" } }), null);
  const contact = readLastDeskContact({
    last_desk_contact: { channel: "call", at: "2026-09-12T20:05:00.000Z", by: "owner@example.com" },
  });
  assert.deepEqual(contact, { channel: "call", at: "2026-09-12T20:05:00.000Z", by: "owner@example.com" });
  assert.match(lastDeskContactLabel(contact!, false), /Call · /);
  assert.match(lastDeskContactLabel(contact!, false), /owner@example.com/);
  assert.match(lastDeskContactLabel({ channel: "whatsapp", at: "2026-09-12T20:05:00.000Z" }, true), /WhatsApp · /);
  const stamp = deskContactStamp("email", "boss@example.com");
  assert.equal(stamp.channel, "email");
  assert.equal(stamp.by, "boss@example.com");
  assert.match(deskContactSummary("call", "7135550100", "owner@example.com"), /owner@example.com started a call/);
  assert.deepEqual(
    sisDeskActivityLines("Met at the expo.\n2026-09-12 · called 7135550100 · owner@example.com\n"),
    ["2026-09-12 · called 7135550100 · owner@example.com"],
  );
});

test("prospect editor validation mirrors the database constraints", () => {
  const good = validateProspectEditor(
    { name: "Cedar Ridge HOA", contactName: "Dana", phone: "713-555-0100", email: "dana@cedar.example", address: "", website: "cedarridge.example", notes: "Met at the expo." },
    false,
  );
  assert.deepEqual(good, {});
  assert.equal(normalizeWebsite("cedarridge.example"), "https://cedarridge.example");
  assert.equal(normalizeWebsite("http://already.example"), "http://already.example");

  const bad = validateProspectEditor(
    { name: "X", contactName: "D", phone: "555", email: "nope", address: "a".repeat(501), website: "", notes: "n".repeat(2501) },
    false,
  );
  assert.deepEqual(Object.keys(bad).sort(), ["address", "contactName", "email", "name", "notes", "phone"]);

  const spanish = validateProspectEditor({ name: "", contactName: "", phone: "", email: "", address: "", website: "", notes: "" }, true);
  assert.match(spanish.name ?? "", /nombre del negocio/);
});

test("notices are plain and repeat that Atlas did not contact anyone when it matters", () => {
  assert.match(prospectNoticeCopy("created", false) ?? "", /did not call/);
  assert.match(prospectNoticeCopy("won", true) ?? "", /Clientes/);
  assert.equal(prospectNoticeCopy(undefined, false), null);
  assert.equal(prospectNoticeCopy("something_else", false), null);
  assert.match(prospectNoticeCopy("contact_logged", false) ?? "", /did not place the call/);
  assert.match(prospectNoticeCopy("outcome_saved", false) ?? "", /Follow-up desk with a date/);
  assert.match(prospectNoticeCopy("outcome_saved", true) ?? "", /Seguimiento/);
  assert.match(prospectNoticeCopy("outcome_wrong_number", false) ?? "", /Needs phone/);
  assert.match(prospectNoticeCopy("note_saved", false) ?? "", /Note saved/);
});

test("every Call, WhatsApp, or Email puts a dated, sendable check-in on the follow-up desk", () => {
  const friday = new Date(2026, 8, 11, 15, 30); // local Friday
  const call = deskContactCheckIn("call", { spanish: false, at: friday });
  assert.equal(call.nextActionDue, "2026-09-14");
  assert.match(call.nextAction, /my call from Friday/);
  assert.match(call.nextAction, /quick call\?$/);
  const whatsapp = deskContactCheckIn("whatsapp", { spanish: true, at: friday });
  assert.equal(whatsapp.nextActionDue, "2026-09-14");
  assert.match(whatsapp.nextAction, /mi WhatsApp del viernes/);
  const email = deskContactCheckIn("email", { spanish: false, at: new Date(2026, 8, 29) });
  assert.equal(email.nextActionDue, "2026-10-02", "rolls over the month end");
  assert.match(email.nextAction, /my email from Tuesday/);
  assert.doesNotMatch(call.nextAction, /Wait for a reply/);
});

test("the record asks how the call went for two days, only for calls, only once", () => {
  const now = new Date("2026-09-12T20:00:00.000Z");
  assert.equal(needsDeskContactOutcome(null, now), false);
  assert.equal(needsDeskContactOutcome({ channel: "call", at: "2026-09-12T19:00:00.000Z" }, now), true);
  assert.equal(needsDeskContactOutcome({ channel: "whatsapp", at: "2026-09-12T19:00:00.000Z" }, now), false);
  assert.equal(needsDeskContactOutcome({ channel: "email", at: "2026-09-12T19:00:00.000Z" }, now), false);
  assert.equal(
    needsDeskContactOutcome({ channel: "call", at: "2026-09-12T19:00:00.000Z", outcome: "no_answer" }, now),
    false,
    "already answered",
  );
  assert.equal(needsDeskContactOutcome({ channel: "call", at: "2026-09-10T19:00:00.000Z" }, now), false, "too old");
  assert.equal(needsDeskContactOutcome({ channel: "call", at: "2026-09-13T19:00:00.000Z" }, now), false, "future");

  const stamped = readLastDeskContact({
    last_desk_contact: { channel: "call", at: "2026-09-12T19:00:00.000Z", by: "owner@example.com", outcome: "voicemail", outcomeAt: "2026-09-12T19:05:00.000Z" },
  });
  assert.equal(stamped?.outcome, "voicemail");
  assert.equal(stamped?.outcomeAt, "2026-09-12T19:05:00.000Z");
  assert.match(lastDeskContactLabel(stamped!, false), /Left voicemail$/);
  assert.match(lastDeskContactLabel(stamped!, true), /Dejé buzón$/);
  const junk = readLastDeskContact({ last_desk_contact: { channel: "call", at: "2026-09-12T19:00:00.000Z", outcome: "ghosted" } });
  assert.equal(junk?.outcome, undefined);
});

test("call outcomes each become a dated next step, and nothing contacts anyone", () => {
  const friday = new Date(2026, 8, 11, 15, 30);
  assert.deepEqual(
    deskContactOutcomeOptions(false).map((item) => item.outcome),
    [...DESK_CONTACT_OUTCOMES],
  );
  assert.deepEqual(
    deskContactOutcomeOptions(true).map((item) => item.label),
    ["No contestaron", "Dejé buzón", "Hablamos", "Quieren cotización", "Número equivocado"],
  );
  assert.equal(isDeskContactOutcome("talked"), true);
  assert.equal(isDeskContactOutcome("ghosted"), false);

  const noAnswer = deskContactOutcomePlan("no_answer", { spanish: false, by: "owner@example.com", at: friday });
  assert.equal(noAnswer.eventType, "note_added");
  assert.equal(noAnswer.stage, null);
  assert.equal(noAnswer.nextActionDue, "2026-09-12", "try again tomorrow");
  assert.match(noAnswer.summary, /^owner@example.com called; no answer\./);
  assert.match(noAnswer.nextAction, /missed you/);

  const voicemail = deskContactOutcomePlan("voicemail", { spanish: true, at: friday, note: "Pidió que llame por la tarde" });
  assert.equal(voicemail.nextActionDue, "2026-09-13");
  assert.match(voicemail.summary, /Note: Pidió que llame por la tarde$/);
  assert.match(voicemail.nextAction, /mensaje de voz el viernes/);

  const talked = deskContactOutcomePlan("talked", { spanish: false, at: friday });
  assert.equal(talked.eventType, "reply_received");
  assert.equal(talked.stage, "responded");
  assert.equal(talked.nextActionDue, "2026-09-14");

  const quote = deskContactOutcomePlan("wants_quote", { spanish: false, at: friday });
  assert.equal(quote.stage, "responded");
  assert.equal(quote.nextActionDue, "2026-09-12", "the quote goes out tomorrow");
  assert.match(quote.nextAction, /here is the quote/);

  const wrong = deskContactOutcomePlan("wrong_number", { spanish: false, at: friday });
  assert.equal(wrong.stage, "needs_client_input");
  assert.equal(wrong.nextActionDue, null);
  assert.match(wrong.nextAction, /Find the right phone/);

  for (const outcome of DESK_CONTACT_OUTCOMES) {
    const plan = deskContactOutcomePlan(outcome, { spanish: false, at: friday });
    assert.match(plan.summary, /Atlas did not place the call/, outcome);
    assert.ok(plan.summary.length >= 5 && plan.summary.length <= 500, outcome);
    assert.ok(plan.nextAction.length >= 5 && plan.nextAction.length <= 1200, outcome);
  }
});

test("timeline notes read as themselves and fit the events table", () => {
  assert.equal(prospectNoteEvent("   "), null);
  assert.equal(prospectNoteEvent("x"), null);
  assert.deepEqual(prospectNoteEvent("Busy"), { summary: "Note: Busy", body: "Busy" });
  const note = prospectNoteEvent("Talked to Maria.\nShe wants three units quoted   next week.");
  assert.equal(note?.summary, "Talked to Maria. She wants three units quoted next week.");
  assert.equal(note?.body, "Talked to Maria.\nShe wants three units quoted   next week.");
  const long = prospectNoteEvent("a".repeat(900));
  assert.equal(long?.summary.length, 500);
  assert.match(long?.summary ?? "", /\.\.\.$/);
  assert.equal(long?.body.length, 900);
});
