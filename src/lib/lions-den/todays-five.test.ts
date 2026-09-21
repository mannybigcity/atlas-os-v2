import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { OrganizationOpportunity } from "../../server/opportunities/queries.ts";
import {
  TODAYS_FIVE_LIMIT,
  TODAYS_FIVE_PLACES_LOOKUP_CAP,
  assembleTodaysFive,
  formatTodaysFiveReason,
  mergePlaceFootprint,
  parseTodaysFiveCache,
  placeFootprintFromDetails,
  presentTodaysFive,
  rankTodaysFiveProspects,
  todaysFiveNotes,
} from "./todays-five.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const deskDate = "2026-09-21";

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function prospect(overrides: Partial<OrganizationOpportunity> = {}): OrganizationOpportunity {
  return {
    id: "opp-1",
    organizationId: "org-1",
    name: "Cypress Plumbing",
    opportunityType: "customer",
    stage: "ready_for_follow_up",
    fitScore: 0,
    ownerRole: "client",
    sourceLabel: "HUNTER Google Maps",
    sourceUrl: null,
    contactName: null,
    contactEmail: null,
    contactPhone: "(281) 555-0101",
    contactSocial: null,
    researchSummary: "Call this prospect. Atlas has not contacted them.",
    fitReason: null,
    nextAction: "Call this prospect. Atlas has not contacted them.",
    nextActionDue: null,
    metadata: { google_place_id: "place-1" },
    createdAt: "2026-09-20T15:00:00.000Z",
    updatedAt: "2026-09-20T15:00:00.000Z",
    events: [],
    ...overrides,
  };
}

test("Today's 5 ranks missing websites above social-only pages and skips called, closed, and sample rows", () => {
  const noSite = prospect({
    id: "no-site",
    name: "No Site Plumbing",
    metadata: { google_place_id: "p-no-site" },
  });
  const socialOnly = prospect({
    id: "social",
    name: "Facebook Only Paint",
    metadata: { google_place_id: "p-social", website_url: "https://facebook.com/paint" },
    contactSocial: "https://facebook.com/paint",
  });
  const fullSite = prospect({
    id: "site",
    name: "Has A Website",
    contactEmail: "owner@example.com",
    metadata: { google_place_id: "p-site", website_url: "https://hasasite.example" },
    contactSocial: "https://hasasite.example",
  });
  const noPhone = prospect({
    id: "nophone",
    name: "No Phone",
    contactPhone: null,
    metadata: {},
  });
  const called = prospect({
    id: "called",
    name: "Already Called",
    stage: "contacted",
    metadata: { owner_contacted_at: "2026-09-20T12:00:00.000Z" },
  });
  const closed = prospect({
    id: "closed",
    name: "Closed Shop",
    metadata: { business_status: "CLOSED_PERMANENTLY" },
  });
  const sample = prospect({
    id: "sample",
    name: "Sample Shop",
    metadata: { trial_seed: true },
    sourceUrl: "https://example.invalid/trial/sample",
  });
  const { queueSize, ranked } = rankTodaysFiveProspects(
    [fullSite, socialOnly, noPhone, called, closed, sample, noSite],
    deskDate,
    "UTC",
  );

  assert.equal(queueSize, 3);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.row.id, "no-site");
  assert.equal(ranked[1]?.row.id, "social");
  assert.ok(ranked[0]?.row.score > (ranked.find((item) => item.row.id === "social")?.row.score ?? 0));
  assert.deepEqual(ranked[0]?.row.reasons, ["no_website", "no_social", "thin_footprint"]);
  assert.deepEqual(ranked.find((item) => item.row.id === "social")?.row.reasons, ["weak_social", "thin_footprint"]);
  assert.equal(ranked.some((item) => item.row.id === "site"), false);
  assert.equal(ranked.some((item) => ["nophone", "called", "closed", "sample"].includes(item.row.id)), false);
  assert.equal(formatTodaysFiveReason("no_website"), "No website");
  assert.equal(formatTodaysFiveReason("no_social", true), "Sin redes");
});

test("a stale thin listing outranks a fresh social-only page when the site is still missing", () => {
  const freshSocial = prospect({
    id: "fresh",
    name: "Fresh Social",
    createdAt: "2026-09-21T12:00:00.000Z",
    metadata: { website_url: "https://instagram.com/fresh" },
    contactSocial: "https://instagram.com/fresh",
  });
  const stale = prospect({
    id: "stale",
    name: "Stale No Site",
    createdAt: "2026-07-01T12:00:00.000Z",
    metadata: {},
  });
  const { ranked } = rankTodaysFiveProspects([freshSocial, stale], deskDate, "UTC");
  assert.equal(ranked[0]?.row.id, "stale");
  assert.ok(ranked[0]?.row.reasons.includes("stale_listing"));
  assert.equal(ranked[1]?.row.reasons.includes("stale_listing"), false);
});

test("an unknown Places website does not invent a missing-site gap", () => {
  const withSite = prospect({
    metadata: { website_url: "https://shop.example", business_status: "OPERATIONAL" },
    contactSocial: "https://shop.example",
    contactEmail: "a@shop.example",
  });
  const ambiguous = placeFootprintFromDetails({
    websiteUrl: null,
    nationalPhoneNumber: null,
    businessStatus: "OPERATIONAL",
  });
  assert.equal(ambiguous?.websiteKnown, false);
  const kept = mergePlaceFootprint(withSite, ambiguous);
  assert.equal(kept.metadata.website_url, "https://shop.example");

  const confirmed = placeFootprintFromDetails({
    websiteUrl: null,
    nationalPhoneNumber: "(281) 555-0199",
    businessStatus: "OPERATIONAL",
  });
  assert.equal(confirmed?.websiteKnown, true);
  const cleared = mergePlaceFootprint(withSite, confirmed);
  assert.equal(cleared.metadata.website_url, null);
});

test("assemble returns exactly five, fewer when the pool is thin, and reuses the morning cache", async () => {
  const many = Array.from({ length: 7 }, (_, index) =>
    prospect({
      id: `row-${index}`,
      name: `Shop ${index}`,
      contactPhone: `(713) 555-01${index}${index}`,
      metadata: { google_place_id: `place-${index}` },
      createdAt: `2026-09-0${index + 1}T15:00:00.000Z`,
    }),
  );
  const lookedUp: string[] = [];
  const built = await assembleTodaysFive({
    prospects: many,
    deskDate,
    cached: null,
    timeZone: "UTC",
    lookupPlace: async (placeId) => {
      lookedUp.push(placeId);
      return { websiteUrl: null, websiteKnown: true, businessStatus: "OPERATIONAL" };
    },
  });
  assert.equal(built.reusedCache, false);
  assert.equal(built.snapshot.rows.length, TODAYS_FIVE_LIMIT);
  assert.equal(built.snapshot.poolSize, 7);
  assert.equal(built.placeLookups, 7);
  assert.equal(built.snapshot.placesChecked, true);
  assert.deepEqual(
    built.snapshot.rows.map((row) => row.id),
    ["row-0", "row-1", "row-2", "row-3", "row-4"],
  );

  lookedUp.length = 0;
  const again = await assembleTodaysFive({
    prospects: many,
    deskDate,
    cached: built.snapshot,
    timeZone: "UTC",
    lookupPlace: async (placeId) => {
      lookedUp.push(placeId);
      throw new Error("Places should not run again today");
    },
  });
  assert.equal(again.reusedCache, true);
  assert.equal(again.placeLookups, 0);
  assert.deepEqual(lookedUp, []);
  assert.equal(again.snapshot.rows.length, 5);

  const thin = await assembleTodaysFive({
    prospects: many.slice(0, 2),
    deskDate: "2026-09-22",
    cached: built.snapshot,
    timeZone: "UTC",
  });
  assert.equal(thin.reusedCache, false);
  assert.equal(thin.snapshot.rows.length, 2);
  assert.equal(thin.snapshot.poolSize, 2);
  assert.equal(thin.placeLookups, 0);
  const notes = todaysFiveNotes({
    rowCount: 2,
    poolSize: 2,
    queueSize: 2,
    loggedOff: 0,
    placesChecked: false,
    hunterChecked: false,
    spanish: false,
  });
  assert.match(notes.situation, /Only 2 phone-reachable prospects/);
  assert.match(notes.footnotes.join(" "), /does not call, email, or text/);
});

test("Places lookups stay capped and a confirmed website drops out of the five", async () => {
  const many = Array.from({ length: 10 }, (_, index) =>
    prospect({
      id: `cap-${index}`,
      name: `Cap ${String.fromCharCode(65 + index)}`,
      contactPhone: `(832) 555-20${index.toString().padStart(2, "0")}`,
      metadata: { google_place_id: `cap-place-${index}` },
      createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T15:00:00.000Z`,
    }),
  );
  const lookedUp: string[] = [];
  const built = await assembleTodaysFive({
    prospects: many,
    deskDate,
    cached: null,
    timeZone: "UTC",
    lookupPlace: async (placeId) => {
      lookedUp.push(placeId);
      if (placeId === "cap-place-0") {
        return { websiteUrl: "https://now-has-a-site.example", websiteKnown: true, businessStatus: "OPERATIONAL" };
      }
      return { websiteUrl: null, websiteKnown: true, businessStatus: "OPERATIONAL" };
    },
  });
  assert.equal(lookedUp.length, TODAYS_FIVE_PLACES_LOOKUP_CAP);
  assert.equal(built.snapshot.rows.some((row) => row.id === "cap-0"), false);
  assert.equal(built.snapshot.rows.length, TODAYS_FIVE_LIMIT);
  assert.equal(built.snapshot.rows[0]?.id, "cap-1");
});

test("Hunter annotates a real website without reordering or sending mail", async () => {
  const closedSite = prospect({
    id: "paused",
    name: "Paused With Site",
    contactEmail: "owner@paused.example",
    metadata: {
      google_place_id: "paused-place",
      website_url: "https://paused.example",
      business_status: "CLOSED_TEMPORARILY",
    },
    contactSocial: "https://paused.example",
  });
  const noSite = prospect({ id: "bare", name: "Bare Shop", metadata: { google_place_id: "bare-place" } });
  const domains: string[] = [];
  const built = await assembleTodaysFive({
    prospects: [closedSite, noSite],
    deskDate,
    cached: null,
    timeZone: "UTC",
    enrichDomain: async (domain) => {
      domains.push(domain);
      return { email: "desk@paused.example", hasSocialProfile: false };
    },
  });
  assert.deepEqual(
    built.snapshot.rows.map((row) => row.id),
    ["bare", "paused"],
  );
  assert.deepEqual(domains, ["paused.example"]);
  assert.equal(built.snapshot.hunterChecked, true);
  assert.equal(built.snapshot.rows[1]?.hunterEmail, "desk@paused.example");
  assert.ok(built.snapshot.rows[1]?.reasons.includes("no_social"));
  assert.equal(built.hunterLookups, 1);
});

test("logged calls drop off the cached five without a new Places trip", () => {
  const people = [
    prospect({ id: "keep", name: "Keep" }),
    prospect({ id: "gone", name: "Gone", contactPhone: "(281) 555-0199" }),
  ];
  const snapshot = parseTodaysFiveCache({
    version: 1,
    deskDate,
    poolSize: 2,
    queueSize: 2,
    placesChecked: true,
    hunterChecked: false,
    rows: [
      {
        id: "keep",
        name: "Keep",
        phone: "(281) 555-0101",
        phoneHref: "tel:2815550101",
        reasons: ["no_website", "no_social"],
        score: 64,
        hunterEmail: null,
      },
      {
        id: "gone",
        name: "Gone",
        phone: "(281) 555-0199",
        phoneHref: "tel:2815550199",
        reasons: ["no_website"],
        score: 40,
        hunterEmail: "not-an-email",
      },
    ],
  });
  assert.ok(snapshot);
  assert.equal(snapshot.rows[1]?.hunterEmail, null);
  const called = people.map((item) =>
    item.id === "gone"
      ? { ...item, stage: "contacted" as const, metadata: { owner_contacted_at: "2026-09-21T18:00:00.000Z" } }
      : item,
  );
  const desk = presentTodaysFive(snapshot, called);
  assert.deepEqual(desk.rows.map((row) => row.id), ["keep"]);
  assert.equal(desk.loggedOff, 1);
  assert.equal(desk.rows[0]?.hunterEmail, null);
  assert.equal(parseTodaysFiveCache({ version: 2, deskDate, rows: [] }), null);
  const notes = todaysFiveNotes({
    rowCount: desk.rows.length,
    poolSize: desk.poolSize,
    queueSize: desk.queueSize,
    loggedOff: desk.loggedOff,
    placesChecked: true,
    hunterChecked: false,
    spanish: false,
  });
  assert.match(notes.situation, /already left Calls to make/);
  assert.match(notes.footnotes.join(" "), /Google Places checked/);

  const sampleOnly = presentTodaysFive(
    { ...snapshot, rows: [], poolSize: 0, queueSize: 0 },
    [prospect({ id: "sample", metadata: { trial_seed: true }, sourceUrl: "https://example.invalid/trial/sample" })],
  );
  assert.equal(sampleOnly.skippedSamples, 1);
  const sampleNotes = todaysFiveNotes({
    rowCount: 0,
    poolSize: 0,
    queueSize: 0,
    loggedOff: 0,
    skippedSamples: sampleOnly.skippedSamples,
    placesChecked: false,
    hunterChecked: false,
    spanish: false,
  });
  assert.match(sampleNotes.situation, /Sample records stay off/);
});

test("Today's 5 sits on the AFE call queue and reuses HUNTER Places", () => {
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const panel = readRepo("src/components/lions-den/todays-five-panel.tsx");
  const loader = readRepo("src/server/lions-den/todays-five.ts");
  const hunter = readRepo("src/server/integrations/hunter-io.ts");
  const migration = readRepo("supabase/migrations/20260921183000_todays_five_desk_cache.sql");
  const env = readRepo(".env.example");
  const page = readRepo("src/app/client/page.tsx");

  assert.match(overview, /TodaysFivePanel/);
  assert.match(overview, /!sisDesk && todaysFive/);
  assert.match(overview, /data-calls-to-make/);
  assert.match(panel, /Today’s 5/);
  assert.match(panel, /Los 5 de hoy/);
  assert.match(panel, /phoneHref/);
  assert.match(panel, /data-todays-five-dial/);
  assert.doesNotMatch(panel, /mailto:|twilio|Twilio|api\.resend\.com/i);
  assert.doesNotMatch(loader, /twilio|resend|mailto:/i);
  assert.match(loader, /getGooglePlaceDetails/);
  assert.doesNotMatch(loader, /places:searchText|new Google/);
  assert.match(loader, /enrichHunterDomain/);
  assert.match(hunter, /HUNTER_API_KEY/);
  assert.match(hunter, /api\.hunter\.io\/v2\/domain-search/);
  assert.match(migration, /todays_five jsonb/);
  assert.match(env, /HUNTER_API_KEY=/);
  assert.match(page, /loadTodaysFiveForDesk/);
  assert.match(page, /!isSisWorkspace && !wantsSisLionsDen/);
});
