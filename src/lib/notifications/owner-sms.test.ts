import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  OWNER_SMS_MAX_LENGTH,
  inboundLeadOwnerSms,
  missingTwilioEnv,
  normalizeUsPhone,
  readTwilioConfig,
} from "./owner-sms.ts";

const sid = `AC${"a".repeat(32)}`;

test("readTwilioConfig is null unless SID, token, and a sender are all present", () => {
  assert.equal(readTwilioConfig({}), null);
  assert.equal(readTwilioConfig({ TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: "tok" }), null);
  assert.equal(readTwilioConfig({ TWILIO_ACCOUNT_SID: "nope", TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_NUMBER: "2105550100" }), null);
  assert.deepEqual(readTwilioConfig({ TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_NUMBER: "(210) 555-0100" }), {
    accountSid: sid,
    authToken: "tok",
    sender: { from: "+12105550100" },
  });
  assert.deepEqual(
    readTwilioConfig({ TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: "tok", TWILIO_MESSAGING_SERVICE_SID: "MG123" })?.sender,
    { messagingServiceSid: "MG123" },
  );
});

test("missingTwilioEnv names what the founder still has to add", () => {
  assert.deepEqual(missingTwilioEnv({}), ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER"]);
  assert.deepEqual(missingTwilioEnv({ TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_NUMBER: "2105550100" }), []);
});

test("normalizeUsPhone accepts US formats only", () => {
  assert.equal(normalizeUsPhone("(210) 555-0100"), "+12105550100");
  assert.equal(normalizeUsPhone("1-210-555-0100"), "+12105550100");
  assert.equal(normalizeUsPhone("+1 210 555 0100"), "+12105550100");
  assert.equal(normalizeUsPhone("555-0100"), null);
  assert.equal(normalizeUsPhone("+52 55 1234 5678"), null);
  assert.equal(normalizeUsPhone(null), null);
});

test("inboundLeadOwnerSms is short, names the lead, and links the prospect", () => {
  const body = inboundLeadOwnerSms({
    businessName: "Big City Roofing",
    leadName: "Rosa Martinez",
    leadPhone: "210-555-0100",
    problem: "Roof leaking over the kitchen ".repeat(10),
    prospectUrl: "https://atlas.example/client/prospects/abc",
  });
  assert.match(body, /New lead for Big City Roofing: Rosa Martinez \(210-555-0100\)/);
  assert.match(body, /…"/);
  assert.match(body, /https:\/\/atlas\.example\/client\/prospects\/abc$/);
  assert.ok(body.length <= OWNER_SMS_MAX_LENGTH);
});

test("contract: the lead page texts the owner only, skips without Twilio, and adds no SDK", () => {
  const actions = readFileSync(new URL("../../server/leads/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /sendOwnerSms\(\{\s*to: owners\.phone/);
  assert.doesNotMatch(actions, /sendOwnerSms\(\{\s*to: values\.phone/);

  const twilio = readFileSync(new URL("../../server/notifications/twilio.ts", import.meta.url), "utf8");
  assert.match(twilio, /readTwilioConfig\(process\.env\)/);
  assert.match(twilio, /Atlas owner SMS skipped/);
  assert.match(twilio, /api\.twilio\.com\/2010-04-01/);
  assert.doesNotMatch(twilio, /from "twilio"/);

  const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies?.twilio, undefined);
});
