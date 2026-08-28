import type { GooglePlaceProspect } from "@/server/integrations/google-places";

export const HUNTER_DAILY_SEARCH_CAP = 20;
export const HUNTER_SEARCH_RESULT_CAP = 10;

export type HunterReviewStatus = "pending" | "accepted" | "dismissed";

export type HunterReviewItem = {
  id: string;
  organizationId: string;
  placeId: string;
  name: string;
  formattedAddress: string | null;
  googleMapsUrl: string | null;
  websiteUrl: string | null;
  primaryType: string | null;
  businessStatus: string | null;
  searchQuery: string;
  status: HunterReviewStatus;
  acceptedOpportunityId: string | null;
  createdAt: string;
};

export function buildHunterSearchQuery(input: {
  service: string;
  zipCode: string;
  city: string;
  state: string;
  radiusMiles: number | null;
}) {
  const locationParts = [
    input.zipCode ? `ZIP code ${input.zipCode}` : null,
    input.city && input.state ? `${input.city}, ${input.state}` : input.city || input.state || null,
  ].filter((part): part is string => Boolean(part));
  const location = locationParts.join(" or ");

  if (input.service.length < 2 || location.length < 2) {
    return { ok: false as const, error: "Enter a business type plus a ZIP code or city/state." };
  }

  if (
    input.radiusMiles !== null &&
    (!Number.isFinite(input.radiusMiles) || input.radiusMiles < 1 || input.radiusMiles > 250)
  ) {
    return { ok: false as const, error: "Radius must be a whole number between 1 and 250 miles." };
  }

  const textQuery = `${input.service} in ${location}${input.radiusMiles ? ` within ${input.radiusMiles} miles` : ""}`;
  return { ok: true as const, textQuery, location };
}

export function hunterDailyCapReached(usedToday: number) {
  return usedToday >= HUNTER_DAILY_SEARCH_CAP;
}

export function acceptedProspectResearchSummary(place: {
  name: string;
  formattedAddress: string | null;
}) {
  const address = place.formattedAddress?.trim() || "Address not listed on Google Maps";
  return `Accepted from the HUNTER review pile. ${place.name} is now a Prospect the salesman can call. Address: ${address}. Atlas has not emailed, called, or texted this business.`;
}

export function acceptedProspectNextAction() {
  return "Call this prospect. Atlas has not contacted them.";
}

export function placesToReviewInserts(
  organizationId: string,
  userId: string,
  query: string,
  places: GooglePlaceProspect[],
) {
  return places.slice(0, HUNTER_SEARCH_RESULT_CAP).map((place) => ({
    organization_id: organizationId,
    place_id: place.placeId.slice(0, 256),
    name: place.name.slice(0, 250),
    formatted_address: place.formattedAddress?.slice(0, 500) ?? null,
    google_maps_url: place.googleMapsUrl?.slice(0, 2000) ?? null,
    website_url: place.websiteUrl?.slice(0, 2000) ?? null,
    primary_type: place.primaryType?.slice(0, 120) ?? null,
    business_status: place.businessStatus?.slice(0, 80) ?? null,
    search_query: query.slice(0, 1000),
    status: "pending" as const,
    created_by: userId,
  }));
}
