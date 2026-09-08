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
  assert.match(search, /Optional filters/);
  assert.match(search, /No website/);
  assert.match(search, /Weak social/);
  assert.match(search, /does not get Facebook or Instagram fields/);
  assert.match(search, /does not invent a phone or website/);
  assert.match(search, /name="missingWebsite"/);
  assert.match(search, /name="weakSocial"/);
  assert.doesNotMatch(search, /name="missingWebsite"[^>]*required/);
  assert.doesNotMatch(search, /name="weakSocial"[^>]*required/);
  assert.doesNotMatch(search, /name="missingWebsite"[^>]*defaultChecked/);
  assert.doesNotMatch(search, /name="weakSocial"[^>]*defaultChecked/);
  assert.match(search, /Google did not publish a phone number/);
  assert.match(search, /will not invent one/);
  assert.match(search, /isMissingPlacePhone/);
  assert.match(search, /No gap leads in this search/);
  assert.match(search, /defaults\?\.service/);
  assert.match(search, /Local business type/);
  assert.doesNotMatch(search, /Auto repair shop or daycare/);
  assert.doesNotMatch(search, /placeholder="77065"/);
  assert.doesNotMatch(search, /placeholder="Katy"/);

  const strip = readRepo("src/components/lions-den/hunter-funnel-strip.tsx");
  assert.match(strip, /"Find", "Review", "Accept", "Prospect", "Follow-up"/);
  assert.match(strip, /steps\.join\(" → "\)/);
  assert.match(strip, /HUNTER starts growth\. You accept\. Atlas drafts follow-up\. You approve send\./);

  const hunterPage = readRepo("src/app/client/hunter/page.tsx");
  assert.match(hunterPage, /hunterSearchDefaultsFromMarket/);
  assert.match(hunterPage, /inferTrialDeskMarket/);
  assert.match(hunterPage, /defaults=\{hunterDefaults\}/);

  const pile = readRepo("src/components/lions-den/hunter-review-pile.tsx");
  assert.match(pile, /Accept into Prospects/);
  assert.match(pile, /Skip/);
  assert.match(pile, /Open Prospects/);
  assert.match(pile, /will not invent a number/);
  assert.match(pile, /will not become a Call prospect/);
  assert.doesNotMatch(pile, /Apply the HUNTER review pile migration/);
  assert.match(pile, /HUNTER_REVIEW_PILE_MIGRATION/);
  assert.match(pile, /setupRequired/);
});

test("Prospect rows on Summary and Prospects open a Google Places detail view", () => {
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const list = readRepo("src/components/lions-den/lions-den-prospects.tsx");
  const detail = readRepo("src/components/lions-den/lions-den-prospect-detail.tsx");
  const accept = readRepo("src/server/hunter/actions.ts");

  assert.match(overview, /prospectDetailPath/);
  assert.match(overview, /presentedProspectNextAction/);
  assert.match(overview, /will not invent a number/);
  assert.match(list, /prospectDetailPath/);
  assert.match(list, /presentedProspectNextAction/);
  assert.match(detail, /presentedProspectNextAction/);
  assert.match(detail, /presentedProspectStageLabel/);
  assert.match(detail, /Open in Google Maps|Abrir en Google Maps/);
  assert.match(detail, /phoneHref/);
  assert.match(detail, /Atlas did not call, email, or text anyone/);
  assert.match(accept, /getGooglePlaceDetails/);
  assert.match(accept, /acceptedHunterOpportunityFields/);
});
