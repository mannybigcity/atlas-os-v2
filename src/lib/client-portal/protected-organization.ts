import { isSisOrganization } from "./identity.ts";

export const PROTECTED_ORGANIZATION_IDENTITY_FIELDS = [
  "name",
  "slug",
  "industry",
  "about",
  "owners",
  "owner",
  "logo",
  "profile",
] as const;

export type ProtectedOrganizationIdentityField =
  (typeof PROTECTED_ORGANIZATION_IDENTITY_FIELDS)[number];

export function isProtectedOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  return isSisOrganization(organization);
}

export function organizationIdentityPatchKeys(patch: Record<string, unknown> | null | undefined) {
  if (!patch) return [];
  return PROTECTED_ORGANIZATION_IDENTITY_FIELDS.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) return false;
    const value = patch[field];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

export function assertCanApplyOrganizationIdentityPatch(
  organization: { name?: string | null; slug?: string | null } | null | undefined,
  patch: Record<string, unknown> | null | undefined,
) {
  if (!isProtectedOrganization(organization)) {
    return;
  }

  const keys = organizationIdentityPatchKeys(patch);
  if (keys.length === 0) {
    return;
  }

  throw new Error(
    `SIS Custom Creations is a protected organization. Cannot overwrite identity fields: ${keys.join(", ")}.`,
  );
}

export function assertNotProvisioningProtectedOrganization(input: {
  name?: string | null;
  slug?: string | null;
}) {
  if (!isProtectedOrganization(input)) {
    return;
  }

  throw new Error(
    "SIS Custom Creations is a protected organization and cannot be recreated or overwritten by seed, checkout, or admin provision.",
  );
}
