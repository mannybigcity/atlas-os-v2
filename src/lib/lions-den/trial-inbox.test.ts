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
  computeTrialInboxStatus,
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
    organizationId: "org-bright-path",
    organizationName: "Bright Path Cleaning",
    organizationSlug: TRIAL_INBOX_PROOF_SLUG,
    organizationCreatedAt: "2026-09-05T14:12:10.000Z",
    membershipRole: "owner",
    emailConfirmedAt: "2026-09-05T14:20:00.000Z",
    lastSignInAt: "2026-09-05T15:01:00.000Z",
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

test("Bright Path Cleaning proof case stays in the 7-day queue from org + owner + Auth", () => {
  const rows = selectTrialInboxRows(
    [
      candidate(),
      candidate({
        userId: "user-sis",
        email: "sis@example.com",
        organizationName: "SIS Custom Creations",
        organizationSlug: "sis-diy-big-complete-showcase",
      }),
      candidate({
        userId: "user-sample",
        email: SAMPLE_DESK_LOGIN_EMAIL,
        organizationName: "Sample desk",
        organizationSlug: "afe-crm-demo",
      }),
      candidate({
        userId: "user-founder",
        email: FOUNDER_MAILBOX_EMAIL,
        organizationName: "Founder mailbox trial",
        organizationSlug: "founder-mailbox-trial",
      }),
      candidate({
        userId: "user-paid",
        email: "paid@example.com",
        organizationName: "Paid Desk Co",
        organizationSlug: "paid-desk-co",
        upgraded: true,
      }),
      candidate({
        userId: "user-old",
        email: "old@example.com",
        organizationName: "Old Trial Co",
        organizationSlug: "old-trial-co",
        organizationCreatedAt: "2026-08-20T00:00:00.000Z",
        trialStartedAt: "2026-08-20T00:00:00.000Z",
        trialEndsAt: "2026-08-27T00:00:00.000Z",
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
  assert.equal(rows[0]?.status, "first_login");
  assert.ok(rows[0]?.emailConfirmedAt);
  assert.ok(rows[0]?.daysRemaining >= 6);
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

test("window rule is last 7 days or still-active trial from org created_at", () => {
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      organizationCreatedAt: "2026-09-05T14:12:00.000Z",
    }),
    true,
  );
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      organizationCreatedAt: "2026-08-20T00:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isInsideTrialInboxWindow({
      now,
      organizationCreatedAt: "2026-08-30T00:00:00.000Z",
    }),
    true,
  );
});

test("status ladder is computed and never stored", () => {
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-09-05T14:12:00.000Z",
      upgraded: true,
    }),
    "upgraded",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-08-20T00:00:00.000Z",
      emailConfirmedAt: null,
      lastSignInAt: null,
    }),
    "abandoned",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-08-20T00:00:00.000Z",
      emailConfirmedAt: "2026-08-20T01:00:00.000Z",
    }),
    "expired",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-09-05T14:12:00.000Z",
      emailConfirmedAt: "2026-09-05T14:20:00.000Z",
      lastSignInAt: "2026-09-05T15:01:00.000Z",
    }),
    "first_login",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-08-30T00:00:00.000Z",
      emailConfirmedAt: "2026-08-30T01:00:00.000Z",
      lastSignInAt: "2026-09-02T12:00:00.000Z",
    }),
    "in_den",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-09-05T14:12:00.000Z",
      emailConfirmedAt: "2026-09-05T14:20:00.000Z",
    }),
    "confirmed",
  );
  assert.equal(
    computeTrialInboxStatus({
      now,
      startedAt: "2026-09-05T14:12:00.000Z",
    }),
    "signed_up",
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
  assert.match(query, /from\("organizations"\)/);
  assert.match(query, /organization_memberships/);
  assert.match(query, /auth\.admin\.getUserById/);
  assert.match(query, /selectTrialInboxRows/);
  assert.doesNotMatch(query, /create table/i);
});
