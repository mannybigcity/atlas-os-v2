"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "@/server/integrations/errors";
import {
  searchGooglePlacesText,
  type GooglePlaceProspect,
} from "@/server/integrations/google-places";

export type HunterSearchState = {
  status: "idle" | "success" | "error";
  message: string | null;
  query: string | null;
  places: GooglePlaceProspect[];
};

export async function searchHunterProspects(
  _previousState: HunterSearchState,
  formData: FormData,
): Promise<HunterSearchState> {
  const user = await requireSuperAdmin("/lions-den/sales");
  const service = String(formData.get("service") ?? "").trim().slice(0, 120);
  const zipCode = String(formData.get("zipCode") ?? "").trim().slice(0, 16);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const state = String(formData.get("state") ?? "").trim().slice(0, 32);
  const radiusMilesRaw = String(formData.get("radiusMiles") ?? "").trim().slice(0, 8);
  const radiusMiles = radiusMilesRaw ? Number(radiusMilesRaw) : null;
  const locationParts = [
    zipCode ? `ZIP code ${zipCode}` : null,
    city && state ? `${city}, ${state}` : city || state || null,
  ].filter((part): part is string => Boolean(part));
  const location = locationParts.join(" or ");

  if (service.length < 2 || location.length < 2) {
    return {
      status: "error",
      message: "Enter a business type plus a ZIP code or city/state.",
      query: null,
      places: [],
    };
  }

  if (radiusMilesRaw && (!Number.isFinite(radiusMiles) || radiusMiles === null || radiusMiles < 1 || radiusMiles > 250)) {
    return {
      status: "error",
      message: "Radius must be a whole number between 1 and 250 miles.",
      query: null,
      places: [],
    };
  }

  const supabase = await createClient();
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
    return {
      status: "error",
      message: "Apply the Atlas Agent Usage Ledger migration before using a paid data API.",
      query: null,
      places: [],
    };
  }

  if ((usageResult.count ?? 0) >= 20) {
    return {
      status: "error",
      message: "HUNTER reached the 20-search daily safety cap. Review today's results before spending more.",
      query: null,
      places: [],
    };
  }

  const textQuery = `${service} in ${location}${radiusMiles ? ` within ${radiusMiles} miles` : ""}`;

  try {
    const result = await searchGooglePlacesText({
      textQuery,
      maxResults: 10,
      languageCode: "en",
      regionCode: "US",
      includeWebsite: false,
      includePureServiceAreaBusinesses: true,
    });

    const { error: logError } = await supabase.from("atlas_agent_runs").insert({
      role: "hunter",
      workflow: "google_places_preview",
      provider: "google_places",
      status: "succeeded",
      request_units: 1,
      result_count: result.places.length,
      initiated_by: user.id,
      // List-price exposure after Google's monthly free usage cap. This is
      // intentionally not presented as the actual charged amount.
      estimated_cost_microusd: 32_000,
        metadata: {
          query: textQuery,
          max_results: 10,
          radius_miles: radiusMiles,
          places_content_persisted: false,
          list_price_exposure_after_free_cap_usd: 0.032,
        },
      });

    if (logError) {
      return {
        status: "error",
        message: "The provider returned results, but Atlas could not record API usage. Run the search again only after checking the ledger.",
        query: textQuery,
        places: [],
      };
    }

    return {
      status: "success",
      message: `${result.places.length} transient Google Maps results. Open the official listing, verify facts on the business's own site, then add the prospect below.`,
      query: textQuery,
      places: result.places,
    };
  } catch (error) {
    const errorCode =
      error instanceof IntegrationConfigurationError ||
      error instanceof IntegrationRequestError
        ? error.code
        : "unknown_error";

    await supabase.from("atlas_agent_runs").insert({
      role: "hunter",
      workflow: "google_places_preview",
      provider: "google_places",
      status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
      request_units: error instanceof IntegrationConfigurationError ? 0 : 1,
      initiated_by: user.id,
      error_code: errorCode,
      metadata: { query: textQuery, radius_miles: radiusMiles, places_content_persisted: false },
    });

    return {
      status: "error",
      message:
        error instanceof IntegrationConfigurationError
          ? "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment."
          : "Google Places could not complete this search. The failed request was recorded.",
      query: textQuery,
      places: [],
    };
  }
}
