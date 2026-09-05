"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanApplyOrganizationIdentityPatch } from "@/lib/client-portal/protected-organization";
import { canSeeSampleDesk, isAfeCrmDemoOrganization } from "@/lib/client-portal/identity";
import { getConfiguredDemoLoginEmail, isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import { executeHunterPlacesSearch } from "@/server/hunter/search";
import { parseHunterSearchFilters } from "@/server/hunter/filters";
import {
  buildHunterSearchQuery,
  acceptedHunterOpportunityFields,
  mergeHunterPlaceDetails,
} from "@/server/hunter/review";
import { getGooglePlaceDetails } from "@/server/integrations/google-places";
import type { HunterSearchState } from "@/server/hunter/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireHunterOperator(organizationId: string | null) {
  const user = await requireUser(organizationId ? "/client/hunter" : "/lions-den/sales");
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const seesSampleDesk = canSeeSampleDesk(user.email, getConfiguredDemoLoginEmail());

  if (!organizationId) {
    if (!isSuperAdmin) {
      redirect("/client?access=denied");
    }
    return { user, organizationId: null };
  }

  if (!uuidPattern.test(organizationId)) {
    redirect("/client?access=denied");
  }

  const memberships = await getUserMemberships(user.id);
  const membership = memberships.data.find(
    (item) => item.organization?.id === organizationId,
  );
  const memberOrg = membership?.organization ?? null;
  const memberIsSample = isAfeCrmDemoOrganization(memberOrg);

  if (membership && memberIsSample === seesSampleDesk) {
    return { user, organizationId };
  }

  if (isSuperAdmin && !seesSampleDesk) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", organizationId)
      .maybeSingle();
    if (isAfeCrmDemoOrganization(data)) {
      redirect("/client?access=denied");
    }
    return { user, organizationId };
  }

  redirect("/client?access=denied");
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

  const filters = parseHunterSearchFilters(formData);

  if (!parsed.ok) {
    return {
      status: "error",
      message: parsed.error,
      query: null,
      places: [],
      persistedCount: 0,
      acceptedCount: 0,
      tableMissing: false,
      rawCount: 0,
      filters,
    };
  }

  return executeHunterPlacesSearch({
    organizationId,
    userId: user.id,
    textQuery: parsed.textQuery,
    radiusMiles: radiusMilesRaw ? radiusMiles : null,
    filters,
  });
}

export async function acceptHunterReviewItem(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const reviewItemId = String(formData.get("reviewItemId") ?? "").trim();
  await requireHunterOperator(organizationId);

  if (!uuidPattern.test(reviewItemId) || !organizationId) {
    redirect("/client/hunter?hunter=invalid");
  }

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  try {
    assertCanApplyOrganizationIdentityPatch(workspace, {
      name: formData.get("organizationName") ?? undefined,
      slug: formData.get("organizationSlug") ?? undefined,
      industry: formData.get("industry") ?? undefined,
      about: formData.get("about") ?? undefined,
      owners: formData.get("owners") ?? undefined,
      logo: formData.get("logo") ?? undefined,
      profile: formData.get("profile") ?? undefined,
    });
  } catch {
    redirect("/client/hunter?hunter=protected");
  }

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

  let placeDetails = null;
  try {
    placeDetails = await getGooglePlaceDetails(item.place_id);
  } catch {
    placeDetails = null;
  }

  const opportunityFields = acceptedHunterOpportunityFields(
    mergeHunterPlaceDetails(item, placeDetails),
  );
  const researchSummary = opportunityFields.research_summary;
  const { data: opportunity, error: opportunityError } = await supabase
    .from("organization_opportunities")
    .insert({
      organization_id: organizationId,
      ...opportunityFields,
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
  revalidatePath(`/client/prospects/${opportunity.id}`);
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
