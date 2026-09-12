import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  isFounderMailboxEmail,
  shouldOpenSisWorkingDesk,
} from "../client-portal/identity.ts";
import { shouldBlockExpiredTrial } from "../../server/stripe/billing-entitlement.ts";
import {
  decideExpiredTrialAccess,
  shouldRedirectExpiredTrialToPricing,
} from "./expired-desk.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const expiredNow = Date.parse("2026-09-12T00:00:00.000Z");
const sisOrg = {
  name: "SIS Custom Creations",
  slug: "sis-diy-big-complete-showcase",
};
const afeOrg = {
  name: "Atlas Trial Test Services",
  slug: "atlas-trial-test-services-0d05e5",
};

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("SIS org stays open even after the trial clock and without a Stripe row", () => {
  const access = decideExpiredTrialAccess({
    trialEndsAt: "2026-09-11T00:00:00.000Z",
    hasActivePaidEntitlement: false,
    organization: sisOrg,
    now: expiredNow,
  });
  assert.equal(access, "open");
  assert.equal(
    shouldBlockExpiredTrial({
      trialEndsAt: "2026-09-11T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: sisOrg,
      now: expiredNow,
    }),
    false,
  );
  assert.equal(
    shouldBlockExpiredTrial({
      trialEndsAt: "2026-09-11T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      isSisOrganization: true,
      now: expiredNow,
    }),
    false,
  );
  assert.equal(
    shouldRedirectExpiredTrialToPricing({
      trialEndsAt: "2026-09-11T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: sisOrg,
      now: expiredNow,
      forSettingsBilling: true,
    }),
    false,
  );
});

test("expired AFE trial is read-only and does not bounce login or the desk to pricing", () => {
  const access = decideExpiredTrialAccess({
    trialEndsAt: "2026-08-24T00:00:00.000Z",
    hasActivePaidEntitlement: false,
    organization: afeOrg,
    now: expiredNow,
  });
  assert.equal(access, "readOnly");
  assert.equal(
    shouldRedirectExpiredTrialToPricing({
      trialEndsAt: "2026-08-24T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: afeOrg,
      now: expiredNow,
    }),
    false,
  );
  assert.equal(
    shouldRedirectExpiredTrialToPricing({
      trialEndsAt: "2026-08-24T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: afeOrg,
      now: expiredNow,
      forSettingsBilling: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockExpiredTrial({
      trialEndsAt: "2026-08-24T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: afeOrg,
      now: expiredNow,
    }),
    true,
  );
});

test("paid entitlement and an active trial stay open", () => {
  assert.equal(
    decideExpiredTrialAccess({
      trialEndsAt: "2026-08-24T00:00:00.000Z",
      hasActivePaidEntitlement: true,
      organization: afeOrg,
      now: expiredNow,
    }),
    "open",
  );
  assert.equal(
    decideExpiredTrialAccess({
      trialEndsAt: "2026-09-20T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      organization: afeOrg,
      now: expiredNow,
    }),
    "open",
  );
  assert.equal(
    decideExpiredTrialAccess({
      trialEndsAt: null,
      hasActivePaidEntitlement: false,
      organization: afeOrg,
      now: expiredNow,
    }),
    "open",
  );
});

test("mannybigcity is a client inquiry login, not founder mailbox or the SIS working desk", () => {
  assert.equal(isFounderMailboxEmail("mannybigcity@gmail.com"), false);
  assert.equal(
    shouldOpenSisWorkingDesk({
      isFounderMailbox: isFounderMailboxEmail("mannybigcity@gmail.com"),
    }),
    false,
  );
});

test("login and desk context no longer hard-redirect expired trials to pricing", () => {
  const authActions = readRepo("server/auth/actions.ts");
  const workspaceContext = readRepo("server/client-workspace/context.ts");
  const trialGuard = readRepo("server/trials/guards.ts");
  const loginFn = authActions.slice(
    authActions.indexOf("export async function signInWithPassword"),
    authActions.indexOf("export async function signInToSampleDesk"),
  );

  assert.doesNotMatch(loginFn, /redirect\("\/pricing\?trial=expired"\)/);
  assert.match(loginFn, /isSisOrganization/);
  assert.match(loginFn, /getUserMemberships/);
  assert.match(loginFn, /ensureTrialWorkspaceForUser/);
  assert.doesNotMatch(workspaceContext, /redirect\("\/pricing\?trial=expired"\)/);
  assert.match(workspaceContext, /decideExpiredTrialAccess/);
  assert.match(workspaceContext, /readOnly/);
  assert.match(trialGuard, /redirect\("\/pricing\?trial=expired"\)/);
  assert.match(trialGuard, /isSisOrganization/);
});

test("read-only desk banner and expired pricing notice keep bilingual copy", () => {
  const board = readRepo("components/lions-den/lions-den-board-screen.tsx");
  const pricing = readRepo("app/pricing/page.tsx");

  assert.match(board, /data-trial-readonly-banner/);
  assert.match(board, /Your trial ended\. You can read everything; upgrade to keep working\./);
  assert.match(board, /Tu prueba terminó\. Puedes leer todo; mejora tu plan para seguir trabajando\./);
  assert.match(board, /\/pricing\?trial=expired/);
  assert.match(pricing, /Your trial ended; your prospects are saved\./);
  assert.match(pricing, /Tu prueba terminó; tus prospectos están guardados\./);
});
