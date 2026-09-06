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
  assert.match(css, /\.ld-followup-columns\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.ld-desk-followup\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);

  assert.match(followUp, /ld-followup-columns/);
  assert.match(followUp, /ld-followup-col/);
  assert.doesNotMatch(followUp, /xl:grid-cols-2/);
  assert.match(followUp, /Más adelante/);
  assert.match(followUp, /Later/);

  assert.match(overview, /ld-followup-columns/);
  assert.match(overview, /THE FORTUNE IS IN THE FOLLOW-UP/);
  assert.match(overview, /LA FORTUNA ESTÁ EN EL SEGUIMIENTO/);
  assert.match(overview, /followUpBandTitle = showActivation/);
  assert.doesNotMatch(overview, /md:grid-cols-3/);
  assert.doesNotMatch(overview, /truncate text-xs font-semibold text-\[#071b42\]/);

  assert.doesNotMatch(prospects, /ld-followup-columns/);
  assert.doesNotMatch(hunter, /ld-followup-columns/);
});

test("Summary desk scrolls and keeps HUNTER/Prospects readable instead of a viewport squeeze", () => {
  const css = readRepo("src/app/globals.css");
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const calendar = readRepo("src/components/clients-calendar.tsx");

  const overviewMain = css.match(/\.lions-den-hub-main\[data-board="overview"\]\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(overviewMain, /overflow-y:\s*auto/);
  assert.doesNotMatch(overviewMain, /overflow:\s*hidden/);

  const desk = css.match(/\.ld-desk\s*\{[^}]+\}/g)?.find((block) => /grid-template-columns/.test(block)) ?? "";
  assert.match(desk, /height:\s*auto/);
  assert.match(desk, /grid-template-rows:\s*auto\s+auto\s+auto\s+auto/);
  assert.doesNotMatch(desk, /height:\s*100%/);
  assert.doesNotMatch(desk, /minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(desk, /minmax\(16rem,\s*1\.25fr\)/);
  assert.doesNotMatch(css, /minmax\(16\.25rem,\s*21\.25rem\)\s+minmax\(0,\s*1fr\)/);

  const pipeline = css.match(/\.ld-desk-pipeline\s*\{[^}]+\}/g)?.find((block) => /grid-template-rows/.test(block)) ?? "";
  assert.match(pipeline, /minmax\(15rem,\s*auto\)/);
  assert.doesNotMatch(pipeline, /minmax\(0,\s*1fr\)/);

  const pile = css.match(/\.ld-desk-pile\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(pile, /min-height:\s*15rem/);

  const deskCalendar = css.match(/\.ld-desk\s+\.ld-calendar\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(deskCalendar, /max-height:\s*20\.5rem/);
  assert.match(deskCalendar, /align-self:\s*start/);
  assert.doesNotMatch(deskCalendar, /height:\s*100%/);

  assert.match(css, /\.ld-desk-followup\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(overview, /ld-desk-pile/);
  assert.match(overview, /ld-desk-followup/);
  assert.match(overview, /THE FORTUNE IS IN THE FOLLOW-UP/);
  assert.match(overview, /followUpBandTitle = showActivation/);
  assert.doesNotMatch(overview, /md:grid-cols-3/);
  assert.doesNotMatch(overview, /xl:grid-cols-3/);

  assert.match(calendar, /ld-calendar-compact/);
  assert.match(calendar, /ld-calendar-agenda/);
  assert.doesNotMatch(calendar, /flex h-6 min-h-0 w-full flex-col items-center justify-center rounded-sm text-\[11px\]/);
});
