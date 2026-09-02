import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  FOUNDER_MAILBOX_EMAIL,
  SAMPLE_DESK_LOGIN_EMAIL,
  canSeeSampleDesk,
  organizationsVisibleToActor,
  resolveOperatorDeskOrganization,
  shouldOpenAfeOperatorDesk,
} from "./identity.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("admin and real client sessions never receive the sample org", () => {
  const admin = { id: "org-admin", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };
  const sis = { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" };
  const sample = { id: "org-sample", name: "Sample desk", slug: "afe-crm-demo" };

  assert.equal(canSeeSampleDesk(FOUNDER_MAILBOX_EMAIL), false);
  assert.deepEqual(
    organizationsVisibleToActor([admin, sis, sample], false).map((row) => row.id),
    ["org-admin", "org-sis"],
  );
  assert.equal(
    resolveOperatorDeskOrganization({
      previewOrgSlug: "afe-crm-demo",
      membershipOrganizations: [admin, sis, sample],
      directory: [sample],
    })?.id,
    "org-admin",
  );
  assert.equal(
    resolveOperatorDeskOrganization({
      previewOrgSlug: "afe-crm-demo",
      membershipOrganizations: [sis],
      directory: [sample, sis],
    })?.id,
    "org-sis",
  );
});

test("sample login only sees afe-crm-demo", () => {
  const admin = { id: "org-admin", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };
  const sample = { id: "org-sample", name: "Sample desk", slug: "afe-crm-demo" };
  assert.equal(canSeeSampleDesk(SAMPLE_DESK_LOGIN_EMAIL), true);
  assert.deepEqual(
    organizationsVisibleToActor([admin, sample], true).map((row) => row.id),
    ["org-sample"],
  );
  assert.equal(
    resolveOperatorDeskOrganization({
      allowSampleDesk: true,
      membershipOrganizations: [admin, sample],
    })?.id,
    "org-sample",
  );
});

test("workspace context no longer auto-attaches afe-crm-demo to admin", () => {
  const context = readRepo("src/server/client-workspace/context.ts");
  assert.doesNotMatch(context, /preferAfeDemoDesk/);
  assert.match(context, /canSeeSampleDesk/);
  assert.match(context, /isSampleDeskPreviewRequest/);
  assert.match(context, /ensureSisWorkingOrgAccess/);
  assert.match(context, /shouldOpenSisWorkingDesk/);
  assert.match(context, /ensureAfeOperatorDeskAccess/);
  assert.match(context, /shouldOpenAfeOperatorDesk/);
  assert.doesNotMatch(context, /getAfeCrmDemoOrganization/);

  const login = readRepo("src/app/login/page.tsx");
  assert.match(login, /signInToSampleDesk/);
  assert.match(login, /Show the desk/);
  assert.doesNotMatch(login, /DEMO_LOGIN_PASSWORD/);
  assert.doesNotMatch(login, /@atlasforentrepreneurs\.com/);
  assert.doesNotMatch(login, /atlasforentrepreneurs\+demo@gmail\.com/);

  const identity = readRepo("src/lib/client-portal/identity.ts");
  assert.match(identity, /SAMPLE_DESK_LOGIN_EMAIL = "atlasforentrepreneurs\+demo@gmail\.com"/);
  assert.doesNotMatch(identity, /SAMPLE_DESK_LOGIN_EMAIL = "[^"]*@atlasforentrepreneurs\.com"/);

  const script = readRepo("scripts/provision-sample-desk-login.mjs");
  assert.match(script, /DEFAULT_EMAIL = "atlasforentrepreneurs\+demo@gmail\.com"/);
  assert.match(script, /email !== requestedEmail/);
  assert.doesNotMatch(script, /DEFAULT_EMAIL = "[^"]*@atlasforentrepreneurs\.com"/);

  const actions = readRepo("src/server/auth/actions.ts");
  assert.match(actions, /getSampleDeskSignInCredentials/);
  assert.doesNotMatch(actions, /password:\s*["'][^"']+["']/);
});

test("HUNTER still writes the review pile and MICAH stays gallery-only", () => {
  const hunter = readRepo("src/server/hunter/search.ts");
  assert.match(hunter, /organization_hunter_review_items/);
  assert.doesNotMatch(hunter, /\.from\(\s*["']organization_opportunities["']\s*\)/);

  const gallery = readRepo("src/server/content-studio/gallery-draft.ts");
  assert.match(gallery, /did not publish|was not published/);
  assert.doesNotMatch(gallery, /auto-post|Blotato|BlackTwist/);
});

test("admin /client renders the Lion's Den CRM desk, not the empty PRIVATE CRM shell", () => {
  const page = readRepo("src/app/client/page.tsx");
  assert.match(page, /clientOverviewRendersLionsDen/);
  assert.match(page, /LionsDenBoardScreen/);
  assert.match(page, /LionsDenOverview/);
  assert.match(page, /Talk to Atlas|LionsDenBoardScreen/);
  const fallbackIndex = page.lastIndexOf("ClientPortalShell");
  const lionsDenIndex = page.indexOf("LionsDenBoardScreen");
  assert.ok(lionsDenIndex > 0);
  assert.ok(fallbackIndex > lionsDenIndex);

  const hub = readRepo("src/lib/lions-den/client-hub.ts");
  assert.match(hub, /clientOverviewRendersLionsDen/);
  assert.match(hub, /label: "Summary"/);
  assert.doesNotMatch(hub, /ABC Plumbing|123 Catering|XYZ Electric/);

  const operator = readRepo("src/server/organizations/afe-operator-desk.ts");
  assert.match(operator, /AFE_OPERATOR_DESK_SLUG/);
  assert.match(operator, /canEnsureAfeOperatorDesk/);
  assert.doesNotMatch(operator, /afe-crm-demo/);
  assert.doesNotMatch(operator, /ABC Plumbing|123 Catering|XYZ Electric/);
  assert.doesNotMatch(operator, /upsertSampleDeskRecords|upsertSisDemoDeskRecords/);
});

test("demo user still only sees the sample org and admin never opens it", () => {
  const admin = { id: "org-admin", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };
  const sample = { id: "org-sample", name: "Sample desk", slug: "afe-crm-demo" };
  assert.equal(canSeeSampleDesk(FOUNDER_MAILBOX_EMAIL), false);
  assert.equal(canSeeSampleDesk(SAMPLE_DESK_LOGIN_EMAIL), true);
  assert.equal(shouldOpenAfeOperatorDesk({ seesSampleDesk: true }), false);
  assert.equal(
    resolveOperatorDeskOrganization({
      allowSampleDesk: true,
      membershipOrganizations: [admin, sample],
    })?.id,
    "org-sample",
  );
  assert.equal(
    resolveOperatorDeskOrganization({
      membershipOrganizations: [sample],
      directory: [admin, sample],
    })?.id,
    "org-admin",
  );
});
