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

test("AFE homepage catalyst hero speaks cash and follow-up in English and Spanish", () => {
  assert.match(homepage, /Stop losing good leads between the call, the quote, and the follow-up/);
  assert.match(homepage, /Keep prospects, callbacks, and next actions in one desk/);
  assert.match(homepage, /You approve every customer message/);
  assert.match(homepage, /New HVAC inquiry → reminder to call → you approve the follow-up → marked booked/);
  assert.match(homepage, /Deja de perder buenos clientes entre la llamada, la cotización y el seguimiento/);
  assert.match(homepage, /Mantén prospectos, devoluciones de llamada y próximos pasos en un solo escritorio/);
  assert.match(homepage, /Nueva consulta de HVAC → recordatorio para llamar → tú apruebas el seguimiento → marcado como reservado/);
  assert.doesNotMatch(homepage, /YOU CARRY THE FAMILY|ATLAS CARRIES THE BUSINESS|TÚ CARGAS CON LA FAMILIA/);
  assert.doesNotMatch(homepage, /agentic/i);
});

test("AFE homepage hero has one gold trial button and quiet secondary links", () => {
  assert.match(hero, /atlas-button gold/);
  assert.match(homepage, /trial:\s*"Start 7-day free trial"/);
  assert.match(hero, /\{t\.trial\}/);
  assert.match(hero, /\/start-trial/);
  assert.equal([...hero.matchAll(/atlas-button/g)].length, 1);
  assert.match(hero, /atlas-hero-link[\s\S]*\/#den/);
  assert.match(homepage, /See how the desk works →/);
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

test("AFE homepage states Phone AI / Front Desk is later and not live", () => {
  assert.match(homepage, /Phone AI \/ Front Desk is later and not live/);
  assert.match(homepage, /Leads to review \(HUNTER\)/);
  assert.match(homepage, /Follow-ups you approve/);
  assert.match(homepage, /Social drafts \(MICAH gallery\)/);
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
