import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getTrialProspectSeeds } from "./trial-desk-seed.ts";
import { buildMicahCardsFromFacts } from "./micah-business-cards.ts";
import {
  extractFactsFromWebsiteHtml,
  isPublicWebsiteUrl,
  retainPageSupportedFacts,
} from "./micah-business-facts.ts";
import { factsFromOwnerInput, resolveMicahBusinessFacts } from "./micah-website.ts";
import { micahSvgNeedsRefit } from "../../server/content-studio/gallery-art.ts";
import { gradeKingdomCaption } from "../../server/content-studio/kingdom-social.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PARTY_HTML = `
  <html><head>
    <title>Good Times & Vibes Event Rentals</title>
    <meta name="description" content="Bounce houses, water slides, and obstacle courses in Hockley, TX.">
  </head><body>
    <h1>Good Times & Vibes Event Rentals</h1>
    <h2>Rentals</h2>
    <ul>
      <li>Bounce Houses</li>
      <li>Water Slides</li>
      <li>Obstacle Courses</li>
      <li>Home</li>
    </ul>
    <p>Call (346) 299-8220</p>
    <p>Serving Hockley, TX</p>
    <p>Weekend combo $250</p>
  </body></html>
`;

test("other-vertical prospect copy does not say local local business", () => {
  const rows = getTrialProspectSeeds({
    businessName: "Good Times & Vibes Event Rentals LLC",
    businessType: "Other small business",
    zipCode: "77447",
  });
  const blob = JSON.stringify(rows);
  assert.doesNotMatch(blob, /local local/i);
  assert.match(blob, /Hockley, TX/);
  assert.doesNotMatch(blob, /this area/);
});

test("website text keeps listed services and drops invented ones", () => {
  const found = extractFactsFromWebsiteHtml(PARTY_HTML, "Good Times & Vibes Event Rentals");
  assert.ok(found.services?.some((service) => /bounce houses/i.test(service)));
  assert.ok(found.services?.some((service) => /water slides/i.test(service)));
  assert.ok(found.services?.some((service) => /obstacle courses/i.test(service)));
  assert.equal(found.phone, "(346) 299-8220");
  assert.equal(found.city, "Hockley");
  assert.match(found.offer ?? "", /\$250/);

  const page = "Bounce houses and water slides in Hockley. Call (346) 299-8220.";
  const kept = retainPageSupportedFacts(page, {
    services: ["Bounce houses", "Pony rides", "Luxury spa"],
    phone: "(346) 299-8220",
    city: "Hockley",
    state: "TX",
    offer: "5-star rated",
  });
  assert.deepEqual(kept.services, ["Bounce houses"]);
  assert.equal(kept.phone, "(346) 299-8220");
  assert.equal(kept.city, "Hockley");
  assert.equal(kept.offer, "");
});

test("private and local websites are not fetched", () => {
  assert.equal(isPublicWebsiteUrl("http://169.254.169.254/latest"), null);
  assert.equal(isPublicWebsiteUrl("http://localhost:3000"), null);
  assert.equal(isPublicWebsiteUrl("https://10.0.0.8/admin"), null);
  assert.match(isPublicWebsiteUrl("gtveventrentals.com") ?? "", /^https:\/\/gtveventrentals\.com\/?$/);
});

test("cards from owner services name only those services and never a price", () => {
  const facts = factsFromOwnerInput({
    businessName: "Good Times & Vibes Event Rentals LLC",
    city: "Hockley",
    state: "TX",
    zipCode: "77447",
    phone: "346-299-8220",
    website: "https://gtveventrentals.com",
    services: "Bounce Houses\nWater Slides\nObstacle Courses",
    offer: "",
  });
  const cards = buildMicahCardsFromFacts(facts);
  assert.equal(cards?.length, 7);
  const blob = JSON.stringify(cards);
  assert.match(blob, /Bounce Houses/);
  assert.match(blob, /Water Slides/);
  assert.match(blob, /Obstacle Courses/);
  assert.match(blob, /Hockley/);
  assert.match(blob, /346-299-8220/);
  assert.match(blob, /gtveventrentals\.com/);
  assert.doesNotMatch(blob, /\$|review|5-star|featured service|this area|call to call|local local/i);
  assert.doesNotMatch(blob, /auto-post|schedule this post|blotato/i);
  for (const card of cards ?? []) {
    assert.equal(card.slot.startsWith("business-week-d"), true);
    assert.match(card.caption, /did not post/i);
    assert.equal(
      gradeKingdomCaption({
        caption: card.caption,
        instagramCaption: card.instagramCaption,
        linkedinCaption: card.linkedinCaption,
      }).pass,
      true,
    );
    assert.equal(micahSvgNeedsRefit(card.imageSvg), false, card.headline);
  }
});

test("no services and no website stays an intake and does not fetch", async () => {
  let fetched = false;
  const result = await resolveMicahBusinessFacts({
    base: factsFromOwnerInput({
      businessName: "Good Times & Vibes Event Rentals LLC",
      zipCode: "77447",
      city: "Hockley",
      state: "TX",
    }),
    fetchImpl: async () => {
      fetched = true;
      return new Response("nope");
    },
  });
  assert.equal(result.status, "intake");
  assert.equal(fetched, false);
  assert.match(result.message, /Nothing was posted/);
});

test("a website with real services becomes cards without a model", async () => {
  const result = await resolveMicahBusinessFacts({
    base: factsFromOwnerInput({
      businessName: "Good Times & Vibes Event Rentals LLC",
      website: "https://gtveventrentals.com",
      zipCode: "77447",
    }),
    fetchImpl: async () =>
      new Response(PARTY_HTML, { status: 200, headers: { "content-type": "text/html" } }),
    completeFromPage: async () => {
      throw new Error("model should not be required when the page lists services");
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(result.facts.city, "Hockley");
  assert.ok(result.facts.services.some((service) => /bounce houses/i.test(service)));
  assert.doesNotMatch(result.facts.services.join(" "), /pony|spa/i);
  const cards = buildMicahCardsFromFacts(result.facts);
  assert.equal(cards?.length, 7);
  assert.match(JSON.stringify(cards), /\$250|Weekend combo/);
});

test("a model cannot add services that are not on the page", async () => {
  const result = await resolveMicahBusinessFacts({
    base: factsFromOwnerInput({
      businessName: "Good Times & Vibes Event Rentals LLC",
      website: "https://gtveventrentals.com",
    }),
    fetchImpl: async () =>
      new Response("<html><body><p>Call us for a quote.</p></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    completeFromPage: async () => ({
      services: ["Pony rides"],
      offer: "$99 today",
      phone: "555-0100",
      city: "Houston",
    }),
  });
  assert.equal(result.status, "intake");
  assert.equal(result.facts.services.length, 0);
  assert.equal(result.facts.offer, "");
});

test("empty MICAH desk shows the intake instead of generic sample cards", () => {
  const studio = readFileSync(join(root, "components/client-content-studio.tsx"), "utf8");
  const desk = readFileSync(join(root, "components/micah-week-desk.tsx"), "utf8");
  const seed = readFileSync(join(root, "lib/lions-den/trial-desk-seed.ts"), "utf8");
  const route = readFileSync(join(root, "app/api/client/micah/business-cards/route.ts"), "utf8");
  assert.match(studio, /MicahBusinessIntake/);
  assert.match(studio, /cards.length === 0/);
  assert.match(desk, /intakeMode/);
  assert.match(seed, /micahSlots: \[\]/);
  assert.match(route, /buildMicahBusinessCardsFromForm/);
  assert.doesNotMatch(route, /status: "published"|auto-post|blotato/i);
});
