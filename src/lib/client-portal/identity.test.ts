import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeIlikeExact,
  findOrganizationByPreviewSlug,
  getClientPortalName,
  isGuestClientPreview,
  isQTimeProductions,
  isQTimeWorkspaceSlug,
  isSisCustomCreations,
  isSisLionsDenRequest,
  isSisOrganization,
  isSisWorkspaceSlug,
  keepPrimaryOrganizationForSisRequest,
  organizationSlugsMatch,
  resolveOperatorDeskOrganization,
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
  assert.equal(
    sisLionsDenPreviewHref([
      { name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
    ]),
    "/client?previewOrg=SIS-DIY-big-complete-showcase",
  );
  assert.equal(sisLionsDenPreviewHref([{ name: "Harbor Lights Studio", slug: "harbor-lights" }]), "/client?previewOrg=sis-diy-big-complete-showcase");
});

test("preview slug lookup is case-insensitive and can fall back to the SIS org", () => {
  assert.equal(organizationSlugsMatch("SIS-DIY-big-complete-showcase", "sis-diy-big-complete-showcase"), true);
  assert.equal(escapeIlikeExact("sis-diy-big-complete-showcase"), "sis-diy-big-complete-showcase");
  assert.equal(escapeIlikeExact("100%_off"), "100\\%\\_off");

  const mixedCase = findOrganizationByPreviewSlug("sis-diy-big-complete-showcase", [
    { name: "QTime Productions", slug: "qtime-productions" },
    { name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
  ]);
  assert.equal(mixedCase?.slug, "SIS-DIY-big-complete-showcase");
  assert.equal(mixedCase?.name, "SIS Custom Creations");

  const byName = findOrganizationByPreviewSlug("sis-diy-big-complete-showcase", [
    { name: "SIS Custom Creations", slug: "sis-custom-creations" },
    { name: "QTime Productions", slug: "qtime-productions" },
  ]);
  assert.equal(byName?.name, "SIS Custom Creations");
  assert.equal(byName?.slug, "sis-custom-creations");
});

test("super admin opening SIS Lion's Den is an operator, not a guest preview", () => {
  assert.equal(
    isGuestClientPreview({ name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" }),
    false,
  );
  assert.equal(
    isGuestClientPreview({ name: "QTime Productions", slug: "qtime-productions" }),
    true,
  );
  assert.equal(isGuestClientPreview(null), false);
});

test("a SIS Lion's Den request does not fall through to QTIME", () => {
  const qtime = { name: "QTime Productions", slug: "qtime-productions" };
  const sis = { name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" };
  assert.equal(
    keepPrimaryOrganizationForSisRequest(qtime, SIS_LIONS_DEN_PREVIEW_SLUG, "")?.slug,
    undefined,
  );
  assert.equal(
    keepPrimaryOrganizationForSisRequest(sis, SIS_LIONS_DEN_PREVIEW_SLUG, "")?.slug,
    "SIS-DIY-big-complete-showcase",
  );
  assert.equal(
    keepPrimaryOrganizationForSisRequest(qtime, "", "qtime-productions")?.slug,
    "qtime-productions",
  );
});

test("super admin opening SIS gets the SIS workspace id even when the first membership is QTIME", () => {
  const qtime = { id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" };
  const sis = { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" };

  const fromDirectory = resolveOperatorDeskOrganization({
    previewOrgSlug: SIS_LIONS_DEN_PREVIEW_SLUG,
    membershipOrganizations: [qtime],
    directory: [qtime, sis],
  });
  assert.equal(fromDirectory?.id, "org-sis");
  assert.equal(fromDirectory?.name, "SIS Custom Creations");

  const fromMembership = resolveOperatorDeskOrganization({
    previewOrgSlug: "sis-diy-big-complete-showcase",
    previewOrganization: null,
    membershipOrganizations: [qtime, sis],
    directory: [],
  });
  assert.equal(fromMembership?.id, "org-sis");

  const mixedCase = resolveOperatorDeskOrganization({
    previewOrgSlug: "sis-diy-big-complete-showcase",
    previewOrganization: { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
    membershipOrganizations: [qtime],
  });
  assert.equal(mixedCase?.id, "org-sis");
});

test("a SIS preview request never treats SIS as a guest and never returns QTIME", () => {
  const qtime = { id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" };
  const resolved = resolveOperatorDeskOrganization({
    previewOrgSlug: SIS_LIONS_DEN_PREVIEW_SLUG,
    previewOrganization: qtime,
    membershipOrganizations: [qtime],
    directory: [qtime],
  });
  assert.equal(resolved, undefined);
  assert.equal(isGuestClientPreview({ name: "SIS Custom Creations", slug: "sis-diy" }), false);
});
