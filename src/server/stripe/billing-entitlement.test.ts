import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FOUNDER_MAILBOX_EMAIL } from "../../lib/client-portal/identity.ts";
import {
  ATLAS_PLAN_PRICE_ENV,
  canAttachPaidEntitlementToOrganization,
  isActivePaidEntitlementStatus,
  pickReusablePaidWorkspace,
  planForConfiguredPriceId,
  preservedCheckoutSessionId,
  shouldBlockExpiredTrial,
  shouldProcessStripeBillingEvent,
  shouldRefuseFounderMailboxSisAttachment,
  STRIPE_BILLING_UNLOCK_EVENTS,
} from "./billing-entitlement.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const EXISTING_PRICE_ENV = {
  STRIPE_ATLAS_BASIC_PRICE_ID: "price_existing_basic",
  STRIPE_ATLAS_GROW_PRICE_ID: "price_existing_grow",
  STRIPE_ATLAS_UNLIMITED_PRICE_ID: "price_existing_unlimited",
};

test("paid plans map only from the existing Stripe price env names", () => {
  assert.deepEqual(ATLAS_PLAN_PRICE_ENV, {
    basic: "STRIPE_ATLAS_BASIC_PRICE_ID",
    grow: "STRIPE_ATLAS_GROW_PRICE_ID",
    unlimited: "STRIPE_ATLAS_UNLIMITED_PRICE_ID",
  });
  assert.equal(planForConfiguredPriceId("price_existing_basic", EXISTING_PRICE_ENV), "basic");
  assert.equal(planForConfiguredPriceId("price_existing_grow", EXISTING_PRICE_ENV), "grow");
  assert.equal(planForConfiguredPriceId("price_existing_unlimited", EXISTING_PRICE_ENV), "unlimited");
  assert.equal(planForConfiguredPriceId("price_invented_later", EXISTING_PRICE_ENV), null);
  assert.equal(planForConfiguredPriceId(null, EXISTING_PRICE_ENV), null);
});

test("webhook unlock events include checkout.session.completed and subscription updates", () => {
  assert.deepEqual([...STRIPE_BILLING_UNLOCK_EVENTS], [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]);
  assert.equal(isActivePaidEntitlementStatus("active"), true);
  assert.equal(isActivePaidEntitlementStatus("paid"), true);
  assert.equal(isActivePaidEntitlementStatus("trialing"), true);
  assert.equal(isActivePaidEntitlementStatus("canceled"), false);
});

test("already processed Stripe events stay idempotent", () => {
  assert.equal(shouldProcessStripeBillingEvent("processed"), false);
  assert.equal(shouldProcessStripeBillingEvent("failed"), true);
  assert.equal(shouldProcessStripeBillingEvent("processing"), true);
  assert.equal(shouldProcessStripeBillingEvent(null), true);
  assert.equal(preservedCheckoutSessionId(null, "cs_existing"), "cs_existing");
  assert.equal(preservedCheckoutSessionId("cs_new", "cs_existing"), "cs_new");
});

test("AFE paid entitlements never attach to SIS, sample desk, or QTIME", () => {
  assert.equal(
    canAttachPaidEntitlementToOrganization({
      id: "org_sis",
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    false,
  );
  assert.equal(
    canAttachPaidEntitlementToOrganization({
      id: "org_sample",
      name: "Sample desk",
      slug: "afe-crm-demo",
    }),
    false,
  );
  assert.equal(
    canAttachPaidEntitlementToOrganization({
      id: "org_qtime",
      name: "QTime Productions",
      slug: "qtime-productions",
    }),
    false,
  );
  assert.equal(
    canAttachPaidEntitlementToOrganization({
      id: "org_unknown",
    }),
    false,
  );
  assert.equal(
    canAttachPaidEntitlementToOrganization({
      id: "org_afe",
      name: "Harbor Lights Studio",
      slug: "harbor-lights-studio",
    }),
    true,
  );

  const picked = pickReusablePaidWorkspace([
    { id: "org_sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
    { id: "org_afe", name: "Harbor Lights Studio", slug: "harbor-lights-studio" },
  ]);
  assert.equal(picked?.id, "org_afe");
});

test("founder mailbox checkout cannot attach a paid plan to SIS", () => {
  assert.equal(
    shouldRefuseFounderMailboxSisAttachment(FOUNDER_MAILBOX_EMAIL, {
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    true,
  );
  assert.equal(
    shouldRefuseFounderMailboxSisAttachment(FOUNDER_MAILBOX_EMAIL, {
      name: "Harbor Lights Studio",
      slug: "harbor-lights-studio",
    }),
    false,
  );
  assert.equal(
    shouldRefuseFounderMailboxSisAttachment("owner@harbor.test", {
      name: "SIS Custom Creations",
      slug: "sis-diy-big-complete-showcase",
    }),
    false,
  );
});

test("an active webhook entitlement unlocks after the trial clock expires", () => {
  assert.equal(
    shouldBlockExpiredTrial({
      trialEndsAt: "2026-01-01T00:00:00.000Z",
      hasActivePaidEntitlement: true,
      now: Date.parse("2026-09-05T00:00:00.000Z"),
    }),
    false,
  );
  assert.equal(
    shouldBlockExpiredTrial({
      trialEndsAt: "2026-01-01T00:00:00.000Z",
      hasActivePaidEntitlement: false,
      now: Date.parse("2026-09-05T00:00:00.000Z"),
    }),
    true,
  );
});

test("webhook is the entitlement writer; success page is confirmation only", () => {
  const webhook = readFileSync(join(root, "src/app/api/stripe/webhook/route.ts"), "utf8");
  const billing = readFileSync(join(root, "src/server/stripe/billing.ts"), "utf8");
  const success = readFileSync(join(root, "src/app/checkout/success/page.tsx"), "utf8");
  const paidWorkspace = readFileSync(join(root, "src/server/stripe/paid-workspace.ts"), "utf8");

  assert.match(webhook, /processStripeBillingEvent/);
  assert.match(webhook, /constructEvent/);
  assert.match(billing, /checkout\.session\.completed/);
  assert.match(billing, /customer\.subscription\./);
  assert.match(billing, /upsertEntitlement/);
  assert.match(billing, /provisionPaidAtlasWorkspace/);
  assert.match(billing, /findExistingPaidWorkspaceLink/);
  assert.match(paidWorkspace, /canAttachPaidEntitlementToOrganization/);
  assert.doesNotMatch(paidWorkspace, /ensureSisWorkingOrgAccess|sis-working-org/);
  assert.doesNotMatch(success, /processStripeBillingEvent/);
  assert.doesNotMatch(success, /upsertEntitlement/);
  assert.doesNotMatch(success, /provisionPaidAtlasWorkspace/);
  assert.doesNotMatch(success, /atlas_billing_entitlements/);
  assert.doesNotMatch(success, /organization_ai_plans/);
  assert.doesNotMatch(success, /checkout\.sessions\.retrieve/);
  assert.doesNotMatch(success, /confirmCheckoutSession/);

  const trialGuard = readFileSync(join(root, "src/server/trials/guards.ts"), "utf8");
  const workspaceContext = readFileSync(join(root, "src/server/client-workspace/context.ts"), "utf8");
  const authActions = readFileSync(join(root, "src/server/auth/actions.ts"), "utf8");
  assert.match(trialGuard, /userHasActivePaidEntitlement/);
  assert.match(workspaceContext, /userHasActivePaidEntitlement/);
  assert.match(authActions, /userHasActivePaidEntitlement/);
});
