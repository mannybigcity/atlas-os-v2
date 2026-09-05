import assert from "node:assert/strict";
import test from "node:test";
import {
  isTrialWorkspaceSetupError,
  trialWorkspaceSetupHref,
  TRIAL_WORKSPACE_SETUP_ERROR,
} from "./workspace-redirect.ts";

test("trialWorkspaceSetupHref encodes concrete failure reasons", () => {
  assert.equal(
    trialWorkspaceSetupHref("create_failed"),
    "/client?error=workspace_setup&reason=create_failed",
  );
  assert.equal(
    trialWorkspaceSetupHref("membership_failed"),
    "/client?error=workspace_setup&reason=membership_failed",
  );
});

test("isTrialWorkspaceSetupError detects the workspace setup error param", () => {
  assert.equal(isTrialWorkspaceSetupError(TRIAL_WORKSPACE_SETUP_ERROR), true);
  assert.equal(isTrialWorkspaceSetupError("profile_setup"), false);
  assert.equal(isTrialWorkspaceSetupError(undefined), false);
});
