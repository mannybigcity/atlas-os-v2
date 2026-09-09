import assert from "node:assert/strict";
import test from "node:test";
import {
  countRealHunterFinds,
  countRealProspects,
  hasTrialSamples,
  isTrialSampleDraft,
  isTrialSampleHunterItem,
  isTrialSampleOpportunity,
  trialSampleCopy,
} from "./trial-samples.ts";
import { describeDeskTrial, trialPillCopy } from "./trial-status.ts";

test("sample detection keys off the seed markers, never the business name", () => {
  assert.equal(isTrialSampleOpportunity({ metadata: { trial_seed: true } }), true);
  assert.equal(isTrialSampleOpportunity({ metadata: {}, sourceUrl: "https://example.invalid/trial/cedar" }), true);
  assert.equal(isTrialSampleOpportunity({ metadata: { trial_seed: false }, sourceUrl: "https://maps.google.com/x" }), false);
  assert.equal(isTrialSampleOpportunity({ metadata: null }), false);
  assert.equal(isTrialSampleHunterItem({ placeId: "trial-seed-7" }), true);
  assert.equal(isTrialSampleHunterItem({ placeId: "ChIJreal" }), false);
  assert.equal(isTrialSampleDraft({ metadata: { trial_seed: true } }), true);
  assert.equal(isTrialSampleDraft({ metadata: { week_pack: true } }), false);
});

test("activation progress only counts the customer's real finds and prospects", () => {
  const hunter = [{ placeId: "trial-seed-1" }, { placeId: "trial-seed-2" }, { placeId: "ChIJreal-1" }];
  const prospects = [
    { metadata: { trial_seed: true } },
    { metadata: { trial_seed: true } },
    { metadata: {}, sourceUrl: "https://maps.google.com/?cid=1" },
  ];
  assert.equal(countRealHunterFinds(hunter), 1);
  assert.equal(countRealProspects(prospects), 1);
  assert.equal(hasTrialSamples({ hunterItems: hunter }), true);
  assert.equal(hasTrialSamples({ opportunities: [prospects[2]], hunterItems: [hunter[2]], drafts: [] }), false);
});

test("sample copy is honest in both languages and never says demo", () => {
  for (const spanish of [false, true]) {
    const copy = trialSampleCopy(spanish);
    const text = Object.values(copy).join(" ");
    assert.doesNotMatch(text, /demo/i);
    assert.match(text, spanish ? /no son reales/ : /not real/);
    assert.ok(copy.clear.length > 0);
  }
});

test("desk trial status counts down, flags the last two days, and disappears once paid", () => {
  const now = new Date("2026-09-09T12:00:00.000Z");
  const fresh = describeDeskTrial({ trialEndsAt: "2026-09-15T12:00:00.000Z", hasActivePaidEntitlement: false, now });
  assert.equal(fresh?.daysRemaining, 6);
  assert.equal(fresh?.endingSoon, false);
  assert.equal(fresh?.expired, false);
  assert.equal(trialPillCopy(fresh!, false).label, "6 days left in trial");
  assert.equal(trialPillCopy(fresh!, true).label, "6 días de prueba");

  const lastDay = describeDeskTrial({ trialEndsAt: "2026-09-10T06:00:00.000Z", hasActivePaidEntitlement: false, now });
  assert.equal(lastDay?.daysRemaining, 1);
  assert.equal(lastDay?.endingSoon, true);
  assert.equal(trialPillCopy(lastDay!, false).label, "Last day of trial");

  const ended = describeDeskTrial({ trialEndsAt: "2026-09-01T00:00:00.000Z", hasActivePaidEntitlement: false, now });
  assert.equal(ended?.expired, true);
  assert.equal(trialPillCopy(ended!, false).action, "Choose a plan");

  assert.equal(describeDeskTrial({ trialEndsAt: "2026-09-15T12:00:00.000Z", hasActivePaidEntitlement: true, now }), null);
  assert.equal(describeDeskTrial({ trialEndsAt: null, hasActivePaidEntitlement: false, now }), null);
});
