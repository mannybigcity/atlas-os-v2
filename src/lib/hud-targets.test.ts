import assert from "node:assert/strict";
import test from "node:test";
import { getHudTarget } from "./hud-targets.ts";

test("allowlists explicit HUD targets to real Atlas surfaces", () => {
  assert.equal(getHudTarget("qtime-productions")?.href, "/clients?previewOrg=qtime-productions");
  assert.equal(getHudTarget("crm-followups")?.href, "/lions-den/sales");
  assert.equal(getHudTarget("missions")?.href, "/lions-den/missions");
  assert.equal(getHudTarget("cash-ledger")?.href, "/lions-den/cash");
  assert.equal(getHudTarget("unsupported-report"), null);
});
