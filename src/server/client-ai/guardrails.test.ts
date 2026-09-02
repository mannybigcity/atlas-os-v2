import assert from "node:assert/strict";
import test from "node:test";
import {
  decideClientAiRoute,
  detectSpecialistLane,
  isHunterFindPrompt,
  isMicahCreatePrompt,
} from "./guardrails.ts";

test("Talk to Atlas without a staff click still routes social work to MICAH", () => {
  const decision = decideClientAiRoute({
    role: "atlas",
    prompt: "Make a Facebook post and a flyer image for Labor Day",
  });
  assert.equal(detectSpecialistLane("Make a Facebook post and a flyer image for Labor Day"), "micah");
  assert.equal(decision.routedTo, "micah");
  assert.equal(decision.scopeStatus, "rerouted");
  assert.equal(decision.blocked, false);
  assert.equal(isMicahCreatePrompt("Make a Facebook post and a flyer image for Labor Day"), true);
});

test("Talk to Atlas routes local-business finds to HUNTER", () => {
  const prompt = "Find plumbers in Houston, TX";
  const decision = decideClientAiRoute({ role: "atlas", prompt });
  assert.equal(detectSpecialistLane(prompt), "hunter");
  assert.equal(decision.routedTo, "hunter");
  assert.equal(isHunterFindPrompt(prompt), true);
  assert.equal(isHunterFindPrompt("Who is in the HUNTER pile?"), false);
});

test("Talk to Atlas routes pipeline, follow-up, and client satisfaction to DAVID", () => {
  const prompt = "What is the next step to a sale for ABC Plumbing on this pipeline?";
  const decision = decideClientAiRoute({ role: "atlas", prompt });
  assert.equal(detectSpecialistLane(prompt), "david");
  assert.equal(decision.routedTo, "david");
  assert.equal(
    detectSpecialistLane("How is client satisfaction on this desk?"),
    "david",
  );
  assert.equal(
    decideClientAiRoute({ role: "atlas", prompt: "How is client satisfaction on this desk?" }).routedTo,
    "david",
  );
});

test("staff HUNTER / MICAH / DAVID buttons keep their lane when the ask matches", () => {
  assert.equal(
    decideClientAiRoute({ role: "hunter", prompt: "Find local daycares near 77065" }).routedTo,
    null,
  );
  assert.equal(
    decideClientAiRoute({ role: "micah", prompt: "Draft an Instagram caption for this offer" }).routedTo,
    null,
  );
  assert.equal(
    decideClientAiRoute({ role: "david", prompt: "Summarize follow-up notes and history" }).routedTo,
    null,
  );
});

test("publish and live-post asks stay declined", () => {
  const decision = decideClientAiRoute({
    role: "atlas",
    prompt: "Publish this post live to Facebook now",
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.scopeStatus, "declined");
});
