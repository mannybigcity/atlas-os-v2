import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  AFE_OPERATOR_DESK_NAME,
  AFE_OPERATOR_DESK_SLUG,
  SAMPLE_DESK_DISPLAY_NAME,
  SIS_LIONS_DEN_PREVIEW_SLUG,
  SIS_WORKING_ORG_NAME,
} from "../../lib/client-portal/identity.ts";
import { canManageSignScoutTokens } from "./access.ts";
import {
  SIGNSCOUT_BODY_MAX_BYTES,
  SIGNSCOUT_INGEST_PATH,
  SIGNSCOUT_MIGRATION,
  SIGNSCOUT_PHOTO_MAX_BYTES,
  SIGNSCOUT_PRIVACY_PATH,
  SIGNSCOUT_TOKEN_HOURLY_LIMIT,
  buildSignScoutReviewInsert,
  generateSignScoutDeviceToken,
  parseSignScoutIngestBody,
  sha256Hex,
  signScoutCorsAllowed,
  signScoutExtraOrigins,
} from "./contract.ts";
import {
  handleSignScoutIngest,
  type SignScoutAttemptInsert,
  type SignScoutIngestStore,
  type StoredSignScoutReview,
} from "./handler.ts";
import type { SignScoutReviewInsert, SignScoutTokenRecord } from "./contract.ts";

const root = join(process.cwd());
const LEAD_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const AFE = {
  id: "org-afe",
  name: AFE_OPERATOR_DESK_NAME,
  slug: AFE_OPERATOR_DESK_SLUG,
};
const SIS = {
  id: "org-sis",
  name: SIS_WORKING_ORG_NAME,
  slug: SIS_LIONS_DEN_PREVIEW_SLUG,
};

function jpegBase64() {
  return Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xd9]).toString("base64");
}

function leadBody(overrides: Record<string, unknown> = {}) {
  return {
    source: "signscout",
    sentAt: "2026-09-25T18:00:00.000Z",
    lead: {
      id: LEAD_ID,
      companyName: "Houston Pipe Co",
      trade: "plumbing",
      phone: "(713) 555-0101",
      website: "https://houstonpipe.example",
      email: "office@houstonpipe.example",
      license: "TACL12345",
      city: "Houston",
      notes: "White van on I-10",
      callNote: "Left a voicemail",
      rawText: "HOUSTON PIPE CO\n713-555-0101",
      status: "new",
      capturedAt: 1_758_823_200_000,
      lat: 29.7604,
      lng: -95.3698,
      photo: null,
      ...overrides,
    },
  };
}

function requestFor(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://atlasforentrepreneurs.com/api/signscout/ingest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": LEAD_ID,
      authorization: "Bearer ss_testtokenvalue_0123456789abcdef",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function memoryStore(seed?: {
  token?: SignScoutTokenRecord | null;
  reviews?: StoredSignScoutReview[];
  byToken?: number;
  byIp?: number;
}) {
  const reviews = [...(seed?.reviews ?? [])];
  const attempts: SignScoutAttemptInsert[] = [];
  const inserts: SignScoutReviewInsert[] = [];
  let token = seed?.token === undefined ? afeToken() : seed.token;
  const store: SignScoutIngestStore = {
    async findToken() {
      return token;
    },
    async countRecent() {
      return { byToken: seed?.byToken ?? 0, byIp: seed?.byIp ?? 0 };
    },
    async findReview(_organizationId, idempotencyKey) {
      return reviews.find((row) => row.idempotencyKey === idempotencyKey) ?? null;
    },
    async insertReview(row) {
      if (reviews.some((item) => item.idempotencyKey === row.idempotency_key)) return { conflict: true };
      inserts.push(row);
      const stored: StoredSignScoutReview = {
        id: "review-1",
        organizationId: row.organization_id,
        status: "pending",
        idempotencyKey: row.idempotency_key,
        bodyFingerprint: row.body_fingerprint,
        photoPath: null,
      };
      reviews.push(stored);
      return { id: stored.id };
    },
    async savePhoto(input) {
      return { path: `${input.organizationId}/${input.reviewItemId}.jpg` };
    },
    async attachPhoto(reviewItemId, path) {
      const row = reviews.find((item) => item.id === reviewItemId);
      if (row) row.photoPath = path;
    },
    async recordAttempt(attempt) {
      attempts.push(attempt);
    },
    async touchToken() {
      token = token ? { ...token, revokedAt: token.revokedAt } : token;
    },
  };
  return { store, reviews, attempts, inserts };
}

function afeToken(overrides: Partial<SignScoutTokenRecord> = {}): SignScoutTokenRecord {
  return {
    id: "token-1",
    organizationId: AFE.id,
    revokedAt: null,
    organization: AFE,
    ...overrides,
  };
}

test("SignScout device tokens are hashed and AFE admins are the only managers", () => {
  const generated = generateSignScoutDeviceToken();
  assert.match(generated.token, /^ss_[A-Za-z0-9_-]{43}$/);
  assert.equal(generated.tokenHash, sha256Hex(generated.token));
  assert.equal(generated.tokenHash.length, 64);
  assert.notEqual(generated.token, generated.tokenHash);

  const afe = { name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG };
  assert.equal(
    canManageSignScoutTokens({ organization: afe, isSuperAdmin: false, isClientPreview: false, role: "owner" }),
    true,
  );
  assert.equal(
    canManageSignScoutTokens({ organization: afe, isSuperAdmin: true, isClientPreview: false, role: "member" }),
    true,
  );
  assert.equal(
    canManageSignScoutTokens({ organization: afe, isSuperAdmin: false, isClientPreview: false, role: "member" }),
    false,
  );
  assert.equal(
    canManageSignScoutTokens({ organization: afe, isSuperAdmin: true, isClientPreview: true, role: "owner" }),
    false,
  );
  assert.equal(
    canManageSignScoutTokens({
      organization: { name: SIS_WORKING_ORG_NAME, slug: SIS_LIONS_DEN_PREVIEW_SLUG },
      isSuperAdmin: true,
      isClientPreview: false,
      role: "owner",
    }),
    false,
  );
  assert.equal(
    canManageSignScoutTokens({
      organization: { name: SAMPLE_DESK_DISPLAY_NAME, slug: "afe-crm-demo" },
      isSuperAdmin: true,
      isClientPreview: false,
      role: "owner",
    }),
    false,
  );
});

test("SignScout CORS allows the Capacitor webview and refuses a wildcard", () => {
  assert.equal(signScoutCorsAllowed("capacitor://localhost"), true);
  assert.equal(signScoutCorsAllowed("https://localhost"), true);
  assert.equal(signScoutCorsAllowed("http://localhost:8080"), true);
  assert.equal(signScoutCorsAllowed("https://evil.example"), false);
  assert.equal(signScoutCorsAllowed("https://localhost.evil.example"), false);
  assert.equal(signScoutCorsAllowed("*"), false);
  assert.deepEqual(signScoutExtraOrigins({ webOrigins: "*, https://signscout.example" }), [
    "https://signscout.example",
  ]);
  assert.equal(
    signScoutCorsAllowed("https://signscout.example", signScoutExtraOrigins({ webOrigins: "https://signscout.example" })),
    true,
  );
});

test("missing, unknown, and revoked SignScout tokens are rejected before any review insert", async () => {
  const missing = memoryStore({ token: null });
  const noHeader = await handleSignScoutIngest(
    requestFor(leadBody(), { authorization: "" }),
    missing.store,
  );
  assert.equal(noHeader.status, 401);
  assert.deepEqual(noHeader.body, { ok: false, error: "unauthorized" });
  assert.equal(missing.inserts.length, 0);

  const unknown = memoryStore({ token: null });
  const bad = await handleSignScoutIngest(requestFor(leadBody()), unknown.store);
  assert.equal(bad.status, 401);
  assert.equal(unknown.inserts.length, 0);

  const revoked = memoryStore({ token: afeToken({ revokedAt: "2026-09-25T00:00:00.000Z" }) });
  const revokedResult = await handleSignScoutIngest(requestFor(leadBody()), revoked.store);
  assert.equal(revokedResult.status, 401);
  assert.equal(revoked.inserts.length, 0);
  assert.equal(revoked.attempts.at(-1)?.outcome, "unauthorized");
});

test("a token for SIS or any non-AFE desk is forbidden and does not insert", async () => {
  const sis = memoryStore({
    token: {
      id: "token-sis",
      organizationId: SIS.id,
      revokedAt: null,
      organization: SIS,
    },
  });
  const result = await handleSignScoutIngest(requestFor(leadBody()), sis.store);
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { ok: false, error: "forbidden" });
  assert.equal(sis.inserts.length, 0);
  assert.equal(sis.attempts.at(-1)?.outcome, "forbidden");

  const other = memoryStore({
    token: afeToken({
      organizationId: "org-other",
      organization: { id: "org-other", name: "Harbor Lights Studio", slug: "harbor-lights" },
    }),
  });
  const otherResult = await handleSignScoutIngest(requestFor(leadBody()), other.store);
  assert.equal(otherResult.status, 403);
  assert.equal(other.inserts.length, 0);
});

test("SignScout validation rejects a bad phone and an oversized photo", async () => {
  const badPhone = memoryStore();
  const phone = await handleSignScoutIngest(
    requestFor(leadBody({ phone: "123" })),
    badPhone.store,
  );
  assert.equal(phone.status, 400);
  assert.equal(phone.body.error, "invalid_request");
  assert.ok(Array.isArray(phone.body.issues) && phone.body.issues.includes("phone"));
  assert.equal(badPhone.inserts.length, 0);

  const huge = "A".repeat(SIGNSCOUT_PHOTO_MAX_BYTES + 10);
  const parsed = parseSignScoutIngestBody(
    leadBody({ photo: { contentType: "image/jpeg", dataBase64: Buffer.from(huge).toString("base64") } }),
    LEAD_ID,
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.ok(parsed.issues.includes("photo.size") || parsed.issues.includes("photo.dataBase64"));

  const wrongType = memoryStore();
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const mismatch = await handleSignScoutIngest(
    requestFor(leadBody({ photo: { contentType: "image/jpeg", dataBase64: pngBytes.toString("base64") } })),
    wrongType.store,
  );
  assert.equal(mismatch.status, 400);
  assert.ok(Array.isArray(mismatch.body.issues) && mismatch.body.issues.includes("photo.contentType"));

  const tooBig = await handleSignScoutIngest(
    new Request("https://atlasforentrepreneurs.com/api/signscout/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(SIGNSCOUT_BODY_MAX_BYTES + 1),
        authorization: "Bearer ss_testtokenvalue_0123456789abcdef",
      },
      body: "{}",
    }),
    memoryStore().store,
  );
  assert.equal(tooBig.status, 413);
  assert.equal(tooBig.body.error, "payload_too_large");
});

test("a valid SignScout lead inserts one pending AFE review row and does not create a Prospect", async () => {
  const desk = memoryStore();
  const result = await handleSignScoutIngest(
    requestFor(leadBody({ photo: { contentType: "image/jpeg", dataBase64: jpegBase64() } })),
    desk.store,
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.status, "pending");
  assert.equal(result.body.replay, false);
  assert.equal(result.body.photoStored, true);
  assert.equal(result.body.idempotencyKey, LEAD_ID);
  assert.equal(desk.inserts.length, 1);
  const row = desk.inserts[0];
  assert.equal(row?.organization_id, AFE.id);
  assert.equal(row?.source, "signscout");
  assert.equal(row?.status, "pending");
  assert.equal(row?.place_id, `signscout:${LEAD_ID}`);
  assert.equal(row?.name, "Houston Pipe Co");
  assert.equal(row?.phone, "(713) 555-0101");
  assert.equal(row?.contact_email, "office@houstonpipe.example");
  assert.match(row?.notes ?? "", /HOUSTON PIPE CO/);
  assert.equal(row?.created_by, null);
  assert.equal("accepted_opportunity_id" in (row ?? {}), false);
  assert.equal(desk.attempts.some((attempt) => attempt.outcome === "created"), true);
});

test("the same SignScout idempotency key replays and a different body conflicts", async () => {
  const first = memoryStore();
  const created = await handleSignScoutIngest(requestFor(leadBody()), first.store);
  assert.equal(created.status, 201);

  const replay = await handleSignScoutIngest(requestFor(leadBody({ status: "called" })), first.store);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replay, true);
  assert.equal(replay.body.status, "pending");
  assert.equal(replay.body.reviewItemId, "review-1");
  assert.equal(first.inserts.length, 1);

  const changed = await handleSignScoutIngest(
    requestFor(leadBody({ companyName: "Other Pipe Co" })),
    first.store,
  );
  assert.equal(changed.status, 409);
  assert.equal(changed.body.error, "idempotency_conflict");
  assert.equal(first.inserts.length, 1);

  const parsed = parseSignScoutIngestBody(leadBody(), LEAD_ID);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const built = buildSignScoutReviewInsert({
    organizationId: AFE.id,
    lead: parsed.value,
    fingerprint: parsed.fingerprint,
  });
  assert.equal(built.status, "pending");
  assert.equal(built.source, "signscout");
});

test("SignScout ingest rate limit returns 429 and does not insert", async () => {
  const limited = memoryStore({ byToken: SIGNSCOUT_TOKEN_HOURLY_LIMIT });
  const result = await handleSignScoutIngest(requestFor(leadBody()), limited.store);
  assert.equal(result.status, 429);
  assert.equal(result.body.error, "rate_limited");
  assert.equal(result.retryAfter, 3600);
  assert.equal(limited.inserts.length, 0);
});

test("SignScout route, migration, and privacy page stay authenticated, AFE-only, and public", () => {
  const route = readFileSync(join(root, "src/app/api/signscout/ingest/route.ts"), "utf8");
  const handler = readFileSync(join(root, "src/server/signscout/handler.ts"), "utf8");
  const store = readFileSync(join(root, "src/server/signscout/supabase-store.ts"), "utf8");
  const migration = readFileSync(join(root, SIGNSCOUT_MIGRATION), "utf8");
  const privacy = readFileSync(join(root, "src/app/signscout/privacy/page.tsx"), "utf8");
  const proxy = readFileSync(join(root, "src/proxy.ts"), "utf8");
  const docs = readFileSync(join(root, "docs/signscout-ingest.md"), "utf8");
  const tokens = readFileSync(join(root, "src/server/signscout/tokens.ts"), "utf8");

  for (const source of [route, handler, store]) {
    assert.doesNotMatch(source, /capture_sis_capture_card_intake|capture_sis_tenant_lead/);
  }
  assert.match(route, /Authorization/);
  assert.doesNotMatch(route, /Access-Control-Allow-Origin": "\*"/);
  assert.match(migration, /source text not null default 'google_places'/);
  assert.match(migration, /token_hash/);
  assert.doesNotMatch(migration, /token_plaintext|plaintext_token/);
  assert.match(migration, /'signscout-photos',\s*\n\s*'signscout-photos',\s*\n\s*false/);
  assert.doesNotMatch(migration, /capture_sis_capture_card_intake|capture_sis_tenant_lead/);
  assert.match(privacy, /info@atlasforentrepreneurs.com/);
  assert.match(privacy, /Tesseract/);
  assert.match(privacy, /xAI/);
  assert.doesNotMatch(proxy, /signscout/);
  assert.match(docs, /POST/);
  assert.match(docs, /Idempotency-Key/);
  assert.match(docs, new RegExp(SIGNSCOUT_INGEST_PATH.replaceAll("/", "\\/")));
  assert.match(docs, /401/);
  assert.match(docs, /403/);
  assert.match(docs, /409/);
  assert.match(docs, /429/);
  assert.match(docs, /201/);
  assert.match(docs, /not applied/i);
  assert.match(docs, new RegExp(SIGNSCOUT_PRIVACY_PATH.replaceAll("/", "\\/")));
  assert.match(docs, /3,500,000/);
  assert.match(tokens, /token_hash/);
  assert.doesNotMatch(tokens, /select\("id, label, created_at, last_used_at, revoked_at, token_hash"\)/);
  assert.doesNotMatch(tokens, /console\.(log|info|debug)\(/);
});
