import type { OrganizationOpportunity } from "@/server/opportunities/queries";

export const CALL_PROSPECT_NEXT_ACTION =
  "Call this prospect. Atlas has not contacted them.";
export const NO_PHONE_PROSPECT_NEXT_ACTION =
  "No phone on file. Open Maps, add a number, or follow up another way. Atlas has not contacted them.";
export const NO_PHONE_PROSPECT_NEXT_ACTION_ES =
  "Sin teléfono. Abre Maps, agrega un número, o sigue de otra forma. Atlas no los ha contactado.";

export function googleMapsUrlFromPlaceId(placeId: string | null | undefined) {
  const id = placeId?.trim();
  if (!id) return null;
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id.replace(/^places\//, ""))}`;
}

export function prospectDetailPath(opportunityId: string, listHref = "/client/prospects") {
  const url = new URL(listHref, "https://atlas.local");
  const base = url.pathname.replace(/\/$/, "");
  url.pathname = `${base}/${opportunityId}`;
  return `${url.pathname}${url.search}`;
}

export function isUnpublishedPlacePhone(phone: string | null | undefined) {
  const raw = phone?.trim() ?? "";
  if (!raw) return true;
  return /google did not publish/i.test(raw) || /no (publicó|publico) un tel[eé]fono/i.test(raw);
}

export function publishedPlacePhone(phone: string | null | undefined) {
  const raw = phone?.trim() || null;
  if (!raw || isUnpublishedPlacePhone(raw)) return null;
  return raw;
}

export function prospectTelHref(phone: string | null | undefined) {
  const raw = publishedPlacePhone(phone);
  if (!raw) return null;
  const href = raw.replace(/[^\d+]/g, "");
  if (href.replace(/\D/g, "").length < 7) return null;
  return `tel:${href}`;
}

export function looksLikeCallNextAction(text: string | null | undefined) {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (/\bdo not call\b|\bno llames\b/i.test(raw)) return false;
  return /\bcall\b|\bllama(?:r|me)?\b|\bllame\b/i.test(raw);
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addressFromResearchSummary(summary: string | null | undefined) {
  if (!summary) return null;
  const match = summary.match(
    /Address:\s*(.+?)(?:\. Phone:|\. Website:|\.\s*Atlas has not|$)/i,
  );
  const address = match?.[1]?.trim();
  if (!address || /not listed on Google Maps/i.test(address)) return null;
  return address;
}

export function prospectPlacesCard(prospect: OrganizationOpportunity) {
  const metadata = prospect.metadata ?? {};
  const phone = publishedPlacePhone(
    prospect.contactPhone?.trim() ||
      metadataString(metadata.national_phone_number) ||
      metadataString(metadata.international_phone_number),
  );
  const placeId = metadataString(metadata.google_place_id);
  const mapsUrl =
    prospect.sourceUrl?.trim() ||
    metadataString(metadata.google_maps_url) ||
    googleMapsUrlFromPlaceId(placeId);
  const website = metadataString(metadata.website_url) || prospect.contactSocial?.trim() || null;

  return {
    phone,
    phoneHref: prospectTelHref(phone),
    address:
      metadataString(metadata.formatted_address) ||
      addressFromResearchSummary(prospect.researchSummary),
    website,
    mapsUrl,
    placeId,
    primaryType: metadataString(metadata.primary_type),
    businessStatus: metadataString(metadata.business_status),
  };
}

export function prospectHasCallablePhone(prospect: OrganizationOpportunity) {
  return Boolean(prospectPlacesCard(prospect).phoneHref);
}

export function presentedProspectNextAction(
  prospect: OrganizationOpportunity,
  spanish = false,
) {
  if (prospectHasCallablePhone(prospect)) {
    return prospect.nextAction?.trim() || CALL_PROSPECT_NEXT_ACTION;
  }
  if (!prospect.nextAction?.trim() || looksLikeCallNextAction(prospect.nextAction)) {
    return spanish ? NO_PHONE_PROSPECT_NEXT_ACTION_ES : NO_PHONE_PROSPECT_NEXT_ACTION;
  }
  return prospect.nextAction;
}

export function presentedProspectStageLabel(
  prospect: OrganizationOpportunity,
  spanish = false,
) {
  const stage = prospect.stage;
  if (
    !prospectHasCallablePhone(prospect) &&
    (stage === "ready_for_follow_up" || stage === "needs_client_input")
  ) {
    return spanish ? "Falta teléfono" : "Needs phone";
  }
  return stage.replaceAll("_", " ");
}
