import assert from "node:assert/strict";
import test from "node:test";
import { atlasDeskNextHref } from "./atlas-desk-route.ts";

test("Atlas routes image and post work to the MICAH gallery", () => {
  assert.equal(
    atlasDeskNextHref({
      prompt: "make a post",
      routedTo: "micah",
      status: "success",
    }),
    "/client/micah",
  );
  assert.equal(
    atlasDeskNextHref({
      prompt: "Make a flyer for Labor Day",
      routedTo: "micah",
      status: "blocked",
      scopeStatus: "needs_input",
    }),
    "/client/micah",
  );
});

test("Atlas routes city lead hunts to Prospects after HUNTER search", () => {
  assert.equal(
    atlasDeskNextHref({
      prompt: "leads in Galveston, TX",
      routedTo: "hunter",
      status: "success",
    }),
    "/client/prospects",
  );
  assert.equal(
    atlasDeskNextHref({
      prompt: "leads in Galveston, TX",
      routedTo: "hunter",
      status: "blocked",
      scopeStatus: "needs_input",
    }),
    null,
  );
});

test("Atlas opens follow-up, calendar, and notes boards from the one input", () => {
  assert.equal(
    atlasDeskNextHref({
      prompt: "what is due today",
      routedTo: "david",
      status: "success",
    }),
    "/client/david",
  );
  assert.equal(
    atlasDeskNextHref({
      prompt: "show the calendar",
      routedTo: null,
      status: "success",
    }),
    "/client/calendar",
  );
  assert.equal(
    atlasDeskNextHref({
      prompt: "open notes",
      routedTo: "david",
      status: "success",
    }),
    "/client/notes",
  );
});

test("declined external actions stay on the current board", () => {
  assert.equal(
    atlasDeskNextHref({
      prompt: "publish this post live",
      routedTo: "atlas",
      status: "blocked",
      scopeStatus: "declined",
    }),
    null,
  );
});
