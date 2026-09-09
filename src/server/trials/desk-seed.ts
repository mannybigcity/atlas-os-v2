import "server-only";

import {
  applyTrialLionsDenSeed,
  type TrialDeskSeedClient,
} from "@/lib/lions-den/trial-desk-seed";
import type { TrialDeskMarketInput } from "@/lib/lions-den/trial-desk-market";
import { createServiceClient } from "@/lib/supabase/service";
import { ownerClearedTrialSamples } from "@/server/trials/desk-settings";

export async function ensureTrialLionsDenSeed(input: {
  organizationId: string;
  userId: string;
  client?: TrialDeskSeedClient;
  hasTrialProfile?: boolean;
  market?: TrialDeskMarketInput | null;
}) {
  try {
    const client = input.client ?? createServiceClient();
    if (await ownerClearedTrialSamples(client, input.organizationId)) {
      return { status: "skipped" as const, reason: "samples_cleared" };
    }
    return await applyTrialLionsDenSeed(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      hasTrialProfile: input.hasTrialProfile ?? true,
      market: input.market,
    });
  } catch (error) {
    console.error("Atlas trial Lion's Den seed failed", {
      organizationId: input.organizationId,
      error,
    });
    return { status: "failed" as const, reason: "write_failed" };
  }
}
