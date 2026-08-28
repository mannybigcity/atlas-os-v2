import assert from "node:assert/strict";
import test from "node:test";
import {
  HUNTER_DAILY_SEARCH_CAP,
  HUNTER_SEARCH_RESULT_CAP,
  acceptedProspectNextAction,
  acceptedProspectResearchSummary,
  buildHunterSearchQuery,
  hunterDailyCapReached,
  placesToReviewInserts,
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

test("review pile inserts stay capped at ten Google Places rows", () => {
  const places = Array.from({ length: 12 }, (_value, index) => ({
    placeId: `place-${index}`,
    name: `Shop ${index}`,
    formattedAddress: "Katy, TX",
    googleMapsUrl: "https://maps.google.com/?cid=1",
    websiteUrl: null,
    primaryType: "painter",
    businessStatus: "OPERATIONAL" as const,
  }));
  const rows = placesToReviewInserts("org-1", "user-1", "painters in Katy, TX", places);
  assert.equal(rows.length, 10);
  assert.equal(rows[0]?.status, "pending");
  assert.equal(rows[0]?.organization_id, "org-1");
});
