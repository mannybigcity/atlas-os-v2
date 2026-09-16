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
import { buildHunterSearchQuery, parseHunterReviewItemIds } from "@/server/hunter/review";
import {
  acceptHunterReviewItemsForOrg,
  acceptPendingHunterReviewItem,
  loadPendingHunterReviewItemsForOrg,
  type HunterAcceptOneResult,
} from "@/server/hunter/accept-item";
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

async function requireHunterAcceptContext(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  await requireHunterOperator(organizationId);

  if (!organizationId || !uuidPattern.test(organizationId)) {
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

  return { organizationId, supabase };
}

export async function acceptHunterReviewItem(formData: FormData) {
  const { organizationId, supabase } = await requireHunterAcceptContext(formData);
  const reviewItemId = String(formData.get("reviewItemId") ?? "").trim();

  if (!uuidPattern.test(reviewItemId)) {
    redirect("/client/hunter?hunter=invalid");
  }

  const { data: item, error: itemError } = await supabase
    .from("organization_hunter_review_items")
    .select(
      "id, organization_id, place_id, name, formatted_address, google_maps_url, website_url, phone, primary_type, business_status, status, accepted_opportunity_id",
    )
    .eq("id", reviewItemId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (itemError || !item) {
    redirect("/client/hunter?hunter=missing");
  }

  const result = await acceptPendingHunterReviewItem(supabase, organizationId, item);
  if (!result.ok) {
    if (result.reason === "already_accepted") {
      redirect("/client/hunter?hunter=already_accepted");
    }
    if (result.reason === "duplicate") {
      redirect("/client/hunter?hunter=duplicate");
    }
    if (result.reason === "missing") {
      redirect("/client/hunter?hunter=missing");
    }
    redirect("/client/hunter?hunter=accept_failed");
  }

  revalidatePath("/client");
  revalidatePath("/client/hunter");
  revalidatePath("/client/prospects");
  revalidatePath(`/client/prospects/${result.opportunityId}`);
  redirect("/client/hunter?hunter=accepted");
}

function hunterBulkRedirect(results: HunterAcceptOneResult[]) {
  const accepted = results.filter((result) => result.ok).length;
  const failed = results.filter(
    (result) => !result.ok && result.reason !== "already_accepted",
  ).length;
  const params = new URLSearchParams();
  if (accepted > 0 && failed > 0) {
    params.set("hunter", "accepted_partial");
    params.set("count", String(accepted));
    params.set("failed", String(failed));
  } else if (accepted > 0) {
    params.set("hunter", "accepted_bulk");
    params.set("count", String(accepted));
  } else if (results.some((result) => !result.ok && result.reason === "duplicate")) {
    params.set("hunter", "duplicate");
  } else if (results.some((result) => !result.ok && result.reason === "already_accepted")) {
    params.set("hunter", "already_accepted");
  } else {
    params.set("hunter", "accept_failed");
  }
  revalidatePath("/client");
  revalidatePath("/client/hunter");
  revalidatePath("/client/prospects");
  redirect(`/client/hunter?${params.toString()}`);
}

export async function acceptSelectedHunterReviewItems(formData: FormData) {
  const { organizationId, supabase } = await requireHunterAcceptContext(formData);
  const reviewItemIds = parseHunterReviewItemIds(formData.getAll("reviewItemId"));
  if (reviewItemIds.length === 0) {
    redirect("/client/hunter?hunter=none_selected");
  }

  const items = await loadPendingHunterReviewItemsForOrg(supabase, organizationId, reviewItemIds);
  const results = await acceptHunterReviewItemsForOrg(supabase, organizationId, items);
  hunterBulkRedirect(results);
}

export async function acceptAllHunterReviewItems(formData: FormData) {
  const { organizationId, supabase } = await requireHunterAcceptContext(formData);
  const visibleIds = parseHunterReviewItemIds(formData.getAll("reviewItemId"));
  const items = await loadPendingHunterReviewItemsForOrg(
    supabase,
    organizationId,
    visibleIds.length > 0 ? visibleIds : undefined,
  );
  if (items.length === 0) {
    redirect("/client/hunter?hunter=none_selected");
  }
  const results = await acceptHunterReviewItemsForOrg(supabase, organizationId, items);
  hunterBulkRedirect(results);
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
