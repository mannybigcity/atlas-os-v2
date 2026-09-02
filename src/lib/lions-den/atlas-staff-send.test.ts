import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atlasStaffCanSend } from "./atlas-staff-send.ts";
import { usesLionsDenHub } from "./client-hub.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("previewMode never blocks Talk to Atlas sending", () => {
  assert.equal(
    atlasStaffCanSend({
      organizationId: "org-afe-crm-demo",
      previewMode: true,
    }),
    true,
  );
  assert.equal(
    atlasStaffCanSend({
      organizationId: "org-afe-crm-demo",
      previewMode: true,
      pending: true,
    }),
    false,
  );
  assert.equal(
    atlasStaffCanSend({
      organizationId: "org-afe-crm-demo",
      previewMode: true,
      capped: true,
    }),
    false,
  );
  assert.equal(atlasStaffCanSend({ organizationId: "", previewMode: false }), false);
});

test("afe-crm-demo uses the Lion's Den hub even when only the DEMO name is present", () => {
  assert.equal(usesLionsDenHub("afe-crm-demo"), true);
  assert.equal(usesLionsDenHub({ name: "Atlas CRM DEMO", slug: "afe-crm-demo" }), true);
  assert.equal(usesLionsDenHub({ name: "Atlas CRM DEMO", slug: "" }), true);
  assert.equal(usesLionsDenHub({ name: "SIS Custom Creations", slug: "" }), true);
  assert.equal(usesLionsDenHub("qtime-productions"), false);
  assert.equal(usesLionsDenHub({ name: "QTime Productions", slug: "qtime-productions" }), false);
});

test("every founder Lion's Den board mounts LionsDenBoardScreen and the live Atlas pane", () => {
  const boards = [
    "src/app/client/page.tsx",
    "src/app/client/prospects/page.tsx",
    "src/app/client/david/page.tsx",
    "src/app/client/calendar/page.tsx",
    "src/app/client/notes/page.tsx",
    "src/app/client/hunter/page.tsx",
    "src/app/client/micah/page.tsx",
  ];

  for (const file of boards) {
    const src = readRepo(file);
    assert.match(src, /LionsDenBoardScreen/, `${file} must mount LionsDenBoardScreen`);
    assert.doesNotMatch(src, /staff chat does not send/, `${file} still has leftover preview staff copy`);
    assert.doesNotMatch(src, /ATLAS staff/, `${file} still has leftover ATLAS STAFF copy`);
  }

  const micah = readRepo("src/app/client/micah/page.tsx");
  assert.match(micah, /board="micah"/);
  assert.match(micah, /LionsDenBoardScreen board="micah"/);
  assert.doesNotMatch(micah, /usesLionsDenHub/);

  const pane = readRepo("src/components/lions-den/atlas-staff-pane.tsx");
  assert.match(pane, /Talk to Atlas/);
  assert.match(pane, /submitClientAiRequest/);
  assert.match(pane, /HUNTER/);
  assert.match(pane, /MICAH/);
  assert.match(pane, /DAVID/);
  assert.match(pane, /staffRole/);
  assert.doesNotMatch(pane, /previewMode/);
  assert.doesNotMatch(pane, /staff chat does not send/);
  assert.doesNotMatch(pane, /staff, not a closer/);

  const hub = readRepo("src/components/lions-den/lions-den-client-hub.tsx");
  assert.match(hub, /<AtlasStaffPane/);
  assert.doesNotMatch(hub, /previewMode/);
});
