import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { placesToReviewInserts } from "./review.ts";

test("HUNTER Places hunts write the review pile, never Prospects", () => {
  const source = readFileSync(join(process.cwd(), "src/server/hunter/search.ts"), "utf8");
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
});
