import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  MICAH_GOLD,
  MICAH_NAVY,
  MICAH_ONBOARDING_QUESTIONS,
  MICAH_STARTER_DAYS,
  brandKitFromMetadata,
  composeMicahDayBoardPrompt,
  composeMicahTalkPrompt,
  composeMicahWeekBuildPrompt,
  defaultMicahBrandKit,
  firstIncompleteMicahOnboardingIndex,
  focusDayFromMicahPrompt,
  isMicahBrandDraft,
  isMicahOnboardingStepAnswered,
  micahOnboardingSteps,
  normalizeBrandColor,
  parseSocialHandle,
  prefillMicahBrandKit,
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
      "1:Monday Motivation",
      "2:Tip Tuesday",
      "3:Wisdom Wednesday",
      "4:Throwback Thursday",
      "5:Feature Friday",
      "6:Community Saturday",
      "7:Sunday Rest / Prep",
    ],
  );
  assert.deepEqual(
    [...MICAH_STARTER_DAYS[0]!.prompts.map((item) => item.label)],
    ["What are we designing today?", "What's the message?", "What's the vibe?"],
  );
  assert.equal(
    MICAH_STARTER_DAYS[1]?.prompts[0]?.label,
    "What's one tip your customers need this week?",
  );
  assert.equal(
    MICAH_STARTER_DAYS[6]?.prompts[0]?.label,
    "What should they rest from — and prep for Monday?",
  );
});

test("locked onboarding copy is one-at-a-time and skips Faith on DEMO", () => {
  assert.deepEqual(
    MICAH_ONBOARDING_QUESTIONS.map((item) => item.question),
    [
      "What's your business name and city?",
      "Who do you serve — and what do you want them to do after they see a post?",
      "Pick a voice: Motivational, Friendly/local, Comical, or Straight?",
      "Want faith/Christian language in your posts? Yes / No (default No).",
      "Brand colors — navy/gold OK, or send hex / a photo of your brand?",
      "Upload your logo file (paste as-is; never redraw).",
      "Which accounts should I learn from? Facebook, Instagram, LinkedIn, TikTok — links or @handles.",
      "What's your main offer this week (one sentence)?",
    ],
  );
  assert.equal(micahOnboardingSteps(false).length, 8);
  assert.equal(micahOnboardingSteps(true).some((item) => item.id === "faith"), false);
  assert.equal(micahOnboardingSteps(true).length, 7);
});

test("DEMO brand setup never offers Faith and defaults to navy/gold", () => {
  const kit = defaultMicahBrandKit();
  assert.equal(kit.demeanor, null);
  assert.equal(kit.faithLanguage, false);
  assert.equal(kit.primaryColor, MICAH_NAVY);
  assert.equal(kit.secondaryColor, MICAH_GOLD);
  assert.equal(kit.logoDataUri, null);
  assert.deepEqual(
    visibleMicahVoices(true).map((voice) => voice.id),
    ["motivational", "friendly_local", "comical", "straight"],
  );
  assert.deepEqual(
    visibleMicahVoices(false).map((voice) => voice.id),
    ["motivational", "friendly_local", "comical", "straight"],
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
  assert.match(prompt, /Copy\/Download only. Never auto-post/);
  assert.match(prompt, /store only, do not scrape/i);
  assert.doesNotMatch(prompt, /blotato|schedule this post/i);
  assert.match(composeMicahTalkPrompt({ theme: "Feature Friday" }), /Never auto-post/);
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
  assert.equal(kit?.faithLanguage, false);
  assert.equal(kit?.primaryColor, "#123456");
  assert.equal(kit?.facebook, "facebook.com/shop");
  assert.equal(kit?.logoDataUri, "data:image/png;base64,ZmFrZQ==");
  assert.equal(kit?.setupSaved, true);
});

test("MICAH desk chrome uses the locked onboarding and day-block copy", () => {
  const desk = readRepo("src/components/micah-week-desk.tsx");
  const studio = readRepo("src/components/client-content-studio.tsx");
  const days = readRepo("src/lib/lions-den/micah-starter-week.ts");
  const pane = readRepo("src/components/lions-den/atlas-staff-pane.tsx");
  assert.match(days, /Monday Motivation/);
  assert.match(days, /Sunday Rest \/ Prep/);
  assert.match(days, /What's your business name and city\?/);
  assert.match(days, /Want faith\/Christian language in your posts\? Yes \/ No \(default No\)\./);
  assert.match(days, /What are we designing today\?/);
  assert.match(desk, /Build my 7-day week/);
  assert.match(desk, /Upload logo/);
  assert.match(desk, /Copy\/Download only. Never auto-post/);
  assert.match(desk, /aria-pressed=\{active\}/);
  assert.match(desk, /micah-day-board/);
  assert.match(desk, /Generate this day-card/);
  assert.match(desk, /composeMicahDayBoardPrompt/);
  assert.match(desk, /submit: true/);
  assert.match(desk, /firstIncompleteMicahOnboardingIndex/);
  assert.match(studio, /MicahWeekDesk/);
  assert.match(studio, /Appointments stay on Calendar/);
  assert.match(studio, /brandKitForMicahDesk/);
  assert.match(studio, /readMicahWorkspacePrefill/);
  assert.match(readRepo("src/app/client/micah/page.tsx"), /organizationName=\{primaryOrganization.name\}/);
  assert.match(readRepo("src/server/content-studio/brand.ts"), /readMicahWorkspacePrefill/);
  assert.doesNotMatch(studio, /Nothing in it yet/);
  assert.doesNotMatch(desk, /schedule this post/i);
  assert.match(pane, /detail\?\.submit/);
  assert.match(pane, /requestSubmit/);
  assert.match(pane, /router.refresh/);
});

test("brand setup prefills workspace name and city and skips answered steps", () => {
  const empty = defaultMicahBrandKit();
  const filled = prefillMicahBrandKit(empty, {
    organizationName: "Atlas For Entrepreneurs",
    city: "Houston",
    audience: "Owners who want booked weeks",
    weeklyOffer: "Same-week service",
  });
  assert.equal(filled.businessName, "Atlas For Entrepreneurs");
  assert.equal(filled.city, "Houston");
  assert.equal(filled.audience, "Owners who want booked weeks");
  assert.equal(filled.weeklyOffer, "Same-week service");
  assert.equal(filled.faithLanguage, false);
  assert.equal(isMicahOnboardingStepAnswered(filled, "name_city"), true);
  assert.equal(isMicahOnboardingStepAnswered(filled, "audience"), true);
  assert.equal(isMicahOnboardingStepAnswered(filled, "voice"), false);
  assert.equal(isMicahOnboardingStepAnswered(filled, "faith", true), true);
  assert.equal(isMicahOnboardingStepAnswered(filled, "faith", false), false);
  assert.equal(firstIncompleteMicahOnboardingIndex(filled, false), 2);
  assert.equal(firstIncompleteMicahOnboardingIndex(filled, true), 2);

  const savedNameOnly = prefillMicahBrandKit(empty, {
    organizationName: "Harbor Lights Studio",
  });
  assert.equal(savedNameOnly.businessName, "Harbor Lights Studio");
  assert.equal(savedNameOnly.city, "");
  assert.equal(isMicahOnboardingStepAnswered(savedNameOnly, "name_city"), false);
  assert.equal(firstIncompleteMicahOnboardingIndex(savedNameOnly, false), 0);

  const kept = prefillMicahBrandKit(
    { ...empty, businessName: "Saved Shop", city: "Cypress" },
    { organizationName: "Atlas For Entrepreneurs", city: "Houston" },
  );
  assert.equal(kept.businessName, "Saved Shop");
  assert.equal(kept.city, "Cypress");
});

test("day-board brief hands off a MICAH create prompt for that weekday", () => {
  const prompt = composeMicahDayBoardPrompt({
    day: 5,
    theme: "Feature Friday",
    angle: "Name the offer. Name the next 48 hours. One CTA.",
    ask: "Spotlight the Labor Day clean-out.",
  });
  assert.match(prompt, /Feature Friday/);
  assert.match(prompt, /Friday/);
  assert.match(prompt, /Name the offer/);
  assert.match(prompt, /Labor Day clean-out/);
  assert.match(prompt, /create/);
  assert.match(prompt, /gallery draft/);
  assert.match(prompt, /Copy\/Download only. Never auto-post/);
  assert.doesNotMatch(prompt, /auto-post this|schedule this post|blotato/i);
  assert.equal(focusDayFromMicahPrompt(prompt), 5);
  assert.equal(focusDayFromMicahPrompt("Ask MICAH to create a Monday Motivation gallery draft"), 1);
  assert.equal(focusDayFromMicahPrompt("focus day 3 please"), 3);
  assert.equal(MICAH_STARTER_DAYS[0]?.angles.length, 5);
  assert.equal(MICAH_STARTER_DAYS.every((item) => item.angles.length >= 3 && item.angles.length <= 5), true);
});
