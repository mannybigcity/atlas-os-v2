import assert from "node:assert/strict";
import test from "node:test";

import { ATLAS_BRIDGE_POLL_INTERVAL_MS } from "../../lib/lions-den/atlas-bridge.ts";
import type { AtlasBridgeDrive } from "../integrations/google-drive.ts";
import { runConfiguredAtlasFileQueue } from "./atlas-file-queue.ts";

const ORG = { id: "org-afe", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };
const NOW = Date.parse("2026-09-21T18:00:00.000Z");

function heartbeat(updatedAt: string) {
  return JSON.stringify({ ok: true, updatedAt, agent: "ATLAS Chief of Staff" });
}

function outbox(input: { requestId: string; status: string; answer: string; organizationId?: string }) {
  return `---
schema: atlas-bridge/v1
kind: answer
requestId: "${input.requestId}"
organizationId: "${input.organizationId ?? ORG.id}"
status: ${input.status}
modelNote: grok-bot-cos
answer: |
  ${input.answer}
nextStep: |
  Decide the next desk step.
error: null
---
`;
}

function fakeDrive(options: {
  heartbeat?: string | null;
  outbox?: string | null | ((name: string, reads: number) => string | null);
  failWrite?: boolean;
}) {
  const writes: string[] = [];
  let outboxReads = 0;
  const drive: AtlasBridgeDrive = {
    async readHeartbeat() {
      return options.heartbeat === undefined ? heartbeat(new Date(NOW).toISOString()) : options.heartbeat;
    },
    async writeInbox(_name, markdown) {
      if (options.failWrite) throw new Error("drive down");
      writes.push(markdown);
    },
    async readOutbox(name) {
      outboxReads += 1;
      if (typeof options.outbox === "function") return options.outbox(name, outboxReads);
      return options.outbox ?? null;
    },
  };
  return { drive, writes, reads: () => outboxReads };
}

function queueInput(overrides: Partial<Parameters<typeof runConfiguredAtlasFileQueue>[0]> = {}) {
  return {
    organization: ORG,
    membershipRole: "admin",
    requestedByUserId: "user-1",
    requestedByEmail: "owner@example.com",
    prompt: "What is the priority for this desk today?",
    crmSnapshot: "Due today: ABC Plumbing",
    env: {
      ATLAS_BRIDGE_FILE_QUEUE: "1",
      ATLAS_BRIDGE_TIMEOUT_MS: "90000",
    },
    now: () => NOW,
    sleep: async () => {},
    randomId: () => "req-bridge-1",
    ...overrides,
  };
}

test("flag off never touches Drive", async () => {
  let touched = false;
  const drive: AtlasBridgeDrive = {
    async readHeartbeat() {
      touched = true;
      return null;
    },
    async writeInbox() {
      touched = true;
    },
    async readOutbox() {
      touched = true;
      return null;
    },
  };
  const result = await runConfiguredAtlasFileQueue(
    queueInput({
      env: { ATLAS_BRIDGE_FILE_QUEUE: "0" },
      drive,
    }),
  );
  assert.deepEqual(result, { action: "skip" });
  assert.equal(touched, false);
});

test("missing or stale heartbeat skips the inbox and falls back silently", async () => {
  const missing = fakeDrive({ heartbeat: null });
  const missingResult = await runConfiguredAtlasFileQueue(queueInput({ drive: missing.drive }));
  assert.equal(missingResult.action, "openai");
  if (missingResult.action === "openai") assert.equal(missingResult.reason, "heartbeat_missing");
  assert.equal(missing.writes.length, 0);

  const stale = fakeDrive({ heartbeat: heartbeat("2026-09-21T17:50:00.000Z") });
  const staleResult = await runConfiguredAtlasFileQueue(queueInput({ drive: stale.drive }));
  assert.equal(staleResult.action, "openai");
  if (staleResult.action === "openai") assert.equal(staleResult.reason, "stale_heartbeat");
  assert.equal(stale.writes.length, 0);
});

test("SIS desks never enter the queue", async () => {
  const drive = fakeDrive({});
  const result = await runConfiguredAtlasFileQueue(
    queueInput({
      organization: { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
      drive: drive.drive,
      env: {
        ATLAS_BRIDGE_FILE_QUEUE: "1",
        ATLAS_BRIDGE_ORG_ALLOWLIST: "org-sis",
      },
    }),
  );
  assert.deepEqual(result, { action: "skip" });
  assert.equal(drive.writes.length, 0);
});

test("fresh heartbeat writes inbox schema and returns the matching outbox answer", async () => {
  let clock = NOW;
  const drive = fakeDrive({
    outbox: (_name, reads) => (reads < 2 ? null : outbox({
      requestId: "req-bridge-1",
      status: "succeeded",
      answer: "The priority is the open approval on this desk.",
    })),
  });
  const sleeps: number[] = [];
  const result = await runConfiguredAtlasFileQueue(
    queueInput({
      drive: drive.drive,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    }),
  );
  assert.equal(result.action, "answer");
  if (result.action === "answer") {
    assert.match(result.answer, /open approval/);
    assert.equal(result.requestId, "req-bridge-1");
  }
  assert.equal(drive.writes.length, 1);
  assert.match(drive.writes[0] ?? "", /schema: atlas-bridge\/v1/);
  assert.match(drive.writes[0] ?? "", /requestId: "req-bridge-1"/);
  assert.match(drive.writes[0] ?? "", /organizationId: "org-afe"/);
  assert.match(drive.writes[0] ?? "", /# CRM snapshot\nDue today: ABC Plumbing/);
  assert.equal(sleeps[0], ATLAS_BRIDGE_POLL_INTERVAL_MS);
  assert.equal(ATLAS_BRIDGE_POLL_INTERVAL_MS >= 2000 && ATLAS_BRIDGE_POLL_INTERVAL_MS <= 3000, true);
});

test("failed outbox and timeout fall back without returning the failed body", async () => {
  const failed = fakeDrive({
    outbox: outbox({ requestId: "req-bridge-1", status: "failed", answer: "secret failure" }),
  });
  const failedResult = await runConfiguredAtlasFileQueue(queueInput({ drive: failed.drive }));
  assert.equal(failedResult.action, "openai");
  if (failedResult.action === "openai") assert.equal(failedResult.reason, "failed");

  let clock = NOW;
  const timeout = fakeDrive({ outbox: null });
  const timeoutResult = await runConfiguredAtlasFileQueue(
    queueInput({
      drive: timeout.drive,
      env: { ATLAS_BRIDGE_FILE_QUEUE: "1", ATLAS_BRIDGE_TIMEOUT_MS: "5000" },
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
    }),
  );
  assert.equal(timeoutResult.action, "openai");
  if (timeoutResult.action === "openai") assert.equal(timeoutResult.reason, "timeout");
  assert.equal(clock - NOW >= 5000, true);
});

test("an outbox for another organization is not returned", async () => {
  const drive = fakeDrive({
    outbox: outbox({
      requestId: "req-bridge-1",
      status: "succeeded",
      answer: "SIS private note",
      organizationId: "org-sis",
    }),
  });
  const result = await runConfiguredAtlasFileQueue(queueInput({ drive: drive.drive }));
  assert.equal(result.action, "openai");
  if (result.action === "openai") assert.equal(result.reason, "org_mismatch");
  assert.equal(JSON.stringify(result).includes("SIS private note"), false);
});
