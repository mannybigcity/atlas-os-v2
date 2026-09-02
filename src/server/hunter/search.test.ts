import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { placesToReviewInserts } from "./review.ts";

test("HUNTER Places hunts write the review pile, never Prospects", () => {
  const source = readFileSync(join(process.cwd(), "src/server/hunter/search.ts"), "utf8");
  assert.match(source, /organization_hunter_review_items/);
  assert.match(source, /REVIEW PILE/);
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
        websiteUrl: null,
        primaryType: "plumber",
        businessStatus: "OPERATIONAL",
      },
    ],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "pending");
  assert.equal(rows[0]?.organization_id, "org-afe-crm-demo");
});
