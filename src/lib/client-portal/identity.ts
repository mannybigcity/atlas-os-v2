const SAFE_NAME_PATTERN = /[^\p{L}\p{N}&.'’\- ]/gu;

function cleanOrganizationName(value: string) {
  return value
    .replace(SAFE_NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function isSisCustomCreations(organizationName: string | null | undefined) {
  const name = String(organizationName ?? "").trim();
  return /sis\s*custom\s*creations/i.test(name) || /sis[-_\s]?diy/i.test(name);
}

export function isQTimeProductions(organizationName: string | null | undefined) {
  return /^qtime productions$/i.test(String(organizationName ?? "").trim());
}

export const SIS_LIONS_DEN_PREVIEW_SLUG = "sis-diy-big-complete-showcase";
export const AFE_CRM_DEMO_SLUG = "afe-crm-demo";
export const AFE_CRM_LIVE_NAME = "Atlas";

export function isQTimeWorkspaceSlug(slug: string | null | undefined) {
  return slug === "qtime-productions";
}

export function isAfeCrmDemoSlug(slug: string | null | undefined) {
  return organizationSlugsMatch(slug, AFE_CRM_DEMO_SLUG);
}

export function isAfeCrmDemoName(name?: string | null) {
  const value = String(name ?? "").trim();
  return /afe[\s_-]*crm[\s_-]*demo/i.test(value) || /atlas\s+crm\s+demo/i.test(value);
}

export function isAfeCrmDemoOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization || isSisOrganization(organization)) return false;
  return isAfeCrmDemoSlug(organization.slug) || isAfeCrmDemoName(organization.name);
}

export function isAfeClientDeskOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization?.slug) return false;
  return !isSisOrganization(organization) && !isQTimeWorkspaceSlug(organization.slug);
}

export function isSisWorkspaceSlug(slug: string | null | undefined) {
  return /sis-diy/i.test(String(slug ?? "").trim());
}

export function isSisOrganization(organization?: { name?: string | null; slug?: string | null } | null) {
  if (!organization) return false;
  return isSisCustomCreations(organization.name) || isSisWorkspaceSlug(organization.slug);
}

export function organizationSlugsMatch(
  left?: string | null,
  right?: string | null,
) {
  const a = String(left ?? "").trim().toLowerCase();
  const b = String(right ?? "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function escapeIlikeExact(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function findOrganizationByPreviewSlug<T extends { name?: string | null; slug?: string | null }>(
  slug: string,
  organizations?: T[] | null,
) {
  const requested = String(slug ?? "").trim();
  if (!requested) return undefined;

  const bySlug = organizations?.find((organization) => organizationSlugsMatch(organization.slug, requested));
  if (bySlug) return bySlug;

  if (isSisWorkspaceSlug(requested)) {
    return organizations?.find((organization) => isSisOrganization(organization));
  }

  if (isAfeCrmDemoSlug(requested)) {
    return organizations?.find((organization) => isAfeCrmDemoOrganization(organization));
  }

  return undefined;
}

export function isGuestClientPreview(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  return (
    Boolean(organization) &&
    !isSisOrganization(organization) &&
    !isAfeCrmDemoOrganization(organization)
  );
}

export function keepPrimaryOrganizationForSisRequest<T extends { name?: string | null; slug?: string | null }>(
  organization: T | null | undefined,
  previewOrgSlug?: string | null,
  workspaceSlug?: string | null,
) {
  if (!isSisLionsDenRequest(previewOrgSlug, workspaceSlug)) {
    return organization ?? undefined;
  }

  if (organization && isSisOrganization(organization)) {
    return organization;
  }

  return undefined;
}

export function resolveOperatorDeskOrganization<T extends { name?: string | null; slug?: string | null }>(input: {
  previewOrgSlug?: string | null;
  workspaceSlug?: string | null;
  previewOrganization?: T | null;
  membershipOrganizations?: Array<T | null | undefined>;
  directory?: Array<T | null | undefined> | null;
  preferAfeDemoDesk?: boolean;
}): T | undefined {
  const membershipOrganizations = (input.membershipOrganizations ?? []).filter(
    (organization): organization is T => Boolean(organization),
  );
  const directory = (input.directory ?? []).filter(
    (organization): organization is T => Boolean(organization),
  );
  const sisRequested = isSisLionsDenRequest(input.previewOrgSlug, input.workspaceSlug);
  const afeDemoRequested =
    isAfeCrmDemoSlug(input.previewOrgSlug) || isAfeCrmDemoSlug(input.workspaceSlug);

  if (sisRequested) {
    const requestedSlug = input.previewOrgSlug || input.workspaceSlug || SIS_LIONS_DEN_PREVIEW_SLUG;
    return (
      (input.previewOrganization && isSisOrganization(input.previewOrganization)
        ? input.previewOrganization
        : undefined) ??
      membershipOrganizations.find((organization) => isSisOrganization(organization)) ??
      findOrganizationByPreviewSlug(requestedSlug, directory) ??
      directory.find((organization) => isSisOrganization(organization))
    );
  }

  if (afeDemoRequested) {
    return (
      (input.previewOrganization && isAfeCrmDemoOrganization(input.previewOrganization)
        ? input.previewOrganization
        : undefined) ??
      membershipOrganizations.find((organization) => isAfeCrmDemoOrganization(organization)) ??
      findOrganizationByPreviewSlug(AFE_CRM_DEMO_SLUG, directory)
    );
  }

  if (input.previewOrganization) {
    return input.previewOrganization;
  }

  const requestedWorkspace = String(input.workspaceSlug ?? "").trim();
  if (requestedWorkspace) {
    return (
      membershipOrganizations.find((organization) =>
        organizationSlugsMatch(organization.slug, requestedWorkspace),
      ) ?? findOrganizationByPreviewSlug(requestedWorkspace, directory)
    );
  }

  const afeDeskMembership = membershipOrganizations.find((organization) =>
    isAfeClientDeskOrganization(organization),
  );
  if (afeDeskMembership) {
    return afeDeskMembership;
  }

  if (input.preferAfeDemoDesk) {
    return (
      membershipOrganizations.find((organization) => isAfeCrmDemoOrganization(organization)) ??
      findOrganizationByPreviewSlug(AFE_CRM_DEMO_SLUG, directory)
    );
  }

  return membershipOrganizations[0];
}

export function sisLionsDenPreviewHref(
  organizations?: Array<{ name?: string | null; slug?: string | null }> | null,
) {
  const matchedSlug = findOrganizationByPreviewSlug(SIS_LIONS_DEN_PREVIEW_SLUG, organizations)?.slug
    ?? organizations?.find((organization) => isSisOrganization(organization) && organization.slug)?.slug;
  return `/client?previewOrg=${encodeURIComponent(matchedSlug || SIS_LIONS_DEN_PREVIEW_SLUG)}`;
}

export function defaultLionsDenDeskHref() {
  return "/client";
}

export function afeCrmDemoPreviewHref(
  organizations?: Array<{ name?: string | null; slug?: string | null }> | null,
) {
  const matchedSlug = findOrganizationByPreviewSlug(AFE_CRM_DEMO_SLUG, organizations)?.slug;
  return `/client?previewOrg=${encodeURIComponent(matchedSlug || AFE_CRM_DEMO_SLUG)}`;
}

export function isSisLionsDenRequest(previewOrgSlug?: string | null, workspaceSlug?: string | null) {
  return isSisWorkspaceSlug(previewOrgSlug) || isSisWorkspaceSlug(workspaceSlug);
}

export function shouldShowSuperAdminCrm(_input: {
  isSuperAdmin: boolean;
  isClientPreview: boolean;
  selectedWorkspaceSlug?: string | null;
  previewOrgSlug?: string | null;
  requestedWorkspaceSlug?: string | null;
}) {
  return false;
}

export function getClientPortalName(
  organizationName: string | null | undefined,
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  const name = cleanOrganizationName(String(organizationName ?? organization?.name ?? ""));
  const resolved = organization ?? { name: organizationName };

  if (!name || isSisCustomCreations(name) || isAfeCrmDemoOrganization(resolved) || isAfeCrmDemoName(name)) {
    return "The Lion’s Den";
  }

  if (isQTimeProductions(name)) {
    return "Q’s Lion’s Den";
  }

  const identity = name.split(" ")[0] ?? name;
  return `${identity}’s Lion’s Den`;
}

export function getClientPortalOrgLabel(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (isAfeCrmDemoOrganization(organization) || isAfeCrmDemoName(organization?.name)) {
    return AFE_CRM_LIVE_NAME;
  }

  return String(organization?.name ?? "").trim();
}
