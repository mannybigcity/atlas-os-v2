import { trialDaysRemaining } from "./trial-inbox.ts";

export type DeskTrialStatus = {
  endsAt: string;
  daysRemaining: number;
  /** Two days or fewer left: the header pill turns urgent. */
  endingSoon: boolean;
  expired: boolean;
};

export const TRIAL_UPGRADE_HREF = "/pricing?from=desk#plans";

export function describeDeskTrial(input: {
  trialEndsAt?: string | null;
  hasActivePaidEntitlement: boolean;
  now?: Date;
}): DeskTrialStatus | null {
  if (input.hasActivePaidEntitlement) return null;
  const endsAt = String(input.trialEndsAt ?? "").trim();
  if (!endsAt) return null;
  const now = input.now ?? new Date();
  const daysRemaining = trialDaysRemaining(endsAt, now);
  const endsMs = new Date(endsAt).getTime();
  const expired = Number.isFinite(endsMs) ? endsMs <= now.getTime() : false;
  return {
    endsAt,
    daysRemaining,
    endingSoon: !expired && daysRemaining <= 2,
    expired,
  };
}

export function trialPillCopy(status: DeskTrialStatus, spanish: boolean) {
  if (status.expired) {
    return {
      label: spanish ? "Prueba terminada" : "Trial ended",
      action: spanish ? "Elegir plan" : "Choose a plan",
    };
  }
  const days = status.daysRemaining;
  if (spanish) {
    return {
      label: days === 1 ? "Último día de prueba" : `${days} días de prueba`,
      action: "Mejorar plan",
    };
  }
  return {
    label: days === 1 ? "Last day of trial" : `${days} days left in trial`,
    action: "Upgrade",
  };
}
