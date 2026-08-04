import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMinorAmount,
  getOperationsSurfaceState,
} from "./presentation.ts";

test("operations surfaces distinguish setup, empty, and connected states", () => {
  assert.equal(getOperationsSurfaceState(true, 0), "needs-input");
  assert.equal(getOperationsSurfaceState(false, 0), "empty");
  assert.equal(getOperationsSurfaceState(false, 1), "connected");
});

test("minor-unit amounts remain exact and readable", () => {
  assert.equal(formatMinorAmount("12500", "usd"), "USD 125.00");
  assert.equal(formatMinorAmount("-250000", "USD"), "USD -2,500.00");
  assert.equal(formatMinorAmount("not-a-number", "USD"), "USD unavailable");
});
