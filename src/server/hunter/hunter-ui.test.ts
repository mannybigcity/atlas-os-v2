import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readRepo(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("HUNTER desk shows the growth funnel and Accept, not a Maps-only dead end", () => {
  const search = readRepo("src/components/hunter-search.tsx");
  assert.match(search, /HunterFunnelStrip/);
  assert.match(search, /Accept/);
  assert.match(search, /Skip/);
  assert.match(search, /Open Prospects/);
  assert.match(search, /Source: Google Maps/);
  assert.match(search, /Google Maps is only the source/);

  const strip = readRepo("src/components/lions-den/hunter-funnel-strip.tsx");
  assert.match(strip, /"Find", "Review", "Accept", "Prospect", "Follow-up"/);
  assert.match(strip, /steps\.join\(" → "\)/);
  assert.match(strip, /HUNTER starts growth\. You accept\. Atlas drafts follow-up\. You approve send\./);

  const pile = readRepo("src/components/lions-den/hunter-review-pile.tsx");
  assert.match(pile, /Accept into Prospects/);
  assert.match(pile, /Skip/);
  assert.match(pile, /Open Prospects/);
  assert.doesNotMatch(pile, /Apply the HUNTER review pile migration/);
  assert.match(pile, /HUNTER_REVIEW_PILE_MIGRATION/);
  assert.match(pile, /setupRequired/);
});
