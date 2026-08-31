import assert from "node:assert/strict";
import test from "node:test";
import { ATLAS_STAFF_PROMPT_LIMIT, composeAtlasStaffPrompt } from "./atlas-staff-prompt.ts";

test("composeAtlasStaffPrompt keeps a short staff message", async () => {
  assert.equal(await composeAtlasStaffPrompt("Next follow-up for ABC Plumbing?", null), "Next follow-up for ABC Plumbing?");
});

test("composeAtlasStaffPrompt appends file metadata and a text excerpt", async () => {
  const file = new File(["Quote notes for 123 Catering"], "notes.txt", { type: "text/plain" });
  const prompt = await composeAtlasStaffPrompt("Review this", file);
  assert.match(prompt, /Review this/);
  assert.match(prompt, /Attached: notes.txt/);
  assert.match(prompt, /Quote notes for 123 Catering/);
});

test("composeAtlasStaffPrompt names an image without inventing file bytes", async () => {
  const file = new File([Uint8Array.from([1, 2, 3, 4])], "storefront.png", { type: "image/png" });
  const prompt = await composeAtlasStaffPrompt("Look at this photo", file);
  assert.match(prompt, /Look at this photo/);
  assert.match(prompt, /Attached: storefront.png \(image\/png/);
  assert.doesNotMatch(prompt, /\u0001/);
});

test("composeAtlasStaffPrompt stays within the existing Ask Atlas limit", async () => {
  const prompt = await composeAtlasStaffPrompt("x".repeat(2000), null);
  assert.equal(prompt.length, ATLAS_STAFF_PROMPT_LIMIT);
});
