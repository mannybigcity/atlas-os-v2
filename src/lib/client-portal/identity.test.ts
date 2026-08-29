import assert from "node:assert/strict";
import test from "node:test";
import {
  getClientPortalName,
  isQTimeProductions,
  isQTimeWorkspaceSlug,
  isSisCustomCreations,
  isSisLionsDenRequest,
  isSisOrganization,
  isSisWorkspaceSlug,
  shouldShowSuperAdminCrm,
  sisLionsDenPreviewHref,
  SIS_LIONS_DEN_PREVIEW_SLUG,
} from "./identity.ts";

test("SIS owner-facing chrome is The Lion's Den, not a DAVID or CRM label", () => {
  assert.equal(getClientPortalName("SIS Custom Creations"), "The Lion’s Den");
  assert.equal(getClientPortalName("SIS-DIY-big-complete-showcase"), "The Lion’s Den");
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

test("live SIS Lion's Den matches name or sis-diy slug, not sis-custom-creations", () => {
  assert.equal(isQTimeWorkspaceSlug("qtime-productions"), true);
  assert.equal(isQTimeWorkspaceSlug(SIS_LIONS_DEN_PREVIEW_SLUG), false);
  assert.equal(isSisWorkspaceSlug(SIS_LIONS_DEN_PREVIEW_SLUG), true);
  assert.equal(isSisWorkspaceSlug("sis-custom-creations"), false);
  assert.equal(isSisWorkspaceSlug("qtime-productions"), false);
  assert.equal(isSisOrganization({ name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" }), true);
  assert.equal(isSisOrganization({ name: "SIS-DIY-big-complete-showcase", slug: "sis-diy-big-complete-showcase" }), true);
  assert.equal(isSisOrganization({ name: "QTime Productions", slug: "qtime-productions" }), false);
});

test("SIS preview and selected workspace skip the super-admin CRM", () => {
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      previewOrgSlug: SIS_LIONS_DEN_PREVIEW_SLUG,
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
      requestedWorkspaceSlug: SIS_LIONS_DEN_PREVIEW_SLUG,
    }),
    false,
  );
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: SIS_LIONS_DEN_PREVIEW_SLUG,
    }),
    false,
  );
  assert.equal(isSisLionsDenRequest(SIS_LIONS_DEN_PREVIEW_SLUG, ""), true);
  assert.equal(isSisLionsDenRequest("sis-custom-creations", ""), false);
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

test("admin Lion's Den door uses the live SIS slug or a matched organization", () => {
  assert.equal(sisLionsDenPreviewHref(), "/client?previewOrg=sis-diy-big-complete-showcase");
  assert.equal(
    sisLionsDenPreviewHref([
      { name: "QTime Productions", slug: "qtime-productions" },
      { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
    ]),
    "/client?previewOrg=sis-diy-big-complete-showcase",
  );
  assert.equal(sisLionsDenPreviewHref([{ name: "Harbor Lights Studio", slug: "harbor-lights" }]), "/client?previewOrg=sis-diy-big-complete-showcase");
});
