export const TRIAL_WORKSPACE_SETUP_ERROR = "workspace_setup";

export type TrialWorkspaceSetupReason =
  | "lookup_failed"
  | "create_failed"
  | "membership_failed"
  | "missing_identity";

export function trialWorkspaceSetupHref(reason: TrialWorkspaceSetupReason) {
  return `/client?error=${TRIAL_WORKSPACE_SETUP_ERROR}&reason=${encodeURIComponent(reason)}`;
}

export function isTrialWorkspaceSetupError(error?: string | null) {
  return error === TRIAL_WORKSPACE_SETUP_ERROR;
}
