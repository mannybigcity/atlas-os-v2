import { createClient } from "@/lib/supabase/server";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";
import { SIGNSCOUT_PHOTO_BUCKET } from "@/server/signscout/contract";
import {
  HUNTER_REVIEW_PILE_LIMIT,
  isMissingHunterReviewColumn,
  isMissingHunterReviewTable,
  isSignScoutHunterItem,
  type HunterReviewItem,
  type HunterReviewStatus,
} from "@/server/hunter/review";

const HUNTER_REVIEW_PILE_COLUMNS =
  "id, organization_id, place_id, name, formatted_address, google_maps_url, website_url, phone, primary_type, business_status, search_query, status, accepted_opportunity_id, created_at";

const HUNTER_REVIEW_PILE_COLUMNS_WITH_SOURCE =
  `${HUNTER_REVIEW_PILE_COLUMNS}, source, notes, contact_email, photo_storage_path`;

type HunterReviewRow = {
  id: string;
  organization_id: string;
  place_id: string;
  name: string;
  formatted_address: string | null;
  google_maps_url: string | null;
  website_url: string | null;
  phone?: string | null;
  primary_type: string | null;
  business_status: string | null;
  search_query: string;
  status: HunterReviewStatus;
  accepted_opportunity_id: string | null;
  created_at: string;
  source?: string | null;
  notes?: string | null;
  contact_email?: string | null;
  photo_storage_path?: string | null;
};

function mapReviewItem(row: HunterReviewRow, photoUrl: string | null = null): HunterReviewItem {
  const source = row.source === "signscout" || isSignScoutHunterItem(row) ? "signscout" : "google_places";
  return {
    id: row.id,
    organizationId: row.organization_id,
    placeId: row.place_id,
    name: row.name,
    formattedAddress: row.formatted_address,
    googleMapsUrl: row.google_maps_url,
    websiteUrl: row.website_url,
    phone: row.phone ?? null,
    primaryType: row.primary_type,
    businessStatus: row.business_status,
    searchQuery: row.search_query,
    status: row.status,
    acceptedOpportunityId: row.accepted_opportunity_id,
    createdAt: row.created_at,
    source,
    notes: row.notes ?? null,
    contactEmail: row.contact_email ?? null,
    photoUrl,
  };
}

export async function getHunterReviewPile(
  organizationId: string,
): Promise<
  WorkspaceQueryResult<HunterReviewItem[]> & {
    acceptedCount: number;
    foundCount: number;
    pendingCount: number;
  }
> {
  const supabase = await createClient();
  const extended = await supabase
    .from("organization_hunter_review_items")
    .select(HUNTER_REVIEW_PILE_COLUMNS_WITH_SOURCE)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(HUNTER_REVIEW_PILE_LIMIT);
  const selected = extended.error && isMissingHunterReviewColumn(extended.error)
    ? await supabase
        .from("organization_hunter_review_items")
        .select(HUNTER_REVIEW_PILE_COLUMNS)
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(HUNTER_REVIEW_PILE_LIMIT)
    : extended;
  const { data, error } = selected;

  if (error) {
    if (isMissingHunterReviewTable(error)) {
      return {
        data: [],
        setupRequired: true,
        error: error.message,
        acceptedCount: 0,
        foundCount: 0,
        pendingCount: 0,
      };
    }
    return {
      data: [],
      setupRequired: false,
      error: null,
      acceptedCount: 0,
      foundCount: 0,
      pendingCount: 0,
    };
  }

  const accepted = await supabase
    .from("organization_hunter_review_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "accepted");
  const pending = await supabase
    .from("organization_hunter_review_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  const found = await supabase
    .from("organization_hunter_review_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const rows = (data ?? []) as HunterReviewRow[];
  const photoUrls = await signScoutPhotoUrls(supabase, organizationId, rows);

  return {
    data: rows.map((row) => mapReviewItem(row, photoUrls.get(row.id) ?? null)),
    setupRequired: false,
    error: null,
    acceptedCount: accepted.count ?? 0,
    foundCount: found.count ?? 0,
    pendingCount: pending.count ?? rows.length,
  };
}

async function signScoutPhotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  rows: HunterReviewRow[],
) {
  const urls = new Map<string, string>();
  await Promise.all(
    rows.map(async (row) => {
      const path = row.photo_storage_path?.trim() ?? "";
      if (!path.startsWith(`${organizationId}/`) || path.includes("..")) return;
      const signed = await supabase.storage.from(SIGNSCOUT_PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
      if (signed.data?.signedUrl) urls.set(row.id, signed.data.signedUrl);
    }),
  );
  return urls;
}
