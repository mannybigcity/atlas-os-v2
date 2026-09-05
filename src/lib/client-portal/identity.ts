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
export const SIS_WORKING_ORG_NAME = "SIS Custom Creations";
export const AFE_CRM_DEMO_SLUG = "afe-crm-demo";
export const AFE_OPERATOR_DESK_SLUG = "atlas-for-entrepreneurs";
export const AFE_OPERATOR_DESK_NAME = "Atlas For Entrepreneurs";
export const AFE_CRM_LIVE_NAME = "Atlas";
export const SAMPLE_DESK_DISPLAY_NAME = "Sample desk";
export const SAMPLE_DESK_LOGIN_EMAIL = "atlasforentrepreneurs+demo@gmail.com";
export const FOUNDER_MAILBOX_EMAIL = "atlasforentrepreneurs@gmail.com";
// Plus-address login only. Mail arrives at FOUNDER_MAILBOX_EMAIL.
// Never attach the sample org to the founder mailbox itself.
// Never use an @atlasforentrepreneurs.com mailbox as the sample login.

export function normalizeLoginEmail(email?: string | null) {
  return String(email ?? "").trim().toLowerCase();
}

export function isFounderMailboxEmail(email?: string | null) {
  return normalizeLoginEmail(email) === FOUNDER_MAILBOX_EMAIL;
}

export function isForbiddenSampleDeskLoginEmail(email?: string | null) {
  const value = normalizeLoginEmail(email);
  if (!value) return true;
  if (isFounderMailboxEmail(value)) return true;
  return value.endsWith("@atlasforentrepreneurs.com");
}

export function resolvedSampleDeskLoginEmail(configuredEmail?: string | null) {
  const configured = normalizeLoginEmail(configuredEmail);
  if (configured && !isForbiddenSampleDeskLoginEmail(configured)) {
    return configured;
  }
  return SAMPLE_DESK_LOGIN_EMAIL;
}

export function isSampleDeskLoginEmail(
  email?: string | null,
  configuredEmail?: string | null,
) {
  const value = normalizeLoginEmail(email);
  if (!value || isForbiddenSampleDeskLoginEmail(value)) return false;
  return value === resolvedSampleDeskLoginEmail(configuredEmail);
}

export function canSeeSampleDesk(
  email?: string | null,
  configuredEmail?: string | null,
) {
  return isSampleDeskLoginEmail(email, configuredEmail);
}

export function organizationsVisibleToActor<T extends { name?: string | null; slug?: string | null }>(
  organizations: Array<T | null | undefined>,
  canSeeSample: boolean,
): T[] {
  const rows = organizations.filter((organization): organization is T => Boolean(organization));
  if (canSeeSample) {
    return rows.filter((organization) => isAfeCrmDemoOrganization(organization));
  }
  return rows.filter((organization) => !isAfeCrmDemoOrganization(organization));
}

export function isQTimeWorkspaceSlug(slug: string | null | undefined) {
  return slug === "qtime-productions";
}

export function isAfeCrmDemoSlug(slug: string | null | undefined) {
  return organizationSlugsMatch(slug, AFE_CRM_DEMO_SLUG);
}

export function isAfeCrmDemoName(name?: string | null) {
  const value = String(name ?? "").trim();
  return (
    /^sample\s+desk$/i.test(value) ||
    /afe[\s_-]*crm[\s_-]*demo/i.test(value) ||
    /atlas\s+crm\s+demo/i.test(value)
  );
}

export function isAfeCrmDemoOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization || isSisOrganization(organization)) return false;
  return isAfeCrmDemoSlug(organization.slug) || isAfeCrmDemoName(organization.name);
}

export function isAfeOperatorDeskSlug(slug: string | null | undefined) {
  return organizationSlugsMatch(slug, AFE_OPERATOR_DESK_SLUG);
}

export function isAfeOperatorDeskName(name?: string | null) {
  return /^atlas\s+for\s+entrepreneurs$/i.test(String(name ?? "").trim());
}

export function isAfeOperatorDeskOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization || isSisOrganization(organization) || isAfeCrmDemoOrganization(organization)) {
    return false;
  }
  if (isQTimeWorkspaceSlug(organization.slug)) return false;
  return isAfeOperatorDeskSlug(organization.slug) || isAfeOperatorDeskName(organization.name);
}

export function isAfeClientDeskOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization?.slug) return false;
  if (isAfeCrmDemoOrganization(organization) || isSisOrganization(organization)) return false;
  if (isQTimeWorkspaceSlug(organization.slug)) return false;
  return true;
}

export function pickAfeOperatorDesk<T extends { name?: string | null; slug?: string | null }>(
  organizations?: Array<T | null | undefined> | null,
) {
  return (organizations ?? []).find((organization): organization is T =>
    Boolean(organization && isAfeOperatorDeskOrganization(organization)),
  );
}

export function canEnsureAfeOperatorDesk(
  email?: string | null,
  configuredDemoEmail?: string | null,
  isSuperAdmin = false,
) {
  if (canSeeSampleDesk(email, configuredDemoEmail)) return false;
  if (isFounderMailboxEmail(email)) return false;
  return isSuperAdmin;
}

export function canEnsureSisWorkingOrg(
  email?: string | null,
  configuredDemoEmail?: string | null,
) {
  if (canSeeSampleDesk(email, configuredDemoEmail)) return false;
  return isFounderMailboxEmail(email);
}

export function shouldOpenSisWorkingDesk(input: {
  seesSampleDesk?: boolean;
  isFounderMailbox?: boolean;
}) {
  if (input.seesSampleDesk) return false;
  return Boolean(input.isFounderMailbox);
}

export function shouldOpenAfeOperatorDesk(input: {
  seesSampleDesk?: boolean;
  sisRequested?: boolean;
  hasPreviewOrganization?: boolean;
  requestedWorkspaceSlug?: string | null;
}) {
  if (input.seesSampleDesk) return false;
  if (input.sisRequested) return false;
  if (input.hasPreviewOrganization) return false;
  const requestedWorkspace = String(input.requestedWorkspaceSlug ?? "").trim();
  if (requestedWorkspace && !isAfeOperatorDeskSlug(requestedWorkspace) && !isAfeCrmDemoSlug(requestedWorkspace)) {
    return false;
  }
  return true;
}

export function isSampleDeskPreviewRequest(
  previewOrgSlug?: string | null,
  workspaceSlug?: string | null,
) {
  return isAfeCrmDemoSlug(previewOrgSlug) || isAfeCrmDemoSlug(workspaceSlug);
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

  if (isAfeOperatorDeskSlug(requested)) {
    return organizations?.find((organization) => isAfeOperatorDeskOrganization(organization));
  }

  return undefined;
}

export function isGuestClientPreview(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  return (
    Boolean(organization) &&
    !isSisOrganization(organization) &&
    !isAfeCrmDemoOrganization(organization) &&
    !isAfeOperatorDeskOrganization(organization)
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
  allowSampleDesk?: boolean;
  preferSisWorkingDesk?: boolean;
}): T | undefined {
  const allowSampleDesk = Boolean(input.allowSampleDesk);
  const membershipOrganizations = organizationsVisibleToActor(
    input.membershipOrganizations ?? [],
    allowSampleDesk,
  );
  const directory = organizationsVisibleToActor(input.directory ?? [], allowSampleDesk);
  const previewOrganization =
    input.previewOrganization &&
    (allowSampleDesk
      ? isAfeCrmDemoOrganization(input.previewOrganization)
      : !isAfeCrmDemoOrganization(input.previewOrganization))
      ? input.previewOrganization
      : null;
  const sisRequested = isSisLionsDenRequest(input.previewOrgSlug, input.workspaceSlug);
  const preferSisWorkingDesk = Boolean(input.preferSisWorkingDesk) && !allowSampleDesk;

  if (allowSampleDesk) {
    return (
      membershipOrganizations.find((organization) => isAfeCrmDemoOrganization(organization)) ??
      (previewOrganization && isAfeCrmDemoOrganization(previewOrganization)
        ? previewOrganization
        : undefined) ??
      findOrganizationByPreviewSlug(AFE_CRM_DEMO_SLUG, directory)
    );
  }

  if (preferSisWorkingDesk || sisRequested) {
    const requestedSlug = input.previewOrgSlug || input.workspaceSlug || SIS_LIONS_DEN_PREVIEW_SLUG;
    return (
      (previewOrganization && isSisOrganization(previewOrganization)
        ? previewOrganization
        : undefined) ??
      membershipOrganizations.find((organization) => isSisOrganization(organization)) ??
      findOrganizationByPreviewSlug(requestedSlug, directory) ??
      directory.find((organization) => isSisOrganization(organization))
    );
  }

  if (previewOrganization) {
    return previewOrganization;
  }

  const requestedWorkspace = String(input.workspaceSlug ?? "").trim();
  if (requestedWorkspace && !isAfeCrmDemoSlug(requestedWorkspace)) {
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

  const operatorDesk =
    membershipOrganizations.find((organization) => isAfeOperatorDeskOrganization(organization)) ??
    pickAfeOperatorDesk(directory) ??
    findOrganizationByPreviewSlug(AFE_OPERATOR_DESK_SLUG, directory);
  if (operatorDesk && !isAfeCrmDemoOrganization(operatorDesk)) {
    return operatorDesk;
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
  _organizations?: Array<{ name?: string | null; slug?: string | null }> | null,
) {
  return "/login";
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

  if (
    !name ||
    isSisCustomCreations(name) ||
    isAfeCrmDemoName(name) ||
    isAfeOperatorDeskName(name) ||
    isAfeCrmDemoOrganization(resolved) ||
    isAfeOperatorDeskOrganization(resolved)
  ) {
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
    return SAMPLE_DESK_DISPLAY_NAME;
  }

  if (isAfeOperatorDeskOrganization(organization) || isAfeOperatorDeskName(organization?.name)) {
    return AFE_OPERATOR_DESK_NAME;
  }

  const name = String(organization?.name ?? "").trim();
  if (isAfeClientDeskOrganization(organization) && /\bdemo\b/i.test(name)) {
    return AFE_CRM_LIVE_NAME;
  }

  return name;
}
