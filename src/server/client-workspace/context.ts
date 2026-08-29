import type { User } from "@supabase/supabase-js";
import { isSuperAdminEmail } from "@/lib/env";
import {
  isGuestClientPreview,
  isSisWorkspaceSlug,
  keepPrimaryOrganizationForSisRequest,
  organizationSlugsMatch,
} from "@/lib/client-portal/identity";
import { requireUser } from "@/server/auth/guards";
import {
  getOrganizationBySlugForSuperAdmin,
  getUserMemberships,
  type MembershipSummary,
  type OrganizationSummary,
  type WorkspaceQueryResult,
} from "@/server/organizations/queries";

type ClientWorkspaceSearchParams = {
  previewOrg?: string;
  workspace?: string;
};

function isSafeOrganizationSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
}

export type ClientWorkspaceContext = {
  user: User;
  isSuperAdmin: boolean;
  previewOrgSlug: string;
  isClientPreview: boolean;
  memberships: WorkspaceQueryResult<MembershipSummary[]>;
  primaryMembership: MembershipSummary | undefined;
  primaryOrganization: OrganizationSummary | undefined;
  canEditBusinessProfile: boolean;
  canCreateNotes: boolean;
  previewOrganization: WorkspaceQueryResult<OrganizationSummary | null> | null;
  selectedWorkspaceSlug: string;
};

export function clientWorkspaceHref(path: string, previewOrgSlug?: string) {
  const slug = String(previewOrgSlug ?? "").trim();

  if (!slug) {
    return path;
  }

  return `${path}?previewOrg=${encodeURIComponent(slug)}`;
}

export async function getClientWorkspaceContext(
  nextPath: string,
  searchParams?: ClientWorkspaceSearchParams,
): Promise<ClientWorkspaceContext> {
  const user = await requireUser(nextPath);
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const requestedPreviewOrgSlug = isSuperAdmin
    ? String(searchParams?.previewOrg ?? "").trim().toLowerCase()
    : "";
  const requestedWorkspaceSlug = isSafeOrganizationSlug(String(searchParams?.workspace ?? "").trim().toLowerCase())
    ? String(searchParams?.workspace ?? "").trim().toLowerCase()
    : "";
  const previewOrgSlug = isSafeOrganizationSlug(requestedPreviewOrgSlug)
    ? requestedPreviewOrgSlug
    : isSuperAdmin && isSisWorkspaceSlug(requestedWorkspaceSlug)
      ? requestedWorkspaceSlug
      : "";
  const previewOrganization = previewOrgSlug
    ? await getOrganizationBySlugForSuperAdmin(previewOrgSlug)
    : null;
  const personalMemberships = await getUserMemberships(user.id);
  const loadedPreviewOrganization =
    previewOrganization && !previewOrganization.setupRequired
      ? previewOrganization.data
      : null;
  const resolvedPreviewOrgSlug = loadedPreviewOrganization?.slug?.trim() || previewOrgSlug;
  const isOperatingPreviewOrganization = Boolean(loadedPreviewOrganization);
  const isClientPreview = isGuestClientPreview(loadedPreviewOrganization);
  const memberships: WorkspaceQueryResult<MembershipSummary[]> = isOperatingPreviewOrganization
    ? {
        data: [
          {
            id: `preview-${loadedPreviewOrganization?.id}`,
            role: "owner",
            organization: loadedPreviewOrganization,
          },
        ],
        setupRequired: false,
        error: null,
      }
    : personalMemberships;
  const primaryMembership = (requestedWorkspaceSlug
    ? memberships.data.find((membership) =>
        organizationSlugsMatch(membership.organization?.slug, requestedWorkspaceSlug),
      )
    : undefined) ?? memberships.data.find((membership) => membership.organization);
  const primaryOrganization = keepPrimaryOrganizationForSisRequest(
    primaryMembership?.organization,
    resolvedPreviewOrgSlug,
    requestedWorkspaceSlug,
  );
  const canEditBusinessProfile =
    Boolean(primaryOrganization) &&
    !isClientPreview &&
    (primaryMembership?.role === "owner" || primaryMembership?.role === "admin");

  return {
    user,
    isSuperAdmin,
    previewOrgSlug: resolvedPreviewOrgSlug,
    isClientPreview,
    memberships,
    primaryMembership: primaryOrganization ? primaryMembership : undefined,
    primaryOrganization,
    canEditBusinessProfile,
    canCreateNotes: Boolean(primaryOrganization) && !isClientPreview,
    previewOrganization,
    selectedWorkspaceSlug: primaryOrganization?.slug ?? "",
  };
}
