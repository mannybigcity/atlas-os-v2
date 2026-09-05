import assert from "node:assert/strict";
import test from "node:test";
import {
  extractTrialMetadata,
  isTrialConfirmationRequest,
  isTrialSignupMetadata,
} from "./metadata.ts";

test("extractTrialMetadata reads snake_case and camelCase signup fields", () => {
  const snake = extractTrialMetadata({
    full_name: "Smoke Owner",
    business_name: "Smoke Den HVAC",
    email: "owner@example.com",
    phone: "555-0100",
    business_type: "Contractor or home service",
    primary_growth_goal: "More booked jobs",
  });

  assert.equal(snake.businessName, "Smoke Den HVAC");

  const camel = extractTrialMetadata({
    fullName: "Smoke Owner",
    businessName: "Smoke Den HVAC",
    email: "owner@example.com",
    phone: "555-0100",
    businessType: "Contractor or home service",
    primaryGrowthGoal: "More booked jobs",
  });

  assert.equal(camel.businessName, "Smoke Den HVAC");
});

test("isTrialSignupMetadata detects trial signup metadata and ignores sample desk", () => {
  assert.equal(
    isTrialSignupMetadata({
      business_name: "Smoke Den HVAC",
      business_type: "Contractor or home service",
      terms_accepted_at: "2026-09-04T00:00:00.000Z",
    }),
    true,
  );

  assert.equal(
    isTrialSignupMetadata({
      businessName: "Smoke Den HVAC",
      primaryGrowthGoal: "More booked jobs",
      privacyAcceptedAt: "2026-09-04T00:00:00.000Z",
    }),
    true,
  );

  assert.equal(isTrialSignupMetadata({ business_name: "Only Name" }), false);
  assert.equal(isTrialSignupMetadata({ business_name: "Sample", sample_desk: true }), false);
});

test("isTrialConfirmationRequest recognizes legacy starter links and client redirects", () => {
  assert.equal(isTrialConfirmationRequest({ type: "email" }), true);
  assert.equal(isTrialConfirmationRequest({ type: "signup" }), true);
  assert.equal(isTrialConfirmationRequest({ next: "/starter" }), true);
  assert.equal(isTrialConfirmationRequest({ next: "/client?status=welcome" }), true);
  assert.equal(isTrialConfirmationRequest({ type: "recovery", next: "/reset-password" }), false);
  assert.equal(isTrialConfirmationRequest({ type: "recovery", next: "/starter" }), true);
});
