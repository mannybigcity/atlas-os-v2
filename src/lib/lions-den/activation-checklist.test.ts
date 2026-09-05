import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AFE_CRM_DEMO_SLUG,
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
  SAMPLE_DESK_DISPLAY_NAME,
} from "../client-portal/identity.ts";
import { HUNTER_SEARCH_RESULT_CAP } from "../../server/hunter/review.ts";
import {
  ACTIVATION_FIND_TARGET,
  activationChecklistCopy,
  activationChecklistProgress,
  activationDismissedStorageKey,
  activationFoundCount,
  activationMicahStorageKey,
  hasMicahActivationProof,
  isActivationSampleWalkthrough,
  shouldShowActivationChecklist,
} from "./activation-checklist.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const trial = { name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43" };
const sample = { name: SAMPLE_DESK_DISPLAY_NAME, slug: AFE_CRM_DEMO_SLUG };
const operator = { name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG };
const sis = { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" };

test("activation checklist is AFE trial or SAMPLE walkthrough only — never SIS or operator", () => {
  assert.equal(shouldShowActivationChecklist({ organization: trial, organizationId: "org-trial" }), true);
  assert.equal(shouldShowActivationChecklist({ organization: sample, organizationId: "org-sample" }), true);
  assert.equal(isActivationSampleWalkthrough(sample), true);
  assert.equal(isActivationSampleWalkthrough(trial), false);
  assert.equal(shouldShowActivationChecklist({ organization: operator, organizationId: "org-afe" }), false);
  assert.equal(shouldShowActivationChecklist({ organization: sis, organizationId: "org-sis" }), false);
  assert.equal(
    shouldShowActivationChecklist({ organization: trial, organizationId: "org-trial", sisDesk: true }),
    false,
  );
  assert.equal(shouldShowActivationChecklist({ organization: trial, organizationId: "" }), false);
});

test("steps mark complete from hunter found/accepted counts and MICAH gallery state", () => {
  assert.equal(ACTIVATION_FIND_TARGET, HUNTER_SEARCH_RESULT_CAP);
  assert.equal(activationFoundCount({ pendingCount: 9, acceptedCount: 1 }), 10);
  assert.equal(activationFoundCount({ foundCount: 10, pendingCount: 0, acceptedCount: 0 }), 10);

  const empty = activationChecklistProgress({ pendingCount: 0, acceptedCount: 0, drafts: [] });
  assert.deepEqual(empty, {
    foundCount: 0,
    acceptedCount: 0,
    find10: false,
    accept1: false,
    micah: false,
    completed: 0,
    total: 3,
    allDone: false,
  });

  const afterSearch = activationChecklistProgress({ pendingCount: 10, acceptedCount: 0 });
  assert.equal(afterSearch.find10, true);
  assert.equal(afterSearch.accept1, false);

  const afterAccept = activationChecklistProgress({ pendingCount: 9, acceptedCount: 1 });
  assert.equal(afterAccept.find10, true);
  assert.equal(afterAccept.accept1, true);
  assert.equal(afterAccept.micah, false);

  assert.equal(hasMicahActivationProof([{ metadata: { brand_setup: true } }]), false);
  assert.equal(hasMicahActivationProof([{ metadata: { week_day: 1, week_pack: true } }]), true);
  assert.equal(hasMicahActivationProof([], true), true);

  const done = activationChecklistProgress({
    foundCount: 10,
    acceptedCount: 1,
    drafts: [{ metadata: { week_day: 1 } }],
  });
  assert.equal(done.allDone, true);
  assert.equal(done.completed, 3);
});

test("copy stays office-manager short and never invents DEMO or outreach", () => {
  const en = activationChecklistCopy();
  const sampleCopy = activationChecklistCopy({ sampleWalkthrough: true });
  const es = activationChecklistCopy({ spanish: true });
  const visible = `${en.eyebrow} ${en.title} ${en.hint} ${en.doneHint} ${en.steps.find10.detail} ${en.steps.accept1.detail} ${en.steps.micah.detail}`;

  assert.equal(en.eyebrow, "First three");
  assert.equal(en.title, "Open the desk.");
  assert.match(en.hint, /You call/);
  assert.match(en.hint, /does not email, call, or text/);
  assert.equal(en.steps.find10.label, "Find 10");
  assert.equal(en.steps.accept1.label, "Accept 1");
  assert.equal(en.steps.micah.label, "Open MICAH");
  assert.match(en.steps.micah.detail, /Day 1 \/ gallery/);
  assert.doesNotMatch(visible, /demo|auto-?send|auto-?post|email them|text them/i);
  assert.equal(sampleCopy.eyebrow, "SAMPLE walkthrough");
  assert.doesNotMatch(sampleCopy.eyebrow, /demo/i);
  assert.equal(es.steps.find10.label, "Busca 10");
  assert.equal(es.steps.accept1.label, "Acepta 1");
  assert.equal(es.steps.micah.label, "Abre MICAH");
  assert.doesNotMatch(es.title, /PANEL DE CLIENTES/);
});

test("Summary mounts the dismissible checklist from real hunter/MICAH state", () => {
  const lib = readRepo("src/lib/lions-den/activation-checklist.ts");
  const checklist = readRepo("src/components/lions-den/lions-den-activation-checklist.tsx");
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const page = readRepo("src/app/client/page.tsx");
  const queries = readRepo("src/server/hunter/queries.ts");
  const micah = readRepo("src/app/client/micah/page.tsx");

  assert.match(lib, /shouldShowActivationChecklist/);
  assert.match(lib, /isAfeClientDeskOrganization/);
  assert.match(lib, /isAfeCrmDemoOrganization/);
  assert.match(lib, /isSisOrganization/);
  assert.doesNotMatch(lib, /resend|auto-send|sendOutreach/i);
  assert.equal(activationDismissedStorageKey("org-1"), "ld-activation-dismissed:org-1");
  assert.equal(activationMicahStorageKey("org-1"), "ld-activation-micah:org-1");

  assert.match(checklist, /LionsDenActivationChecklist/);
  assert.match(checklist, /MicahActivationMarker/);
  assert.match(checklist, /localStorage/);
  assert.match(checklist, /copy\.hide/);
  assert.doesNotMatch(checklist, /\bDEMO\b/);

  assert.match(overview, /LionsDenActivationChecklist/);
  assert.match(overview, /shouldShowActivationChecklist/);
  assert.match(overview, /isActivationSampleWalkthrough/);
  assert.match(overview, /acceptedCount/);
  assert.match(overview, /foundCount/);
  assert.doesNotMatch(overview, /sisDashboard \? <LionsDenActivationChecklist/);

  assert.match(page, /acceptedCount=\{reviewPile\?\.acceptedCount/);
  assert.match(page, /foundCount=\{reviewPile\?\.foundCount/);
  assert.match(queries, /foundCount/);
  assert.match(queries, /acceptedCount/);
  assert.match(micah, /MicahActivationMarker/);
});
