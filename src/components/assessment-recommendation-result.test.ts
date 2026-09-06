import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const result = readFileSync(join(root, "src/components/assessment-recommendation-result.tsx"), "utf8");
const page = readFileSync(join(root, "src/app/assessment/page.tsx"), "utf8");
const actions = readFileSync(join(root, "src/server/assessments/actions.ts"), "utf8");

test("post-submit assessment page renders the recommendation result instead of a review-only thank-you", () => {
  assert.match(page, /AssessmentRecommendationResult/);
  assert.match(page, /recommendAssessment/);
  assert.match(page, /resolveAssessmentSignals/);
  assert.match(page, /Atlas already has a recommendation/);
  assert.match(page, /GROW \$249 or UNLIMITED \$499/);
  assert.match(page, /Start the 7-day free trial/);
  assert.doesNotMatch(page, /queued for private CRM review/);
  assert.doesNotMatch(page, /Explore the 7-day trial/);
  assert.doesNotMatch(page, /sis-homepage|SisHeader|SIS Custom Creations/);
});

test("recommendation result leads with score, priced plan, next step, and the 7-day trial CTA", () => {
  assert.match(result, /recommendation\.score/);
  assert.match(result, /recommendation\.monthlyPrice/);
  assert.match(result, /Prioritized next step/);
  assert.match(result, /Useful preview/);
  assert.match(result, /Start 7-day free trial/);
  assert.match(result, /\/start-trial/);
  assert.match(result, /\/pricing#\$\{planAnchor\}/);
  assert.match(result, /does not automatically call, email, or text/);
  assert.doesNotMatch(result, /Front Desk is live|phone AI is live|SIS Custom/i);
});

test("successful assessment submit redirects with recommendation signals, not a bare received status", () => {
  assert.match(actions, /assessmentReceivedPath/);
  assert.match(actions, /resolveAssessmentSignals/);
  assert.match(actions, /c: biggestChallenge/);
  assert.match(actions, /v: monthlyLeadVolume/);
  assert.match(actions, /f: followUpSpeed/);
  const successTail = actions.slice(actions.lastIndexOf("sendAssessmentNotification"));
  assert.match(successTail, /assessmentReceivedPath/);
  assert.doesNotMatch(successTail, /redirect\("\/assessment\?status=received"\)/);
});
