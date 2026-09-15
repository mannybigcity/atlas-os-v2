import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  micahFlyerButtonLabel,
  micahFlyerConfirmation,
  micahFlyerPrompt,
} from "./micah-flyer-request.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

test("Micah flyer prompt is gallery-only and SIS never asks for the AFE lion", () => {
  const sis = micahFlyerPrompt({
    spanish: false,
    prospectName: "Jordan Host",
    prospectCompany: null,
    prospectType: "party client",
    businessName: "SIS Custom Creations",
    trade: null,
    city: null,
    sisDesk: true,
  });
  assert.match(sis, /Make a flyer for Jordan Host/);
  assert.match(sis, /Do not use the AFE lion logo/);
  assert.match(sis, /Gallery draft only/);
  assert.match(sis, /No Blotato/);
  assert.doesNotMatch(sis, /post this live|schedule this post/i);

  const afe = micahFlyerPrompt({
    spanish: false,
    prospectName: "Dana Reyes",
    prospectCompany: "Cypress PM",
    prospectType: "property management company",
    businessName: "Atlas For Entrepreneurs",
    trade: "plumbing",
    city: "Cypress",
    sisDesk: false,
  });
  assert.match(afe, /AFE house desks may use AFE brand/);
  assert.match(afe, /Client desks must not use the AFE lion/);
});

test("Micah flyer confirmation never claims a live post", () => {
  assert.equal(
    micahFlyerButtonLabel(false),
    "Ask Micah for a flyer",
  );
  assert.equal(micahFlyerButtonLabel(true), "Pídele un flyer a Micah");
  const saved = micahFlyerConfirmation({ spanish: false, prospectName: "Dana Reyes", saved: true });
  assert.match(saved, /gallery draft for Dana Reyes/);
  assert.match(saved, /Nothing was posted/);
  const queued = micahFlyerConfirmation({ spanish: true, prospectName: "Dana Reyes", saved: false });
  assert.match(queued, /pedido de flyer para Dana Reyes/);
  assert.match(queued, /No se publicó nada/);
});

test("desk compose actions reuse the org AI ledger and never auto-send", () => {
  const actions = readRepo("src/server/outreach/desk-compose-actions.ts");
  assert.match(actions, /reserve_client_ai_daily_question/);
  assert.match(actions, /generateStructuredText/);
  assert.match(actions, /createMicahGalleryDraft/);
  assert.match(actions, /isSisOrganization/);
  assert.match(actions, /isAfeCrmDemoOrganization|isAfeOperatorDeskOrganization/);
  assert.match(actions, /demoDesk: afeHouse/);
  assert.match(actions, /focusDay: 1/);
  assert.match(actions, /organization_ai_requests/);
  assert.doesNotMatch(actions, /api\.resend\.com|twilio|blotato|blacktwist/i);
  assert.doesNotMatch(actions, /process\.env\.OPENAI_API_KEY.*=.*sk-/);
});
