import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildMicahDraftCopy,
  buildMicahDraftSvg,
  readOfficialAtlasLogoDataUri,
} from "./gallery-art.ts";

test("MICAH gallery drafts are navy/gold downloadable SVGs and never live posts", () => {
  const copy = buildMicahDraftCopy("Make a Facebook post and a flyer image for Labor Day");
  assert.equal(copy.headline, "Labor Day");
  assert.match(copy.caption, /did not publish/);
  assert.match(copy.title, /MICAH draft: Labor Day/);
  assert.doesNotMatch(copy.caption, /posted to Facebook or Instagram/i);

  const svg = buildMicahDraftSvg({
    headline: copy.headline,
    supportingText: copy.supportingText,
    logoDataUri: "data:image/png;base64,ZmFrZQ==",
  });
  assert.match(svg, /#071b42/);
  assert.match(svg, /#f5b932/);
  assert.match(svg, /Labor Day/);
  assert.match(svg, /data:image\/png;base64,ZmFrZQ==/);
  assert.match(svg, /DRAFT — download and post yourself/);
  assert.doesNotMatch(svg, /published to Facebook|posted live/i);
});

test("official circular-ready Atlas logo file is pasted as-is when present", () => {
  const logoPath = join(process.cwd(), "public/brand/atlas-logo.png");
  assert.equal(existsSync(logoPath), true);
  const dataUri = readOfficialAtlasLogoDataUri();
  assert.ok(dataUri);
  assert.match(String(dataUri), /^data:image\/png;base64,/);
  const svg = buildMicahDraftSvg({
    headline: "Labor Day special",
    supportingText: "Download this draft",
    logoDataUri: dataUri,
  });
  assert.match(svg, /<image href="data:image\/png;base64,/);
});
