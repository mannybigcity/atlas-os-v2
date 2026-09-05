import type { OrganizationOpportunity } from "@/server/opportunities/queries";

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

export function prospectTelHref(phone: string | null | undefined) {
  const raw = phone?.trim();
  if (!raw) return null;
  const href = raw.replace(/[^\d+]/g, "");
  if (href.replace(/\D/g, "").length < 7) return null;
  return `tel:${href}`;
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
  const phone =
    prospect.contactPhone?.trim() ||
    metadataString(metadata.national_phone_number) ||
    metadataString(metadata.international_phone_number);
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
