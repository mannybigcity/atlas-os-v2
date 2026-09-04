import "server-only";

import { ensureTrialProfile } from "@/server/trials/profile";
import { ensureTrialWorkspace } from "@/server/trials/workspace";

export type TrialProvisionResult =
  | { ok: true }
  | { ok: false; error: string; stage: "profile" | "workspace" };

export async function ensureTrialAccountForUser(
  userId: string,
  metadata: Record<string, unknown>,
  email: string | null | undefined,
): Promise<TrialProvisionResult> {
  const profile = await ensureTrialProfile(userId, {
    ...metadata,
    email: email ?? metadata.email,
  });

  if (!profile.ok) {
    console.error("Atlas trial profile ensure failed", { userId, error: profile.error });
    return { ok: false, error: profile.error, stage: "profile" };
  }

  return { ok: true };
}

export async function ensureTrialWorkspaceForUser(input: {
  userId: string;
  businessName: string;
  email: string;
}) {
  const workspace = await ensureTrialWorkspace(input);

  if (!workspace.ok) {
    console.error("Atlas trial workspace ensure failed", {
      userId: input.userId,
      businessName: input.businessName,
      email: input.email,
      error: workspace.error,
    });
  }

  return workspace;
}
