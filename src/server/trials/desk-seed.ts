import "server-only";

import {
  applyTrialLionsDenSeed,
  type TrialDeskSeedClient,
} from "@/lib/lions-den/trial-desk-seed";
import { createServiceClient } from "@/lib/supabase/service";

export async function ensureTrialLionsDenSeed(input: {
  organizationId: string;
  userId: string;
  client?: TrialDeskSeedClient;
  hasTrialProfile?: boolean;
}) {
  try {
    const client = input.client ?? createServiceClient();
    return await applyTrialLionsDenSeed(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      hasTrialProfile: input.hasTrialProfile ?? true,
    });
  } catch (error) {
    console.error("Atlas trial Lion's Den seed failed", {
      organizationId: input.organizationId,
      error,
    });
    return { status: "failed" as const, reason: "write_failed" };
  }
}
