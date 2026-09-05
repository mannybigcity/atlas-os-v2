import assert from "node:assert/strict";
import test from "node:test";
import {
  prospectDetailPath,
  prospectPlacesCard,
  prospectTelHref,
} from "./prospect-places.ts";
import type { OrganizationOpportunity } from "../../server/opportunities/queries.ts";

function prospect(overrides: Partial<OrganizationOpportunity> = {}): OrganizationOpportunity {
  return {
    id: "opp-1",
    organizationId: "org-1",
    name: "Mobile Dent Repair",
    opportunityType: "customer",
    stage: "ready_for_follow_up",
    fitScore: 0,
    ownerRole: "client",
    sourceLabel: "HUNTER Google Maps",
    sourceUrl: "https://maps.google.com/?cid=9",
    contactName: null,
    contactEmail: null,
    contactPhone: "(281) 246-8800",
    contactSocial: null,
    researchSummary:
      "Accepted from the HUNTER review pile. Mobile Dent Repair is now a Prospect the salesman can call. Address: Cypress, TX. Atlas has not emailed, called, or texted this business.",
    fitReason: null,
    nextAction: "Call this prospect. Atlas has not contacted them.",
    nextActionDue: null,
    metadata: {
      google_place_id: "ChIJ-mobile-dent",
      formatted_address: "Cypress, TX",
      website_url: "https://mobiledent.example",
      google_maps_url: "https://maps.google.com/?cid=9",
    },
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
    events: [],
    ...overrides,
  };
}

test("prospect rows deep-link to a detail path and keep preview query params", () => {
  assert.equal(prospectDetailPath("opp-1"), "/client/prospects/opp-1");
  assert.equal(
    prospectDetailPath("opp-1", "/client/prospects?workspace=afe"),
    "/client/prospects/opp-1?workspace=afe",
  );
});

test("detail card exposes Google phone, Maps, and website without inventing a number", () => {
  const card = prospectPlacesCard(prospect());
  assert.equal(card.phone, "(281) 246-8800");
  assert.equal(card.phoneHref, "tel:2812468800");
  assert.equal(card.address, "Cypress, TX");
  assert.equal(card.website, "https://mobiledent.example");
  assert.equal(card.mapsUrl, "https://maps.google.com/?cid=9");

  const older = prospectPlacesCard(
    prospect({
      contactPhone: null,
      sourceUrl: null,
      metadata: { google_place_id: "ChIJ-old" },
    }),
  );
  assert.equal(older.phone, null);
  assert.equal(older.phoneHref, null);
  assert.equal(older.address, "Cypress, TX");
  assert.equal(
    older.mapsUrl,
    "https://www.google.com/maps/search/?api=1&query_place_id=ChIJ-old",
  );
  assert.equal(prospectTelHref("123"), null);
  assert.equal(prospectTelHref(null), null);
});
