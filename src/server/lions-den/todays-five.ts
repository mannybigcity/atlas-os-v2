import "server-only";

import { deskDateOnly, deskTimeZone } from "@/lib/desk-time";
import {
  assembleTodaysFive,
  parseTodaysFiveCache,
  placeFootprintFromDetails,
  presentTodaysFive,
  type TodaysFiveCache,
  type TodaysFiveDesk,
} from "@/lib/lions-den/todays-five";
import { createClient } from "@/lib/supabase/server";
import { getGooglePlaceDetails } from "@/server/integrations/google-places";
import { enrichHunterDomain, hunterApiKey } from "@/server/integrations/hunter-io";
import { hasServerIntegrationSecret } from "@/server/integrations/server-env";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";

const memoryCache = new Map<string, TodaysFiveCache>();

function memoryKey(organizationId: string, deskDate: string) {
  return `${organizationId}:${deskDate}`;
}

function remember(organizationId: string, snapshot: TodaysFiveCache) {
  for (const [key, value] of memoryCache) {
    if (value.deskDate !== snapshot.deskDate) memoryCache.delete(key);
  }
  memoryCache.set(memoryKey(organizationId, snapshot.deskDate), snapshot);
}

async function readStoredCache(organizationId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_desk_settings")
      .select("todays_five")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) return null;
    return parseTodaysFiveCache((data as { todays_five?: unknown } | null)?.todays_five);
  } catch {
    return null;
  }
}

async function writeStoredCache(organizationId: string, snapshot: TodaysFiveCache) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("organization_desk_settings").upsert(
      {
        organization_id: organizationId,
        todays_five: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    if (error) console.error("[todays-five] cache write failed");
  } catch {
    console.error("[todays-five] cache write failed");
  }
}

/**
 * Build or reuse the owner's morning five. Places details run only on a cache
 * miss, and only for the top gap candidates. Hunter.io runs only when
 * HUNTER_API_KEY is set. Neither path contacts the prospect.
 */
export async function loadTodaysFiveForDesk(
  organizationId: string,
  prospects: OrganizationOpportunity[],
): Promise<TodaysFiveDesk> {
  const deskDate = deskDateOnly();
  const timeZone = deskTimeZone();
  try {
    const stored = (await readStoredCache(organizationId)) ?? memoryCache.get(memoryKey(organizationId, deskDate)) ?? null;
    const placesReady = hasServerIntegrationSecret("GOOGLE_PLACES_API_KEY");
    const hunterReady = Boolean(hunterApiKey());
    const { snapshot, reusedCache } = await assembleTodaysFive({
      prospects,
      deskDate,
      timeZone,
      cached: stored,
      lookupPlace: placesReady
        ? async (placeId) =>
            placeFootprintFromDetails(
              await getGooglePlaceDetails(placeId, { signal: AbortSignal.timeout(5_000) }),
            )
        : undefined,
      enrichDomain: hunterReady
        ? async (domain) => {
            const found = await enrichHunterDomain(domain);
            if (!found) return null;
            return { email: found.email, hasSocialProfile: found.hasSocialProfile };
          }
        : undefined,
    });
    remember(organizationId, snapshot);
    if (!reusedCache) await writeStoredCache(organizationId, snapshot);
    return presentTodaysFive(snapshot, prospects);
  } catch (error) {
    console.error("[todays-five] desk load failed", error instanceof Error ? error.name : "error");
    const { snapshot } = await assembleTodaysFive({
      prospects,
      deskDate,
      timeZone,
      cached: null,
    });
    remember(organizationId, snapshot);
    return presentTodaysFive(snapshot, prospects);
  }
}
