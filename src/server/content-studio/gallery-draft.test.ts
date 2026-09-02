import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildMicahDraftCopy,
  buildMicahDraftSvg,
  buildMicahWeekPack,
  captionForClipboard,
  parseMicahDemeanor,
  readOfficialAtlasLogoDataUri,
  resolveMicahDemeanor,
  selectMicahWeekGallery,
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

test("MICAH week pack is 7 navy/gold day-cards with copyable captions", () => {
  const cards = buildMicahWeekPack({
    prompt: "Make a week of posts for Labor Day",
    demeanor: "friendly_local",
    demoDesk: true,
    logoDataUri: "data:image/png;base64,ZmFrZQ==",
  });
  assert.equal(cards.length, 7);
  assert.deepEqual(
    cards.map((card) => `${card.day}:${card.weekday}`),
    [
      "1:Monday",
      "2:Tuesday",
      "3:Wednesday",
      "4:Thursday",
      "5:Friday",
      "6:Saturday",
      "7:Sunday",
    ],
  );
  assert.equal(cards.some((card) => /ABC Plumbing \(DEMO\)/.test(card.title)), true);
  assert.equal(cards.some((card) => /123 Catering \(DEMO\)/.test(card.title)), true);
  assert.equal(cards.some((card) => /XYZ Electric \(DEMO\)/.test(card.title)), true);
  for (const card of cards) {
    assert.match(card.dayLabel, /DAY \d/);
    assert.match(card.caption, /did not publish/);
    assert.match(card.caption, /DEMO draft/);
    assert.doesNotMatch(card.caption, /SIS Custom Creations/i);
    assert.match(card.imageSvg, /#071b42/);
    assert.match(card.imageSvg, /#f5b932/);
    assert.match(card.imageSvg, /DAY \d/);
    assert.doesNotMatch(card.imageSvg, /from-blue-950|to-blue-700/);
    assert.equal(captionForClipboard(card.caption).includes("\n"), false);
  }
});

test("demeanor is parsed once and Faith is never the DEMO default", () => {
  assert.equal(parseMicahDemeanor("Friendly/local"), "friendly_local");
  assert.equal(parseMicahDemeanor("Motivational please"), "motivational");
  assert.equal(parseMicahDemeanor("straight"), "straight");
  assert.equal(parseMicahDemeanor("comical"), "comical");
  assert.equal(parseMicahDemeanor("Faith"), "faith");

  const demoFaith = resolveMicahDemeanor({
    prompt: "Make a week. Faith.",
    demoDesk: true,
  });
  assert.equal(demoFaith.demeanor, null);
  assert.equal(demoFaith.blockedFaithOnDemo, true);

  const stored = resolveMicahDemeanor({
    prompt: "Make a week of posts",
    stored: "comical",
    demoDesk: true,
  });
  assert.equal(stored.demeanor, "comical");

  const unset = resolveMicahDemeanor({ prompt: "Make a week of posts" });
  assert.equal(unset.demeanor, null);
});

test("AFE DEMO gallery shows 7 day-cards instead of the old blue placeholder boxes", () => {
  const gallery = selectMicahWeekGallery(
    [
      {
        id: "old-1",
        title: "DEMO DESK SAMPLE",
        headline: "DEMO hats for the crew",
        caption: "DEMO draft for ABC Plumbing. Do not publish.",
        supportingText: null,
        imageSvg: null,
        imageUrl: null,
        metadata: {},
      },
      {
        id: "old-2",
        title: "DEMO DESK SAMPLE",
        headline: "DEMO tasting night shirts",
        caption: "DEMO draft for 123 Catering. Do not publish.",
        supportingText: null,
        imageSvg: null,
        imageUrl: null,
        metadata: {},
      },
    ],
    { demoDesk: true, logoDataUri: "data:image/png;base64,ZmFrZQ==" },
  );
  assert.equal(gallery.length, 7);
  assert.equal(gallery.every((card) => Boolean(card.imageSvg)), true);
  assert.equal(gallery.every((card) => card.imageSvg.includes("#071b42")), true);
  assert.equal(gallery.some((card) => card.headline === "DEMO hats for the crew"), false);
});
