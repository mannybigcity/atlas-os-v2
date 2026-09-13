import assert from "node:assert/strict";
import test from "node:test";
import {
  ATLAS_OFF_TOPIC_REPLY,
  ATLAS_OFF_TOPIC_REPLY_ES,
  isLionDenJobPrompt,
} from "./atlas-job-scope.ts";

test("Lion's Den desk questions stay in scope", () => {
  assert.equal(isLionDenJobPrompt("What is the next follow-up on this desk?"), true);
  assert.equal(isLionDenJobPrompt("Who is in the HUNTER pile?"), true);
  assert.equal(isLionDenJobPrompt("Summarize my MICAH drafts"), true);
  assert.equal(isLionDenJobPrompt("Any notes or calendar items due?"), true);
  assert.equal(isLionDenJobPrompt("Move this prospect through the pipeline"), true);
  assert.equal(isLionDenJobPrompt("Make a Facebook post for Labor Day"), true);
  assert.equal(isLionDenJobPrompt("Make a week of posts for 123 Catering"), true);
  assert.equal(isLionDenJobPrompt("Find plumbers in Houston, TX"), true);
  assert.equal(isLionDenJobPrompt("How is client satisfaction on this desk?"), true);
  assert.equal(isLionDenJobPrompt("Who do I call today?"), true);
  assert.equal(isLionDenJobPrompt("What do I say to this prospect?"), true);
  assert.equal(isLionDenJobPrompt("What do I say?"), true);
  assert.equal(isLionDenJobPrompt("Who should I call?"), true);
  assert.equal(isLionDenJobPrompt("What's due today?"), true);
  assert.equal(isLionDenJobPrompt("Follow up today"), true);
});

test("random trivia and search questions are off the desk", () => {
  assert.equal(isLionDenJobPrompt("Who won the Super Bowl?"), false);
  assert.equal(isLionDenJobPrompt("What is the capital of France?"), false);
  assert.equal(isLionDenJobPrompt("What's the weather this weekend?"), false);
  assert.equal(isLionDenJobPrompt("What's the weather today?"), false);
  assert.equal(isLionDenJobPrompt("Ask Grok who the president is"), false);
  assert.equal(isLionDenJobPrompt("Google that for me"), false);
});

test("off-topic reply invites a desk ask and does not lecture the owner", () => {
  assert.equal(
    ATLAS_OFF_TOPIC_REPLY,
    "Ask me about who to call today, what to say, what's due, or the next follow-up on this desk.",
  );
  assert.doesNotMatch(ATLAS_OFF_TOPIC_REPLY, /I only work this desk/);
  assert.doesNotMatch(ATLAS_OFF_TOPIC_REPLY_ES, /Solo trabajo en este escritorio/);
  assert.match(ATLAS_OFF_TOPIC_REPLY_ES, /Pregúntame a quién llamar hoy/);
});
