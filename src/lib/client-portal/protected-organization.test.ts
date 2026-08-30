import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCanApplyOrganizationIdentityPatch,
  assertNotProvisioningProtectedOrganization,
  isProtectedOrganization,
  organizationIdentityPatchKeys,
} from "./protected-organization.ts";

const sis = { name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" };

test("SIS is the protected organization, matched by isSisOrganization rules", () => {
  assert.equal(isProtectedOrganization(sis), true);
  assert.equal(isProtectedOrganization({ name: "SIS-DIY shop", slug: "sis-diy" }), true);
  assert.equal(isProtectedOrganization({ name: "Harbor Lights", slug: "harbor-lights" }), false);
  assert.equal(isProtectedOrganization({ name: "QTime Productions", slug: "qtime-productions" }), false);
});

test("empty admin edits are allowed; identity overwrites on SIS abort", () => {
  assert.deepEqual(organizationIdentityPatchKeys({ offer: "hats" }), []);
  assert.doesNotThrow(() => assertCanApplyOrganizationIdentityPatch(sis, { offer: "hats" }));
  assert.doesNotThrow(() => assertCanApplyOrganizationIdentityPatch(sis, { name: "", slug: null }));
  assert.throws(
    () => assertCanApplyOrganizationIdentityPatch(sis, { name: "ABC Plumbing" }),
    /protected organization/,
  );
  assert.throws(
    () => assertCanApplyOrganizationIdentityPatch(sis, { slug: "sis-custom-creations" }),
    /protected organization/,
  );
  assert.doesNotThrow(() =>
    assertCanApplyOrganizationIdentityPatch({ name: "Harbor Lights", slug: "harbor" }, { name: "Harbor" }),
  );
});

test("checkout and seed cannot provision a second SIS identity", () => {
  assert.throws(
    () => assertNotProvisioningProtectedOrganization({ name: "SIS Custom Creations", slug: "new-sis" }),
    /cannot be recreated/,
  );
  assert.throws(
    () => assertNotProvisioningProtectedOrganization({ name: "Harbor", slug: "sis-diy-big-complete-showcase" }),
    /cannot be recreated/,
  );
  assert.doesNotThrow(() =>
    assertNotProvisioningProtectedOrganization({ name: "Harbor Lights Studio", slug: "harbor-lights-studio" }),
  );
});
