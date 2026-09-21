import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Ask Atlas staff rail defaults collapsed and restores the full pane", () => {
  const rail = readRepo("src/components/lions-den/atlas-staff-rail.tsx");
  const hub = readRepo("src/components/lions-den/lions-den-client-hub.tsx");
  const pane = readRepo("src/components/lions-den/atlas-staff-pane.tsx");
  const css = readRepo("src/app/globals.css");

  assert.match(hub, /<AtlasStaffRail/);
  assert.match(rail, /<AtlasStaffPane/);
  assert.match(rail, /useState\(false\)/);
  assert.match(rail, /localStorage/);
  assert.match(rail, /lions-den-atlas-staff-rail:/);
  assert.match(rail, /Ask Atlas/);
  assert.match(rail, /Expand Ask Atlas/);
  assert.match(rail, /Collapse Ask Atlas/);
  assert.match(rail, /Pregunta a Atlas/);
  assert.match(rail, /Expandir Pregunta a Atlas/);
  assert.match(rail, /Contraer Pregunta a Atlas/);
  assert.match(rail, /: "Collapse"/);
  assert.match(rail, /\? "Contraer"/);
  assert.match(rail, /\{collapseText\}/);
  assert.match(rail, /MICAH_TALK_EVENT/);
  assert.match(rail, /data-staff-toggle="expand"/);
  assert.match(rail, /data-staff-toggle="collapse"/);
  assert.doesNotMatch(rail, /onDrag|draggable/);
  assert.match(pane, /Talk to Atlas/);
  assert.match(pane, /submitClientAiRequest/);
  assert.match(pane, /id="atlas-staff-prompt"/);

  assert.match(css, /grid-template-columns:\s*9rem\s+minmax\(0,\s*1fr\)\s+3\.25rem/);
  assert.match(
    css,
    /\.lions-den-hub-body:has\(\.lions-den-hub-staff\[data-staff="expanded"\]\)\s*\{[^}]*17rem/,
  );
  assert.match(css, /max-width:\s*1279px/);

  assert.doesNotMatch(readRepo("src/components/client-portal-shell.tsx"), /AtlasStaffRail|lions-den-hub-staff/);
  assert.doesNotMatch(readRepo("src/components/sis-crm-dashboard.tsx"), /AtlasStaffRail/);
  assert.doesNotMatch(readRepo("src/components/client-qtime-dashboard.tsx"), /AtlasStaffRail/);
});
