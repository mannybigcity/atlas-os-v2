"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "@/server/integrations/errors";
import {
  searchGooglePlacesText,
  type GooglePlaceProspect,
} from "@/server/integrations/google-places";
import {
  HUNTER_DAILY_SEARCH_CAP,
  HUNTER_SEARCH_RESULT_CAP,
  acceptedProspectNextAction,
  acceptedProspectResearchSummary,
  buildHunterSearchQuery,
  hunterDailyCapReached,
  placesToReviewInserts,
} from "@/server/hunter/review";

export type HunterSearchState = {
  status: "idle" | "success" | "error";
  message: string | null;
  query: string | null;
  places: GooglePlaceProspect[];
  persistedCount: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const initialHunterSearchState: HunterSearchState = {
  status: "idle",
  message: null,
  query: null,
  places: [],
  persistedCount: 0,
};

async function requireHunterOperator(organizationId: string | null) {
  const user = await requireUser(organizationId ? "/client/hunter" : "/lions-den/sales");
  const isSuperAdmin = isSuperAdminEmail(user.email);

  if (!organizationId) {
    if (!isSuperAdmin) {
      redirect("/client?access=denied");
    }
    return { user, organizationId: null };
  }

  if (!uuidPattern.test(organizationId)) {
    redirect("/client?access=denied");
  }

  if (isSuperAdmin) {
    return { user, organizationId };
  }

  const memberships = await getUserMemberships(user.id);
  const membership = memberships.data.find(
    (item) => item.organization?.id === organizationId,
  );
  if (!membership) {
    redirect("/client?access=denied");
  }

  return { user, organizationId };
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

export async function searchHunterProspects(
  _previousState: HunterSearchState,
  formData: FormData,
): Promise<HunterSearchState> {
  const organizationIdRaw = String(formData.get("organizationId") ?? "").trim();
  const organizationId = uuidPattern.test(organizationIdRaw) ? organizationIdRaw : null;
  const { user } = await requireHunterOperator(organizationId);
  const service = String(formData.get("service") ?? "").trim().slice(0, 120);
  const zipCode = String(formData.get("zipCode") ?? "").trim().slice(0, 16);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const state = String(formData.get("state") ?? "").trim().slice(0, 32);
  const radiusMilesRaw = String(formData.get("radiusMiles") ?? "").trim().slice(0, 8);
  const radiusMiles = radiusMilesRaw ? Number(radiusMilesRaw) : null;
  const parsed = buildHunterSearchQuery({
    service,
    zipCode,
    city,
    state,
    radiusMiles: radiusMilesRaw ? radiusMiles : null,
  });

  if (!parsed.ok) {
    return {
      status: "error",
      message: parsed.error,
      query: null,
      places: [],
      persistedCount: 0,
    };
  }

  const supabase = await createClient();
  const usage = await hunterSearchUsageToday(supabase);

  if (usage.setupRequired) {
    return {
      status: "error",
      message: "Apply the Atlas Agent Usage Ledger migration before using a paid data API.",
      query: null,
      places: [],
      persistedCount: 0,
    };
  }

  if (hunterDailyCapReached(usage.count)) {
    return {
      status: "error",
      message: "HUNTER reached the 20-search daily safety cap. Review today's results before spending more.",
      query: null,
      places: [],
      persistedCount: 0,
    };
  }

  try {
    const result = await searchGooglePlacesText({
      textQuery: parsed.textQuery,
      maxResults: HUNTER_SEARCH_RESULT_CAP,
      languageCode: "en",
      regionCode: "US",
      includeWebsite: false,
      includePureServiceAreaBusinesses: true,
    });

    let persistedCount = 0;
    if (organizationId) {
      const rows = placesToReviewInserts(
        organizationId,
        user.id,
        parsed.textQuery,
        result.places,
      );
      if (rows.length > 0) {
        const { data: existing } = await supabase
          .from("organization_hunter_review_items")
          .select("place_id, status")
          .eq("organization_id", organizationId)
          .in("place_id", rows.map((row) => row.place_id));
        const accepted = new Set(
          (existing ?? [])
            .filter((row) => row.status === "accepted")
            .map((row) => row.place_id),
        );
        const pendingRows = rows.filter((row) => !accepted.has(row.place_id));
        if (pendingRows.length > 0) {
          const { error: persistError } = await supabase
            .from("organization_hunter_review_items")
            .upsert(pendingRows, { onConflict: "organization_id,place_id" });
          if (!persistError) {
            persistedCount = pendingRows.length;
          }
        }
      }
    }

    const recordError = await recordHunterSearch({
      supabase,
      organizationId,
      userId: user.id,
      query: parsed.textQuery,
      resultCount: result.places.length,
      radiusMiles,
      status: "succeeded",
      errorCode: null,
      placesContentPersisted: persistedCount > 0,
    });

    if (recordError) {
      return {
        status: "error",
        message: "The provider returned results, but Atlas could not record API usage. Run the search again only after checking the ledger.",
        query: parsed.textQuery,
        places: [],
        persistedCount: 0,
      };
    }

    if (organizationId) {
      revalidatePath("/client/hunter");
      revalidatePath("/client/prospects");
    }

    const persistNote = organizationId
      ? persistedCount
        ? ` ${persistedCount} listing${persistedCount === 1 ? "" : "s"} saved to the REVIEW PILE. They are not Prospects until you accept them. Atlas will not email, call, or text anyone.`
        : " Listings already accepted stay in Prospects. New finds were not added because they were already accepted."
      : " Results stay only in this page session and are not copied into the CRM.";

    return {
      status: "success",
      message: `${result.places.length} Google Maps result${result.places.length === 1 ? "" : "s"}.${persistNote}`,
      query: parsed.textQuery,
      places: result.places,
      persistedCount,
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
      userId: user.id,
      query: parsed.textQuery,
      resultCount: 0,
      radiusMiles,
      status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
      errorCode,
      placesContentPersisted: false,
    });

    return {
      status: "error",
      message:
        error instanceof IntegrationConfigurationError
          ? "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment."
          : "Google Places could not complete this search. The failed request was recorded.",
      query: parsed.textQuery,
      places: [],
      persistedCount: 0,
    };
  }
}

export async function acceptHunterReviewItem(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const reviewItemId = String(formData.get("reviewItemId") ?? "").trim();
  await requireHunterOperator(organizationId);

  if (!uuidPattern.test(reviewItemId) || !organizationId) {
    redirect("/client/hunter?hunter=invalid");
  }

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("organization_hunter_review_items")
    .select(
      "id, organization_id, place_id, name, formatted_address, google_maps_url, website_url, primary_type, business_status, status, accepted_opportunity_id",
    )
    .eq("id", reviewItemId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (itemError || !item) {
    redirect("/client/hunter?hunter=missing");
  }

  if (item.status === "accepted") {
    redirect("/client/hunter?hunter=already_accepted");
  }

  const researchSummary = acceptedProspectResearchSummary({
    name: item.name,
    formattedAddress: item.formatted_address,
  });
  const { data: opportunity, error: opportunityError } = await supabase
    .from("organization_opportunities")
    .insert({
      organization_id: organizationId,
      name: item.name.slice(0, 220),
      opportunity_type: "customer",
      stage: "ready_for_follow_up",
      fit_score: 0,
      owner_role: "client",
      source_label: "HUNTER Google Maps",
      source_url: item.google_maps_url,
      research_summary: researchSummary.slice(0, 3000),
      next_action: acceptedProspectNextAction(),
      metadata: {
        hunter_review_item_id: item.id,
        google_place_id: item.place_id,
        google_maps_attribution: "Google Maps",
        no_outreach_sent: true,
        accepted_for_calling: true,
        primary_type: item.primary_type,
        business_status: item.business_status,
      },
    })
    .select("id")
    .single();

  if (opportunityError || !opportunity) {
    if (opportunityError?.code === "23505") {
      redirect("/client/hunter?hunter=duplicate");
    }
    redirect("/client/hunter?hunter=accept_failed");
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunity.id,
    organization_id: organizationId,
    event_type: "created",
    actor_role: "hunter",
    summary: "Owner accepted this HUNTER find into Prospects. No contact was sent.",
    body: researchSummary,
  });

  const { error: updateError } = await supabase
    .from("organization_hunter_review_items")
    .update({
      status: "accepted",
      accepted_opportunity_id: opportunity.id,
    })
    .eq("id", item.id)
    .eq("organization_id", organizationId);

  if (updateError) {
    redirect("/client/hunter?hunter=accept_failed");
  }

  revalidatePath("/client");
  revalidatePath("/client/hunter");
  revalidatePath("/client/prospects");
  redirect("/client/hunter?hunter=accepted");
}

export async function dismissHunterReviewItem(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const reviewItemId = String(formData.get("reviewItemId") ?? "").trim();
  await requireHunterOperator(organizationId);

  if (!uuidPattern.test(reviewItemId) || !organizationId) {
    redirect("/client/hunter?hunter=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_hunter_review_items")
    .update({ status: "dismissed" })
    .eq("id", reviewItemId)
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) {
    redirect("/client/hunter?hunter=dismiss_failed");
  }

  revalidatePath("/client/hunter");
  redirect("/client/hunter?hunter=dismissed");
}
