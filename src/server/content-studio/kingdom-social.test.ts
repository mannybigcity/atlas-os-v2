import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleKingdomCaption,
  extractHashtags,
  gradeKingdomCaption,
  gradeKingdomWeek,
  sameHashtagSet,
} from "./kingdom-social.ts";
import { buildMicahWeekPack } from "./gallery-art.ts";

test("Kingdom grader requires hook, payoff, one CTA, and Facebook 1–3 hashtags", () => {
  const caption = assembleKingdomCaption({
    hook: "Monday is here. ABC Plumbing can use it.",
    payoff: "Crew hats are ready for the shop.",
    cta: "Call or stop in if you want this done this week.",
    hashtags: ["#DEMO", "#CrewHats"],
    demoLabel: "Sample draft for ABC Plumbing. Download and post it yourself.",
  });
  const instagram = assembleKingdomCaption({
    hook: "Monday is here. ABC Plumbing can use it.",
    payoff: "Crew hats are ready for the shop.",
    cta: "Call or stop in if you want this done this week.",
    hashtags: ["#HoustonTrades", "#Workwear", "#LocalCrew"],
    demoLabel: "Sample draft for ABC Plumbing. Download and post it yourself.",
  });
  const linkedin = assembleKingdomCaption({
    hook: "Monday is here. ABC Plumbing can use it.",
    payoff: "Crew hats are ready for the shop.",
    cta: "Call or stop in if you want this done this week.",
    hashtags: ["#SmallBusiness", "#TradesWork", "#LocalService"],
    demoLabel: "Sample draft for ABC Plumbing. Download and post it yourself.",
  });
  const grade = gradeKingdomCaption({
    caption,
    instagramCaption: instagram,
    linkedinCaption: linkedin,
    demoLabeled: true,
  });
  assert.equal(grade.pass, true);
  assert.equal(grade.facebookHashtags.length >= 1 && grade.facebookHashtags.length <= 3, true);
  assert.equal(sameHashtagSet(grade.facebookHashtags, grade.instagramHashtags), false);
  assert.equal(sameHashtagSet(grade.facebookHashtags, grade.linkedinHashtags), false);
});

test("Kingdom grader blocks hustle-bro voice, cloned hashtags, and auto-post tools", () => {
  const synergy = gradeKingdomCaption({
    caption: assembleKingdomCaption({
      hook: "Let's unlock synergy this week.",
      payoff: "Be a thought-leader and hustle.",
      cta: "Crush it and auto-post with Blotato.",
      hashtags: ["#Hustle", "#Grind"],
    }),
  });
  assert.equal(synergy.pass, false);
  assert.equal(
    synergy.reasons.some((reason) => /synergy|thought-leader|hustle-bro/i.test(reason)),
    true,
  );

  const cloned = gradeKingdomCaption({
    caption: assembleKingdomCaption({
      hook: "Monday is here.",
      payoff: "Hats for the crew.",
      cta: "Call if you need this.",
      hashtags: ["#CrewHats", "#LocalShop", "#ShopFloor"],
    }),
    instagramCaption: assembleKingdomCaption({
      hook: "Monday is here.",
      payoff: "Hats for the crew.",
      cta: "Call if you need this.",
      hashtags: ["#ShopFloor", "#CrewHats", "#LocalShop"],
    }),
  });
  assert.equal(cloned.pass, false);
  assert.equal(
    cloned.reasons.some((reason) => /clone the Facebook hashtag set/i.test(reason)),
    true,
  );
  assert.equal(sameHashtagSet(["#CrewHats", "#LocalShop"], ["#localshop", "#crewhats"]), true);
  assert.deepEqual(extractHashtags("Hello #One #Two"), ["#One", "#Two"]);
});

test("graded MICAH week pack keeps Facebook home hashtags distinct from IG/LinkedIn", () => {
  const cards = buildMicahWeekPack({
    prompt: "Make a week of posts for Labor Day",
    demeanor: "friendly_local",
    demoDesk: true,
  });
  const week = gradeKingdomWeek(cards);
  assert.equal(week.pass, true);
  assert.equal(week.failedDays.length, 0);
  for (const card of cards) {
    const grade = gradeKingdomCaption(card);
    assert.equal(grade.pass, true, grade.reasons.join(" "));
    assert.equal(grade.facebookHashtags.length >= 1 && grade.facebookHashtags.length <= 3, true);
    assert.equal(grade.instagramHashtags.length >= 3 && grade.instagramHashtags.length <= 5, true);
    assert.equal(grade.linkedinHashtags.length >= 3 && grade.linkedinHashtags.length <= 5, true);
    assert.equal(sameHashtagSet(grade.facebookHashtags, grade.instagramHashtags), false);
    assert.equal(sameHashtagSet(grade.facebookHashtags, grade.linkedinHashtags), false);
    assert.equal(sameHashtagSet(grade.instagramHashtags, grade.linkedinHashtags), false);
    assert.doesNotMatch(card.caption, /\bDEMO\b/);
    assert.doesNotMatch(card.caption, /synergy|thought-leader|hustle|blotato|blacktwist/i);
    assert.doesNotMatch(card.caption, /SIS Custom Creations/i);
  }
});
