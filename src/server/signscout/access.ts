import { isAfeOperatorDeskOrganization, isSisOrganization } from "../../lib/client-portal/identity.ts";

export function canManageSignScoutTokens(input: {
  organization?: { name?: string | null; slug?: string | null } | null;
  isSuperAdmin: boolean;
  isClientPreview: boolean;
  role?: string | null;
}) {
  if (input.isClientPreview) return false;
  if (!input.organization || isSisOrganization(input.organization)) return false;
  if (!isAfeOperatorDeskOrganization(input.organization)) return false;
  if (input.isSuperAdmin) return true;
  return input.role === "owner" || input.role === "admin";
}
