import assert from "node:assert/strict";
import test from "node:test";
import {
  HUNTER_DAILY_SEARCH_CAP,
  HUNTER_REVIEW_PILE_MIGRATION,
  HUNTER_SEARCH_RESULT_CAP,
  acceptedHunterOpportunityFields,
  acceptedProspectNextAction,
  acceptedProspectResearchSummary,
  mergeHunterPlaceDetails,
  pickStoredPlacePhone,
  annotateHunterSearchPlaces,
  buildHunterSearchPersistNote,
  buildHunterSearchQuery,
  formatHunterChatAnswer,
  hunterDailyCapReached,
  isMissingHunterReviewTable,
  placesToReviewInserts,
  parseHunterChatQuery,
} from "./review.ts";

test("HUNTER keeps the documented 10-result / 20-search UTC-day caps", () => {
  assert.equal(HUNTER_SEARCH_RESULT_CAP, 10);
  assert.equal(HUNTER_DAILY_SEARCH_CAP, 20);
  assert.equal(hunterDailyCapReached(19), false);
  assert.equal(hunterDailyCapReached(20), true);
});

test("HUNTER search requires a business type and a market", () => {
  const missing = buildHunterSearchQuery({
    service: "daycare",
    zipCode: "",
    city: "",
    state: "",
    radiusMiles: null,
  });
  assert.equal(missing.ok, false);

  const ready = buildHunterSearchQuery({
    service: "daycare",
    zipCode: "77065",
    city: "Katy",
    state: "TX",
    radiusMiles: 10,
  });
  assert.equal(ready.ok, true);
  if (ready.ok) {
    assert.match(ready.textQuery, /daycare in ZIP code 77065 or Katy, TX within 10 miles/);
  }
});

test("accepted HUNTER finds become call-ready prospects without outreach copy", () => {
  const summary = acceptedProspectResearchSummary({
    name: "Katy Paint Studio",
    formattedAddress: "123 Main St, Katy, TX",
  });
  assert.match(summary, /review pile/);
  assert.match(summary, /has not emailed, called, or texted/);
  assert.equal(acceptedProspectNextAction().includes("Call this prospect"), true);
});

test("chat answers send owners to the REVIEW PILE, not a Maps dead end", () => {
  const answer = formatHunterChatAnswer({
    message: "2 Google Maps results. 2 listings saved to the REVIEW PILE.",
    places: [{ name: "Katy Shop", formattedAddress: "Katy, TX" }],
  });
  assert.match(answer, /REVIEW PILE/);
  assert.match(answer, /Katy Shop/);
  assert.doesNotMatch(answer, /Accept finds on Prospects/);
});

test("review pile inserts stay capped at ten Google Places rows", () => {
  const places = Array.from({ length: 12 }, (_value, index) => ({
    placeId: `place-${index}`,
    name: `Shop ${index}`,
    formattedAddress: "Katy, TX",
    googleMapsUrl: "https://maps.google.com/?cid=1",
    websiteUrl: null,
    nationalPhoneNumber: null,
    internationalPhoneNumber: null,
    primaryType: "painter",
    businessStatus: "OPERATIONAL" as const,
  }));
  const rows = placesToReviewInserts("org-1", "user-1", "painters in Katy, TX", places);
  assert.equal(rows.length, 10);
  assert.equal(rows[0]?.status, "pending");
  assert.equal(rows[0]?.organization_id, "org-1");
});

test("chat prompts parse into a HUNTER search without becoming Prospects", () => {
  const houston = parseHunterChatQuery("Find plumbers in Houston, TX");
  assert.equal(houston.ok, true);
  if (houston.ok) {
    assert.match(houston.textQuery, /plumbers in Houston, TX/);
  }

  const zip = parseHunterChatQuery("find local daycares near 77065");
  assert.equal(zip.ok, true);
  if (zip.ok) {
    assert.match(zip.textQuery, /daycare/);
    assert.match(zip.textQuery, /77065/);
  }

  const missing = parseHunterChatQuery("find prospects");
  assert.equal(missing.ok, false);

  const galveston = parseHunterChatQuery("leads in Galveston, TX");
  assert.equal(galveston.ok, true);
  if (galveston.ok) {
    assert.match(galveston.textQuery, /local businesses in Galveston, TX/);
  }
});

test("missing review-pile table detection ignores unrelated query errors", () => {
  assert.equal(isMissingHunterReviewTable({ code: "PGRST205", message: "schema cache" }), true);
  assert.equal(isMissingHunterReviewTable({ code: "42P01", message: "relation does not exist" }), true);
  assert.equal(
    isMissingHunterReviewTable({
      message: "Could not find the table 'public.organization_hunter_review_items' in the schema cache",
    }),
    true,
  );
  assert.equal(isMissingHunterReviewTable({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingHunterReviewTable(null), false);
});

test("persist notes never treat a save failure as already accepted", () => {
  const saved = buildHunterSearchPersistNote({
    organizationId: "org-1",
    persistedCount: 10,
    acceptedCount: 0,
    tableMissing: false,
    persistFailed: false,
  });
  assert.match(saved, /10 listings saved to the REVIEW PILE/);
  assert.doesNotMatch(saved, /already accepted/);

  const already = buildHunterSearchPersistNote({
    organizationId: "org-1",
    persistedCount: 0,
    acceptedCount: 10,
    tableMissing: false,
    persistFailed: false,
  });
  assert.match(already, /already Prospects/);
  assert.match(already, /Open Prospects/);
  assert.doesNotMatch(already, /were not added because they were already accepted/);

  const mixed = buildHunterSearchPersistNote({
    organizationId: "org-1",
    persistedCount: 4,
    acceptedCount: 6,
    tableMissing: false,
    persistFailed: false,
  });
  assert.match(mixed, /4 listings saved to the REVIEW PILE/);
  assert.match(mixed, /6 listings already accepted stay in Prospects/);

  const missing = buildHunterSearchPersistNote({
    organizationId: "org-1",
    persistedCount: 0,
    acceptedCount: 0,
    tableMissing: true,
    persistFailed: true,
  });
  assert.match(missing, new RegExp(HUNTER_REVIEW_PILE_MIGRATION.replaceAll(".", "\\.")));
  assert.doesNotMatch(missing, /already accepted/);

  const failed = buildHunterSearchPersistNote({
    organizationId: "org-1",
    persistedCount: 0,
    acceptedCount: 0,
    tableMissing: false,
    persistFailed: true,
  });
  assert.match(failed, /could not save them to the REVIEW PILE/);
  assert.doesNotMatch(failed, /already accepted/);
});

test("search results classify Accept vs already-Prospect lanes", () => {
  const places = [
    {
      placeId: "new-1",
      name: "New Shop",
      formattedAddress: "Katy, TX",
      googleMapsUrl: "https://maps.google.com/?cid=1",
      websiteUrl: null,
      nationalPhoneNumber: null,
      internationalPhoneNumber: null,
      primaryType: "painter",
      businessStatus: "OPERATIONAL" as const,
    },
    {
      placeId: "old-1",
      name: "Old Shop",
      formattedAddress: "Katy, TX",
      googleMapsUrl: "https://maps.google.com/?cid=2",
      websiteUrl: null,
      nationalPhoneNumber: null,
      internationalPhoneNumber: null,
      primaryType: "painter",
      businessStatus: "OPERATIONAL" as const,
    },
  ];
  const annotated = annotateHunterSearchPlaces(
    places,
    [
      {
        id: "review-old",
        place_id: "old-1",
        status: "accepted",
        accepted_opportunity_id: "opp-1",
      },
    ],
    ["new-1"],
  );
  assert.equal(annotated[0]?.lane, "review");
  assert.equal(annotated[1]?.lane, "prospect");
  assert.equal(annotated[1]?.opportunityId, "opp-1");
});

test("Accept maps Google Places fields onto the Prospect without inventing a phone", () => {
  const withPhone = acceptedHunterOpportunityFields({
    reviewItemId: "review-1",
    placeId: "ChIJ-mobile-dent",
    name: "Mobile Dent Repair",
    formattedAddress: "Cypress, TX",
    googleMapsUrl: "https://maps.google.com/?cid=9",
    websiteUrl: "https://mobiledent.example",
    nationalPhoneNumber: "(281) 555-0147",
    internationalPhoneNumber: "+1 281-555-0147",
    primaryType: "car_repair",
    businessStatus: "OPERATIONAL",
  });

  assert.equal(withPhone.contact_phone, "(281) 555-0147");
  assert.equal(withPhone.source_url, "https://maps.google.com/?cid=9");
  assert.equal(withPhone.metadata.google_place_id, "ChIJ-mobile-dent");
  assert.equal(withPhone.metadata.formatted_address, "Cypress, TX");
  assert.equal(withPhone.metadata.website_url, "https://mobiledent.example");
  assert.equal(withPhone.metadata.no_outreach_sent, true);
  assert.match(withPhone.research_summary, /Cypress, TX/);
  assert.match(withPhone.research_summary, /\(281\) 555-0147/);
  assert.match(withPhone.research_summary, /has not emailed, called, or texted/);
  assert.equal(withPhone.next_action.includes("Call this prospect"), true);

  const missingPhone = acceptedHunterOpportunityFields({
    reviewItemId: "review-2",
    placeId: "places/ChIJ-old",
    name: "Texas Paintless Dent",
    formattedAddress: null,
    googleMapsUrl: null,
    websiteUrl: null,
    primaryType: null,
    businessStatus: null,
  });
  assert.equal(missingPhone.contact_phone, null);
  assert.equal(
    missingPhone.source_url,
    "https://www.google.com/maps/search/?api=1&query_place_id=ChIJ-old",
  );
  assert.doesNotMatch(missingPhone.research_summary, /Phone:/);
  assert.equal(pickStoredPlacePhone({ nationalPhoneNumber: "123" }), null);
});

test("Accept prefers Place Details phone and website over empty review-pile fields", () => {
  const merged = mergeHunterPlaceDetails(
    {
      id: "review-3",
      place_id: "ChIJ-detail",
      name: "Mobile Dent Repair",
      formatted_address: "Cypress, TX",
      google_maps_url: "https://maps.google.com/?cid=3",
      website_url: null,
      primary_type: "car_repair",
      business_status: "OPERATIONAL",
    },
    {
      placeId: "ChIJ-detail",
      name: "Mobile Dent Repair",
      formattedAddress: "123 Paint St, Cypress, TX",
      googleMapsUrl: "https://maps.google.com/?cid=3",
      websiteUrl: "https://mobiledent.example",
      nationalPhoneNumber: "(281) 246-8800",
      internationalPhoneNumber: "+1 281-246-8800",
      primaryType: "car_repair",
      businessStatus: "OPERATIONAL",
    },
  );
  const fields = acceptedHunterOpportunityFields(merged);
  assert.equal(fields.contact_phone, "(281) 246-8800");
  assert.equal(fields.metadata.website_url, "https://mobiledent.example");
  assert.equal(fields.metadata.formatted_address, "123 Paint St, Cypress, TX");
});
