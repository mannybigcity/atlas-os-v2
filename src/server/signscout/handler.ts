import {
  SIGNSCOUT_BODY_MAX_BYTES,
  SIGNSCOUT_IP_HOURLY_LIMIT,
  SIGNSCOUT_RATE_WINDOW_MS,
  SIGNSCOUT_TOKEN_HOURLY_LIMIT,
  authorizeSignScoutToken,
  buildSignScoutReviewInsert,
  parseSignScoutIngestBody,
  readBearerToken,
  sha256Hex,
  signScoutPhotoPath,
  type SignScoutLead,
  type SignScoutPhoto,
  type SignScoutReviewInsert,
  type SignScoutTokenRecord,
} from "./contract.ts";

export type StoredSignScoutReview = {
  id: string;
  organizationId: string;
  status: "pending" | "accepted" | "dismissed";
  idempotencyKey: string;
  bodyFingerprint: string;
  photoPath: string | null;
};

export type SignScoutAttemptInsert = {
  organizationId: string | null;
  tokenId: string | null;
  idempotencyKey: string | null;
  outcome:
    | "created"
    | "replay"
    | "invalid_request"
    | "unauthorized"
    | "forbidden"
    | "rate_limited"
    | "idempotency_conflict"
    | "failed";
  outcomeReason: string | null;
  reviewItemId: string | null;
  fingerprint: string;
  ipHash: string | null;
  userAgent: string | null;
};

export type SignScoutIngestStore = {
  findToken(hash: string): Promise<SignScoutTokenRecord | null>;
  countRecent(input: {
    tokenId: string;
    ipHash: string | null;
    sinceIso: string;
  }): Promise<{ byToken: number; byIp: number }>;
  findReview(organizationId: string, idempotencyKey: string): Promise<StoredSignScoutReview | null>;
  insertReview(row: SignScoutReviewInsert): Promise<{ id: string } | { conflict: true }>;
  savePhoto(input: {
    organizationId: string;
    reviewItemId: string;
    photo: SignScoutPhoto;
  }): Promise<{ path: string }>;
  attachPhoto(reviewItemId: string, path: string, contentType: string): Promise<void>;
  recordAttempt(attempt: SignScoutAttemptInsert): Promise<void>;
  touchToken(tokenId: string, usedAtIso: string): Promise<void>;
};

export class SignScoutStoreUnavailable extends Error {
  constructor() {
    super("signscout_store_unavailable");
    this.name = "SignScoutStoreUnavailable";
  }
}

export type SignScoutHttpResult = {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
};

export async function handleSignScoutIngest(
  request: Request,
  store: SignScoutIngestStore,
  now = new Date(),
): Promise<SignScoutHttpResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { status: 415, body: { ok: false, error: "unsupported_media_type" } };
  }

  const contentLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > SIGNSCOUT_BODY_MAX_BYTES) {
    return { status: 413, body: { ok: false, error: "payload_too_large" } };
  }

  const ipHash = requestIpHash(request);
  const userAgent = requestUserAgent(request);
  const bearer = readBearerToken(request.headers.get("authorization"));
  if (!bearer) {
    await audit(store, {
      organizationId: null,
      tokenId: null,
      idempotencyKey: null,
      outcome: "unauthorized",
      outcomeReason: "missing_token",
      reviewItemId: null,
      fingerprint: sha256Hex("unauthorized"),
      ipHash,
      userAgent,
    });
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }

  let record: SignScoutTokenRecord | null;
  try {
    record = await store.findToken(sha256Hex(bearer));
  } catch (error) {
    if (error instanceof SignScoutStoreUnavailable) {
      return { status: 503, body: { ok: false, error: "not_ready" } };
    }
    return { status: 500, body: { ok: false, error: "ingest_failed" } };
  }

  const auth = authorizeSignScoutToken(record);
  if (!auth.ok) {
    await audit(store, {
      organizationId: record?.organizationId ?? null,
      tokenId: record?.id ?? null,
      idempotencyKey: null,
      outcome: auth.error === "forbidden" ? "forbidden" : "unauthorized",
      outcomeReason: auth.error,
      reviewItemId: null,
      fingerprint: sha256Hex(auth.error),
      ipHash,
      userAgent,
    });
    return { status: auth.status, body: { ok: false, error: auth.error } };
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return invalid(store, auth.record, ipHash, userAgent, ["body"]);
  }

  const parsed = parseSignScoutIngestBody(rawBody, request.headers.get("idempotency-key"));
  if (!parsed.ok) {
    return invalid(store, auth.record, ipHash, userAgent, parsed.issues);
  }

  try {
    const counts = await store.countRecent({
      tokenId: auth.record.id,
      ipHash,
      sinceIso: new Date(now.getTime() - SIGNSCOUT_RATE_WINDOW_MS).toISOString(),
    });
    if (counts.byToken >= SIGNSCOUT_TOKEN_HOURLY_LIMIT || counts.byIp >= SIGNSCOUT_IP_HOURLY_LIMIT) {
      await audit(store, {
        organizationId: auth.record.organizationId,
        tokenId: auth.record.id,
        idempotencyKey: parsed.value.id,
        outcome: "rate_limited",
        outcomeReason: counts.byToken >= SIGNSCOUT_TOKEN_HOURLY_LIMIT ? "token_rate_limit" : "ip_rate_limit",
        reviewItemId: null,
        fingerprint: parsed.fingerprint,
        ipHash,
        userAgent,
      });
      return {
        status: 429,
        retryAfter: Math.ceil(SIGNSCOUT_RATE_WINDOW_MS / 1000),
        body: { ok: false, error: "rate_limited" },
      };
    }

    const row = buildSignScoutReviewInsert({
      organizationId: auth.record.organizationId,
      lead: parsed.value,
      fingerprint: parsed.fingerprint,
    });
    const existing = await store.findReview(auth.record.organizationId, parsed.value.id);
    if (existing) {
      return finishReplay(store, auth.record, parsed.value, parsed.fingerprint, existing, ipHash, userAgent);
    }

    const inserted = await store.insertReview(row);
    if ("conflict" in inserted) {
      const again = await store.findReview(auth.record.organizationId, parsed.value.id);
      if (!again) return failed(store, auth.record, parsed.value.id, parsed.fingerprint, ipHash, userAgent);
      return finishReplay(store, auth.record, parsed.value, parsed.fingerprint, again, ipHash, userAgent);
    }

    const photoStored = await storePhoto(store, inserted.id, auth.record.organizationId, parsed.value.photo);
    if (parsed.value.photo && !photoStored) {
      return failed(store, auth.record, parsed.value.id, parsed.fingerprint, ipHash, userAgent);
    }

    await audit(store, {
      organizationId: auth.record.organizationId,
      tokenId: auth.record.id,
      idempotencyKey: parsed.value.id,
      outcome: "created",
      outcomeReason: null,
      reviewItemId: inserted.id,
      fingerprint: parsed.fingerprint,
      ipHash,
      userAgent,
    });
    await touch(store, auth.record.id, now);
    return {
      status: 201,
      body: {
        ok: true,
        status: "pending",
        reviewItemId: inserted.id,
        idempotencyKey: parsed.value.id,
        replay: false,
        photoStored,
      },
    };
  } catch (error) {
    if (error instanceof SignScoutStoreUnavailable) {
      return { status: 503, body: { ok: false, error: "not_ready" } };
    }
    return failed(store, auth.record, parsed.value.id, parsed.fingerprint, ipHash, userAgent);
  }
}

async function finishReplay(
  store: SignScoutIngestStore,
  record: SignScoutTokenRecord,
  lead: SignScoutLead,
  fingerprint: string,
  existing: StoredSignScoutReview,
  ipHash: string | null,
  userAgent: string | null,
): Promise<SignScoutHttpResult> {
  if (existing.bodyFingerprint !== fingerprint) {
    await audit(store, {
      organizationId: record.organizationId,
      tokenId: record.id,
      idempotencyKey: lead.id,
      outcome: "idempotency_conflict",
      outcomeReason: "body_mismatch",
      reviewItemId: existing.id,
      fingerprint,
      ipHash,
      userAgent,
    });
    return {
      status: 409,
      body: { ok: false, error: "idempotency_conflict", idempotencyKey: lead.id },
    };
  }

  let photoStored = Boolean(existing.photoPath);
  if (lead.photo && !existing.photoPath) {
    photoStored = await storePhoto(store, existing.id, record.organizationId, lead.photo);
  }

  await audit(store, {
    organizationId: record.organizationId,
    tokenId: record.id,
    idempotencyKey: lead.id,
    outcome: "replay",
    outcomeReason: null,
    reviewItemId: existing.id,
    fingerprint,
    ipHash,
    userAgent,
  });
  await touch(store, record.id, new Date());
  return {
    status: 200,
    body: {
      ok: true,
      status: existing.status,
      reviewItemId: existing.id,
      idempotencyKey: lead.id,
      replay: true,
      photoStored,
    },
  };
}

async function storePhoto(
  store: SignScoutIngestStore,
  reviewItemId: string,
  organizationId: string,
  photo: SignScoutPhoto | null,
) {
  if (!photo) return false;
  try {
    const saved = await store.savePhoto({ organizationId, reviewItemId, photo });
    const expected = signScoutPhotoPath(organizationId, reviewItemId, photo.contentType);
    if (saved.path !== expected || !saved.path.startsWith(`${organizationId}/`)) return false;
    await store.attachPhoto(reviewItemId, saved.path, photo.contentType);
    return true;
  } catch {
    return false;
  }
}

async function invalid(
  store: SignScoutIngestStore,
  record: SignScoutTokenRecord,
  ipHash: string | null,
  userAgent: string | null,
  issues: string[],
) {
  await audit(store, {
    organizationId: record.organizationId,
    tokenId: record.id,
    idempotencyKey: null,
    outcome: "invalid_request",
    outcomeReason: issues.join(",").slice(0, 2000),
    reviewItemId: null,
    fingerprint: sha256Hex(`invalid|${issues.join(",")}`),
    ipHash,
    userAgent,
  });
  return { status: 400, body: { ok: false, error: "invalid_request", issues } };
}

async function failed(
  store: SignScoutIngestStore,
  record: SignScoutTokenRecord,
  idempotencyKey: string,
  fingerprint: string,
  ipHash: string | null,
  userAgent: string | null,
) {
  await audit(store, {
    organizationId: record.organizationId,
    tokenId: record.id,
    idempotencyKey,
    outcome: "failed",
    outcomeReason: "ingest_failed",
    reviewItemId: null,
    fingerprint,
    ipHash,
    userAgent,
  });
  return { status: 500, body: { ok: false, error: "ingest_failed" } };
}

async function audit(store: SignScoutIngestStore, attempt: SignScoutAttemptInsert) {
  try {
    await store.recordAttempt(attempt);
  } catch {
    // Audit is best-effort after the auth decision is already made.
  }
}

async function touch(store: SignScoutIngestStore, tokenId: string, now: Date) {
  try {
    await store.touchToken(tokenId, now.toISOString());
  } catch {
    // last_used_at is informational.
  }
}

function requestIpHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "";
  return ip ? sha256Hex(ip) : null;
}

function requestUserAgent(request: Request) {
  const agent = request.headers.get("user-agent")?.trim() || "";
  if (agent.length < 2) return null;
  return agent.slice(0, 512);
}
