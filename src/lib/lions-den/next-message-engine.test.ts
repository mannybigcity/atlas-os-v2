import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  amandaClose,
  concatNotesText,
  latestTimestamp,
  nextMessage,
  type NextMessageInput,
} from "./next-message-engine.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

function base(overrides: Partial<NextMessageInput> = {}): NextMessageInput {
  return {
    spanish: false,
    ownerFirstName: "Manny",
    businessName: "Cypress Plumbing",
    ownerPhone: "(281) 555-0199",
    prospectName: "Dana Reyes",
    prospectCompany: "Cypress Property Management",
    stage: "researching",
    opportunityType: "partner",
    lastTouchAt: null,
    nowIso: "2026-09-13T15:00:00.000Z",
    notesText: "",
    quoteAmount: null,
    ...overrides,
  };
}

function sendableTexts(result: ReturnType<typeof nextMessage>) {
  return [result.body, result.variants.shorter, result.variants.softer, result.variants.askYes, ...result.variants.extra];
}

test("empty notes, no last touch, and no quote stay need_one_fact and do not invent a sendable email", () => {
  const result = nextMessage(base());
  assert.equal(result.job, "need_one_fact");
  assert.equal(result.jobLabel, "Need one fact before I write");
  assert.match(result.body, /Add a note on this prospect/);
  assert.match(result.body, /I will not invent a job, a name, or a phone/);
  assert.doesNotMatch(result.body, /Amanda, on behalf of/);
  assert.doesNotMatch(result.body, /Hi Dana/);
  assert.doesNotMatch(result.body, /555-0100|example\.com|kid|hijo/i);
  for (const text of sendableTexts(result)) {
    assert.doesNotMatch(text, /Amanda, on behalf of/);
    assert.doesNotMatch(text, /\(\d{3}\)/);
  }
});

test("quiet 11 days becomes a re-engage job with the day count on the label", () => {
  const result = nextMessage(
    base({
      stage: "contacted",
      lastTouchAt: "2026-09-02T15:00:00.000Z",
      notesText: "Left a voicemail. No reply yet.",
    }),
  );
  assert.equal(result.job, "quiet_reopen");
  assert.equal(result.jobLabel, "Re-engage after 11 quiet days");
  assert.match(result.body, /11 quiet days/);
  assert.match(result.subject, /Checking back in/);
});

test("a real quote on an open stage is quote follow-up and uses that amount", () => {
  const result = nextMessage(
    base({
      stage: "responded",
      lastTouchAt: "2026-09-12T15:00:00.000Z",
      notesText: "Sent the number.",
      quoteAmount: "$1,850",
    }),
  );
  assert.equal(result.job, "quote_follow");
  assert.equal(result.jobLabel, "Quote follow-up");
  assert.match(result.subject, /\$1,850/);
  assert.match(result.body, /\$1,850/);
  assert.doesNotMatch(result.body, /\$2,400/);
});

test("won stage asks for a review and a referral without inventing a review link", () => {
  const result = nextMessage(
    base({
      stage: "won",
      lastTouchAt: "2026-09-10T15:00:00.000Z",
      notesText: "Finished the water heater swap.",
    }),
  );
  assert.equal(result.job, "review_referral");
  assert.equal(result.jobLabel, "Review and referral");
  assert.match(result.body, /Google review/);
  assert.match(result.body, /same work/);
  assert.doesNotMatch(result.body, /https?:\/\//);
});

test("Spanish jobLabel and owner-only need_one_fact copy", () => {
  const empty = nextMessage(base({ spanish: true }));
  assert.equal(empty.job, "need_one_fact");
  assert.equal(empty.jobLabel, "Falta un dato antes de escribir");
  assert.match(empty.body, /Agrega una nota/);
  assert.doesNotMatch(empty.body, /Amanda, de parte de/);

  const quiet = nextMessage(
    base({
      spanish: true,
      stage: "contacted",
      lastTouchAt: "2026-09-02T15:00:00.000Z",
      notesText: "Sin respuesta.",
    }),
  );
  assert.equal(quiet.jobLabel, "Retomar después de 11 días en silencio");
  assert.match(quiet.body, /Amanda, de parte de Cypress Plumbing/);
});

test("no invented phone: missing ownerPhone drops the phone sentence on every sendable body", () => {
  const result = nextMessage(
    base({
      ownerPhone: null,
      stage: "researching",
      notesText: "Met them at the supply house.",
    }),
  );
  assert.equal(result.job, "first_touch");
  for (const text of sendableTexts(result)) {
    assert.match(text, /Amanda, on behalf of Cypress Plumbing\.$/m);
    assert.doesNotMatch(text, /answers at/);
    assert.doesNotMatch(text, /555-0199|555-0100|\(\d{3}\)/);
  }
});

test("every sendable body includes the Amanda close and variants are real rewrites", () => {
  const result = nextMessage(
    base({
      stage: "ready_for_follow_up",
      notesText: "Card from the truck show.",
    }),
  );
  assert.equal(result.job, "first_touch");
  const close = "Amanda, on behalf of Cypress Plumbing. Manny answers at (281) 555-0199.";
  const texts = sendableTexts(result);
  for (const text of texts) {
    assert.match(text, /Amanda, on behalf of Cypress Plumbing/);
    assert.match(text, /Manny answers at \(281\) 555-0199/);
    assert.doesNotMatch(text, /I'm a real person|human employee|I work in the office/i);
    assert.doesNotMatch(text, /[#*_`]|[\u{1F300}-\u{1FAFF}]/u);
  }
  assert.equal(amandaClose(base()), close);
  const unique = new Set(texts);
  assert.equal(unique.size, texts.length, "variants must not repeat the same paragraph");
});

test("book_or_close needs a contacted or replied stage plus a note that implies interest", () => {
  const ready = nextMessage(
    base({
      stage: "contacted",
      lastTouchAt: "2026-09-12T15:00:00.000Z",
      notesText: "They said yes, book us for Tuesday.",
    }),
  );
  assert.equal(ready.job, "book_or_close");
  assert.match(ready.body, /book the job/);

  const noGuess = nextMessage(
    base({
      stage: "contacted",
      lastTouchAt: "2026-09-12T15:00:00.000Z",
      notesText: "Left a card at the office.",
    }),
  );
  assert.equal(noGuess.job, "first_touch");
  assert.doesNotMatch(noGuess.body, /they said yes/i);
});

test("notes concat keeps newest inside 800 chars; latestTimestamp ignores junk", () => {
  const text = concatNotesText([
    { createdAt: "2026-09-11T10:00:00.000Z", text: "Older note" },
    { createdAt: "2026-09-12T10:00:00.000Z", text: "Newer note" },
  ]);
  assert.equal(text, "Older note\nNewer note");
  const long = concatNotesText([
    { createdAt: "2026-09-01T00:00:00.000Z", text: "A".repeat(700) },
    { createdAt: "2026-09-13T00:00:00.000Z", text: "B".repeat(200) },
  ]);
  assert.equal(long.length, 800);
  assert.match(long, /B{200}$/);
  assert.equal(latestTimestamp(["nope", "2026-09-01T00:00:00.000Z", "2026-09-12T00:00:00.000Z"]), "2026-09-12T00:00:00.000Z");
  assert.equal(latestTimestamp([null, "", "bad"]), null);
});

test("compose strip has the four chips and chips never send", () => {
  const compose = readRepo("src/components/lions-den/desk-email-compose.tsx");
  const board = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const page = readRepo("src/app/client/david/page.tsx");
  const staff = readRepo("src/components/lions-den/atlas-staff-pane.tsx");

  assert.match(compose, /data-next-message-engine/);
  assert.match(compose, /data-engine-chip="shorter"/);
  assert.match(compose, /data-engine-chip="softer"/);
  assert.match(compose, /data-engine-chip="askYes"/);
  assert.match(compose, /data-engine-chip="more"/);
  assert.match(compose, /\{spanish \? "Más corto" : "Shorter"\}/);
  assert.match(compose, /\{spanish \? "Más suave" : "Softer"\}/);
  assert.match(compose, /\{spanish \? "Pedir el sí" : "Ask for the yes"\}/);
  assert.match(compose, /\{spanish \? "2 más" : "2 more"\}/);
  assert.match(compose, /engine\?: NextMessageResult/);
  assert.doesNotMatch(compose, /api\.resend\.com/);
  assert.doesNotMatch(compose, /twilio|sms:/i);
  assert.doesNotMatch(compose, /data-engine-chip[\s\S]{0,200}type="submit"/);
  assert.match(compose, /type="button"/);

  assert.match(board, /nextMessage\(/);
  assert.match(board, /DeskEmailCompose/);
  assert.match(board, /AmandaSequenceCard/);
  assert.match(board, /allowDraftControls/);
  assert.doesNotMatch(board, /75\s*\/\s*25|template rail|atlas-staff-pane/);
  assert.doesNotMatch(board, /api\.resend\.com|twilio/i);

  assert.match(page, /canShowFollowUpDraftControls/);
  assert.match(page, /getOrganizationNotes/);
  assert.match(page, /nextMessage|notesByRecordId|linkedNotes/);
  assert.doesNotMatch(page, /atlas-staff-pane/);

  assert.doesNotMatch(staff, /data-next-message-engine|data-engine-chip/);
});
