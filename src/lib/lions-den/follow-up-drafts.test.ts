import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  canShowFollowUpDraftControls,
  followUpDraftHasVisibleSampleLabel,
  followUpDraftMailto,
  isOwnerGatedFollowUpMailto,
} from "./follow-up-drafts.ts";

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

test("Follow-up desk shows Edit/Send/Delete on AFE drafts and keeps send owner-gated", () => {
  const board = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const page = readRepo("src/app/client/david/page.tsx");
  const actions = readRepo("src/server/opportunities/actions.ts");

  assert.match(board, /data-followup-control="edit"/);
  assert.match(board, /data-followup-control="send"/);
  assert.match(board, /data-followup-control="delete"/);
  assert.match(board, /\{spanish \? "Editar" : "Edit"\}/);
  assert.match(board, /\{spanish \? "Enviar" : "Send"\}/);
  assert.match(board, /\{spanish \? "Eliminar" : "Delete"\}/);
  assert.match(board, /followUpDraftMailto/);
  assert.match(board, /allowDraftControls/);
  assert.match(board, /updateFollowUpDraft/);
  assert.match(board, /deleteFollowUpDraft/);
  assert.match(board, /openFollowUpOwnerSend/);
  assert.match(board, /Send opens your email\. Atlas does not send\./);
  assert.match(board, /name="draftBody"/);
  assert.match(board, /SAMPLE/);
  assert.match(board, /followupStatus/);
  assert.match(board, /href: `\/client\/sis\/party\/\$\{item\.id\}`/);
  assert.doesNotMatch(
    board,
    /href: `\/client\/sis\/party\/\$\{item\.id\}`,\s*draftControls/,
  );
  assert.doesNotMatch(board, /resend|sendgrid|postmark|twilio|auto-?send/i);
  assert.doesNotMatch(board, /organization_sis_/);

  assert.match(page, /canShowFollowUpDraftControls/);
  assert.match(page, /allowDraftControls=\{canShowFollowUpDraftControls\(primaryOrganization\)\}/);

  assert.match(actions, /isSisOrganization/);
  assert.match(actions, /sis_blocked/);
  assert.match(actions, /Owner opened send\. Atlas did not email/);
  assert.match(actions, /Owner edited the follow-up draft/);
  assert.match(actions, /Owner deleted the follow-up draft from the queue/);
  assert.match(actions, /next_action_due: null/);
  assert.match(actions, /no_outreach_sent: true/);
  assert.match(actions, /followUpDraftMailto/);
  assert.match(actions, /send_opened/);
  assert.doesNotMatch(actions, /redirect\(mailto\)/);
  assert.doesNotMatch(actions, /resend|sendgrid|postmark|twilio/i);
  assert.doesNotMatch(actions, /organization_sis_/);
  assert.doesNotMatch(actions, /from\("atlas_sales_prospects"\)/);
});
