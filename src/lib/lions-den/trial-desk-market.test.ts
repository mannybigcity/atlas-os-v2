import assert from "node:assert/strict";
import test from "node:test";
import {
  TRIAL_DESK_VERTICALS,
  hunterSearchDefaultsFromMarket,
  inferTrialCityFromName,
  inferTrialDeskMarket,
  inferTrialVertical,
  isSelfSearch,
  referralTargetsForVertical,
} from "./trial-desk-market.ts";

test("Cypress Pest Pros infers pest control in Cypress, TX — not auto repair / 77065", () => {
  const market = inferTrialDeskMarket({
    businessName: "Cypress Pest Pros",
    businessType: "Contractor or home service",
  });
  assert.equal(market.vertical, "pest");
  assert.equal(market.serviceQuery, "pest control");
  assert.equal(market.city, "Cypress");
  assert.equal(market.state, "TX");
  assert.equal(market.zipCode, "");

  const defaults = hunterSearchDefaultsFromMarket(market);
  assert.equal(defaults.service, "property management company");
  assert.equal(defaults.ownService, "pest control");
  assert.equal(defaults.city, "Cypress");
  assert.equal(defaults.zipCode, "");
  assert.doesNotMatch(defaults.service, /auto repair|pest/i);
  assert.notEqual(defaults.zipCode, "77065");
  assert.notEqual(defaults.city, "Katy");
});

test("HUNTER defaults to who sends the trade work, never the trade itself", () => {
  const plumber = inferTrialDeskMarket({ businessName: "Cypress Plumbing Co", businessType: "Contractor or home service" });
  assert.equal(plumber.vertical, "contractor");
  const defaults = hunterSearchDefaultsFromMarket(plumber);
  assert.equal(defaults.service, "property management company");
  assert.ok(defaults.targets.length >= 5);
  assert.ok(defaults.targets.some((target) => target.query === "real estate agency"));
  assert.ok(defaults.targets.every((target) => target.why.length > 10 && target.whyEs.length > 10));
  assert.ok(defaults.targets.every((target) => !/plumb|home service/i.test(target.query)));

  for (const vertical of TRIAL_DESK_VERTICALS) {
    const targets = referralTargetsForVertical(vertical);
    assert.ok(targets.length >= 5, vertical);
    assert.equal(new Set(targets.map((target) => target.query)).size, targets.length, vertical);
  }

  assert.equal(isSelfSearch("plumber", plumber), true);
  assert.equal(isSelfSearch("Home Service", plumber), true);
  assert.equal(isSelfSearch("property management company", plumber), false);
  assert.equal(isSelfSearch("", plumber), false);
  const pest = inferTrialDeskMarket({ businessName: "Cypress Pest Pros" });
  assert.equal(isSelfSearch("pest control", pest), true);
  assert.equal(isSelfSearch("termite exterminator", pest), true);
  assert.equal(isSelfSearch("restaurant", pest), false);
});

test("Massive Action Maintenance infers maintenance and does not invent a ZIP", () => {
  const market = inferTrialDeskMarket({
    businessName: "Massive Action Maintenance",
    businessType: "Contractor or home service",
  });
  assert.equal(market.vertical, "maintenance");
  assert.equal(market.serviceQuery, "home maintenance");
  assert.equal(market.zipCode, "");
  assert.equal(inferTrialCityFromName("Massive Action Maintenance"), "");
});

test("signup city and ZIP win over name inference", () => {
  const market = inferTrialDeskMarket({
    businessName: "Cypress Pest Pros",
    businessType: "Contractor or home service",
    city: "Tomball",
    zipCode: "77377",
    metadata: { city: "Houston", postal_code: "77065" },
  });
  assert.equal(market.city, "Tomball");
  assert.equal(market.zipCode, "77377");
});

test("metadata fills market when dedicated fields are empty", () => {
  const market = inferTrialDeskMarket({
    metadata: {
      businessName: "Harbor HVAC",
      business_type: "Contractor or home service",
      city: "Spring",
      zipCode: "77379",
    },
  });
  assert.equal(market.businessName, "Harbor HVAC");
  assert.equal(market.vertical, "hvac");
  assert.equal(market.city, "Spring");
  assert.equal(market.zipCode, "77379");
  assert.equal(market.state, "TX");
});

test("business type alone still avoids the hardcoded auto-repair market", () => {
  const contractor = inferTrialVertical({ businessType: "Contractor or home service" });
  const professional = inferTrialVertical({ businessType: "Professional service" });
  const retail = inferTrialVertical({ businessType: "Retail or ecommerce" });
  const other = inferTrialVertical({ businessType: "Other small business" });
  assert.equal(contractor.serviceQuery, "home service");
  assert.equal(professional.serviceQuery, "professional service");
  assert.equal(retail.serviceQuery, "retail shop");
  assert.equal(other.serviceQuery, "local business");
  assert.doesNotMatch(
    `${contractor.serviceQuery} ${professional.serviceQuery} ${retail.serviceQuery} ${other.serviceQuery}`,
    /auto repair|daycare|77065|Katy/,
  );
});
