import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ATLAS_BRIDGE_ANSWER_MS,
  ATLAS_BRIDGE_LISTENING_MS,
  ATLAS_BRIDGE_STAGE_COPY,
  stripAtlasBridgeOpsNote,
} from "./atlas-bridge-copy.ts";
import {
  ATLAS_BRIDGE_DEFAULT_INBOX_FOLDER_ID,
  ATLAS_BRIDGE_DEFAULT_OUTBOX_FOLDER_ID,
  ATLAS_BRIDGE_DEFAULT_STATUS_FOLDER_ID,
  ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS,
  ATLAS_BRIDGE_POLL_INTERVAL_MS,
  appendAtlasBridgeOpsNote,
  atlasBridgeAccess,
  atlasBridgeFolderIds,
  atlasBridgeOpsNote,
  atlasBridgeUiEnabled,
  buildAtlasBridgeInboxMarkdown,
  capAtlasBridgeText,
  isAtlasBridgeFileQueueEnabled,
  isCosHeartbeatFresh,
  parseAtlasBridgeOrgAllowlist,
  parseAtlasBridgeOutbox,
  parseCosHeartbeat,
} from "./atlas-bridge.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const NOW = Date.parse("2026-09-21T18:00:00.000Z");

test("ATLAS_BRIDGE_FILE_QUEUE defaults off", () => {
  assert.equal(isAtlasBridgeFileQueueEnabled(undefined), false);
  assert.equal(isAtlasBridgeFileQueueEnabled(""), false);
  assert.equal(isAtlasBridgeFileQueueEnabled("0"), false);
  assert.equal(isAtlasBridgeFileQueueEnabled("false"), false);
  assert.equal(isAtlasBridgeFileQueueEnabled("off"), false);
  assert.equal(isAtlasBridgeFileQueueEnabled("1"), true);
  assert.equal(isAtlasBridgeFileQueueEnabled("true"), true);
  assert.equal(isAtlasBridgeFileQueueEnabled("on"), true);
  assert.equal(isAtlasBridgeFileQueueEnabled(" YES "), true);
});

test("Drive folder ids fall back to the documented AtlasBridge folders", () => {
  assert.deepEqual(atlasBridgeFolderIds({}), {
    inbox: ATLAS_BRIDGE_DEFAULT_INBOX_FOLDER_ID,
    outbox: ATLAS_BRIDGE_DEFAULT_OUTBOX_FOLDER_ID,
    status: ATLAS_BRIDGE_DEFAULT_STATUS_FOLDER_ID,
  });
  assert.equal(ATLAS_BRIDGE_DEFAULT_INBOX_FOLDER_ID, "1RU6WJlj1rLtbOTiuDNyztZlULpPULo2Y");
  assert.equal(ATLAS_BRIDGE_DEFAULT_OUTBOX_FOLDER_ID, "1xqGEVX5e1qMIL_qqOkmlhvJSX6SMRAPR");
  assert.equal(ATLAS_BRIDGE_DEFAULT_STATUS_FOLDER_ID, "142aHVOEr0kcB5ti4nkhYri6U2yA7VJkd");
  assert.equal(atlasBridgeFolderIds({ ATLAS_BRIDGE_DRIVE_INBOX_FOLDER_ID: " custom " }).inbox, "custom");
});

test("empty allowlist admits admin, sys, and trial desks and never SIS", () => {
  assert.deepEqual(parseAtlasBridgeOrgAllowlist(" org-a, org-b ,, "), ["org-a", "org-b"]);

  const trial = atlasBridgeAccess({
    organization: { id: "org-trial", name: "Manny Plumbing", slug: "manny-plumbing" },
    allowlist: [],
    membershipRole: "owner",
    trialDesk: true,
  });
  assert.equal(trial.eligible, true);
  assert.equal(trial.lane, "trial");

  const admin = atlasBridgeAccess({
    organization: { id: "org-afe", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" },
    membershipRole: "admin",
  });
  assert.equal(admin.eligible, true);
  assert.equal(admin.lane, "admin");

  const sys = atlasBridgeAccess({
    organization: { id: "org-afe", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" },
    isSuperAdmin: true,
  });
  assert.equal(sys.eligible, true);
  assert.equal(sys.lane, "sys");

  const member = atlasBridgeAccess({
    organization: { id: "org-desk", name: "Corner Shop", slug: "corner-shop" },
    membershipRole: "member",
  });
  assert.equal(member.eligible, true);
  assert.equal(member.lane, "desk");

  const sis = atlasBridgeAccess({
    organization: { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
    allowlist: ["org-sis"],
    isSuperAdmin: true,
    trialDesk: true,
  });
  assert.equal(sis.eligible, false);
  assert.equal(sis.lane, "sis");

  const blocked = atlasBridgeAccess({
    organization: { id: "org-other", name: "Other Desk", slug: "other-desk" },
    allowlist: ["org-afe"],
    membershipRole: "admin",
  });
  assert.equal(blocked.eligible, false);

  assert.equal(
    atlasBridgeUiEnabled({
      flag: "0",
      organization: { id: "org-afe", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" },
      membershipRole: "admin",
    }),
    false,
  );
  assert.equal(
    atlasBridgeUiEnabled({
      flag: "1",
      organization: { id: "org-sis", name: "SIS DIY", slug: "sis-diy-big-complete-showcase" },
    }),
    false,
  );
});

test("inbox markdown uses atlas-bridge/v1 and caps the CRM snapshot", () => {
  const crm = capAtlasBridgeText("x".repeat(4000), 100);
  assert.equal(crm.length, 100);
  assert.equal(crm.endsWith("…"), true);

  const markdown = buildAtlasBridgeInboxMarkdown({
    requestId: "req-1",
    createdAt: "2026-09-21T18:00:00.000Z",
    organizationId: "org-afe",
    organizationSlug: "afe",
    organizationName: "Atlas For Entrepreneurs",
    requestedByUserId: "user-1",
    requestedByEmail: "owner@example.com",
    prompt: "What is the priority for this desk today?",
    crmSnapshot: "Due today: ABC Plumbing",
    timeoutSeconds: 90,
  });

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /schema: atlas-bridge\/v1/);
  assert.match(markdown, /kind: ask/);
  assert.match(markdown, /requestId: "req-1"/);
  assert.match(markdown, /source: lions-den-ask-atlas/);
  assert.match(markdown, /role: atlas/);
  assert.match(markdown, /fallback: openai/);
  assert.match(markdown, /# Prompt\nWhat is the priority for this desk today\?/);
  assert.match(markdown, /# CRM snapshot\nDue today: ABC Plumbing/);
});

test("outbox parser accepts succeeded answers and rejects a foreign schema", () => {
  const succeeded = parseAtlasBridgeOutbox(`---
schema: atlas-bridge/v1
kind: answer
requestId: "req-1"
answeredAt: "2026-09-21T18:01:00.000Z"
organizationId: "org-afe"
status: succeeded
latencyMs: 42000
modelNote: grok-bot-cos
answer: |
  The priority is the open approval.
nextStep: |
  Decide the approval.
error: null
---
`);
  assert.equal(succeeded?.requestId, "req-1");
  assert.equal(succeeded?.status, "succeeded");
  assert.equal(succeeded?.organizationId, "org-afe");
  assert.match(succeeded?.answer ?? "", /open approval/);
  assert.equal(succeeded?.error, null);
  assert.equal(succeeded?.modelNote, "grok-bot-cos");

  assert.equal(parseAtlasBridgeOutbox("---\nschema: other/v1\nrequestId: req\nstatus: succeeded\n---\n"), null);
  const failed = parseAtlasBridgeOutbox(`---
schema: atlas-bridge/v1
requestId: "req-2"
status: failed
answer: ""
error: "cos stopped"
---
`);
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.error, "cos stopped");
});

test("heartbeat is fresh inside 5 minutes and stale after that", () => {
  const fresh = parseCosHeartbeat(
    JSON.stringify({ ok: true, updatedAt: "2026-09-21T17:56:00.000Z", agent: "ATLAS Chief of Staff" }),
  );
  assert.equal(isCosHeartbeatFresh(fresh, NOW), true);
  assert.equal(
    isCosHeartbeatFresh(
      { ok: true, updatedAt: new Date(NOW - ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS).toISOString() },
      NOW,
    ),
    true,
  );
  assert.equal(
    isCosHeartbeatFresh(
      { ok: true, updatedAt: new Date(NOW - ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS - 1).toISOString() },
      NOW,
    ),
    false,
  );
  assert.equal(isCosHeartbeatFresh(parseCosHeartbeat("{"), NOW), false);
  assert.equal(isCosHeartbeatFresh({ ok: false, updatedAt: new Date(NOW).toISOString() }, NOW), false);
  assert.equal(parseCosHeartbeat(""), null);
});

test("pane copy has the three bridge stages and no fallback badge", () => {
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.listening.en, "Atlas is listening");
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.thinking.en, "thinking it through");
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.answer.en, "here's what I've got");
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.listening.es, "Atlas te escucha");
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.thinking.es, "lo está pensando");
  assert.equal(ATLAS_BRIDGE_STAGE_COPY.answer.es, "mira lo que tengo");
  assert.equal(ATLAS_BRIDGE_POLL_INTERVAL_MS >= 2000 && ATLAS_BRIDGE_POLL_INTERVAL_MS <= 3000, true);
  assert.equal(ATLAS_BRIDGE_LISTENING_MS >= 2000 && ATLAS_BRIDGE_LISTENING_MS <= 3000, true);
  assert.ok(ATLAS_BRIDGE_ANSWER_MS > 0);

  const spanish = Object.values(ATLAS_BRIDGE_STAGE_COPY).map((line) => line.es).join(" ");
  assert.doesNotMatch(spanish, /perdón|lo siento|disculpa/i);

  const pane = readRepo("src/components/lions-den/atlas-staff-pane.tsx");
  const rail = readRepo("src/components/lions-den/atlas-staff-rail.tsx");
  assert.match(pane, /ATLAS_BRIDGE_STAGE_COPY/);
  assert.match(pane, /data-atlas-bridge-line/);
  assert.match(pane, /atlas-bridge-lion/);
  assert.match(pane, /stripAtlasBridgeOpsNote/);
  assert.doesNotMatch(pane, /fallback badge|Fell back|OpenAI fallback/i);
  assert.match(rail, /ATLAS_BRIDGE_STAGE_EVENT/);
  assert.match(rail, /atlas-bridge-lion/);

  const note = atlasBridgeOpsNote({ brain: "openai", fallback: "openai" });
  const stored = appendAtlasBridgeOpsNote("Answer: The desk is clear.", note);
  assert.match(stored, /"brain":"openai"/);
  assert.match(stored, /"fallback":"openai"/);
  assert.equal(stripAtlasBridgeOpsNote(stored), "Answer: The desk is clear.");
  assert.match(atlasBridgeOpsNote({ brain: "grok-bot-cos" }), /"brain":"grok-bot-cos"/);
});
