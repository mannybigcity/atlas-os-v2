import assert from "node:assert/strict";
import test from "node:test";
import {
  hunterSearchDefaultsFromMarket,
  inferTrialCityFromName,
  inferTrialDeskMarket,
  inferTrialVertical,
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
  assert.equal(defaults.service, "pest control");
  assert.equal(defaults.city, "Cypress");
  assert.equal(defaults.zipCode, "");
  assert.doesNotMatch(defaults.service, /auto repair/i);
  assert.notEqual(defaults.zipCode, "77065");
  assert.notEqual(defaults.city, "Katy");
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
