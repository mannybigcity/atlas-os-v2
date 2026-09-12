import { isSisOrganization } from "../client-portal/identity.ts";

export type ExpiredTrialAccess = "open" | "readOnly";

export type ExpiredTrialOrganization = {
  name?: string | null;
  slug?: string | null;
} | null;

export type ExpiredTrialAccessInput = {
  trialEndsAt?: string | null;
  hasActivePaidEntitlement: boolean;
  organization?: ExpiredTrialOrganization;
  now?: number;
};

function trialHasEnded(trialEndsAt: string, now: number) {
  const endsAt = new Date(trialEndsAt).getTime();
  return Number.isFinite(endsAt) && endsAt <= now;
}

export function decideExpiredTrialAccess(input: ExpiredTrialAccessInput): ExpiredTrialAccess {
  if (isSisOrganization(input.organization)) return "open";
  if (input.hasActivePaidEntitlement) return "open";
  if (!input.trialEndsAt) return "open";
  if (trialHasEnded(input.trialEndsAt, input.now ?? Date.now())) return "readOnly";
  return "open";
}

export function shouldRedirectExpiredTrialToPricing(
  input: ExpiredTrialAccessInput & { forSettingsBilling?: boolean },
) {
  if (isSisOrganization(input.organization)) return false;
  if (input.forSettingsBilling !== true) return false;
  return decideExpiredTrialAccess(input) === "readOnly";
}
