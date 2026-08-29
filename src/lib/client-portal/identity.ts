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

export function sisLionsDenPreviewHref(
  organizations?: Array<{ name?: string | null; slug?: string | null }> | null,
) {
  const matchedSlug = organizations?.find((organization) => isSisOrganization(organization) && organization.slug)?.slug;
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
