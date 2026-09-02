import assert from "node:assert/strict";
import test from "node:test";
import {
  AFE_CRM_DEMO_SLUG,
  AFE_CRM_LIVE_NAME,
  afeCrmDemoPreviewHref,
  defaultLionsDenDeskHref,
  escapeIlikeExact,
  findOrganizationByPreviewSlug,
  getClientPortalName,
  getClientPortalOrgLabel,
  isAfeClientDeskOrganization,
  isAfeCrmDemoName,
  isAfeCrmDemoOrganization,
  isAfeCrmDemoSlug,
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
import { lionsDenHubChromeCopy } from "../lions-den/live-desk.ts";

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

test("super-admin CRM is never the /client front door", () => {
  assert.equal(
    shouldShowSuperAdminCrm({
      isSuperAdmin: true,
      isClientPreview: false,
      selectedWorkspaceSlug: "",
    }),
    false,
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

test("AFE desk is afe-crm-demo, not SIS, and is not a guest preview", () => {
  const liveDesk = { name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG };
  assert.equal(isAfeCrmDemoSlug(AFE_CRM_DEMO_SLUG), true);
  assert.equal(isAfeCrmDemoSlug(SIS_LIONS_DEN_PREVIEW_SLUG), false);
  assert.equal(isAfeCrmDemoOrganization(liveDesk), true);
  assert.equal(isAfeCrmDemoOrganization({ name: "AFE CRM DEMO", slug: "afe-crm-demo" }), true);
  assert.equal(isAfeCrmDemoOrganization({ name: "Atlas CRM DEMO", slug: "afe-crm-demo" }), true);
  assert.equal(isAfeCrmDemoName("AFE CRM DEMO"), true);
  assert.equal(isAfeCrmDemoName("Atlas CRM DEMO"), true);
  assert.equal(isAfeCrmDemoName(AFE_CRM_LIVE_NAME), false);
  assert.equal(
    isAfeCrmDemoOrganization({ name: "Atlas CRM DEMO", slug: "atlas-crm-demo" }),
    true,
  );
  assert.equal(
    isAfeCrmDemoOrganization({ name: "SIS Custom Creations", slug: "afe-crm-demo" }),
    false,
  );
  assert.equal(isAfeClientDeskOrganization(liveDesk), true);
  assert.equal(
    isAfeClientDeskOrganization({ name: "SIS Custom Creations", slug: SIS_LIONS_DEN_PREVIEW_SLUG }),
    false,
  );
  assert.equal(
    isAfeClientDeskOrganization({ name: "QTime Productions", slug: "qtime-productions" }),
    false,
  );
  assert.equal(isGuestClientPreview(liveDesk), false);
  assert.equal(defaultLionsDenDeskHref(), "/client");
  assert.equal(afeCrmDemoPreviewHref(), "/client?previewOrg=afe-crm-demo");
  assert.equal(
    afeCrmDemoPreviewHref([{ name: AFE_CRM_LIVE_NAME, slug: "AFE-CRM-DEMO" }]),
    "/client?previewOrg=AFE-CRM-DEMO",
  );
  assert.doesNotMatch(defaultLionsDenDeskHref(), /sis-diy/i);
  assert.doesNotMatch(afeCrmDemoPreviewHref(), /sis-diy/i);
});

test("AFE desk chrome is The Lion's Den / Atlas and never includes DEMO", () => {
  const liveDesk = { name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG };
  const oldName = { name: "AFE CRM DEMO", slug: AFE_CRM_DEMO_SLUG };
  const chrome = lionsDenHubChromeCopy(liveDesk);
  const chromeEs = lionsDenHubChromeCopy(liveDesk, true);
  const oldChrome = lionsDenHubChromeCopy(oldName);

  assert.equal(getClientPortalName(liveDesk.name, liveDesk), "The Lion’s Den");
  assert.equal(getClientPortalName(oldName.name, oldName), "The Lion’s Den");
  assert.equal(getClientPortalOrgLabel(liveDesk), "Atlas");
  assert.equal(getClientPortalOrgLabel(oldName), "Atlas");
  assert.doesNotMatch(getClientPortalName(liveDesk.name, liveDesk), /DEMO/i);
  assert.doesNotMatch(getClientPortalOrgLabel(liveDesk), /DEMO/i);
  assert.doesNotMatch(`${chrome.portalName} ${chrome.orgLabel} ${chrome.atlasEmpty}`, /demo/i);
  assert.doesNotMatch(`${chromeEs.portalName} ${chromeEs.orgLabel} ${chromeEs.atlasEmpty}`, /demo/i);
  assert.doesNotMatch(`${oldChrome.portalName} ${oldChrome.orgLabel}`, /demo/i);
  assert.doesNotMatch(chrome.atlasEmpty, /sample|preview desk|fake/i);
  assert.doesNotMatch(getClientPortalName(liveDesk.name, liveDesk), /DAVID/);
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

test("default desk prefers an AFE membership and never auto-opens SIS", () => {
  const qtime = { id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" };
  const sis = { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" };
  const afe = { id: "org-afe", name: AFE_CRM_LIVE_NAME, slug: "afe-crm-demo" };
  const harbor = { id: "org-harbor", name: "Harbor Lights Studio", slug: "harbor-lights" };

  assert.equal(
    resolveOperatorDeskOrganization({
      membershipOrganizations: [sis, qtime, harbor],
    })?.id,
    "org-harbor",
  );

  assert.equal(
    resolveOperatorDeskOrganization({
      previewOrgSlug: AFE_CRM_DEMO_SLUG,
      membershipOrganizations: [sis, qtime],
      directory: [sis, qtime, afe],
    })?.id,
    "org-afe",
  );

  assert.equal(
    resolveOperatorDeskOrganization({
      previewOrgSlug: AFE_CRM_DEMO_SLUG,
      membershipOrganizations: [sis],
      directory: [sis],
    }),
    undefined,
  );

  assert.equal(
    resolveOperatorDeskOrganization({
      preferAfeDemoDesk: true,
      membershipOrganizations: [sis, qtime],
      directory: [sis, qtime, afe],
    })?.id,
    "org-afe",
  );

  const byName = findOrganizationByPreviewSlug("afe-crm-demo", [
    { name: "QTime Productions", slug: "qtime-productions" },
    { name: "Atlas CRM DEMO", slug: "atlas-crm-demo" },
    { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
  ]);
  assert.equal(byName?.name, "Atlas CRM DEMO");
  assert.equal(byName?.slug, "atlas-crm-demo");

  const byLiveName = findOrganizationByPreviewSlug("afe-crm-demo", [
    { name: "QTime Productions", slug: "qtime-productions" },
    { name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG },
    { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
  ]);
  assert.equal(byLiveName?.name, AFE_CRM_LIVE_NAME);
  assert.equal(byLiveName?.slug, AFE_CRM_DEMO_SLUG);
  assert.ok(Boolean(afe.id));
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
