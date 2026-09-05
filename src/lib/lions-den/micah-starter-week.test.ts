import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  MICAH_GOLD,
  MICAH_NAVY,
  MICAH_STARTER_DAYS,
  brandKitFromMetadata,
  composeMicahTalkPrompt,
  composeMicahWeekBuildPrompt,
  defaultMicahBrandKit,
  isMicahBrandDraft,
  normalizeBrandColor,
  parseSocialHandle,
  visibleMicahVoices,
} from "./micah-starter-week.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("empty MICAH week has seven local-owner day blocks", () => {
  assert.deepEqual(
    MICAH_STARTER_DAYS.map((item) => `${item.day}:${item.theme}`),
    [
      "1:Mon Motivation",
      "2:Tip Tuesday",
      "3:Wisdom Wednesday",
      "4:Throwback Thursday",
      "5:Feature Friday",
      "6:Community Saturday",
      "7:Sunday Rest/Prep",
    ],
  );
});

test("DEMO brand setup never offers Faith and defaults to navy/gold", () => {
  const kit = defaultMicahBrandKit();
  assert.equal(kit.demeanor, null);
  assert.equal(kit.primaryColor, MICAH_NAVY);
  assert.equal(kit.secondaryColor, MICAH_GOLD);
  assert.equal(kit.logoDataUri, null);
  assert.deepEqual(
    visibleMicahVoices(true).map((voice) => voice.id),
    ["motivational", "friendly_local", "comical", "straight"],
  );
  assert.equal(
    visibleMicahVoices(false).some((voice) => voice.id === "faith" && voice.optIn),
    true,
  );
});

test("week-build prompt stays gallery-only and can carry stored social handles", () => {
  const prompt = composeMicahWeekBuildPrompt({
    demeanor: "friendly_local",
    focusDay: 2,
    socials: { facebook: "@shop", instagram: "", linkedin: "", tiktok: "" },
    briefs: [
      { day: 2, design: "crew hats", message: "same-week help", vibe: "neighbor" },
    ],
  });
  assert.match(prompt, /Tip Tuesday/);
  assert.match(prompt, /crew hats/);
  assert.match(prompt, /do not post or schedule/i);
  assert.match(prompt, /store only, do not scrape/i);
  assert.doesNotMatch(prompt, /auto-?post|blotato|schedule this post/i);
  assert.match(composeMicahTalkPrompt({ theme: "Feature Friday" }), /do not post/i);
});

test("brand kit metadata is stored, not scraped, and ignored as a gallery card", () => {
  assert.equal(isMicahBrandDraft({ brand_setup: true }), true);
  assert.equal(isMicahBrandDraft({ week_pack: true }), false);
  assert.equal(parseSocialHandle("  @LocalShop  "), "@LocalShop");
  assert.equal(normalizeBrandColor("#071B42", MICAH_NAVY), "#071b42");
  assert.equal(normalizeBrandColor("navy", MICAH_NAVY), MICAH_NAVY);
  const kit = brandKitFromMetadata(
    {
      brand_setup: true,
      micah_demeanor: "straight",
      primary_color: "#123456",
      facebook: "facebook.com/shop",
    },
    "data:image/png;base64,ZmFrZQ==",
  );
  assert.equal(kit?.demeanor, "straight");
  assert.equal(kit?.primaryColor, "#123456");
  assert.equal(kit?.facebook, "facebook.com/shop");
  assert.equal(kit?.logoDataUri, "data:image/png;base64,ZmFrZQ==");
});

test("MICAH desk chrome replaces the empty chat box with brand setup and a week CTA", () => {
  const desk = readRepo("src/components/micah-week-desk.tsx");
  const studio = readRepo("src/components/client-content-studio.tsx");
  const days = readRepo("src/lib/lions-den/micah-starter-week.ts");
  assert.match(days, /Mon Motivation/);
  assert.match(days, /Tip Tuesday/);
  assert.match(days, /Sunday Rest\/Prep/);
  assert.match(desk, /What are we designing today/);
  assert.match(desk, /Build my 7-day week/);
  assert.match(desk, /Upload logo/);
  assert.match(desk, /Faith/);
  assert.match(studio, /MicahWeekDesk/);
  assert.match(studio, /Appointments stay on Calendar/);
  assert.doesNotMatch(studio, /Nothing in it yet/);
  assert.doesNotMatch(desk, /auto-?post|schedule this post/i);
});
