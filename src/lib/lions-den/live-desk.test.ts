import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AFE_CRM_DEMO_SLUG, AFE_CRM_LIVE_NAME } from "../client-portal/identity.ts";
import { usesLionsDenHub } from "./client-hub.ts";
import {
  AFE_LIVE_DESK_COMPANIES,
  ATLAS_STAFF_EMPTY_EN,
  ATLAS_STAFF_EMPTY_ES,
  lionsDenHubChromeCopy,
  presentLiveDeskOpportunity,
  stripVisibleDemoLabel,
} from "./live-desk.ts";

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260902010000_afe_lions_den_live_labels.sql",
);
const seedPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/seeds/afe_lions_den_live_desk.sql",
);

test("AFE live desk chrome never includes DEMO, sample, preview desk, or fake", () => {
  const chrome = lionsDenHubChromeCopy({ name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG });
  const chromeEs = lionsDenHubChromeCopy({ name: "AFE CRM DEMO", slug: AFE_CRM_DEMO_SLUG }, true);
  const visible = `${chrome.portalName} ${chrome.orgLabel} ${chrome.atlasEmpty}`;
  const visibleEs = `${chromeEs.portalName} ${chromeEs.orgLabel} ${chromeEs.atlasEmpty}`;

  assert.equal(chrome.portalName, "The Lion’s Den");
  assert.equal(chrome.orgLabel, "Atlas");
  assert.equal(chrome.atlasEmpty, ATLAS_STAFF_EMPTY_EN);
  assert.equal(chromeEs.atlasEmpty, ATLAS_STAFF_EMPTY_ES);
  assert.doesNotMatch(visible, /demo|sample|preview desk|fake/i);
  assert.doesNotMatch(visibleEs, /demo|muestra|falso/i);
  assert.deepEqual([...AFE_LIVE_DESK_COMPANIES], ["ABC Plumbing", "123 Catering", "XYZ Electric"]);
});

test("visible DEMO labels are stripped from AFE desk records and left on other desks", () => {
  assert.equal(stripVisibleDemoLabel("ABC Plumbing (DEMO)"), "ABC Plumbing");
  assert.equal(stripVisibleDemoLabel("DEMO: call Jordan Hale today"), "call Jordan Hale today");
  assert.equal(stripVisibleDemoLabel("Jordan Hale (DEMO)"), "Jordan Hale");

  const afe = { name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG };
  const sis = { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" };
  const row = {
    id: "opp-1",
    organizationId: "org-afe",
    name: "ABC Plumbing (DEMO)",
    opportunityType: "customer" as const,
    stage: "qualified" as const,
    fitScore: 80,
    ownerRole: "hunter" as const,
    sourceLabel: "DEMO seed — no outreach",
    sourceUrl: null,
    contactName: "Jordan Hale (DEMO)",
    contactEmail: "demo+abc-plumbing@example.invalid",
    contactPhone: "(555) 010-0101",
    contactSocial: null,
    researchSummary: "DEMO record only. Plumbing shop that asked about hats.",
    fitReason: null,
    nextAction: "DEMO: salesman can call Jordan Hale at ABC Plumbing today.",
    nextActionDue: "2026-09-02",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    events: [],
  };

  const live = presentLiveDeskOpportunity(afe, row);
  assert.equal(live.name, "ABC Plumbing");
  assert.equal(live.nextAction, "salesman can call Jordan Hale at ABC Plumbing today.");
  assert.equal(live.contactName, "Jordan Hale");
  assert.doesNotMatch(`${live.name} ${live.nextAction} ${live.contactName}`, /demo/i);

  const untouched = presentLiveDeskOpportunity(sis, row);
  assert.equal(untouched.name, "ABC Plumbing (DEMO)");
});

test("MICAH uses the live Lion's Den hub pane and does not restore preview staff copy", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const micah = readFileSync(join(root, "src/app/client/micah/page.tsx"), "utf8");
  const pane = readFileSync(join(root, "src/components/lions-den/atlas-staff-pane.tsx"), "utf8");
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");

  assert.match(micah, /LionsDenBoardScreen board="micah"/);
  assert.doesNotMatch(micah, /usesLionsDenHub/);
  assert.doesNotMatch(micah, /staff chat does not send/);
  assert.doesNotMatch(micah, /ATLAS staff/);
  assert.doesNotMatch(micah, /\bDEMO\b/);
  assert.match(pane, /Talk to Atlas/);
  assert.match(pane, /submitClientAiRequest/);
  assert.doesNotMatch(pane, /previewMode/);
  assert.doesNotMatch(pane, /staff chat does not send/);
  assert.doesNotMatch(pane, /\bDEMO\b/);
  assert.match(hub, /<AtlasStaffPane/);
  assert.doesNotMatch(hub, /previewMode/);
  assert.equal(usesLionsDenHub({ name: AFE_CRM_LIVE_NAME, slug: AFE_CRM_DEMO_SLUG }), true);
  assert.equal(usesLionsDenHub({ name: "AFE CRM DEMO", slug: "" }), true);
  assert.equal(usesLionsDenHub("qtime-productions"), false);
});

test("AFE live-label SQL only updates slug afe-crm-demo and never deletes or seeds SIS", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const seed = readFileSync(seedPath, "utf8");

  assert.match(sql, /slug ilike 'afe-crm-demo'/);
  assert.match(sql, /set name = 'Atlas'/i);
  assert.match(sql, /organization_opportunities/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /sis-diy-big-complete-showcase/);
  assert.doesNotMatch(sql, /qtime-productions/);
  assert.match(seed, /slug ilike 'afe-crm-demo'/);
  assert.doesNotMatch(seed, /insert into/i);
  assert.doesNotMatch(seed, /sis-diy-big-complete-showcase/);
});
