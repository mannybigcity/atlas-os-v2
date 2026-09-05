import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atlasStaffCanSend } from "./atlas-staff-send.ts";
import { clientOverviewRendersLionsDen, usesLionsDenHub } from "./client-hub.ts";

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
  assert.equal(usesLionsDenHub({ name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" }), true);
  assert.equal(clientOverviewRendersLionsDen(null), true);
  assert.equal(clientOverviewRendersLionsDen({ name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" }), true);
  assert.equal(clientOverviewRendersLionsDen(undefined), true);
  assert.equal(clientOverviewRendersLionsDen("qtime-productions"), false);
  assert.equal(clientOverviewRendersLionsDen({ slug: "harbor-lights" }, { showSuperAdminCrm: true }), false);
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
    "src/app/client/trial-inbox/page.tsx",
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
  assert.match(pane, /atlasDeskNextHref/);
  assert.match(pane, /value="atlas"/);
  assert.doesNotMatch(pane, /staffRole/);
  assert.doesNotMatch(pane, /setStaffRole/);
  assert.doesNotMatch(pane, /Atlas staff/);
  assert.doesNotMatch(pane, /previewMode/);
  assert.doesNotMatch(pane, /staff chat does not send/);
  assert.doesNotMatch(pane, /staff, not a closer/);

  const followUp = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  assert.match(followUp, /THE FORTUNE IS IN THE FOLLOW-UP/);
  assert.match(followUp, /font-extrabold/);
  assert.match(followUp, /uppercase/);
  assert.doesNotMatch(followUp, /The fortune is in the follow-up\./);

  const handoff = readRepo("src/lib/lions-den/atlas-staff-handoff.ts");
  assert.match(handoff, /Handed to DAVID/);
  assert.match(handoff, /Handed to HUNTER/);
  assert.match(handoff, /Handed to MICAH/);

  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  assert.match(overview, /ld-desk-followup/);
  assert.match(overview, /LionsDenCalendarBoard/);
  const followupIndex = overview.indexOf('className="ld-desk-followup"');
  const calendarIndex = overview.indexOf("<LionsDenCalendarBoard");
  const notesWorkIndex = overview.lastIndexOf("ld-desk-work");
  assert.ok(followupIndex > 0 && calendarIndex > followupIndex);
  assert.ok(notesWorkIndex > calendarIndex);

  const notes = readRepo("src/components/lions-den/lions-den-notes.tsx");
  assert.match(notes, /name="noteType"/);
  assert.match(notes, /name="attention"/);

  const layout = readRepo("src/app/layout.tsx");
  assert.match(layout, /Inter/);
  assert.match(layout, /--font-ui/);
});
