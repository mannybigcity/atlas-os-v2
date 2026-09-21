import { randomUUID } from "node:crypto";

import { readRuntimeEnv } from "../../lib/env.ts";
import {
  ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS,
  ATLAS_BRIDGE_POLL_INTERVAL_MS,
  atlasBridgeAccess,
  atlasBridgeFolderIds,
  atlasBridgeTimeoutMs,
  buildAtlasBridgeInboxMarkdown,
  capAtlasBridgeText,
  isAtlasBridgeFileQueueEnabled,
  isCosHeartbeatFresh,
  parseAtlasBridgeOrgAllowlist,
  parseAtlasBridgeOutbox,
  parseCosHeartbeat,
} from "../../lib/lions-den/atlas-bridge.ts";
import {
  createGoogleDriveClient,
  readGoogleDriveCredentials,
  type AtlasBridgeDrive,
} from "../integrations/google-drive.ts";

export type AtlasFileQueueInput = {
  organization: { id: string; name?: string | null; slug?: string | null };
  membershipRole?: string | null;
  isSuperAdmin?: boolean;
  trialDesk?: boolean;
  requestedByUserId: string;
  requestedByEmail?: string | null;
  prompt: string;
  crmSnapshot: string;
  env?: Record<string, string | undefined>;
  drive?: AtlasBridgeDrive;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  randomId?: () => string;
};

export type AtlasFileQueueResult =
  | { action: "skip" }
  | { action: "answer"; answer: string; nextStep: string; requestId: string }
  | { action: "openai"; reason: string; requestId?: string };

function envValue(env: Record<string, string | undefined> | undefined, name: string) {
  if (env && env !== process.env) return String(env[name] ?? "");
  return readRuntimeEnv(name);
}

export function createAtlasBridgeDrive(env?: Record<string, string | undefined>): AtlasBridgeDrive | null {
  const read = (name: string) => envValue(env, name);
  const credentials = readGoogleDriveCredentials(read);
  if (!credentials) return null;
  return createGoogleDriveClient({
    credentials,
    folders: atlasBridgeFolderIds({
      ATLAS_BRIDGE_DRIVE_INBOX_FOLDER_ID: read("ATLAS_BRIDGE_DRIVE_INBOX_FOLDER_ID"),
      ATLAS_BRIDGE_DRIVE_OUTBOX_FOLDER_ID: read("ATLAS_BRIDGE_DRIVE_OUTBOX_FOLDER_ID"),
      ATLAS_BRIDGE_DRIVE_STATUS_FOLDER_ID: read("ATLAS_BRIDGE_DRIVE_STATUS_FOLDER_ID"),
    }),
  });
}

function clipAnswer(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 1600) return trimmed;
  return trimmed.slice(0, 1600).trimEnd();
}

function clipNextStep(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const next = trimmed || "Review this on the desk.";
  return next.length <= 200 ? next : next.slice(0, 200).trimEnd();
}

async function pollOutbox(input: {
  drive: AtlasBridgeDrive;
  requestId: string;
  organizationId: string;
  timeoutMs: number;
  pollMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}): Promise<AtlasFileQueueResult> {
  const deadline = input.now() + input.timeoutMs;
  const fileName = `${input.requestId}.md`;
  while (input.now() < deadline) {
    let body: string | null = null;
    try {
      body = await input.drive.readOutbox(fileName);
    } catch {
      body = null;
    }
    if (body) {
      const parsed = parseAtlasBridgeOutbox(body);
      if (parsed?.requestId === input.requestId) {
        if (parsed.organizationId && parsed.organizationId !== input.organizationId) {
          return { action: "openai", reason: "org_mismatch", requestId: input.requestId };
        }
        if (parsed.status === "succeeded" && parsed.answer.trim()) {
          return {
            action: "answer",
            answer: clipAnswer(parsed.answer),
            nextStep: clipNextStep(parsed.nextStep),
            requestId: input.requestId,
          };
        }
        if (parsed.status === "failed" || parsed.status === "blocked" || !parsed.answer.trim()) {
          return { action: "openai", reason: parsed.status, requestId: input.requestId };
        }
      }
    }
    const remaining = deadline - input.now();
    if (remaining <= 0) break;
    await input.sleep(Math.min(input.pollMs, remaining));
  }
  return { action: "openai", reason: "timeout", requestId: input.requestId };
}

export async function runConfiguredAtlasFileQueue(input: AtlasFileQueueInput): Promise<AtlasFileQueueResult> {
  const env = input.env;
  if (!isAtlasBridgeFileQueueEnabled(envValue(env, "ATLAS_BRIDGE_FILE_QUEUE"))) {
    return { action: "skip" };
  }

  const access = atlasBridgeAccess({
    organization: input.organization,
    allowlist: parseAtlasBridgeOrgAllowlist(envValue(env, "ATLAS_BRIDGE_ORG_ALLOWLIST")),
    membershipRole: input.membershipRole,
    isSuperAdmin: input.isSuperAdmin,
    trialDesk: input.trialDesk,
  });
  if (!access.eligible) return { action: "skip" };

  const requestId = input.randomId?.() ?? randomUUID();
  const drive = input.drive ?? createAtlasBridgeDrive(env);
  if (!drive) return { action: "openai", reason: "drive_unconfigured", requestId };

  const now = input.now ?? Date.now;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = atlasBridgeTimeoutMs(envValue(env, "ATLAS_BRIDGE_TIMEOUT_MS"));

  let heartbeatRaw: string | null = null;
  try {
    heartbeatRaw = await drive.readHeartbeat();
  } catch {
    return { action: "openai", reason: "heartbeat_missing", requestId };
  }

  const heartbeat = heartbeatRaw ? parseCosHeartbeat(heartbeatRaw) : null;
  if (!heartbeat) return { action: "openai", reason: "heartbeat_missing", requestId };
  if (!isCosHeartbeatFresh(heartbeat, now(), ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS)) {
    return { action: "openai", reason: "stale_heartbeat", requestId };
  }

  const createdAt = new Date(now()).toISOString();
  const markdown = buildAtlasBridgeInboxMarkdown({
    requestId,
    createdAt,
    organizationId: input.organization.id,
    organizationSlug: input.organization.slug,
    organizationName: input.organization.name,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
    prompt: input.prompt,
    crmSnapshot: capAtlasBridgeText(input.crmSnapshot),
    timeoutSeconds: Math.round(timeoutMs / 1000),
  });

  try {
    await drive.writeInbox(`${requestId}.md`, markdown);
  } catch {
    return { action: "openai", reason: "inbox_write_failed", requestId };
  }

  return pollOutbox({
    drive,
    requestId,
    organizationId: input.organization.id,
    timeoutMs,
    pollMs: ATLAS_BRIDGE_POLL_INTERVAL_MS,
    now,
    sleep,
  });
}
