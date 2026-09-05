import assert from "node:assert/strict";
import test from "node:test";
import { workspaceSlugFromIdentity } from "../stripe/paid-workspace-identity.ts";

const SIS_LIVE_SLUG = "sis-diy-big-complete-showcase";
const usesLionsDenHub = (slug: string) => Boolean(slug) && slug !== "qtime-productions";

test("trial workspace slugs open Lion's Den and never reuse SIS or QTIME identities", () => {
  const acme = workspaceSlugFromIdentity({
    name: "Acme Roofing Co",
    email: "owner+trial@example.com",
    uniqueness: "trial-uid",
  });
  assert.match(acme, /^acme-roofing-co-/);
  assert.equal(usesLionsDenHub(acme), true);

  assert.notEqual(
    workspaceSlugFromIdentity({ name: "SIS Custom Creations", email: "owner@example.com" }),
    "sis-custom-creations",
  );
  assert.notEqual(
    workspaceSlugFromIdentity({ name: "SIS DIY", uniqueness: SIS_LIVE_SLUG }),
    SIS_LIVE_SLUG,
  );
  assert.equal(
    workspaceSlugFromIdentity({ name: "QTime Productions", email: "owner@example.com" }),
    "qtime-productions-workspace",
  );
});
