import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  FOLLOW_UP_CHECK_IN_DAYS,
  canShowFollowUpDraftControls,
  followUpDraftHasVisibleSampleLabel,
  followUpDraftMailto,
  followUpDraftSms,
  followUpDraftText,
  followUpSentCheckIn,
  isOwnerGatedFollowUpMailto,
} from "./follow-up-drafts.ts";
import { presentLiveDeskOpportunity } from "./live-desk.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("AFE and SAMPLE desks get draft controls; SIS never does", () => {
  assert.equal(
    canShowFollowUpDraftControls({ name: "Cypress Pest Pros", slug: "cypress-pest-pros-trial" }),
    true,
  );
  assert.equal(
    canShowFollowUpDraftControls({ name: "Sample desk", slug: "afe-crm-demo" }),
    true,
  );
  assert.equal(
    canShowFollowUpDraftControls({ name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" }),
    true,
  );
  assert.equal(
    canShowFollowUpDraftControls({
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    false,
  );
  assert.equal(canShowFollowUpDraftControls(null), false);
});

test("SAMPLE and DEMO labels stay visible on follow-up drafts", () => {
  assert.equal(
    followUpDraftHasVisibleSampleLabel(
      "Rivergate Pest Co · SAMPLE",
      "SAMPLE draft follow-up — review, then you send.",
    ),
    true,
  );
  assert.equal(followUpDraftHasVisibleSampleLabel("ABC Plumbing (DEMO)", "Later follow-up"), true);
  assert.equal(followUpDraftHasVisibleSampleLabel("Harbor Grill", "Call after lunch"), false);

  const presented = presentLiveDeskOpportunity(
    { name: "Cypress Pest Pros", slug: "cypress-pest-pros-trial" },
    {
      name: "Rivergate Pest Co · SAMPLE",
      nextAction: "SAMPLE draft follow-up — review, then you send. Atlas has not emailed anyone.",
    },
  );
  assert.equal(followUpDraftHasVisibleSampleLabel(presented.name, presented.nextAction), false);
  assert.doesNotMatch(`${presented.name} ${presented.nextAction}`, /\bSAMPLE\b|not a real location/i);
});

test("Send builds an owner-gated mailto and never invents a live mail API", () => {
  const href = followUpDraftMailto({
    email: "desk+trial-rivergate-pest@example.invalid",
    prospectName: "Rivergate Pest Co · SAMPLE",
    contactName: "Casey Nguyen",
    body: "SAMPLE draft follow-up — review, then you send. Atlas has not emailed anyone.",
  });

  assert.ok(href);
  assert.match(href, /^mailto:desk\+trial-rivergate-pest@example\.invalid\?/);
  assert.match(href, /subject=/);
  assert.match(href, /body=/);
  assert.equal(isOwnerGatedFollowUpMailto(href), true);
  assert.doesNotMatch(href, /resend|sendgrid|postmark|smtp/i);

  assert.equal(
    followUpDraftMailto({
      email: null,
      prospectName: "Harbor Grill",
      body: "Call the owner.",
    }),
    null,
  );
  assert.equal(
    followUpDraftMailto({
      email: "not-an-email",
      prospectName: "Harbor Grill",
      body: "Call the owner.",
    }),
    null,
  );
});

test("Text opens WhatsApp with the draft; Copy text matches the email body", () => {
  const sms = followUpDraftSms({ phone: "(713) 555-0100", body: "Quick question about your pest routes." });
  assert.ok(sms);
  assert.match(sms, /^https:\/\/wa\.me\/17135550100\?text=/);
  assert.match(sms, /Quick/);
  assert.doesNotMatch(sms, /Hi%20/);

  assert.equal(followUpDraftSms({ phone: null, body: "x" }), null);
  assert.equal(followUpDraftSms({ phone: "Phone not published", body: "x" }), null);
  assert.equal(followUpDraftSms({ phone: "12", body: "x" }), null);

  const text = followUpDraftText({ contactName: "Casey Nguyen", body: "Quick question." });
  assert.equal(text, "Hi Casey Nguyen,\n\nQuick question.");
  assert.equal(followUpDraftText({ contactName: null, body: "  Quick question.  " }), "Quick question.");

  const mailto = followUpDraftMailto({
    email: "owner@example.com",
    prospectName: "Harbor Grill",
    contactName: "Casey Nguyen",
    body: "Quick question.",
  });
  assert.ok(mailto);
  assert.match(mailto, new RegExp(`body=${encodeURIComponent(text)}$`));
});

test("I sent this queues a sendable check-in a few days out and never a same-day nag", () => {
  const sentAt = new Date(2026, 8, 9, 15, 30);
  const en = followUpSentCheckIn({ contactName: "Casey", spanish: false, sentAt });
  assert.equal(en.nextActionDue, "2026-09-12");
  assert.equal(FOLLOW_UP_CHECK_IN_DAYS, 3);
  assert.match(en.nextAction, /following up on my message from Wednesday/);
  assert.match(en.nextAction, /quick call\?$/);

  const es = followUpSentCheckIn({ contactName: "Casey", spanish: true, sentAt });
  assert.equal(es.nextActionDue, "2026-09-12");
  assert.match(es.nextAction, /miércoles/);

  // Noon, so the owner's day is unambiguous whatever zone the test machine runs in.
  const monthEnd = followUpSentCheckIn({ spanish: false, sentAt: new Date(2026, 8, 29, 12) });
  assert.equal(monthEnd.nextActionDue, "2026-10-02");
});

test("Follow-up desk offers Email/Text/Copy/Edit/Delete plus I sent this, and Atlas never transmits", () => {
  const board = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const copyButton = readRepo("src/components/lions-den/follow-up-copy-button.tsx");
  const page = readRepo("src/app/client/david/page.tsx");
  const actions = readRepo("src/server/opportunities/actions.ts");

  assert.match(board, /data-followup-control="edit"/);
  assert.match(board, /data-followup-control="email"/);
  assert.match(board, /data-followup-control="text"/);
  assert.match(board, /data-followup-control="delete"/);
  assert.match(board, /data-followup-control="sent"/);
  assert.match(board, /\{spanish \? "Editar" : "Edit"\}/);
  assert.match(board, /\{spanish \? "Correo" : "Email"\}/);
  assert.match(board, /WhatsApp/);
  assert.match(board, /\{spanish \? "Eliminar" : "Delete"\}/);
  assert.match(board, /\{spanish \? "Ya lo envié" : "I sent this"\}/);
  assert.match(board, /followUpDraftMailto/);
  assert.match(board, /followUpDraftSms/);
  assert.match(board, /followUpDraftText/);
  assert.match(board, /FollowUpCopyButton/);
  assert.match(board, /allowDraftControls/);
  assert.match(board, /updateFollowUpDraft/);
  assert.match(board, /deleteFollowUpDraft/);
  assert.match(board, /markFollowUpSent/);
  assert.match(board, /Email and WhatsApp open your own apps with the draft filled in\. Atlas does not send\./);
  assert.match(board, /No email on file\. Edit the prospect to add one\./);
  assert.match(board, /No phone on file\. Edit the prospect to add one\./);
  assert.match(board, /name="draftBody"/);
  assert.match(board, /SAMPLE/);
  assert.match(board, /followupStatus/);
  assert.match(board, /status === "sent"/);
  assert.match(board, /href: `\/client\/sis\/party\/\$\{item\.id\}`/);
  assert.doesNotMatch(
    board,
    /href: `\/client\/sis\/party\/\$\{item\.id\}`,\s*draftControls/,
  );
  assert.doesNotMatch(board, /resend|sendgrid|postmark|twilio|auto-?send/i);
  assert.doesNotMatch(board, /organization_sis_/);

  assert.match(copyButton, /^"use client";/);
  assert.match(copyButton, /navigator\.clipboard\.writeText/);
  assert.match(copyButton, /data-followup-control="copy"/);
  assert.doesNotMatch(copyButton, /fetch\(|resend|twilio/i);

  assert.match(page, /canShowFollowUpDraftControls/);
  assert.match(page, /const allowDraftControls = canShowFollowUpDraftControls\(primaryOrganization\)/);
  assert.match(page, /allowDraftControls=\{allowDraftControls\}/);

  assert.match(actions, /isSisOrganization/);
  assert.match(actions, /sis_blocked/);
  assert.match(actions, /export async function markFollowUpSent/);
  assert.match(actions, /Owner sent the follow-up themselves\. Atlas did not email, call, or text anyone/);
  assert.match(actions, /Owner edited the follow-up draft/);
  assert.match(actions, /Owner deleted the follow-up draft from the queue/);
  assert.match(actions, /next_action_due: null/);
  assert.match(actions, /no_outreach_sent: true/);
  assert.match(actions, /followUpSentCheckIn/);
  assert.match(actions, /STAGES_PAST_CONTACTED/);
  assert.match(actions, /event_type: "contacted"/);
  assert.doesNotMatch(actions, /openFollowUpOwnerSend/);
  assert.doesNotMatch(actions, /redirect\(mailto\)/);
  assert.doesNotMatch(actions, /resend|sendgrid|postmark|twilio/i);
  assert.doesNotMatch(actions, /organization_sis_/);
  assert.doesNotMatch(actions, /from\("atlas_sales_prospects"\)/);
});
