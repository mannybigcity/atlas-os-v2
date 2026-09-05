import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const homepage = readFileSync(join(root, "src/components/atlas-homepage.tsx"), "utf8");
const hero = homepage.slice(homepage.indexOf("atlas-hero-actions"), homepage.indexOf("atlas-hero-art"));

test("AFE homepage hero has one gold trial button and quiet secondary links", () => {
  assert.match(hero, /atlas-button gold/);
  assert.match(hero, /\/start-trial/);
  assert.equal([...hero.matchAll(/atlas-button/g)].length, 1);
  assert.match(hero, /atlas-hero-link[\s\S]*\/pricing#plans/);
  assert.match(hero, /atlas-hero-link[\s\S]*\/assessment/);
  assert.doesNotMatch(hero, /atlas-button outline/);
});

test("AFE homepage keeps PANEL DE CLIENTES and does not sell Front Desk or SIS chrome", () => {
  assert.match(homepage, /denTitle:\s*"PANEL DE CLIENTES"/);
  assert.doesNotMatch(homepage, /Front Desk|frontdesk/i);
  assert.doesNotMatch(homepage, /sis-homepage|SisHeader|sis-real|SIS Custom Creations/);
});
