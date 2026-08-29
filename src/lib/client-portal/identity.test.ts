import assert from "node:assert/strict";
import test from "node:test";
import {
  getClientPortalName,
  isQTimeProductions,
  isQTimeWorkspaceSlug,
  isSisCustomCreations,
  isSisLionsDenRequest,
  isSisWorkspaceSlug,
  shouldShowSuperAdminCrm,
  SIS_CUSTOM_CREATIONS_SLUG,
} from "./identity.ts";

test("SIS owner-facing chrome is The Lion's Den, not a DAVID or CRM label", () => {
  assert.equal(getClientPortalName("SIS Custom Creations"), "The Lion’s Den");
  assert.equal(getClientPortalName(null), "The Lion’s Den");
  assert.equal(isSisCustomCreations("SIS Custom Creations"), true);
  assert.equal(getClientPortalName("SIS Custom Creations").includes("DAVID"), false);
  assert.equal(getClientPortalName("SIS Custom Creations").includes("CRM"), false);
});

test("QTIME keeps its own skin name and is not the default", () => {
  assert.equal(getClientPortalName("QTime Productions"), "Q’s Lion’s Den");
  assert.equal(isQTimeProductions("QTime Productions"), true);
  assert.equal(isQTimeProductions("SIS Custom Creations"), false);
});

test("other tenants get a Lion's Den label from the business name", () => {
  assert.equal(getClientPortalName("Harbor Lights Studio"), "Harbor’s Lion’s Den");
});

test("QTIME is not the default Lion's Den workspace slug", () => {
  assert.equal(isQTimeWorkspaceSlug("qtime-productions"), true);
  assert.equal(isQTimeWorkspaceSlug("sis-custom-creations"), false);
  assert.equal(isSisWorkspaceSlug(SIS_CUSTOM_CREATIONS_SLUG), true);
  assert.equal(isSisWorkspaceSlug("qtime-productions"), false);
});

test("SIS preview and selected workspace skip the super-admin CRM", () => {
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      previewOrgSlug: SIS_CUSTOM_CREATIONS_SLUG,
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      requestedWorkspaceSlug: SIS_CUSTOM_CREATIONS_SLUG,
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: SIS_CUSTOM_CREATIONS_SLUG,
    }),
    false,
  );
  assert.equal(isSisLionsDenRequest(SIS_CUSTOM_CREATIONS_SLUG, ""), true);
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
});

