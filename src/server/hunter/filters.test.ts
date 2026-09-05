import assert from "node:assert/strict";
import test from "node:test";
import {
  applyHunterSearchFilters,
  emptyHunterSearchFilters,
  formatHunterSearchCountMessage,
  hunterFiltersActive,
  hunterGapLabels,
  isMissingOrWeakSocial,
  isMissingWebsite,
  isSocialWebsiteUrl,
  parseHunterSearchFilters,
  placeMatchesHunterFilters,
} from "./filters.ts";

const withSite = { websiteUrl: "https://katypaint.example/" };
const noSite = { websiteUrl: null };
const facebookOnly = { websiteUrl: "https://www.facebook.com/katypaint" };
const instagramOnly = { websiteUrl: "https://instagram.com/katypaint" };

test("default HUNTER filters are off and keep every Places row", () => {
  assert.deepEqual(emptyHunterSearchFilters, { missingWebsite: false, weakSocial: false });
  assert.equal(hunterFiltersActive(emptyHunterSearchFilters), false);
  const kept = applyHunterSearchFilters([withSite, noSite, facebookOnly], emptyHunterSearchFilters);
  assert.equal(kept.length, 3);
});

test("unchecked form fields do not force a filter", () => {
  const form = new FormData();
  form.set("service", "daycare");
  assert.deepEqual(parseHunterSearchFilters(form), emptyHunterSearchFilters);
});

test("checked gap filters parse from the search form", () => {
  const form = new FormData();
  form.set("missingWebsite", "yes");
  form.set("weakSocial", "on");
  assert.deepEqual(parseHunterSearchFilters(form), {
    missingWebsite: true,
    weakSocial: true,
  });
});

test("No website uses Places websiteUri only and does not invent a site", () => {
  assert.equal(isMissingWebsite(noSite), true);
  assert.equal(isMissingWebsite(withSite), false);
  assert.equal(isMissingWebsite(facebookOnly), false);
  assert.deepEqual(hunterGapLabels(noSite), ["no_website"]);
  assert.deepEqual(hunterGapLabels(withSite), []);
});

test("Weak social treats a missing site or a social-profile website as a gap", () => {
  assert.equal(isSocialWebsiteUrl(facebookOnly.websiteUrl), true);
  assert.equal(isSocialWebsiteUrl(instagramOnly.websiteUrl), true);
  assert.equal(isSocialWebsiteUrl(withSite.websiteUrl), false);
  assert.equal(isSocialWebsiteUrl(null), false);
  assert.equal(isMissingOrWeakSocial(noSite), true);
  assert.equal(isMissingOrWeakSocial(facebookOnly), true);
  assert.equal(isMissingOrWeakSocial(withSite), false);
  assert.deepEqual(hunterGapLabels(facebookOnly), ["social_only"]);
});

test("selected gap filters are a union, so both toggles still include social-only sites", () => {
  const both = { missingWebsite: true, weakSocial: true };
  assert.equal(placeMatchesHunterFilters(noSite, { missingWebsite: true, weakSocial: false }), true);
  assert.equal(placeMatchesHunterFilters(facebookOnly, { missingWebsite: true, weakSocial: false }), false);
  assert.equal(placeMatchesHunterFilters(facebookOnly, { missingWebsite: false, weakSocial: true }), true);
  assert.equal(placeMatchesHunterFilters(facebookOnly, both), true);
  assert.equal(placeMatchesHunterFilters(withSite, both), false);

  const kept = applyHunterSearchFilters([withSite, noSite, facebookOnly], both);
  assert.deepEqual(
    kept.map((place) => place.websiteUrl),
    [null, "https://www.facebook.com/katypaint"],
  );
});

test("filtered empty copy stays honest about Places fields", () => {
  const empty = formatHunterSearchCountMessage({
    rawCount: 10,
    keptCount: 0,
    filters: { missingWebsite: true, weakSocial: false },
  });
  assert.match(empty, /Google Maps returned 10 listings/);
  assert.match(empty, /None matched no website/);
  assert.match(empty, /does not receive Facebook or Instagram fields/);
  assert.match(empty, /does not invent a website or phone/);

  const narrowed = formatHunterSearchCountMessage({
    rawCount: 10,
    keptCount: 3,
    filters: { missingWebsite: false, weakSocial: true },
  });
  assert.equal(narrowed, "3 Google Maps results, narrowed from 10 (weak social).");

  const unfiltered = formatHunterSearchCountMessage({
    rawCount: 10,
    keptCount: 10,
    filters: emptyHunterSearchFilters,
  });
  assert.equal(unfiltered, "10 Google Maps results.");

  const none = formatHunterSearchCountMessage({
    rawCount: 0,
    keptCount: 0,
    filters: emptyHunterSearchFilters,
  });
  assert.equal(none, "0 Google Maps results.");
});
