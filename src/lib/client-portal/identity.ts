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

export function isQTimeWorkspaceSlug(slug: string | null | undefined) {
  return slug === "qtime-productions";
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

  return undefined;
}

export function isGuestClientPreview(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  return Boolean(organization) && !isSisOrganization(organization);
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
}): T | undefined {
  const membershipOrganizations = (input.membershipOrganizations ?? []).filter(
    (organization): organization is T => Boolean(organization),
  );
  const directory = (input.directory ?? []).filter(
    (organization): organization is T => Boolean(organization),
  );
  const sisRequested = isSisLionsDenRequest(input.previewOrgSlug, input.workspaceSlug);

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

  return membershipOrganizations[0];
}

export function sisLionsDenPreviewHref(
  organizations?: Array<{ name?: string | null; slug?: string | null }> | null,
) {
  const matchedSlug = findOrganizationByPreviewSlug(SIS_LIONS_DEN_PREVIEW_SLUG, organizations)?.slug
    ?? organizations?.find((organization) => isSisOrganization(organization) && organization.slug)?.slug;
  return `/client?previewOrg=${encodeURIComponent(matchedSlug || SIS_LIONS_DEN_PREVIEW_SLUG)}`;
}

export function isSisLionsDenRequest(previewOrgSlug?: string | null, workspaceSlug?: string | null) {
  return isSisWorkspaceSlug(previewOrgSlug) || isSisWorkspaceSlug(workspaceSlug);
}

export function shouldShowSuperAdminCrm({
  isSuperAdmin,
  isClientPreview,
  selectedWorkspaceSlug,
  previewOrgSlug,
  requestedWorkspaceSlug,
}: {
  isSuperAdmin: boolean;
  isClientPreview: boolean;
  selectedWorkspaceSlug?: string | null;
  previewOrgSlug?: string | null;
  requestedWorkspaceSlug?: string | null;
}) {
  if (!isSuperAdmin || isClientPreview || selectedWorkspaceSlug) {
    return false;
  }

  return !isSisLionsDenRequest(previewOrgSlug, requestedWorkspaceSlug);
}

export function getClientPortalName(organizationName: string | null | undefined) {
  const name = cleanOrganizationName(String(organizationName ?? ""));

  if (!name || isSisCustomCreations(name)) {
    return "The Lion’s Den";
  }

  if (isQTimeProductions(name)) {
    return "Q’s Lion’s Den";
  }

  const identity = name.split(" ")[0] ?? name;
  return `${identity}’s Lion’s Den`;
}
