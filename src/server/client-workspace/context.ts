import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getConfiguredDemoLoginEmail, isSuperAdminEmail } from "@/lib/env";
import {
  canSeeSampleDesk,
  isAfeCrmDemoOrganization,
  isGuestClientPreview,
  isSampleDeskPreviewRequest,
  isSisLionsDenRequest,
  isSisOrganization,
  isSisWorkspaceSlug,
  organizationSlugsMatch,
  organizationsVisibleToActor,
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

  if (!slug || isSampleDeskPreviewRequest(slug)) {
    return path;
  }

  return `${path}?previewOrg=${encodeURIComponent(slug)}`;
}

function membershipsForOrganizations(
  memberships: MembershipSummary[],
  organizations: OrganizationSummary[],
): MembershipSummary[] {
  return organizations.map((organization) => {
    const existing = memberships.find((membership) => membership.organization?.id === organization.id);
    return (
      existing ?? {
        id: `operator-${organization.id}`,
        role: "owner",
        organization,
      }
    );
  });
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
  const seesSampleDesk = canSeeSampleDesk(user.email, getConfiguredDemoLoginEmail());
  const personalMemberships = await getUserMemberships(user.id);
  const visibleOrganizations = organizationsVisibleToActor(
    personalMemberships.data.map((membership) => membership.organization),
    seesSampleDesk,
  );
  const visibleMemberships = personalMemberships.data.filter((membership) =>
    visibleOrganizations.some((organization) => organization.id === membership.organization?.id),
  );
  const requestedPreviewOrgSlug = isSuperAdmin
    ? String(searchParams?.previewOrg ?? "").trim().toLowerCase()
    : "";
  const requestedWorkspaceSlug = isSafeOrganizationSlug(String(searchParams?.workspace ?? "").trim())
    ? String(searchParams?.workspace ?? "").trim().toLowerCase()
    : "";
  const samplePreviewBlocked =
    !seesSampleDesk && isSampleDeskPreviewRequest(requestedPreviewOrgSlug, requestedWorkspaceSlug);
  let previewOrgSlug =
    isSafeOrganizationSlug(requestedPreviewOrgSlug) && !samplePreviewBlocked
      ? requestedPreviewOrgSlug
      : isSuperAdmin && isSisWorkspaceSlug(requestedWorkspaceSlug)
        ? requestedWorkspaceSlug
        : "";
  if (isSampleDeskPreviewRequest(previewOrgSlug) && !seesSampleDesk) {
    previewOrgSlug = "";
  }
  let previewOrganization = previewOrgSlug
    ? await getOrganizationBySlugForSuperAdmin(previewOrgSlug)
    : null;
  let loadedPreviewOrganization =
    previewOrganization && !previewOrganization.setupRequired
      ? previewOrganization.data
      : null;
  if (loadedPreviewOrganization && isAfeCrmDemoOrganization(loadedPreviewOrganization) && !seesSampleDesk) {
    loadedPreviewOrganization = null;
    previewOrganization = null;
    previewOrgSlug = "";
  }
  const sisRequested = isSisLionsDenRequest(
    loadedPreviewOrganization?.slug || previewOrgSlug,
    requestedWorkspaceSlug,
  );
  const needsDirectory =
    isSuperAdmin &&
    !seesSampleDesk &&
    sisRequested &&
    !isSisOrganization(loadedPreviewOrganization);
  const directory = organizationsVisibleToActor(
    needsDirectory ? await listOrganizationsForOperator() : [],
    false,
  );
  const primaryOrganization = resolveOperatorDeskOrganization({
    previewOrgSlug: loadedPreviewOrganization?.slug || previewOrgSlug,
    workspaceSlug: requestedWorkspaceSlug,
    previewOrganization: loadedPreviewOrganization,
    membershipOrganizations: visibleOrganizations,
    directory,
    allowSampleDesk: seesSampleDesk,
  });
  const resolvedPreviewOrgSlug =
    seesSampleDesk || isAfeCrmDemoOrganization(primaryOrganization)
      ? ""
      : primaryOrganization?.slug?.trim() ||
        loadedPreviewOrganization?.slug?.trim() ||
        previewOrgSlug;
  const isClientPreview = isGuestClientPreview(primaryOrganization);
  const shouldPinResolvedOrganization =
    Boolean(primaryOrganization) &&
    isSuperAdmin &&
    !seesSampleDesk &&
    !isAfeCrmDemoOrganization(primaryOrganization) &&
    (Boolean(loadedPreviewOrganization) || sisRequested);
  const memberships: WorkspaceQueryResult<MembershipSummary[]> = shouldPinResolvedOrganization
    ? {
        data: membershipsForOrganizations(visibleMemberships, [primaryOrganization!]),
        setupRequired: false,
        error: null,
      }
    : personalMemberships.setupRequired
      ? {
          data: visibleMemberships,
          setupRequired: true,
          error: personalMemberships.error,
        }
      : {
          data: visibleMemberships,
          setupRequired: false,
          error: null,
        };
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
    previewOrgSlug: isAfeCrmDemoOrganization(primaryOrganization) ? "" : resolvedPreviewOrgSlug,
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
