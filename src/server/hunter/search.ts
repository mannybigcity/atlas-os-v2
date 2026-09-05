import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "@/server/integrations/errors";
import { searchGooglePlacesText } from "@/server/integrations/google-places";
import type { GooglePlaceProspect } from "@/server/integrations/google-places";
import {
  applyHunterSearchFilters,
  emptyHunterSearchFilters,
  formatHunterSearchCountMessage,
  type HunterSearchFilters,
} from "@/server/hunter/filters";
import {
  HUNTER_SEARCH_RESULT_CAP,
  annotateHunterSearchPlaces,
  buildHunterSearchPersistNote,
  hunterDailyCapReached,
  isMissingHunterReviewTable,
  placesToReviewInserts,
  type HunterReviewRowRef,
  type HunterSearchFind,
} from "@/server/hunter/review";

export type HunterPlacesSearchResult = {
  status: "success" | "error";
  message: string;
  query: string;
  places: HunterSearchFind[];
  persistedCount: number;
  acceptedCount: number;
  tableMissing: boolean;
  rawCount: number;
  filters: HunterSearchFilters;
};

function unsavedPlaces(places: GooglePlaceProspect[]): HunterSearchFind[] {
  return annotateHunterSearchPlaces(places, []);
}

function emptyHunterSearch(
  input: Omit<
    HunterPlacesSearchResult,
    "places" | "persistedCount" | "acceptedCount" | "tableMissing" | "rawCount" | "filters"
  > & {
    places?: HunterSearchFind[];
    persistedCount?: number;
    acceptedCount?: number;
    tableMissing?: boolean;
    rawCount?: number;
    filters?: HunterSearchFilters;
  },
): HunterPlacesSearchResult {
  return {
    ...input,
    places: input.places ?? [],
    persistedCount: input.persistedCount ?? 0,
    acceptedCount: input.acceptedCount ?? 0,
    tableMissing: input.tableMissing ?? false,
    rawCount: input.rawCount ?? 0,
    filters: input.filters ?? emptyHunterSearchFilters,
  };
}

async function hunterSearchUsageToday(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("get_hunter_places_search_count_today");
  if (error) {
    const utcDay = new Date().toISOString().slice(0, 10);
    const [ledgerResult, usageResult] = await Promise.all([
      supabase.from("atlas_agent_runs").select("id").limit(1),
      supabase
        .from("atlas_agent_runs")
        .select("id", { count: "exact", head: true })
        .eq("role", "hunter")
        .eq("workflow", "google_places_preview")
        .eq("provider", "google_places")
        .eq("status", "succeeded")
        .gte("occurred_at", `${utcDay}T00:00:00.000Z`),
    ]);

    if (ledgerResult.error || usageResult.error) {
      return { setupRequired: true as const, count: 0 };
    }

    return { setupRequired: false as const, count: usageResult.count ?? 0 };
  }

  return { setupRequired: false as const, count: Number(data ?? 0) };
}

async function recordHunterSearch(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  organizationId: string | null;
  userId: string;
  query: string;
  resultCount: number;
  radiusMiles: number | null;
  status: "succeeded" | "failed" | "blocked";
  errorCode: string | null;
  placesContentPersisted: boolean;
}) {
  const { error: rpcError } = await input.supabase.rpc("record_hunter_places_search", {
    p_organization_id: input.organizationId,
    p_query: input.query,
    p_result_count: input.resultCount,
    p_radius_miles: input.radiusMiles,
    p_status: input.status,
    p_error_code: input.errorCode,
    p_places_content_persisted: input.placesContentPersisted,
  });

  if (!rpcError) {
    return null;
  }

  const { error } = await input.supabase.from("atlas_agent_runs").insert({
    organization_id: input.organizationId,
    role: "hunter",
    workflow: "google_places_preview",
    provider: "google_places",
    status: input.status,
    request_units: input.status === "blocked" ? 0 : 1,
    result_count: input.resultCount,
    initiated_by: input.userId,
    estimated_cost_microusd: input.status === "succeeded" ? 32_000 : 0,
    error_code: input.errorCode,
    metadata: {
      query: input.query,
      max_results: HUNTER_SEARCH_RESULT_CAP,
      radius_miles: input.radiusMiles,
      places_content_persisted: input.placesContentPersisted,
      list_price_exposure_after_free_cap_usd: 0.032,
    },
  });

  return error?.message ?? null;
}

export async function executeHunterPlacesSearch(input: {
  organizationId: string | null;
  userId: string;
  textQuery: string;
  radiusMiles?: number | null;
  filters?: HunterSearchFilters;
}): Promise<HunterPlacesSearchResult> {
  const organizationId = input.organizationId;
  const radiusMiles = input.radiusMiles ?? null;
  const filters = input.filters ?? emptyHunterSearchFilters;
  const supabase = await createClient();
  const usage = await hunterSearchUsageToday(supabase);

  if (usage.setupRequired) {
    return emptyHunterSearch({
      status: "error",
      message: "Apply the Atlas Agent Usage Ledger migration before using a paid data API.",
      query: input.textQuery,
      filters,
    });
  }

  if (hunterDailyCapReached(usage.count)) {
    return emptyHunterSearch({
      status: "error",
      message: "HUNTER reached the 20-search daily safety cap. Review today's results before spending more.",
      query: input.textQuery,
      filters,
    });
  }

  try {
    const result = await searchGooglePlacesText({
      textQuery: input.textQuery,
      maxResults: HUNTER_SEARCH_RESULT_CAP,
      languageCode: "en",
      regionCode: "US",
      includeWebsite: true,
      includePureServiceAreaBusinesses: true,
    });
    const places = applyHunterSearchFilters(result.places, filters);

    let persistedCount = 0;
    let acceptedCount = 0;
    let tableMissing = false;
    let persistFailed = false;
    let annotatedPlaces = unsavedPlaces(places);

    if (organizationId) {
      const rows = placesToReviewInserts(
        organizationId,
        input.userId,
        input.textQuery,
        places,
      );
      if (rows.length > 0) {
        const { data: existing, error: existingError } = await supabase
          .from("organization_hunter_review_items")
          .select("id, place_id, status, accepted_opportunity_id")
          .eq("organization_id", organizationId)
          .in("place_id", rows.map((row) => row.place_id));

        if (existingError) {
          persistFailed = true;
          tableMissing = isMissingHunterReviewTable(existingError);
        } else {
          const existingRows = (existing ?? []) as HunterReviewRowRef[];
          const acceptedIds = new Set(
            existingRows
              .filter((row) => row.status === "accepted")
              .map((row) => row.place_id),
          );
          acceptedCount = acceptedIds.size;
          const pendingRows = rows.filter((row) => !acceptedIds.has(row.place_id));
          const persistedPlaceIds = new Set<string>();
          if (pendingRows.length > 0) {
            const { error: persistError } = await supabase
              .from("organization_hunter_review_items")
              .upsert(pendingRows, { onConflict: "organization_id,place_id" });
            if (persistError) {
              persistFailed = true;
              tableMissing = isMissingHunterReviewTable(persistError);
            } else {
              persistedCount = pendingRows.length;
              for (const row of pendingRows) persistedPlaceIds.add(row.place_id);
            }
          }

          let knownRows = existingRows;
          if (!persistFailed && persistedPlaceIds.size > 0) {
            const { data: saved } = await supabase
              .from("organization_hunter_review_items")
              .select("id, place_id, status, accepted_opportunity_id")
              .eq("organization_id", organizationId)
              .in("place_id", rows.map((row) => row.place_id));
            if (saved) knownRows = saved as HunterReviewRowRef[];
          }
          annotatedPlaces = annotateHunterSearchPlaces(
            places,
            knownRows,
            persistedPlaceIds,
          );
        }
      }
    }

    const recordError = await recordHunterSearch({
      supabase,
      organizationId,
      userId: input.userId,
      query: input.textQuery,
      resultCount: result.places.length,
      radiusMiles,
      status: "succeeded",
      errorCode: null,
      placesContentPersisted: persistedCount > 0,
    });

    if (recordError) {
      return emptyHunterSearch({
        status: "error",
        message: "The provider returned results, but Atlas could not record API usage. Run the search again only after checking the ledger.",
        query: input.textQuery,
        rawCount: result.places.length,
        filters,
      });
    }

    if (organizationId) {
      revalidatePath("/client/hunter");
      revalidatePath("/client/prospects");
      revalidatePath("/client");
    }

    const persistNote = buildHunterSearchPersistNote({
      organizationId,
      persistedCount,
      acceptedCount,
      tableMissing,
      persistFailed,
    });

    return {
      status: "success",
      message: `${formatHunterSearchCountMessage({
        rawCount: result.places.length,
        keptCount: places.length,
        filters,
      })}${persistNote}`,
      query: input.textQuery,
      places: annotatedPlaces,
      persistedCount,
      acceptedCount,
      tableMissing,
      rawCount: result.places.length,
      filters,
    };
  } catch (error) {
    const errorCode =
      error instanceof IntegrationConfigurationError ||
      error instanceof IntegrationRequestError
        ? error.code
        : "unknown_error";

    await recordHunterSearch({
      supabase,
      organizationId,
      userId: input.userId,
      query: input.textQuery,
      resultCount: 0,
      radiusMiles,
      status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
      errorCode,
      placesContentPersisted: false,
    });

    return emptyHunterSearch({
      status: "error",
      message:
        error instanceof IntegrationConfigurationError
          ? "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment."
          : "Google Places could not complete this search. The failed request was recorded.",
      query: input.textQuery,
      filters,
    });
  }
}
