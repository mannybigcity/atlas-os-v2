import assert from "node:assert/strict";
import test from "node:test";
import {
  isSisLionsDenRequest,
  shouldShowSuperAdminCrm,
  usesLionsDenHub,
} from "./client-hub.ts";

test("SIS preview and selected workspace skip the super-admin CRM", () => {
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      previewOrgSlug: "sis-custom-creations",
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      requestedWorkspaceSlug: "sis-custom-creations",
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "sis-custom-creations",
    }),
    false,
  );
  assert.equal(isSisLionsDenRequest("sis-custom-creations", ""), true);
});

test("super-admin CRM stays the default when no SIS view is requested", () => {
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
    }),
    true,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: true,
      selectedWorkspaceSlug: "",
    }),
    false,
  );
  assert.equal(usesLionsDenHub("sis-custom-creations"), true);
  assert.equal(usesLionsDenHub("qtime-productions"), false);
});
