import assert from "node:assert/strict";
import test from "node:test";
import {
  isUsableCheckoutEmail,
  nextWorkspaceSlugCandidate,
  provisioningStatusForCheckoutEmail,
  workspaceNameFromCheckout,
  workspaceSlugFromIdentity,
} from "./paid-workspace-identity.ts";

const SIS_LIVE_SLUG = "sis-diy-big-complete-showcase";
const usesLionsDenHub = (slug: string) => Boolean(slug) && slug !== "qtime-productions";

test("missing checkout email stays failed instead of inventing a login", () => {
  assert.equal(isUsableCheckoutEmail(null), false);
  assert.equal(isUsableCheckoutEmail("   "), false);
  assert.equal(isUsableCheckoutEmail("not-an-email"), false);
  assert.equal(provisioningStatusForCheckoutEmail(""), "failed");
  assert.equal(provisioningStatusForCheckoutEmail("owner@business.com"), "pending");
});

test("workspace names come from checkout, not QTIME or SIS defaults", () => {
  assert.equal(
    workspaceNameFromCheckout({ businessName: "Harbor Lights Studio", email: "owner@harbor.test" }),
    "Harbor Lights Studio",
  );
  assert.equal(
    workspaceNameFromCheckout({ customerName: "Alex Rivera", email: "alex@studio.test" }),
    "Alex Rivera",
  );
  assert.equal(
    workspaceNameFromCheckout({ email: "alex.rivera@studio.test" }),
    "alex rivera workspace",
  );
  assert.equal(workspaceNameFromCheckout({}), "Atlas workspace");
  assert.notEqual(workspaceNameFromCheckout({ email: "buyer@example.com" }), "QTime Productions");
  assert.notEqual(workspaceNameFromCheckout({ email: "buyer@example.com" }), "SIS Custom Creations");
});

test("paid workspace slugs open Lion's Den and never reuse QTIME or the live SIS slug", () => {
  const harbor = workspaceSlugFromIdentity({ name: "Harbor Lights Studio", email: "owner@harbor.test" });
  assert.equal(harbor, "harbor-lights-studio");
  assert.equal(usesLionsDenHub(harbor), true);

  assert.equal(
    workspaceSlugFromIdentity({ name: "QTime Productions", email: "owner@example.com" }),
    "qtime-productions-workspace",
  );
  assert.equal(usesLionsDenHub("qtime-productions-workspace"), true);
  assert.equal(usesLionsDenHub("qtime-productions"), false);

  assert.notEqual(
    workspaceSlugFromIdentity({ name: "SIS Custom Creations", email: "owner@example.com" }),
    "sis-custom-creations",
  );
  assert.notEqual(
    workspaceSlugFromIdentity({ name: "SIS DIY", uniqueness: SIS_LIVE_SLUG }),
    SIS_LIVE_SLUG,
  );
  assert.equal(nextWorkspaceSlugCandidate("harbor-lights-studio", 1), "harbor-lights-studio-2");
});
