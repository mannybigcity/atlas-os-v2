import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, test } from "node:test";
import { amandaFrom, nextSendAt, replyAddress, runAmandaSendPass } from "../functions/amanda-outreach.mjs";
import inbound, {
  handleReceived,
  isStopRequest,
  parseReplyToken,
  replyExcerpt,
  verifyResendSignature,
} from "../functions/amanda-inbound.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const sequence = {
  id: "seq-1",
  organization_id: "org-1",
  opportunity_id: "opp-1",
  status: "approved",
  current_step: 0,
  approved_at: "2026-09-12T15:00:00.000Z",
  next_send_at: "2026-09-12T15:00:00.000Z",
  to_email: "office@cypresspm.test",
  owner_email: "owner@example.com",
  reply_token: "abcdef1234567890",
  steps: [
    { step: 0, delayDays: 0, subject: "Plumbing for Cypress PM", body: "Hi team, ... reply STOP ..." },
    { step: 1, delayDays: 3, subject: "Re: Plumbing", body: "Quick follow-up" },
    { step: 2, delayDays: 7, subject: "Re: Plumbing — should I stop?", body: "Last note" },
  ],
};

afterEach(() => {
  delete globalThis.fetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.AMANDA_REPLY_DOMAIN;
  delete process.env.ATLAS_NOTIFICATION_FROM;
  delete process.env.RESEND_WEBHOOK_SECRET;
});

test("helpers: reply address, from label, schedule math", () => {
  assert.equal(replyAddress("AbC-123", "reply.atlasforentrepreneurs.com"), "amanda+AbC123@reply.atlasforentrepreneurs.com");
  assert.equal(replyAddress("abc", ""), null);
  assert.equal(amandaFrom("Atlas <noreply@atlasforentrepreneurs.com>", "Cypress Plumbing"), "Amanda for Cypress Plumbing <noreply@atlasforentrepreneurs.com>");
  assert.equal(amandaFrom("noreply@atlasforentrepreneurs.com", null), "Amanda <noreply@atlasforentrepreneurs.com>");
  assert.equal(amandaFrom("", "X"), null);
  assert.equal(nextSendAt("2026-09-12T15:00:00.000Z", 1), "2026-09-15T15:00:00.000Z");
  assert.equal(nextSendAt("2026-09-12T15:00:00.000Z", 2), "2026-09-19T15:00:00.000Z");
});

test("send pass sends exactly the due step, records it, schedules the next, marks Contacted", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.ATLAS_NOTIFICATION_FROM = "Atlas <noreply@atlasforentrepreneurs.com>";
  process.env.AMANDA_REPLY_DOMAIN = "reply.atlasforentrepreneurs.com";
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const path = String(url).replace("https://example.supabase.co/rest/v1/", "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, path, body, headers: init.headers || {} });
    if (String(url).startsWith("https://api.resend.com/emails")) return json({ id: "resend-1" });
    if (path.startsWith("organization_outreach_sequences?status=in.")) return json([sequence]);
    if (path.startsWith("organization_opportunities?id=in.")) return json([{ id: "opp-1", name: "Cypress PM", stage: "qualified", contact_name: "Dana" }]);
    if (path.startsWith("organizations?id=in.")) return json([{ id: "org-1", name: "Cypress Plumbing" }]);
    if (path.startsWith("organization_outreach_messages") && method === "POST") return json([{ id: "m1" }]);
    if (path.startsWith("organization_outreach_sequences?id=eq.seq-1") && method === "PATCH") return json([{ id: "seq-1" }]);
    if (path.startsWith("organization_opportunities?id=eq.opp-1") && method === "PATCH") return json([{ id: "opp-1" }]);
    if (path.startsWith("organization_opportunity_events") && method === "POST") return json([{ id: "e1" }]);
    throw new Error(`unexpected ${method} ${path}`);
  };

  const summary = await runAmandaSendPass(new Date("2026-09-12T15:05:00.000Z"));
  assert.deepEqual(summary, { due: 1, sent: 1, paused: 0, done: 0, skipped: 0 });

  const resend = calls.find((call) => call.path.startsWith("https://api.resend.com/emails"));
  assert.equal(resend.headers["Idempotency-Key"], "amanda-seq-1-0");
  assert.deepEqual(resend.body.to, ["office@cypresspm.test"]);
  assert.equal(resend.body.reply_to, "amanda+abcdef1234567890@reply.atlasforentrepreneurs.com");
  assert.equal(resend.body.from, "Amanda for Cypress Plumbing <noreply@atlasforentrepreneurs.com>");
  assert.equal(resend.body.subject, "Plumbing for Cypress PM");

  const patch = calls.find((call) => call.method === "PATCH" && call.path.startsWith("organization_outreach_sequences"));
  assert.equal(patch.body.current_step, 1);
  assert.equal(patch.body.status, "sending");
  assert.equal(patch.body.next_send_at, "2026-09-15T15:00:00.000Z");

  const stage = calls.find((call) => call.method === "PATCH" && call.path.startsWith("organization_opportunities"));
  assert.equal(stage.body.stage, "contacted");
  const event = calls.find((call) => call.path === "organization_opportunity_events");
  assert.equal(event.body.event_type, "contacted");
  assert.match(event.body.summary, /approved by the owner/);
});

test("send pass pauses when the prospect already moved past outreach, and skips when Resend is unset", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const path = String(url).replace("https://example.supabase.co/rest/v1/", "");
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : null });
    if (path.startsWith("organization_outreach_sequences?status=in.")) return json([sequence, { ...sequence, id: "seq-2", opportunity_id: "opp-2" }]);
    if (path.startsWith("organization_opportunities?id=in.")) return json([
      { id: "opp-1", name: "Cypress PM", stage: "won" },
      { id: "opp-2", name: "Katy Realty", stage: "qualified" },
    ]);
    if (path.startsWith("organizations?id=in.")) return json([{ id: "org-1", name: "Cypress Plumbing" }]);
    if (method === "PATCH") return json([{}]);
    throw new Error(`unexpected ${method} ${path}`);
  };
  const summary = await runAmandaSendPass(new Date("2026-09-12T15:05:00.000Z"));
  assert.deepEqual(summary, { due: 2, sent: 0, paused: 1, done: 0, skipped: 1 });
  const paused = calls.find((call) => call.method === "PATCH");
  assert.equal(paused.body.status, "paused");
  assert.equal(paused.body.stopped_reason, "stage");
  assert.ok(!calls.some((call) => call.path.startsWith("https://api.resend.com")));
});

test("inbound helpers: token, stop detection, excerpt strips quoted text", () => {
  assert.equal(parseReplyToken(["Amanda <amanda+ABCDEF1234567890@reply.atlasforentrepreneurs.com>"]), "abcdef1234567890");
  assert.equal(parseReplyToken(["office@cypresspm.test"]), null);
  assert.equal(isStopRequest("STOP"), true);
  assert.equal(isStopRequest("Please remove me from this list"), true);
  assert.equal(isStopRequest("No gracias"), true);
  assert.equal(isStopRequest("Sure, can you call Tuesday? We need someone for 3 units."), false);
  assert.equal(isStopRequest("> If this is not relevant, reply STOP\nSounds good, call me."), false);
  assert.equal(replyExcerpt("Yes please.\n> On Fri Amanda wrote:\n> Hi team", null), "Yes please.");
  assert.equal(replyExcerpt(null, "<p>Call <b>me</b></p>"), "Call me");
});

test("signature check accepts a valid Svix signature and rejects stale or forged ones", () => {
  const secret = `whsec_${Buffer.from("topsecret").toString("base64")}`;
  const payload = JSON.stringify({ type: "email.received" });
  const id = "msg_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from("topsecret")).update(`${id}.${timestamp}.${payload}`).digest("base64");
  assert.equal(verifyResendSignature({ secret, payload, id, timestamp, signature: `v1,${sig}` }), true);
  const forged = createHmac("sha256", Buffer.from("othersecret")).update(`${id}.${timestamp}.${payload}`).digest("base64");
  assert.equal(verifyResendSignature({ secret, payload, id, timestamp, signature: `v1,${forged}` }), false);
  assert.equal(verifyResendSignature({ secret, payload: `${payload} `, id, timestamp, signature: `v1,${sig}` }), false);
  assert.equal(verifyResendSignature({ secret, payload, id, timestamp: String(Number(timestamp) - 3600), signature: `v1,${sig}` }), false);
  assert.equal(verifyResendSignature({ secret: "", payload, id, timestamp, signature: `v1,${sig}` }), false);
});

test("a reply pauses the sequence, moves the prospect to Responded, and emails the owner", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.ATLAS_NOTIFICATION_FROM = "Atlas <noreply@atlasforentrepreneurs.com>";
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const path = String(url).replace("https://example.supabase.co/rest/v1/", "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, path, body });
    if (String(url).startsWith("https://api.resend.com/emails/receiving/")) return json({ text: "Sure, call me Tuesday.\n> quoted", html: null, subject: "Re: Plumbing" });
    if (String(url) === "https://api.resend.com/emails") return json({ id: "owner-mail" });
    if (path.startsWith("organization_outreach_sequences?reply_token=eq.abcdef1234567890")) return json([{ ...sequence, status: "sending", current_step: 1 }]);
    if (path.startsWith("organization_outreach_messages?resend_id=eq.")) return json([]);
    if (path.startsWith("organization_outreach_messages") && method === "POST") return json([{ id: "m2" }]);
    if (path.startsWith("organization_outreach_sequences?id=eq.seq-1") && method === "PATCH") return json([{}]);
    if (path.startsWith("organization_opportunities?id=eq.opp-1") && method === "GET") return json([{ id: "opp-1", name: "Cypress PM", stage: "contacted", contact_name: "Dana" }]);
    if (path.startsWith("organization_opportunities?id=eq.opp-1") && method === "PATCH") return json([{}]);
    if (path.startsWith("organization_opportunity_events") && method === "POST") return json([{}]);
    throw new Error(`unexpected ${method} ${path}`);
  };

  const result = await handleReceived({
    email_id: "in-1",
    from: "dana@cypresspm.test",
    to: ["amanda+abcdef1234567890@reply.atlasforentrepreneurs.com"],
    subject: "Re: Plumbing",
  });
  assert.equal(result.handled, "reply");
  assert.equal(result.emailedOwner, true);

  const seqPatch = calls.find((call) => call.method === "PATCH" && call.path.startsWith("organization_outreach_sequences"));
  assert.equal(seqPatch.body.status, "paused");
  assert.equal(seqPatch.body.stopped_reason, "replied");
  const oppPatch = calls.find((call) => call.method === "PATCH" && call.path.startsWith("organization_opportunities"));
  assert.equal(oppPatch.body.stage, "responded");
  assert.match(oppPatch.body.next_action, /Dana replied to Amanda\. Call them back today\./);
  const event = calls.find((call) => call.path === "organization_opportunity_events");
  assert.equal(event.body.event_type, "reply_received");
  assert.equal(event.body.body, "Sure, call me Tuesday.");
  const ownerMail = calls.find((call) => call.path === "https://api.resend.com/emails");
  assert.deepEqual(ownerMail.body.to, ["owner@example.com"]);
  assert.match(ownerMail.body.subject, /Dana replied — call them today/);
  assert.match(ownerMail.body.text, /client\/prospects\/opp-1/);
});

test("webhook endpoint refuses unsigned requests and non-POST", async () => {
  process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("topsecret").toString("base64")}`;
  const get = await inbound(new Request("https://x.test/.netlify/functions/amanda-inbound", { method: "GET" }));
  assert.equal(get.status, 405);
  const forged = await inbound(
    new Request("https://x.test/.netlify/functions/amanda-inbound", {
      method: "POST",
      body: "{}",
      headers: { "svix-id": "a", "svix-timestamp": String(Math.floor(Date.now() / 1000)), "svix-signature": "v1,bad" },
    }),
  );
  assert.equal(forged.status, 401);
});
