import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atlasPricingPlans } from "../lib/pricing.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const homepage = readFileSync(join(root, "src/components/atlas-homepage.tsx"), "utf8");
const header = readFileSync(join(root, "src/components/site-header.tsx"), "utf8");
const footer = readFileSync(join(root, "src/components/site-footer.tsx"), "utf8");
const hero = homepage.slice(homepage.indexOf("atlas-hero-copy"), homepage.indexOf("atlas-hero-art"));
const bottomBar = homepage.slice(homepage.indexOf("atlas-bottom-bar"));

test("AFE homepage hero has one gold trial button and quiet secondary links", () => {
  assert.match(hero, /atlas-button gold/);
  assert.match(hero, /\/start-trial/);
  assert.equal([...hero.matchAll(/atlas-button/g)].length, 1);
  assert.match(hero, /atlas-hero-link[\s\S]*\/pricing#plans/);
  assert.match(hero, /atlas-hero-link[\s\S]*\/assessment/);
  assert.doesNotMatch(hero, /atlas-button outline/);
});

test("AFE homepage hero shows live BASIC GROW UNLIMITED prices from the pricing source", () => {
  const basic = atlasPricingPlans.find((plan) => plan.slug === "basic");
  const grow = atlasPricingPlans.find((plan) => plan.slug === "grow");
  const unlimited = atlasPricingPlans.find((plan) => plan.slug === "unlimited");

  assert.equal(basic?.monthlyPrice, 99);
  assert.equal(grow?.monthlyPrice, 249);
  assert.equal(unlimited?.monthlyPrice, 499);
  assert.equal(grow?.featured, true);
  assert.match(hero, /atlasPricingPlans\.map/);
  assert.match(hero, /atlas-hero-plans/);
  assert.match(hero, /\$\{plan\.monthlyPrice\}/);
  assert.match(hero, /plan\.featured/);
});

test("AFE homepage states UNLIMITED is the live desk and Front Desk phone AI is not live", () => {
  assert.match(homepage, /UNLIMITED is the full desk today/);
  assert.match(homepage, /HUNTER/);
  assert.match(homepage, /MICAH gallery/);
  assert.match(homepage, /Front Desk phone AI is later and not live/);
  assert.doesNotMatch(homepage, /Phone AI is live|live Phone AI|Front Desk is live/i);
});

test("AFE homepage keeps PANEL DE CLIENTES and does not sell SIS chrome", () => {
  assert.match(homepage, /denTitle:\s*"PANEL DE CLIENTES"/);
  assert.doesNotMatch(homepage, /sis-homepage|SisHeader|sis-real|SIS Custom Creations/);
});

test("AFE header keeps the official pasted logo and trial as the gold nav CTA", () => {
  assert.match(header, /src="\/brand\/atlas-logo\.png"/);
  assert.match(header, /Start 7-day free trial/);
  assert.match(header, /href=\{withSiteLanguage\("\/start-trial", language\)\}/);
  assert.match(header, /href: "\/assessment"/);
});

test("AFE footer strip CTA matches the hero trial door and keeps trust legal contact", () => {
  assert.match(bottomBar, /atlas-bottom-bar/);
  assert.match(bottomBar, /\/start-trial/);
  assert.match(bottomBar, /\{t\.bottomCta\}/);
  assert.match(homepage, /bottomCta:\s*"Start 7-day free trial"/);
  assert.doesNotMatch(bottomBar, /\/assessment/);
  assert.match(footer, /Built for trust:/);
  assert.match(footer, /Responsible AI/);
  assert.match(footer, /Privacy policy/);
  assert.match(footer, /Terms of use/);
  assert.match(footer, /Accessibility/);
  assert.match(footer, /atlasforentrepreneurs@gmail.com/);
  assert.match(footer, /All rights reserved/);
});
