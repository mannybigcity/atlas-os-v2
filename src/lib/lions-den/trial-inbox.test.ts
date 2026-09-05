import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  FOUNDER_MAILBOX_EMAIL,
  SAMPLE_DESK_LOGIN_EMAIL,
} from "../client-portal/identity.ts";
import {
  TRIAL_INBOX_PROOF_SLUG,
  canSeeTrialInboxNav,
  isExcludedTrialInboxEmail,
  isExcludedTrialInboxOrganization,
  isInsideTrialInboxWindow,
  selectTrialInboxRows,
  trialInboxNavLabel,
  trialInboxPreviewHref,
  type TrialInboxCandidate,
} from "./trial-inbox.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const now = new Date("2026-09-05T18:00:00.000Z");

function candidate(overrides: Partial<TrialInboxCandidate> = {}): TrialInboxCandidate {
  return {
    userId: "user-bright-path",
    ownerName: "Jordan Hale",
    email: "jordan@brightpath.example",
    businessName: "Bright Path Cleaning",
    trialStartedAt: "2026-09-05T14:12:00.000Z",
    trialEndsAt: "2026-09-12T14:12:00.000Z",
    organizationId: "org-bright-path",
    organizationName: "Bright Path Cleaning",
    organizationSlug: TRIAL_INBOX_PROOF_SLUG,
    organizationCreatedAt: "2026-09-05T14:12:10.000Z",
    membershipRole: "owner",
    emailConfirmedAt: "2026-09-05T14:20:00.000Z",
    ...overrides,
  };
}

test("7 Day Trial nav is AFE operator / super-admin only", () => {
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" },
    }),
    true,
  );
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: false,
      isClientPreview: false,
      organization: { name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" },
    }),
    false,
  );
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: true,
      isClientPreview: true,
      organization: { name: "Bright Path Cleaning", slug: TRIAL_INBOX_PROOF_SLUG },
    }),
    false,
  );
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
    }),
    false,
  );
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "Sample desk", slug: "afe-crm-demo" },
    }),
    false,
  );
  assert.equal(
    canSeeTrialInboxNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "Harbor Lights Studio", slug: "harbor-lights" },
    }),
    false,
  );
});

test("count label stays owner-friendly", () => {
  assert.equal(trialInboxNavLabel(3), "7 Day Trial (3)");
  assert.equal(trialInboxNavLabel(0, true), "Prueba 7 días (0)");
});

test("Bright Path Cleaning proof case stays in the 7-day queue", () => {
  const rows = selectTrialInboxRows(
    [
      candidate(),
      candidate({
        userId: "user-sis",
        email: "sis@example.com",
        businessName: "SIS Custom Creations",
        organizationName: "SIS Custom Creations",
        organizationSlug: "sis-diy-big-complete-showcase",
      }),
      candidate({
        userId: "user-sample",
        email: SAMPLE_DESK_LOGIN_EMAIL,
        businessName: "Sample desk",
        organizationName: "Sample desk",
        organizationSlug: "afe-crm-demo",
      }),
      candidate({
        userId: "user-founder",
        email: FOUNDER_MAILBOX_EMAIL,
        businessName: "Founder mailbox trial",
        organizationName: "Founder mailbox trial",
        organizationSlug: "founder-mailbox-trial",
      }),
      candidate({
        userId: "user-old",
        email: "old@example.com",
        businessName: "Old Trial Co",
        trialStartedAt: "2026-08-20T00:00:00.000Z",
        trialEndsAt: "2026-08-27T00:00:00.000Z",
        organizationName: "Old Trial Co",
        organizationSlug: "old-trial-co",
        organizationCreatedAt: "2026-08-20T00:00:00.000Z",
      }),
    ],
    now,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.organizationSlug, TRIAL_INBOX_PROOF_SLUG);
  assert.equal(rows[0]?.companyName, "Bright Path Cleaning");
  assert.equal(rows[0]?.ownerName, "Jordan Hale");
  assert.equal(rows[0]?.email, "jordan@brightpath.example");
  assert.equal(rows[0]?.previewHref, `/client?previewOrg=${TRIAL_INBOX_PROOF_SLUG}`);
  assert.ok(rows[0]?.emailConfirmedAt);
});

test("exclusions never mix SIS, sample desk, or founder mailbox", () => {
  assert.equal(
    isExcludedTrialInboxOrganization({
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    true,
  );
  assert.equal(isExcludedTrialInboxOrganization({ name: "Sample desk", slug: "afe-crm-demo" }), true);
  assert.equal(
    isExcludedTrialInboxOrganization({
      name: "Atlas For Entrepreneurs",
      slug: "atlas-for-entrepreneurs",
    }),
    true,
  );
  assert.equal(isExcludedTrialInboxEmail(FOUNDER_MAILBOX_EMAIL), true);
  assert.equal(isExcludedTrialInboxEmail("ops@atlasforentrepreneurs.com"), true);
  assert.equal(isExcludedTrialInboxEmail(SAMPLE_DESK_LOGIN_EMAIL), true);
  assert.equal(isExcludedTrialInboxEmail("jordan@brightpath.example"), false);
});

test("window rule is last 7 days or still-active trial", () => {
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      trialStartedAt: "2026-09-05T14:12:00.000Z",
      trialEndsAt: "2026-09-12T14:12:00.000Z",
    }),
    true,
  );
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      trialStartedAt: "2026-08-20T00:00:00.000Z",
      trialEndsAt: "2026-08-27T00:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      trialStartedAt: "2026-08-28T00:00:00.000Z",
      trialEndsAt: "2026-09-06T00:00:00.000Z",
    }),
    true,
  );
});

test("row click uses previewOrg and never Prospects or HUNTER", () => {
  assert.equal(
    trialInboxPreviewHref(TRIAL_INBOX_PROOF_SLUG),
    `/client?previewOrg=${TRIAL_INBOX_PROOF_SLUG}`,
  );

  const page = readFileSync(join(root, "src/app/client/trial-inbox/page.tsx"), "utf8");
  const board = readFileSync(join(root, "src/components/lions-den/lions-den-trial-inbox.tsx"), "utf8");
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");
  const query = readFileSync(join(root, "src/server/trials/inbox.ts"), "utf8");

  assert.match(page, /LionsDenBoardScreen board="trial-inbox"/);
  assert.match(page, /canSeeTrialInboxNav/);
  assert.match(page, /getAfeTrialInbox/);
  assert.doesNotMatch(page, /getHunterReviewPile/);
  assert.doesNotMatch(page, /getOpportunityPipeline/);
  assert.match(board, /previewHref/);
  assert.match(board, /does not email, call, or text/);
  assert.doesNotMatch(board, /Accept into Prospects/);
  assert.doesNotMatch(board, /\/client\/hunter/);
  assert.doesNotMatch(board, /\/client\/prospects/);
  assert.match(hub, /trialInboxNavLabel/);
  assert.match(hub, /ld-trial-nav-new/);
  assert.match(query, /atlas_trial_profiles/);
  assert.match(query, /selectTrialInboxRows/);
  assert.match(query, /email_confirmed_at|emailConfirmedAt/);
});
