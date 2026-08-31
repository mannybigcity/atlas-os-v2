import assert from "node:assert/strict";
import test from "node:test";
import {
  atlasAskUsageLabel,
  isAtlasAskCapped,
  nextAtlasAskUsage,
  normalizeAtlasAskPlan,
} from "./atlas-quota.ts";

test("workspaces with no plan default to BASIC 5", () => {
  assert.equal(normalizeAtlasAskPlan(undefined), "basic");
  assert.equal(normalizeAtlasAskPlan(""), "basic");
  assert.equal(normalizeAtlasAskPlan("starter"), "basic");
  const usage = nextAtlasAskUsage({ used: 0, plan: null, status: "success" });
  assert.equal(usage.plan, "basic");
  assert.equal(usage.limit, 5);
  assert.equal(usage.used, 1);
});

test("billing GROW maps to a 10-question daily cap", () => {
  assert.equal(normalizeAtlasAskPlan("grow"), "grow");
  assert.equal(normalizeAtlasAskPlan("growth"), "grow");
  const usage = nextAtlasAskUsage({ used: 0, plan: "grow", status: "success" });
  assert.equal(usage.limit, 10);
});

test("successful in-scope asks increment the daily count", () => {
  const first = nextAtlasAskUsage({
    used: 0,
    plan: "basic",
    status: "success",
    scopeStatus: "in_scope",
  });
  assert.equal(first.counted, true);
  assert.equal(first.reason, "success");
  assert.equal(first.used, 1);
  assert.equal(atlasAskUsageLabel(first.used, "basic"), "1/5");
});

test("off-topic asks do not increment", () => {
  const usage = nextAtlasAskUsage({
    used: 2,
    plan: "basic",
    status: "blocked",
    scopeStatus: "declined",
  });
  assert.equal(usage.counted, false);
  assert.equal(usage.reason, "off_topic");
  assert.equal(usage.used, 2);
  assert.equal(atlasAskUsageLabel(usage.used, "basic"), "2/5");
});

test("failed asks do not increment", () => {
  const usage = nextAtlasAskUsage({
    used: 4,
    plan: "grow",
    status: "failed",
    scopeStatus: "in_scope",
  });
  assert.equal(usage.counted, false);
  assert.equal(usage.reason, "failed");
  assert.equal(usage.used, 4);
});

test("BASIC hard-stops at 5/5", () => {
  const atCap = nextAtlasAskUsage({
    used: 4,
    plan: "basic",
    status: "success",
    scopeStatus: "in_scope",
  });
  assert.equal(atCap.used, 5);
  assert.equal(atCap.capped, true);
  assert.equal(atlasAskUsageLabel(5, "basic"), "5/5");
  assert.equal(isAtlasAskCapped(5, "basic"), true);
  assert.equal(isAtlasAskCapped(4, "basic"), false);
});

test("GROW hard-stops at 10/10", () => {
  assert.equal(isAtlasAskCapped(9, "grow"), false);
  assert.equal(isAtlasAskCapped(10, "grow"), true);
  assert.equal(atlasAskUsageLabel(10, "grow"), "10/10");
});

test("UNLIMITED shows usage and never blocks", () => {
  const usage = nextAtlasAskUsage({
    used: 40,
    plan: "unlimited",
    status: "success",
    scopeStatus: "in_scope",
  });
  assert.equal(usage.limit, null);
  assert.equal(usage.capped, false);
  assert.equal(isAtlasAskCapped(usage.used, "unlimited"), false);
  assert.equal(atlasAskUsageLabel(usage.used, "unlimited"), "41");
});

test("blocked outreach does not burn a credit", () => {
  const usage = nextAtlasAskUsage({
    used: 1,
    plan: "basic",
    status: "blocked",
    scopeStatus: "in_scope",
  });
  assert.equal(usage.counted, false);
  assert.equal(usage.reason, "blocked_action");
  assert.equal(usage.used, 1);
});
