import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
  SAMPLE_DESK_DISPLAY_NAME,
  SIS_LIONS_DEN_PREVIEW_SLUG,
  SIS_WORKING_ORG_NAME,
} from "../client-portal/identity.ts";
import {
  SIGNSCOUT_URL_ENV,
  canSeeSignScoutNav,
  getSignScoutUrl,
  signScoutNavLabel,
  signScoutUnsetHint,
} from "./signscout.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function afeOperator() {
  return { name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG };
}

test("SignScout nav is AFE operator / super-admin only — never SIS, sample, or client desks", () => {
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: afeOperator(),
    }),
    true,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: false,
      isClientPreview: false,
      organization: afeOperator(),
    }),
    false,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: true,
      organization: afeOperator(),
    }),
    false,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: SIS_WORKING_ORG_NAME, slug: SIS_LIONS_DEN_PREVIEW_SLUG },
    }),
    false,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: SAMPLE_DESK_DISPLAY_NAME, slug: "afe-crm-demo" },
    }),
    false,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "Harbor Lights Studio", slug: "harbor-lights" },
    }),
    false,
  );
  assert.equal(
    canSeeSignScoutNav({
      isSuperAdmin: true,
      isClientPreview: false,
      organization: { name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43" },
    }),
    false,
  );
});

test("SignScout URL comes from env and never invents a domain", () => {
  assert.equal(SIGNSCOUT_URL_ENV, "NEXT_PUBLIC_SIGNSCOUT_URL");
  assert.equal(getSignScoutUrl(""), null);
  assert.equal(getSignScoutUrl("   "), null);
  assert.equal(getSignScoutUrl(undefined), null);
  assert.equal(getSignScoutUrl("not-a-url"), null);
  assert.equal(getSignScoutUrl("javascript:alert(1)"), null);
  assert.equal(getSignScoutUrl("http://example.com"), null);
  assert.equal(
    getSignScoutUrl("https://signscout-live.example.vercel.app/"),
    "https://signscout-live.example.vercel.app/",
  );
  assert.equal(getSignScoutUrl("http://localhost:4173/scout"), "http://localhost:4173/scout");
  assert.equal(signScoutNavLabel(), "SignScout");
  assert.equal(signScoutUnsetHint(), "URL not set yet");
  assert.equal(signScoutUnsetHint(true), "URL aún no configurada");
});

test("desk chrome gates SignScout to AFE admin and opens a new tab when the URL is set", () => {
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");
  const screen = readFileSync(join(root, "src/components/lions-den/lions-den-board-screen.tsx"), "utf8");
  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  const helper = readFileSync(join(root, "src/lib/lions-den/signscout.ts"), "utf8");

  assert.match(screen, /canSeeSignScoutNav/);
  assert.match(screen, /getSignScoutUrl/);
  assert.match(screen, /showSignScout/);
  assert.match(hub, /showSignScout/);
  assert.match(hub, /data-signscout-nav/);
  assert.match(hub, /data-signscout-corner/);
  assert.match(hub, /target="_blank"/);
  assert.match(hub, /rel="noopener noreferrer"/);
  assert.match(hub, /signScoutUnsetHint/);
  assert.doesNotMatch(hub, /https?:\/\/[^\s"']*signscout/i);
  assert.doesNotMatch(screen, /https?:\/\/[^\s"']*signscout/i);
  assert.doesNotMatch(helper, /https?:\/\/[^\s"']*vercel\.app/);
  assert.match(envExample, /NEXT_PUBLIC_SIGNSCOUT_URL=/);
  assert.match(envExample, /CoS will set the live Vercel URL/);
  assert.doesNotMatch(hub, /HUNTER ingest|ocr api/i);
  assert.doesNotMatch(screen, /HUNTER ingest|ocr api/i);
});
