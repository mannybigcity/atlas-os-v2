import { isSisOrganization } from "../client-portal/identity.ts";

export const ATLAS_BRIDGE_SCHEMA = "atlas-bridge/v1";
export const ATLAS_BRIDGE_SOURCE = "lions-den-ask-atlas";
export const ATLAS_BRIDGE_HEARTBEAT_FILE = "cos-heartbeat.json";
export const ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS = 5 * 60 * 1000;
export const ATLAS_BRIDGE_POLL_INTERVAL_MS = 2500;
export const ATLAS_BRIDGE_TIMEOUT_MS = 90_000;
export const ATLAS_BRIDGE_CRM_SNAPSHOT_CAP = 3500;
export const ATLAS_BRIDGE_LOGGED_RESPONSE_MAX = 5000;

export const ATLAS_BRIDGE_DEFAULT_INBOX_FOLDER_ID = "1RU6WJlj1rLtbOTiuDNyztZlULpPULo2Y";
export const ATLAS_BRIDGE_DEFAULT_OUTBOX_FOLDER_ID = "1xqGEVX5e1qMIL_qqOkmlhvJSX6SMRAPR";
export const ATLAS_BRIDGE_DEFAULT_STATUS_FOLDER_ID = "142aHVOEr0kcB5ti4nkhYri6U2yA7VJkd";

const FLAG_ON = new Set(["1", "true", "on", "yes"]);

export type AtlasBridgeBrain = "grok-bot-cos" | "openai";

export type AtlasBridgeAccessLane = "sis" | "admin" | "sys" | "trial" | "desk" | "denied";

export type AtlasBridgeOrganization = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
};

/**
 * Flag default is off. Unset, empty, and "0" keep today's OpenAI path.
 * Only an explicit on-value enables the file queue.
 */
export function isAtlasBridgeFileQueueEnabled(flag: string | null | undefined) {
  return FLAG_ON.has(String(flag ?? "").trim().toLowerCase());
}

export function parseAtlasBridgeOrgAllowlist(raw: string | null | undefined) {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function atlasBridgeFolderIds(env: {
  ATLAS_BRIDGE_DRIVE_INBOX_FOLDER_ID?: string | null;
  ATLAS_BRIDGE_DRIVE_OUTBOX_FOLDER_ID?: string | null;
  ATLAS_BRIDGE_DRIVE_STATUS_FOLDER_ID?: string | null;
}) {
  return {
    inbox: String(env.ATLAS_BRIDGE_DRIVE_INBOX_FOLDER_ID ?? "").trim() || ATLAS_BRIDGE_DEFAULT_INBOX_FOLDER_ID,
    outbox: String(env.ATLAS_BRIDGE_DRIVE_OUTBOX_FOLDER_ID ?? "").trim() || ATLAS_BRIDGE_DEFAULT_OUTBOX_FOLDER_ID,
    status: String(env.ATLAS_BRIDGE_DRIVE_STATUS_FOLDER_ID ?? "").trim() || ATLAS_BRIDGE_DEFAULT_STATUS_FOLDER_ID,
  };
}

export function atlasBridgeTimeoutMs(raw: string | null | undefined, fallback = ATLAS_BRIDGE_TIMEOUT_MS) {
  const parsed = Number(String(raw ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 1000) return fallback;
  return Math.min(Math.floor(parsed), 180_000);
}

/**
 * When the flag is on, admin, sys (super admin), and seven-day trial desks
 * are eligible. An empty allowlist means any membership-valid org that is
 * not SIS. Founder mailbox is not required. SIS never enters this queue,
 * even if its id is listed, so AFE and SIS are not mixed.
 */
export function atlasBridgeAccess(input: {
  organization?: AtlasBridgeOrganization | null;
  allowlist?: readonly string[];
  membershipRole?: string | null;
  isSuperAdmin?: boolean;
  trialDesk?: boolean;
}): { eligible: boolean; lane: AtlasBridgeAccessLane } {
  const organization = input.organization;
  if (!organization?.id) return { eligible: false, lane: "denied" };
  if (isSisOrganization(organization)) return { eligible: false, lane: "sis" };

  const allowlist = input.allowlist ?? [];
  if (allowlist.length > 0 && !allowlist.includes(organization.id)) {
    return { eligible: false, lane: "denied" };
  }

  if (input.trialDesk) return { eligible: true, lane: "trial" };
  if (input.isSuperAdmin) return { eligible: true, lane: "sys" };
  const role = String(input.membershipRole ?? "").trim().toLowerCase();
  if (role === "admin" || role === "owner" || role === "sys") {
    return { eligible: true, lane: "admin" };
  }
  return { eligible: true, lane: "desk" };
}

/** UI pulse is on only when this desk would be allowed to use the queue. */
export function atlasBridgeUiEnabled(input: {
  flag: string | null | undefined;
  allowlist?: string | null;
  organization?: AtlasBridgeOrganization | null;
  membershipRole?: string | null;
  isSuperAdmin?: boolean;
  trialDesk?: boolean;
}) {
  if (!isAtlasBridgeFileQueueEnabled(input.flag)) return false;
  return atlasBridgeAccess({
    organization: input.organization,
    allowlist: parseAtlasBridgeOrgAllowlist(input.allowlist),
    membershipRole: input.membershipRole,
    isSuperAdmin: input.isSuperAdmin,
    trialDesk: input.trialDesk,
  }).eligible;
}

export function capAtlasBridgeText(value: string, max = ATLAS_BRIDGE_CRM_SNAPSHOT_CAP) {
  const trimmed = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function yamlBlock(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!normalized) return '""';
  return `|\n${normalized.split("\n").map((line) => `  ${line}`).join("\n")}`;
}

export function buildAtlasBridgeInboxMarkdown(input: {
  requestId: string;
  createdAt: string;
  organizationId: string;
  organizationSlug?: string | null;
  organizationName?: string | null;
  requestedByUserId: string;
  requestedByEmail?: string | null;
  prompt: string;
  crmSnapshot: string;
  timeoutSeconds?: number;
}) {
  const prompt = input.prompt.replace(/\r\n/g, "\n").trim();
  const crm = capAtlasBridgeText(input.crmSnapshot);
  const timeoutSeconds = input.timeoutSeconds ?? Math.round(ATLAS_BRIDGE_TIMEOUT_MS / 1000);
  return [
    "---",
    `schema: ${ATLAS_BRIDGE_SCHEMA}`,
    "kind: ask",
    `requestId: ${JSON.stringify(input.requestId)}`,
    `createdAt: ${JSON.stringify(input.createdAt)}`,
    `organizationId: ${JSON.stringify(input.organizationId)}`,
    `organizationSlug: ${JSON.stringify(input.organizationSlug || "desk")}`,
    `organizationName: ${JSON.stringify(input.organizationName || "Client workspace")}`,
    `requestedByUserId: ${JSON.stringify(input.requestedByUserId)}`,
    `requestedByEmail: ${JSON.stringify(input.requestedByEmail ?? "")}`,
    `source: ${ATLAS_BRIDGE_SOURCE}`,
    "role: atlas",
    `prompt: ${yamlBlock(prompt)}`,
    `timeoutSeconds: ${timeoutSeconds}`,
    "fallback: openai",
    "---",
    "",
    "# Prompt",
    prompt,
    "",
    "# CRM snapshot",
    crm,
    "",
  ].join("\n");
}

function unwrapScalar(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "~" || trimmed === '""' || trimmed === "''") {
    return "";
  }
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : trimmed;
    } catch {
      return trimmed.replace(/^"|"$/g, "");
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  return trimmed;
}

export function parseAtlasBridgeFrontMatter(markdown: string) {
  const text = String(markdown ?? "").replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const lines = text.slice(text.indexOf("\n") + 1, end).split("\n");
  const fields: Record<string, string> = {};
  let index = 0;
  while (index < lines.length) {
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(lines[index] ?? "");
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2] ?? "";
    if (rest === "|" || rest === "|-" || rest === ">") {
      const collected: string[] = [];
      index += 1;
      while (index < lines.length) {
        const line = lines[index] ?? "";
        if (/^[A-Za-z][A-Za-z0-9]*:/.test(line)) break;
        collected.push(line.replace(/^ {2}/, "").replace(/^\t/, ""));
        index += 1;
      }
      fields[key] = collected.join("\n").replace(/\n+$/g, "");
      continue;
    }
    fields[key] = unwrapScalar(rest);
    index += 1;
  }
  return fields;
}

export type AtlasBridgeOutbox = {
  schema: string;
  kind: string;
  requestId: string;
  organizationId: string;
  status: "succeeded" | "blocked" | "failed";
  answer: string;
  nextStep: string;
  error: string | null;
  modelNote: string;
};

export function parseAtlasBridgeOutbox(markdown: string): AtlasBridgeOutbox | null {
  const fields = parseAtlasBridgeFrontMatter(markdown);
  if (!fields) return null;
  if (fields.schema !== ATLAS_BRIDGE_SCHEMA) return null;
  if (!fields.requestId) return null;
  if (fields.status !== "succeeded" && fields.status !== "blocked" && fields.status !== "failed") {
    return null;
  }
  const error = fields.error?.trim() ? fields.error : null;
  return {
    schema: fields.schema,
    kind: fields.kind ?? "",
    requestId: fields.requestId,
    organizationId: fields.organizationId ?? "",
    status: fields.status,
    answer: fields.answer ?? "",
    nextStep: fields.nextStep ?? "",
    error,
    modelNote: fields.modelNote ?? "",
  };
}

export function parseCosHeartbeat(raw: string) {
  try {
    const value = JSON.parse(raw) as { ok?: unknown; updatedAt?: unknown; agent?: unknown };
    if (!value || typeof value !== "object" || typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
      return null;
    }
    return {
      ok: value.ok !== false,
      updatedAt: value.updatedAt.trim(),
      agent: typeof value.agent === "string" ? value.agent : "",
    };
  } catch {
    return null;
  }
}

/** Fresh when updatedAt is not older than 5 minutes. Exactly 5 minutes still counts. */
export function isCosHeartbeatFresh(
  heartbeat: { ok?: boolean; updatedAt?: string | null } | null | undefined,
  nowMs: number,
  maxAgeMs = ATLAS_BRIDGE_HEARTBEAT_MAX_AGE_MS,
) {
  if (!heartbeat?.updatedAt || heartbeat.ok === false) return false;
  const updated = Date.parse(heartbeat.updatedAt);
  if (!Number.isFinite(updated)) return false;
  return nowMs - updated <= maxAgeMs;
}

export function atlasBridgeOpsNote(input: {
  brain: AtlasBridgeBrain;
  fallback?: "openai" | null;
  reason?: string | null;
}) {
  const payload: { brain: AtlasBridgeBrain; fallback?: "openai"; reason?: string } = { brain: input.brain };
  if (input.fallback) payload.fallback = input.fallback;
  if (input.reason) payload.reason = input.reason;
  return `<!-- atlas-bridge ${JSON.stringify(payload)} -->`;
}

export function appendAtlasBridgeOpsNote(response: string, note: string) {
  const suffix = `\n${note}`;
  if (response.length + suffix.length <= ATLAS_BRIDGE_LOGGED_RESPONSE_MAX) {
    return `${response}${suffix}`;
  }
  const room = Math.max(1, ATLAS_BRIDGE_LOGGED_RESPONSE_MAX - suffix.length);
  return `${response.slice(0, room).trimEnd()}${suffix}`;
}

export function logAtlasBridgeOutcome(input: {
  brain: AtlasBridgeBrain;
  fallback?: "openai" | null;
  reason?: string | null;
  requestId?: string | null;
}) {
  console.info("atlas-bridge", {
    brain: input.brain,
    fallback: input.fallback ?? null,
    reason: input.reason ?? null,
    requestId: input.requestId ?? null,
  });
}
