import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { placesToReviewInserts } from "./review.ts";

function readRepo(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

test("HUNTER Places hunts write the review pile, never Prospects", () => {
  const source = readRepo("src/server/hunter/search.ts");
  assert.match(source, /organization_hunter_review_items/);
  assert.match(source, /buildHunterSearchPersistNote/);
  assert.match(source, /existingError/);
  assert.doesNotMatch(source, /were not added because they were already accepted/);
  assert.doesNotMatch(source, /\.from\(\s*["']organization_opportunities["']\s*\)/);

  const rows = placesToReviewInserts(
    "org-afe-crm-demo",
    "owner-1",
    "plumbers in Houston, TX",
    [
      {
        placeId: "place-1",
        name: "Houston Pipe Co",
        formattedAddress: "Houston, TX",
        googleMapsUrl: "https://maps.google.com/?cid=1",
        websiteUrl: "https://houstonpipe.example",
        nationalPhoneNumber: "(713) 555-0101",
        internationalPhoneNumber: "+1 713-555-0101",
        primaryType: "plumber",
        businessStatus: "OPERATIONAL",
      },
    ],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "pending");
  assert.equal(rows[0]?.organization_id, "org-afe-crm-demo");
  assert.equal(rows[0]?.website_url, "https://houstonpipe.example");
  assert.match(source, /includeWebsite:\s*true/);
  assert.doesNotMatch(source, /includeWebsite:\s*false/);
  assert.match(source, /applyHunterSearchFilters/);
  assert.match(source, /filters \?\? emptyHunterSearchFilters/);

  const chat = readRepo("src/server/client-ai/actions.ts");
  assert.match(chat, /executeHunterPlacesSearch/);
  assert.doesNotMatch(chat, /filters:/);
});
