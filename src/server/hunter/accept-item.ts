import { getGooglePlaceDetails } from "@/server/integrations/google-places";
import { findEmailOnBusinessWebsite } from "@/server/hunter/website-email";
import {
  HUNTER_BULK_ACCEPT_CONCURRENCY,
  HUNTER_REVIEW_PILE_LIMIT,
  acceptedHunterOpportunityFields,
  mergeHunterPlaceDetails,
  parseHunterReviewItemIds,
  pendingHunterReviewItemsForOrg,
  blockedHunterAcceptReason,
} from "@/server/hunter/review";

export const HUNTER_REVIEW_ITEM_SELECT =
  "id, organization_id, place_id, name, formatted_address, google_maps_url, website_url, phone, primary_type, business_status, status, accepted_opportunity_id";

export type HunterAcceptRow = {
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
  status: string;
  accepted_opportunity_id: string | null;
};

export type HunterAcceptOneResult =
  | { ok: true; reviewItemId: string; opportunityId: string }
  | {
      ok: false;
      reviewItemId: string;
      reason: "missing" | "already_accepted" | "duplicate" | "failed";
    };

type HunterDb = {
  from: (table: string) => any;
};

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const current = next;
      next += 1;
      results[current] = await fn(items[current] as T);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

/**
 * Same Accept as the single-row HUNTER button: org-scoped, no invented phone,
 * website email when Google listed a site, CALL_OK only when Google published a number.
 */
export async function acceptPendingHunterReviewItem(
  supabase: HunterDb,
  organizationId: string,
  item: HunterAcceptRow,
): Promise<HunterAcceptOneResult> {
  const blocked = blockedHunterAcceptReason(item, organizationId);
  if (blocked) {
    return { ok: false, reviewItemId: item.id, reason: blocked };
  }

  let placeDetails = null;
  try {
    placeDetails = await getGooglePlaceDetails(item.place_id);
  } catch {
    placeDetails = null;
  }

  const merged = mergeHunterPlaceDetails(item, placeDetails);
  const websiteEmail = merged.websiteUrl ? await findEmailOnBusinessWebsite(merged.websiteUrl) : null;
  const opportunityFields = acceptedHunterOpportunityFields({
    ...merged,
    contactEmail: websiteEmail,
  });
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
      return { ok: false, reviewItemId: item.id, reason: "duplicate" };
    }
    return { ok: false, reviewItemId: item.id, reason: "failed" };
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
    return { ok: false, reviewItemId: item.id, reason: "failed" };
  }

  return { ok: true, reviewItemId: item.id, opportunityId: opportunity.id };
}

export async function loadPendingHunterReviewItemsForOrg(
  supabase: HunterDb,
  organizationId: string,
  ids?: string[],
): Promise<HunterAcceptRow[]> {
  const selectedIds = ids ? parseHunterReviewItemIds(ids).slice(0, HUNTER_REVIEW_PILE_LIMIT) : null;
  if (selectedIds && selectedIds.length === 0) return [];

  let query = supabase
    .from("organization_hunter_review_items")
    .select(HUNTER_REVIEW_ITEM_SELECT)
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (selectedIds) {
    query = query.in("id", selectedIds);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(HUNTER_REVIEW_PILE_LIMIT);

  if (error || !data) return [];
  return pendingHunterReviewItemsForOrg(data as HunterAcceptRow[], organizationId);
}

export async function acceptHunterReviewItemsForOrg(
  supabase: HunterDb,
  organizationId: string,
  items: HunterAcceptRow[],
): Promise<HunterAcceptOneResult[]> {
  const scoped = pendingHunterReviewItemsForOrg(items, organizationId).slice(
    0,
    HUNTER_REVIEW_PILE_LIMIT,
  );
  return mapPool(scoped, HUNTER_BULK_ACCEPT_CONCURRENCY, (item) =>
    acceptPendingHunterReviewItem(supabase, organizationId, item),
  );
}
