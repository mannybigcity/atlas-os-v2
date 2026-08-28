import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";
import type { HunterReviewItem, HunterReviewStatus } from "@/server/hunter/review";

type HunterReviewRow = {
  id: string;
  organization_id: string;
  place_id: string;
  name: string;
  formatted_address: string | null;
  google_maps_url: string | null;
  website_url: string | null;
  primary_type: string | null;
  business_status: string | null;
  search_query: string;
  status: HunterReviewStatus;
  accepted_opportunity_id: string | null;
  created_at: string;
};

function mapReviewItem(row: HunterReviewRow): HunterReviewItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    placeId: row.place_id,
    name: row.name,
    formattedAddress: row.formatted_address,
    googleMapsUrl: row.google_maps_url,
    websiteUrl: row.website_url,
    primaryType: row.primary_type,
    businessStatus: row.business_status,
    searchQuery: row.search_query,
    status: row.status,
    acceptedOpportunityId: row.accepted_opportunity_id,
    createdAt: row.created_at,
  };
}

export async function getHunterReviewPile(
  organizationId: string,
): Promise<WorkspaceQueryResult<HunterReviewItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_hunter_review_items")
    .select(
      "id, organization_id, place_id, name, formatted_address, google_maps_url, website_url, primary_type, business_status, search_query, status, accepted_opportunity_id, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return {
      data: [],
      setupRequired: true,
      error: error.message,
    };
  }

  return {
    data: ((data ?? []) as HunterReviewRow[]).map(mapReviewItem),
    setupRequired: false,
    error: null,
  };
}
