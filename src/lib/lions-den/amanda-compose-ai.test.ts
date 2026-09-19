import assert from "node:assert/strict";
import test from "node:test";
import {
  amandaComposeAiInstructions,
  amandaComposeAiInput,
  nextMessageFromAiDraft,
  parseAmandaComposeAiDraft,
} from "./amanda-compose-ai.ts";
import { amandaClose, firstTouchClose, nextMessage, type NextMessageInput } from "./next-message-engine.ts";

function base(overrides: Partial<NextMessageInput> = {}): NextMessageInput {
  return {
    spanish: false,
    ownerFirstName: "Manny",
    businessName: "Cypress Plumbing",
    ownerPhone: "(281) 555-0199",
    trade: "plumbing",
    city: "Cypress",
    prospectName: "Dana Reyes",
    prospectCompany: "Cypress Property Management",
    prospectType: "property management company",
    stage: "researching",
    opportunityType: "partner",
    lastTouchAt: null,
    nowIso: "2026-09-15T15:00:00.000Z",
    notesText: "",
    quoteAmount: null,
    ...overrides,
  };
}

test("Ask Amanda AI instructions forbid invented facts and auto-send", () => {
  const text = amandaComposeAiInstructions(false);
  assert.match(text, /Never invent/);
  assert.match(text, /never sends/);
  assert.match(text, /child's name|kid/);
  assert.doesNotMatch(text, /auto-send|twilio/i);
  const payload = amandaComposeAiInput(base(), amandaClose(base()));
  assert.equal(payload.ownerPhone, "(281) 555-0199");
  assert.equal(payload.trade, "plumbing");
  assert.equal(payload.deskLane, null);

  const sis = amandaComposeAiInstructions(false, "sis");
  assert.match(sis, /SIS Custom Creations Sign Party/);
  assert.match(sis, /Never write Hi there/);
  assert.doesNotMatch(sis, /BASIC \$99|Front Desk is live/);
  const afe = amandaComposeAiInstructions(false, "afe");
  assert.match(afe, /Atlas For Entrepreneurs/);
  assert.match(afe, /Do not claim live Front Desk or auto-call/);
  assert.match(afe, /Do not use SIS Custom Creations voice/);
});

test("AI draft is kept only when it is a sendable opener with the Amanda close", () => {
  const input = base();
  const close = amandaClose(input);
  const parsed = parseAmandaComposeAiDraft({
    subject: "Hello from Cypress Plumbing",
    body: `Hi Dana,\n\nI'm Amanda, writing for Cypress Plumbing in Cypress.\n\n${close}`,
    shorter: `Hi Dana,\n\nCan we talk this week?\n\n${close}`,
    softer: `Hi Dana,\n\nWriting from Cypress Plumbing whenever it is easy.\n\n${close}`,
    askYes: `Hi Dana,\n\nCan we book 10 minutes — yes or no?\n\n${close}`,
    extra1: `Hi Dana,\n\nReply with a time.\n\n${close}`,
    extra2: `Hi Dana,\n\nTell us what you need.\n\n${close}`,
  });
  assert.ok(parsed);
  const drafted = nextMessageFromAiDraft(input, parsed);
  assert.ok(drafted);
  assert.equal(drafted.job, "first_touch");
  assert.match(drafted.body, /Amanda, on behalf of Cypress Plumbing/);
  assert.doesNotMatch(drafted.body, /Need one fact|A single note is enough/);
});

test("AI draft is dropped when it invents a phone, a kid, or coach copy", () => {
  const input = base();
  const close = amandaClose(input);
  const coach = parseAmandaComposeAiDraft({
    subject: "Need one fact",
    body: `A single note is enough. ${close}`,
    shorter: `Add a note on this prospect. ${close}`,
    softer: `Need one fact before I write. ${close}`,
    askYes: `Do you have one fact? ${close}`,
    extra1: `Pin one fact. ${close}`,
    extra2: `Write what they asked for. ${close}`,
  });
  assert.ok(coach);
  assert.equal(nextMessageFromAiDraft(input, coach), null);

  const kid = parseAmandaComposeAiDraft({
    subject: "Hello",
    body: `Hi Dana, how is your kid? ${close}`,
    shorter: `Hi Dana, how is your kid? ${close}`,
    softer: `Hi Dana, how is your kid? ${close}`,
    askYes: `Hi Dana, how is your kid? ${close}`,
    extra1: `Hi Dana, how is your kid? ${close}`,
    extra2: `Hi Dana, how is your kid? ${close}`,
  });
  assert.ok(kid);
  assert.equal(nextMessageFromAiDraft(input, kid), null);

  const phone = parseAmandaComposeAiDraft({
    subject: "Hello",
    body: `Hi Dana, call me at (832) 555-0100. ${close}`,
    shorter: `Hi Dana, call (832) 555-0100. ${close}`,
    softer: `Hi Dana, call (832) 555-0100. ${close}`,
    askYes: `Hi Dana, call (832) 555-0100. ${close}`,
    extra1: `Hi Dana, call (832) 555-0100. ${close}`,
    extra2: `Hi Dana, call (832) 555-0100. ${close}`,
  });
  assert.ok(phone);
  assert.equal(nextMessageFromAiDraft(input, phone), null);
});

test("deterministic cold first_touch stays sendable if AI is skipped", () => {
  const result = nextMessage(base());
  assert.equal(result.job, "first_touch");
  assert.equal(result.aiEligible, true);
  assert.match(result.body, /Hi Dana/);
  assert.match(result.variants.softer, /Amanda, on behalf of/);
});

test("SIS Ask Amanda may say kids paint and must keep the SIS close, not Atlas sell copy", () => {
  const input = base({
    businessName: "SIS Custom Creations",
    organizationSlug: "sis-diy-big-complete-showcase",
    ownerPhone: "346-544-8621",
    contactLines: [
      { name: "Manny", phone: "346-544-8621" },
      { name: "Deleana", phone: "346-544-8697" },
    ],
    trade: null,
    city: "Katy",
    prospectName: "Pat",
    prospectCompany: "Little Stars",
    prospectType: "daycare center",
  });
  const close = firstTouchClose(input);
  const parsed = parseAmandaComposeAiDraft({
    subject: "Sign party for Little Stars kids",
    body: `Little Stars in Katy,\n\nWe bring supplies on-site. Kids paint. They take a project home.\n\n${close}`,
    shorter: `Little Stars,\n\nOn-site sign party. Reply with ages and headcount.\n\n${close}`,
    softer: `Little Stars in Katy,\n\nWe can host a sign party at your center.\n\n${close}`,
    askYes: `Little Stars,\n\nSaturday morning or weekday afternoon, yes or no?\n\n${close}`,
    extra1: `Little Stars,\n\nSend ages, headcount, and a date window.\n\n${close}`,
    extra2: `Little Stars,\n\nKids leave with a project. Reply with a date window.\n\n${close}`,
  });
  assert.ok(parsed);
  const drafted = nextMessageFromAiDraft(input, parsed);
  assert.ok(drafted);
  assert.match(drafted.body, /Kids paint/);
  assert.match(drafted.body, /siscustomcreationstx@gmail.com/);
  assert.doesNotMatch(drafted.body, /Atlas|Front Desk|BASIC \$99/);

  const atlas = parseAmandaComposeAiDraft({
    subject: "Atlas for Little Stars",
    body: `Hi there, Atlas Front Desk can auto-call. ${close}`,
    shorter: `Atlas BASIC $99. ${close}`,
    softer: `Front Desk is live. ${close}`,
    askYes: `Want Atlas? ${close}`,
    extra1: `GROW $249. ${close}`,
    extra2: `UNLIMITED $499. ${close}`,
  });
  assert.ok(atlas);
  assert.equal(nextMessageFromAiDraft(input, atlas), null);
});
