import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getConfiguredDemoLoginEmail, isSuperAdminEmail } from "@/lib/env";
import {
  canSeeSampleDesk,
  isAfeClientDeskOrganization,
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isFounderMailboxEmail,
  isGuestClientPreview,
  isSampleDeskPreviewRequest,
  isSisLionsDenRequest,
  isSisOrganization,
  isSisWorkspaceSlug,
  organizationSlugsMatch,
  organizationsVisibleToActor,
  resolveOperatorDeskOrganization,
  shouldOpenAfeOperatorDesk,
  shouldOpenSisWorkingDesk,
} from "@/lib/client-portal/identity";
import { requireUser } from "@/server/auth/guards";
import { getTrialProfile } from "@/server/trials/profile";
import { isTrialSignupMetadata } from "@/server/trials/metadata";
import {
  ensureTrialAccountForUser,
  ensureTrialWorkspaceForUser,
} from "@/server/trials/provision";
import {
  isTrialWorkspaceSetupError,
  trialWorkspaceSetupHref,
} from "@/server/trials/workspace-redirect";
import { ensureAfeOperatorDeskAccess } from "@/server/organizations/afe-operator-desk";
import { ensureSisWorkingOrgAccess } from "@/server/organizations/sis-working-org";
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
  error?: string;
  reason?: string;
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

  if (!trialProfile && isTrialSignupMetadata(user.user_metadata)) {
    const provision = await ensureTrialAccountForUser(user.id, user.user_metadata, user.email);
    if (!provision.ok) {
      redirect("/start-trial?error=profile_setup");
    }
    trialProfile = await getTrialProfile(user.id);
  }

  if (trialProfile) {
    if (new Date(trialProfile.trial_ends_at).getTime() <= Date.now()) {
      redirect("/pricing?trial=expired");
    }

    if (!isTrialWorkspaceSetupError(searchParams?.error)) {
      const workspace = await ensureTrialWorkspaceForUser({
        userId: user.id,
        businessName: trialProfile.business_name,
        email: user.email ?? "",
      });

      if (!workspace.ok) {
        redirect(trialWorkspaceSetupHref(workspace.error));
      }
    }
  }
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const seesSampleDesk = canSeeSampleDesk(user.email, getConfiguredDemoLoginEmail());
  const founderMailbox = isFounderMailboxEmail(user.email);
  const canUseOperatorDesk = isSuperAdmin || founderMailbox;
  const wantsSisWorkingDesk = shouldOpenSisWorkingDesk({
    seesSampleDesk,
    isFounderMailbox: founderMailbox,
  });
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
  const needsOperatorDesk =
    canUseOperatorDesk &&
    !wantsSisWorkingDesk &&
    shouldOpenAfeOperatorDesk({
      seesSampleDesk,
      sisRequested,
      hasPreviewOrganization: Boolean(loadedPreviewOrganization),
      requestedWorkspaceSlug,
    }) &&
    !visibleOrganizations.some((organization) => isAfeClientDeskOrganization(organization));
  const needsDirectory =
    !seesSampleDesk &&
    (wantsSisWorkingDesk ||
      (isSuperAdmin &&
        ((sisRequested && !isSisOrganization(loadedPreviewOrganization)) || needsOperatorDesk)));
  const directory = organizationsVisibleToActor(
    needsDirectory ? await listOrganizationsForOperator() : [],
    false,
  );
  let primaryOrganization = resolveOperatorDeskOrganization({
    previewOrgSlug: loadedPreviewOrganization?.slug || previewOrgSlug,
    workspaceSlug: requestedWorkspaceSlug,
    previewOrganization: loadedPreviewOrganization,
    membershipOrganizations: visibleOrganizations,
    directory,
    allowSampleDesk: seesSampleDesk,
    preferSisWorkingDesk: wantsSisWorkingDesk,
  });
  if (wantsSisWorkingDesk) {
    try {
      const sisDesk = await ensureSisWorkingOrgAccess(user.id, user.email);
      if (sisDesk && isSisOrganization(sisDesk) && !isAfeCrmDemoOrganization(sisDesk)) {
        primaryOrganization = sisDesk;
      }
    } catch (error) {
      console.error("SIS working org ensure failed", error);
    }
  }
  if (
    !wantsSisWorkingDesk &&
    needsOperatorDesk &&
    (!primaryOrganization || !isAfeClientDeskOrganization(primaryOrganization))
  ) {
    try {
      const operatorDesk = await ensureAfeOperatorDeskAccess(user.id, user.email);
      if (operatorDesk && isAfeOperatorDeskOrganization(operatorDesk) && !isAfeCrmDemoOrganization(operatorDesk)) {
        primaryOrganization = operatorDesk;
      }
    } catch (error) {
      console.error("Atlas operator desk ensure failed", error);
    }
  }
  if (primaryOrganization && isAfeCrmDemoOrganization(primaryOrganization) && !seesSampleDesk) {
    primaryOrganization = undefined;
  }
  const resolvedPreviewOrgSlug =
    seesSampleDesk || isAfeCrmDemoOrganization(primaryOrganization)
      ? ""
      : primaryOrganization?.slug?.trim() ||
        loadedPreviewOrganization?.slug?.trim() ||
        previewOrgSlug;
  const isClientPreview = isGuestClientPreview(primaryOrganization);
  const shouldPinResolvedOrganization =
    Boolean(primaryOrganization) &&
    canUseOperatorDesk &&
    !seesSampleDesk &&
    !isAfeCrmDemoOrganization(primaryOrganization) &&
    (Boolean(loadedPreviewOrganization) ||
      sisRequested ||
      wantsSisWorkingDesk ||
      isSisOrganization(primaryOrganization) ||
      isAfeOperatorDeskOrganization(primaryOrganization));
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
    (primaryMembership?.role === "owner" ||
      primaryMembership?.role === "admin" ||
      isSuperAdmin ||
      canUseOperatorDesk);

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
