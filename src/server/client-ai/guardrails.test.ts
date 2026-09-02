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
  assert.equal(isMicahCreatePrompt("Make a week of posts for 123 Catering"), true);
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

test("desk CRM prospect questions route to DAVID, not HUNTER", () => {
  for (const prompt of [
    "who are the prospects on this desk?",
    "Who are the prospects on this pipeline?",
    "What are the names of the prospects on this desk?",
    "list the prospects on this desk",
    "find prospects on this desk",
  ]) {
    assert.equal(detectSpecialistLane(prompt), "david", prompt);
    assert.equal(decideClientAiRoute({ role: "atlas", prompt }).routedTo, "david", prompt);
    assert.equal(isHunterFindPrompt(prompt), false, prompt);
  }
});

test("city and Google Places hunts still route to HUNTER", () => {
  for (const prompt of [
    "Find plumbers in Houston, TX",
    "find prospects in Houston",
    "find leads in Katy, TX",
    "leads in Galveston, TX",
    "google places daycares near 77065",
  ]) {
    assert.equal(detectSpecialistLane(prompt), "hunter", prompt);
    assert.equal(decideClientAiRoute({ role: "atlas", prompt }).routedTo, "hunter", prompt);
    assert.equal(isHunterFindPrompt(prompt), true, prompt);
  }
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
