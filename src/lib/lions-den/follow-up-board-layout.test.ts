import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Follow-up and Summary use landscape columns instead of a 3-col squeeze", () => {
  const css = readRepo("src/app/globals.css");
  const followUp = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const prospects = readRepo("src/components/lions-den/lions-den-prospects.tsx");
  const hunter = readRepo("src/components/lions-den/hunter-review-pile.tsx");

  assert.match(css, /\.ld-followup-columns/);
  assert.match(css, /repeat\(3,\s*minmax\(16rem,\s*1fr\)\)/);
  assert.match(css, /\.ld-followup-col\s*\{[^}]*min-width:\s*16rem/);
  assert.match(css, /\.ld-followup-columns\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.ld-desk-followup\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);

  assert.match(followUp, /ld-followup-columns/);
  assert.match(followUp, /ld-followup-col/);
  assert.doesNotMatch(followUp, /xl:grid-cols-2/);
  assert.match(followUp, /Más adelante/);
  assert.match(followUp, /Later/);

  assert.match(overview, /ld-followup-columns/);
  assert.doesNotMatch(overview, /md:grid-cols-3/);
  assert.doesNotMatch(overview, /truncate text-xs font-semibold text-\[#071b42\]/);

  assert.doesNotMatch(prospects, /ld-followup-columns/);
  assert.doesNotMatch(hunter, /ld-followup-columns/);
});
