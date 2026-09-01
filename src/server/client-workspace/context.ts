import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import {
  AFE_CRM_DEMO_SLUG,
  isAfeClientDeskOrganization,
  isGuestClientPreview,
  isSisLionsDenRequest,
  isSisOrganization,
  isSisWorkspaceSlug,
  organizationSlugsMatch,
  resolveOperatorDeskOrganization,
} from "@/lib/client-portal/identity";
import { requireUser } from "@/server/auth/guards";
import { getTrialProfile } from "@/server/trials/profile";
import {
  getOrganizationBySlugForSuperAdmin,
  getUserMemberships,
  listOrganizationsForOperator,
  type MembershipSummary,
  type OrganizationSummary,
  type WorkspaceQueryResult,
} from "@/server/organizations/queries";

type ClientWorkspaceSearchParams = {
  previewOrg?: string;
  workspace?: string;
};

function isSafeOrganizationSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value) && value.length <= 80;
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
  let trialProfile = null;
  try {
    trialProfile = await getTrialProfile(user.id);
  } catch (error) {
    console.error("Atlas trial profile guard failed", error);
  }
  if (trialProfile) {
    redirect("/starter");
  }
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const personalMemberships = await getUserMemberships(user.id);
  const membershipOrganizations = personalMemberships.data.map(
    (membership) => membership.organization,
  );
  const hasAfeDeskMembership = membershipOrganizations.some((organization) =>
    isAfeClientDeskOrganization(organization),
  );
  const requestedPreviewOrgSlug = isSuperAdmin
    ? String(searchParams?.previewOrg ?? "").trim().toLowerCase()
    : "";
  const requestedWorkspaceSlug = isSafeOrganizationSlug(String(searchParams?.workspace ?? "").trim())
    ? String(searchParams?.workspace ?? "").trim().toLowerCase()
    : "";
  let previewOrgSlug = isSafeOrganizationSlug(requestedPreviewOrgSlug)
    ? requestedPreviewOrgSlug
    : isSuperAdmin && isSisWorkspaceSlug(requestedWorkspaceSlug)
      ? requestedWorkspaceSlug
      : "";
  const preferAfeDemoDesk =
    isSuperAdmin &&
    !previewOrgSlug &&
    !requestedWorkspaceSlug &&
    !hasAfeDeskMembership;
  if (preferAfeDemoDesk) {
    previewOrgSlug = AFE_CRM_DEMO_SLUG;
  }
  const previewOrganization = previewOrgSlug
    ? await getOrganizationBySlugForSuperAdmin(previewOrgSlug)
    : null;
  const loadedPreviewOrganization =
    previewOrganization && !previewOrganization.setupRequired
      ? previewOrganization.data
      : null;
  const sisRequested = isSisLionsDenRequest(
    loadedPreviewOrganization?.slug || previewOrgSlug,
    requestedWorkspaceSlug,
  );
  const needsDirectory =
    isSuperAdmin &&
    sisRequested &&
    !isSisOrganization(loadedPreviewOrganization);
  const directory = needsDirectory ? await listOrganizationsForOperator() : [];
  const primaryOrganization = resolveOperatorDeskOrganization({
    previewOrgSlug: loadedPreviewOrganization?.slug || previewOrgSlug,
    workspaceSlug: requestedWorkspaceSlug,
    previewOrganization: loadedPreviewOrganization,
    membershipOrganizations,
    directory,
    preferAfeDemoDesk,
  });
  const resolvedPreviewOrgSlug =
    primaryOrganization?.slug?.trim() ||
    loadedPreviewOrganization?.slug?.trim() ||
    previewOrgSlug;
  const isClientPreview = isGuestClientPreview(primaryOrganization);
  const existingMembership = primaryOrganization
    ? personalMemberships.data.find((membership) => membership.organization?.id === primaryOrganization.id)
    : undefined;
  const shouldPinResolvedOrganization =
    Boolean(primaryOrganization) &&
    (Boolean(loadedPreviewOrganization) || (sisRequested && isSuperAdmin));
  const memberships: WorkspaceQueryResult<MembershipSummary[]> = shouldPinResolvedOrganization
    ? {
        data: [
          existingMembership ?? {
            id: `operator-${primaryOrganization!.id}`,
            role: "owner",
            organization: primaryOrganization!,
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
  const canEditBusinessProfile =
    Boolean(primaryOrganization) &&
    !isClientPreview &&
    (primaryMembership?.role === "owner" || primaryMembership?.role === "admin" || isSuperAdmin);

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
    previewOrganization:
      previewOrganization &&
      !previewOrganization.data &&
      primaryOrganization &&
      isSisOrganization(primaryOrganization)
        ? { data: primaryOrganization, setupRequired: false, error: null }
        : previewOrganization,
    selectedWorkspaceSlug: primaryOrganization?.slug ?? "",
  };
}
