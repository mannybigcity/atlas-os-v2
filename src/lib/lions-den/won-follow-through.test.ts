import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  WON_REVIEW_ASK_DAYS,
  localDateInDaysFrom,
  normalizeReviewLink,
  validateReviewLink,
  wonReviewAsk,
} from "./won-follow-through.ts";

const wonAt = new Date(2026, 8, 11, 15, 30);

test("wonReviewAsk dates the review ask three days after the win", () => {
  const ask = wonReviewAsk({ prospectName: "Rosa's Bakery", businessName: "Big City Roofing", spanish: false, wonAt });
  assert.equal(WON_REVIEW_ASK_DAYS, 3);
  assert.equal(ask.nextActionDue, "2026-09-14");
  assert.equal(localDateInDaysFrom(new Date(2026, 8, 29, 12), 3), "2026-10-02");
});

test("wonReviewAsk is a sendable message with the review link inside", () => {
  const ask = wonReviewAsk({
    prospectName: "Rosa's Bakery",
    businessName: "Big City Roofing",
    reviewLink: "g.page/r/abc/review",
    spanish: false,
    wonAt,
  });
  assert.match(ask.nextAction, /Thank you for choosing Big City Roofing/);
  assert.match(ask.nextAction, /https:\/\/g\.page\/r\/abc\/review/);
  assert.match(ask.nextAction, /anyone who needs the same kind of work/);
  assert.ok(ask.nextAction.length <= 1200);
});

test("wonReviewAsk tells the owner to paste the link when none is saved, in both languages", () => {
  const en = wonReviewAsk({ prospectName: "X", businessName: "Big City Roofing", spanish: false, wonAt });
  const es = wonReviewAsk({ prospectName: "X", businessName: "Big City Roofing", spanish: true, wonAt });
  assert.match(en.nextAction, /Paste your Google review link here/);
  assert.match(es.nextAction, /Pega aquí tu enlace de reseñas/);
  assert.match(es.nextAction, /Gracias por confiar en Big City Roofing/);
});

test("review link normalization and validation", () => {
  assert.equal(normalizeReviewLink("  "), "");
  assert.equal(normalizeReviewLink("ab"), "");
  assert.equal(normalizeReviewLink("g.page/r/abc"), "https://g.page/r/abc");
  assert.equal(normalizeReviewLink("https://g.page/r/abc"), "https://g.page/r/abc");
  assert.equal(validateReviewLink("", false).error, null);
  assert.equal(validateReviewLink("g.page/r/abc", false).link, "https://g.page/r/abc");
  assert.match(validateReviewLink("g.page/r/a b", false).error ?? "", /spaces/);
  assert.match(validateReviewLink(`https://${"x".repeat(600)}`, true).error ?? "", /largo/);
});

test("contract: marking won sets the dated review ask and saves the review link per desk", () => {
  const actions = readFileSync(new URL("../../server/opportunities/prospect-actions.ts", import.meta.url), "utf8");
  assert.match(actions, /wonReviewAsk\(/);
  assert.match(actions, /getDeskReviewLink\(supabase, organizationId\)/);
  assert.match(actions, /next_action_due: reviewAsk\.nextActionDue/);
  assert.match(actions, /Review and referral ask queued for/);

  const review = readFileSync(new URL("../../server/opportunities/desk-review-actions.ts", import.meta.url), "utf8");
  assert.match(review, /^"use server";/);
  assert.match(review, /organization_desk_settings/);
  assert.match(review, /onConflict: "organization_id"/);
  assert.match(review, /review_link_saved/);

  const card = readFileSync(new URL("../../components/lions-den/won-review-card.tsx", import.meta.url), "utf8");
  assert.match(card, /data-won-review/);
  assert.match(card, /action=\{saveDeskReviewLink\}/);
  assert.match(card, /data-review-ask-preview/);

  const page = readFileSync(new URL("../../app/client/clients/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<WonReviewCard/);

  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260913020000_desk_settings_review_link.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /add column if not exists review_link text/);
});
