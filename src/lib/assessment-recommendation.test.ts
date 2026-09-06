import assert from "node:assert/strict";
import test from "node:test";
import {
  assessmentReceivedPath,
  defaultAssessmentSignals,
  pickAssessmentPlan,
  pickAssessmentPriority,
  recommendAssessment,
  resolveAssessmentSignals,
  scoreAssessment,
  type AssessmentSignals,
} from "./assessment-recommendation.ts";

function signals(overrides: Partial<AssessmentSignals> = {}): AssessmentSignals {
  return { ...defaultAssessmentSignals, ...overrides };
}

function copyBlob(recommendation: ReturnType<typeof recommendAssessment>) {
  return [
    recommendation.planWhy,
    recommendation.nextStep,
    ...recommendation.preview,
    ...recommendation.planProof,
  ]
    .flatMap((copy) => [copy.en, copy.es])
    .join("\n");
}

test("leaky follow-up is the first priority even when the owner also wants growth", () => {
  assert.equal(
    pickAssessmentPriority(
      signals({
        challenge: "growing_the_business",
        followUpSpeed: "when_remembered",
      }),
    ),
    "follow_up",
  );
  assert.equal(
    pickAssessmentPriority(signals({ challenge: "marketing", followUpSpeed: "not_tracking" })),
    "follow_up",
  );
});

test("finding customers with same-day follow-up recommends getting more leads", () => {
  assert.equal(
    pickAssessmentPriority(
      signals({
        challenge: "finding_customers",
        followUpSpeed: "same_day",
        leadVolume: "under_10",
      }),
    ),
    "leads",
  );
});

test("getting customers to buy with a tracked pipeline recommends closing more deals", () => {
  assert.equal(
    pickAssessmentPriority(
      signals({
        challenge: "getting_customers_to_buy",
        followUpSpeed: "1_2_days",
        areas: ["sales"],
      }),
    ),
    "close",
  );
});

test("growing local businesses get GROW $249 and established teams get UNLIMITED $499", () => {
  assert.equal(pickAssessmentPlan(signals({ businessSize: "2_5", leadVolume: "10_25" })), "grow");
  assert.equal(pickAssessmentPlan(signals({ businessSize: "just_me", budget: "under_500" })), "grow");
  assert.equal(pickAssessmentPlan(signals({ businessSize: "16_50" })), "unlimited");
  assert.equal(
    pickAssessmentPlan(signals({ businessSize: "6_15", leadVolume: "76_plus" })),
    "unlimited",
  );
  assert.equal(
    pickAssessmentPlan(signals({ businessSize: "6_15", budget: "3000_plus" })),
    "unlimited",
  );
});

test("score stays in a useful band and rises with urgency and team signal", () => {
  const exploring = scoreAssessment(
    signals({
      timing: "exploring",
      followUpSpeed: "same_day",
      leadVolume: "not_sure",
      businessSize: "just_me",
      budget: "under_500",
      areas: [],
    }),
  );
  const urgent = scoreAssessment(
    signals({
      timing: "immediately",
      followUpSpeed: "when_remembered",
      leadVolume: "76_plus",
      businessSize: "16_50",
      budget: "3000_plus",
      areas: ["sales", "marketing", "operations", "automation"],
    }),
  );

  assert.ok(exploring >= 42 && exploring <= 94);
  assert.ok(urgent >= exploring);
  assert.ok(urgent <= 94);
});

test("recommendation includes a score, priced plan, next step, and trial-ready preview", () => {
  const recommendation = recommendAssessment(
    signals({
      challenge: "not_enough_time",
      followUpSpeed: "when_remembered",
      businessSize: "2_5",
    }),
  );

  assert.equal(recommendation.plan, "grow");
  assert.equal(recommendation.monthlyPrice, 249);
  assert.equal(recommendation.planName, "ATLAS GROW");
  assert.equal(recommendation.priority, "follow_up");
  assert.match(recommendation.priorityTitle.en, /Follow up faster/);
  assert.match(recommendation.nextStep.en, /pipeline/);
  assert.ok(recommendation.score >= 42);
  assert.ok(recommendation.preview.length >= 3);
  assert.match(copyBlob(recommendation), /does not call, email, or text/i);
});

test("unlimited recommendation prices $499 and never claims live Front Desk phone AI", () => {
  const recommendation = recommendAssessment(
    signals({
      businessSize: "16_50",
      leadVolume: "76_plus",
      budget: "3000_plus",
      challenge: "getting_customers_to_buy",
      followUpSpeed: "1_2_days",
    }),
  );

  assert.equal(recommendation.plan, "unlimited");
  assert.equal(recommendation.monthlyPrice, 499);
  assert.equal(recommendation.planName, "ATLAS UNLIMITED");
  assert.doesNotMatch(copyBlob(recommendation), /Front Desk is live|phone AI is live|SIS Custom/i);
  assert.match(copyBlob(recommendation), /not live|future add-on/i);
});

test("received path encodes allowlisted signals and ignores unknown values", () => {
  const href = assessmentReceivedPath(
    signals({
      challenge: "finding_customers",
      leadVolume: "26_75",
      followUpSpeed: "3_7_days",
      businessSize: "6_15",
      budget: "1500_3000",
      timing: "immediately",
      areas: ["sales", "marketing"],
    }),
  );

  assert.match(href, /^\/assessment\?/);
  assert.match(href, /status=received/);
  assert.match(href, /c=finding_customers/);
  assert.match(href, /v=26_75/);
  assert.match(href, /f=3_7_days/);
  assert.match(href, /s=6_15/);
  assert.match(href, /b=1500_3000/);
  assert.match(href, /t=immediately/);
  assert.match(href, /a=sales%2Cmarketing|a=sales,marketing/);

  const parsed = resolveAssessmentSignals({
    c: "not_a_real_challenge",
    v: "10_25",
    f: "hacked",
    s: "2_5",
    b: "need_recommendation",
    t: "30_days",
    a: "sales,not_real,marketing",
  });

  assert.equal(parsed.challenge, defaultAssessmentSignals.challenge);
  assert.equal(parsed.followUpSpeed, defaultAssessmentSignals.followUpSpeed);
  assert.equal(parsed.leadVolume, "10_25");
  assert.deepEqual(parsed.areas, ["sales", "marketing"]);
});

test("bare received status still resolves a concrete GROW recommendation", () => {
  const recommendation = recommendAssessment(resolveAssessmentSignals({}));

  assert.equal(recommendation.plan, "grow");
  assert.equal(recommendation.monthlyPrice, 249);
  assert.equal(recommendation.priority, "follow_up");
  assert.match(recommendation.nextStep.en, /pipeline|next step|leads/i);
});
