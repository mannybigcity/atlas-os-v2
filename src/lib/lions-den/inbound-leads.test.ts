import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  INBOUND_LEAD_SOURCE_LABEL,
  inboundLeadAutoReply,
  inboundLeadOpportunityRow,
  inboundLeadOwnerEmail,
  isInboundOpportunity,
  leadPagePath,
  leadPageUrl,
  validateInboundLead,
} from "./inbound-leads.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

const values = {
  name: "Maria Lopez",
  phone: "(713) 555-0142",
  email: "maria@example.com",
  address: "123 Cypress Creek Pkwy",
  problem: "Leak under the kitchen sink, started this morning.",
};

test("lead page URL is stable and slug-safe", () => {
  assert.equal(leadPagePath("cypress-plumbing-trial"), "/go/cypress-plumbing-trial");
  assert.equal(leadPageUrl("https://atlasforentrepreneurs.com/", "cypress-plumbing-trial"), "https://atlasforentrepreneurs.com/go/cypress-plumbing-trial");
});

test("validation mirrors the opportunity constraints", () => {
  assert.deepEqual(validateInboundLead(values, false), {});
  const bad = validateInboundLead({ name: "M", phone: "123", email: "nope", address: "", problem: "short" }, false);
  assert.ok(bad.name && bad.phone && bad.email && bad.problem);
  assert.deepEqual(validateInboundLead({ ...values, email: "" }, true), {});
});

test("an inbound lead lands as a hot, already-responded customer due today", () => {
  const now = new Date(2026, 8, 12, 9, 15);
  const row = inboundLeadOpportunityRow({ organizationId: "org-1", slug: "cypress-plumbing-trial", values, spanish: false, now });
  assert.equal(row.stage, "responded");
  assert.equal(row.opportunity_type, "customer");
  assert.equal(row.owner_role, "client");
  assert.equal(row.source_label, INBOUND_LEAD_SOURCE_LABEL);
  assert.equal(row.next_action_due, "2026-09-12");
  assert.equal(row.contact_phone, values.phone);
  assert.equal(row.contact_email, values.email);
  assert.ok(row.research_summary.length >= 10 && row.research_summary.length <= 3000);
  assert.ok(row.next_action.length >= 5);
  assert.equal(row.metadata.inbound, true);
  assert.equal(row.metadata.no_outreach_sent, true);
  assert.equal(isInboundOpportunity({ metadata: row.metadata }), true);
  assert.equal(isInboundOpportunity({ metadata: {}, sourceLabel: "HUNTER" }), false);

  const noEmail = inboundLeadOpportunityRow({ organizationId: "org-1", slug: "x", values: { ...values, email: "" }, spanish: true, now });
  assert.equal(noEmail.contact_email, null);
  assert.match(noEmail.next_action, /Llámalos ahora/);
});

test("owner email leads with the phone number; Amanda's receipt promises a call and sells nothing", () => {
  const owner = inboundLeadOwnerEmail({ businessName: "Cypress Plumbing", values, prospectUrl: "https://atlasforentrepreneurs.com/client/prospects/abc" });
  assert.equal(owner.subject, "New lead: Maria Lopez needs Cypress Plumbing");
  assert.match(owner.text, /Phone: \(713\) 555-0142/);
  assert.match(owner.text, /Call them now/);
  assert.match(owner.html, /href="tel:7135550142"/);
  assert.match(owner.html, /Open in your desk/);

  const reply = inboundLeadAutoReply({ businessName: "Cypress Plumbing", ownerPhone: "(281) 555-0199", values, spanish: false });
  assert.match(reply.subject, /We got your request/);
  assert.match(reply.text, /^Hi Maria,/);
  assert.match(reply.text, /call you at \(713\) 555-0142/);
  assert.match(reply.text, /call us directly at \(281\) 555-0199/);
  assert.match(reply.text, /Amanda\nCustomer outreach for Cypress Plumbing$/);
  assert.doesNotMatch(reply.text, /discount|offer|subscribe|unsubscribe/i);

  const es = inboundLeadAutoReply({ businessName: "Cypress Plumbing", ownerPhone: null, values, spanish: true });
  assert.match(es.text, /^Hola Maria,/);
  assert.doesNotMatch(es.text, /llama directo/);
});

test("lead page is public, honeypotted, and never authenticates the visitor", () => {
  const page = readRepo("src/app/go/[slug]/page.tsx");
  const actions = readRepo("src/server/leads/actions.ts");
  const proxy = readRepo("src/proxy.ts");
  const prospects = readRepo("src/app/client/prospects/page.tsx");

  assert.match(page, /submitInboundLead/);
  assert.match(page, /name="company"/);
  assert.match(page, /name="phone"/);
  assert.match(page, /name="problem"/);
  assert.match(page, /robots: \{ index: false/);
  assert.doesNotMatch(page, /requireUser|getClientWorkspaceContext/);
  assert.doesNotMatch(proxy, /"\/go"/);

  assert.match(actions, /formData\.get\("company"\)/);
  assert.match(actions, /event_type: "created"/);
  assert.match(actions, /atlas-inbound-owner-/);
  assert.match(actions, /atlas-inbound-reply-/);
  assert.match(actions, /No marketing was sent/);
  assert.doesNotMatch(actions, /twilio|sms:/i);

  assert.match(prospects, /InboundLeadLinkCard/);
  assert.match(prospects, /isSisOrganization/);
});
