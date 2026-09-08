import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
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
  assert.match(homepage, /HUNTER[\s\S]*leads to review/);
  assert.match(homepage, /you approve then send/);
  assert.match(homepage, /gallery drafts only/);
  assert.doesNotMatch(homepage, /Phone AI is live|live Phone AI|Front Desk is live/i);
});

test("AFE homepage keeps CLIENT PANEL and does not sell SIS chrome", () => {
  assert.match(homepage, /denTitle:\s*"CLIENT PANEL"/);
  assert.match(homepage, /denCta:\s*"ENTER THE CLIENT PANEL"/);
  assert.match(homepage, /denCta:\s*"ENTRAR AL CLIENT PANEL"/);
  assert.doesNotMatch(homepage, /PANEL DE CLIENTES|Panel de clientes/);
  assert.doesNotMatch(homepage, /sis-homepage|SisHeader|sis-real|SIS Custom Creations/);
});

test("AFE homepage #den shows a real Lion’s Den Summary still, not the empty workspace mock", () => {
  const den = homepage.slice(homepage.indexOf("atlas-den-section"), homepage.indexOf("atlas-stills-section"));
  const summaryStill = join(root, "public/marketing/desk-stills/lions-den-summary.webp");

  assert.match(den, /DeskSummaryStill/);
  assert.match(homepage, /lions-den-summary\.webp/);
  assert.match(homepage, /Desk menu/);
  assert.match(homepage, /Summary, Prospects, Clients, Follow-up, Calendar, Notes, HUNTER, MICAH/);
  assert.match(homepage, /Massive Action Maintenance/);
  assert.match(homepage, /packed Prospects, HUNTER, Follow-up, and MICAH counts/);
  assert.doesNotMatch(homepage, /Your workspace|Tu espacio de trabajo/);
  assert.doesNotMatch(homepage, /No recent activity|No hay actividad reciente/);
  assert.doesNotMatch(homepage, /"Dashboard"|"Leads"|"Conversations"|"Opportunities"/);
  assert.doesNotMatch(den, /SAMPLE|#SampleDraft|sis-real|SIS Custom Creations|Floor/);
  assert.equal(existsSync(summaryStill), true, "lions-den-summary.webp is missing");
  assert.ok(statSync(summaryStill).size > 8_000, "lions-den-summary.webp should be a real still, not an empty placeholder");
});

test("AFE homepage shows three desk proof stills near #den without selling live send", () => {
  const stills = homepage.slice(homepage.indexOf("atlas-stills-section"), homepage.indexOf("atlas-family-section"));
  const stillFiles = [
    "public/marketing/desk-stills/hunter-review-pile.webp",
    "public/marketing/desk-stills/follow-up-drafts.webp",
    "public/marketing/desk-stills/micah-gallery.webp",
  ];
  const micahStill = join(root, "public/marketing/desk-stills/micah-gallery.webp");

  assert.match(homepage, /id="desk-stills"/);
  assert.match(homepage, /See the desk before the trial/);
  assert.match(homepage, /Teasers only\. The working sample stays behind the 7-day trial/);
  assert.match(stills, /\{still\.name\} — \{still\.label\}/);
  assert.match(homepage, /HUNTER[\s\S]*leads to review/);
  assert.match(homepage, /you approve then send/);
  assert.match(homepage, /gallery drafts only/);
  assert.match(homepage, /Review pile/);
  assert.match(homepage, /Follow-up drafts you approve/);
  assert.match(homepage, /gallery Copy\/Download/);
  assert.match(homepage, /Copy caption, Download, and Edit/);
  assert.match(homepage, /hunter-review-pile\.webp/);
  assert.match(homepage, /follow-up-drafts\.webp/);
  assert.match(homepage, /micah-gallery\.webp/);
  assert.doesNotMatch(stills, /auto-send|auto-call|live Front Desk|live social/i);
  assert.doesNotMatch(stills, /SAMPLE|#SampleDraft|sis-real|SIS Custom Creations|Floor/);
  assert.doesNotMatch(stills, /HUNTER 7|7 leads|ten finds/i);
  assert.doesNotMatch(stills, /atlas-button gold/);
  assert.doesNotMatch(homepage, /Monday Motivation|Tip Tuesday|Brand Setup empty|empty blue day-cards/i);

  for (const file of stillFiles) {
    const path = join(root, file);
    assert.equal(existsSync(path), true, `${file} is missing`);
    assert.ok(statSync(path).size > 8_000, `${file} should be an optimized still, not an empty placeholder`);
  }
  assert.ok(
    statSync(micahStill).size > 80_000,
    "micah-gallery.webp must be a packed gallery still with finished drafts, not Brand Setup empty navy day-cards",
  );
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
