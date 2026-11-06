import { isGuestClientPreview, organizationSlugsMatch } from "../../lib/client-portal/identity.ts";

export type BookkeepingDeskRef = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

export type BookkeepingMembershipRef = {
  id?: string | null;
  role?: string | null;
  organization?: { id?: string | null } | null;
};

export type BookkeepingStripeAccessInput = {
  /** Omit to mean bookkeeping is already enabled. */
  enabled?: boolean;
  organization?: BookkeepingDeskRef | null;
  memberships?: BookkeepingMembershipRef[] | null;
  clientView?: boolean;
  /** Expired trial desks stay read-only. Operator, SIS, and the sample desk ignore this. */
  readOnly?: boolean;
  /**
   * previewOrg that actually selected this screen.
   * A customer or trial slug here is a preview and cannot connect.
   * A slug for a different desk is refused so Stripe is not attached to Lion's Den instead.
   */
  requestedPreviewOrgSlug?: string | null;
  /** Organization id posted with the action. It must be the resolved desk. */
  postedOrganizationId?: string | null;
};

export type BookkeepingStripeAccess = {
  viewerMode: boolean;
  canManage: boolean;
  organizationId: string | null;
};

const OPERATOR_PIN_PREFIX = "operator-";

const refused: BookkeepingStripeAccess = {
  viewerMode: true,
  canManage: false,
  organizationId: null,
};

export function bookkeepingRequestedPreviewSlug(input: {
  isSuperAdmin: boolean;
  previewOrg?: string | null;
}) {
  if (!input.isSuperAdmin) return "";
  return String(input.previewOrg ?? "").trim();
}

export function isOperatorPinnedMembership(membershipId?: string | null) {
  return String(membershipId ?? "").startsWith(OPERATOR_PIN_PREFIX);
}

function isManagerRole(role?: string | null) {
  return role === "owner" || role === "admin";
}

function membershipForOrganization(
  memberships: BookkeepingMembershipRef[] | null | undefined,
  organizationId: string,
) {
  if (!organizationId) return undefined;
  return memberships?.find((membership) => membership.organization?.id === organizationId);
}

function isRealManager(membership: BookkeepingMembershipRef | undefined) {
  return Boolean(
    membership &&
      isManagerRole(membership.role) &&
      membership.id &&
      !isOperatorPinnedMembership(membership.id),
  );
}

/**
 * Bookkeeping viewer mode is a preview of somebody else's customer desk.
 * It is not "this organization is a trial or customer."
 * Owners and admins of the desk they are actually using can connect Stripe.
 */
export function bookkeepingStripeAccess(input: BookkeepingStripeAccessInput): BookkeepingStripeAccess {
  const organization = input.organization ?? null;
  const enabled = input.enabled !== false;
  const organizationId = String(organization?.id ?? "").trim();
  const previewSlug = String(input.requestedPreviewOrgSlug ?? "").trim();
  const postedOrganizationId = String(input.postedOrganizationId ?? "").trim();

  if (input.clientView) return refused;

  if (previewSlug && !organizationSlugsMatch(previewSlug, organization?.slug)) {
    return refused;
  }

  if (postedOrganizationId && postedOrganizationId !== organizationId) {
    return refused;
  }

  const guestDesk = isGuestClientPreview(organization);
  const membership = membershipForOrganization(input.memberships, organizationId);

  if (guestDesk && previewSlug && organizationSlugsMatch(previewSlug, organization?.slug)) {
    return refused;
  }

  if (guestDesk && input.readOnly) {
    return refused;
  }

  if (guestDesk) {
    const canManage = enabled && isRealManager(membership);
    return {
      viewerMode: !isRealManager(membership),
      canManage,
      organizationId: canManage ? organizationId : null,
    };
  }

  const canManage = enabled && Boolean(organizationId) && isManagerRole(membership?.role);
  return {
    viewerMode: false,
    canManage,
    organizationId: canManage ? organizationId : null,
  };
}
