import { createServiceClient } from "@/lib/supabase/service";
import {
  SIGNSCOUT_PHOTO_BUCKET,
  signScoutPhotoPath,
  type SignScoutReviewInsert,
  type SignScoutTokenRecord,
} from "@/server/signscout/contract";
import {
  SignScoutStoreUnavailable,
  type SignScoutAttemptInsert,
  type SignScoutIngestStore,
  type StoredSignScoutReview,
} from "@/server/signscout/handler";

type TokenRow = {
  id: string;
  organization_id: string;
  revoked_at: string | null;
};

type OrgRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type ReviewRow = {
  id: string;
  organization_id: string;
  status: "pending" | "accepted" | "dismissed";
  idempotency_key: string;
  body_fingerprint: string;
  photo_storage_path: string | null;
};

export function createSupabaseSignScoutStore(): SignScoutIngestStore {
  const supabase = createServiceClient();

  return {
    async findToken(hash) {
      const { data, error } = await supabase
        .from("organization_signscout_device_tokens")
        .select("id, organization_id, revoked_at")
        .eq("token_hash", hash)
        .maybeSingle();
      if (error) {
        if (isMissingRelation(error)) throw new SignScoutStoreUnavailable();
        throw new Error(error.message);
      }
      const token = data as TokenRow | null;
      if (!token) return null;
      const orgResult = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", token.organization_id)
        .maybeSingle();
      if (orgResult.error) throw new Error(orgResult.error.message);
      const organization = orgResult.data as OrgRow | null;
      if (!organization) return null;
      const record: SignScoutTokenRecord = {
        id: token.id,
        organizationId: token.organization_id,
        revokedAt: token.revoked_at,
        organization,
      };
      return record;
    },

    async countRecent(input) {
      const tokenQuery = supabase
        .from("signscout_ingest_attempts")
        .select("id", { count: "exact", head: true })
        .eq("token_id", input.tokenId)
        .gte("created_at", input.sinceIso)
        .in("outcome", ["created", "replay"]);
      const tokenResult = await tokenQuery;
      if (tokenResult.error) {
        if (isMissingRelation(tokenResult.error)) throw new SignScoutStoreUnavailable();
        throw new Error(tokenResult.error.message);
      }
      let byIp = 0;
      if (input.ipHash) {
        const ipResult = await supabase
          .from("signscout_ingest_attempts")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", input.ipHash)
          .gte("created_at", input.sinceIso)
          .in("outcome", ["created", "replay"]);
        if (ipResult.error) throw new Error(ipResult.error.message);
        byIp = ipResult.count ?? 0;
      }
      return { byToken: tokenResult.count ?? 0, byIp };
    },

    async findReview(organizationId, idempotencyKey) {
      const { data, error } = await supabase
        .from("organization_hunter_review_items")
        .select("id, organization_id, status, idempotency_key, body_fingerprint, photo_storage_path")
        .eq("organization_id", organizationId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (error) {
        if (isMissingRelation(error) || isMissingColumn(error)) throw new SignScoutStoreUnavailable();
        throw new Error(error.message);
      }
      return mapReview(data as ReviewRow | null);
    },

    async insertReview(row: SignScoutReviewInsert) {
      const { data, error } = await supabase
        .from("organization_hunter_review_items")
        .insert(row)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return { conflict: true as const };
        if (isMissingRelation(error) || isMissingColumn(error)) throw new SignScoutStoreUnavailable();
        throw new Error(error.message);
      }
      return { id: String((data as { id: string }).id) };
    },

    async savePhoto(input) {
      const path = signScoutPhotoPath(input.organizationId, input.reviewItemId, input.photo.contentType);
      const { error } = await supabase.storage.from(SIGNSCOUT_PHOTO_BUCKET).upload(path, input.photo.bytes, {
        contentType: input.photo.contentType,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      return { path };
    },

    async attachPhoto(reviewItemId, path, contentType) {
      const { error } = await supabase
        .from("organization_hunter_review_items")
        .update({ photo_storage_path: path, photo_content_type: contentType })
        .eq("id", reviewItemId);
      if (error) throw new Error(error.message);
    },

    async recordAttempt(attempt: SignScoutAttemptInsert) {
      const { error } = await supabase.from("signscout_ingest_attempts").insert({
        organization_id: attempt.organizationId,
        token_id: attempt.tokenId,
        idempotency_key: attempt.idempotencyKey,
        outcome: attempt.outcome,
        outcome_reason: attempt.outcomeReason,
        review_item_id: attempt.reviewItemId,
        fingerprint: attempt.fingerprint,
        ip_hash: attempt.ipHash,
        user_agent: attempt.userAgent,
      });
      if (error && !isMissingRelation(error)) throw new Error(error.message);
    },

    async touchToken(tokenId, usedAtIso) {
      await supabase
        .from("organization_signscout_device_tokens")
        .update({ last_used_at: usedAtIso })
        .eq("id", tokenId);
    },
  };
}

function mapReview(row: ReviewRow | null): StoredSignScoutReview | null {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    bodyFingerprint: row.body_fingerprint,
    photoPath: row.photo_storage_path,
  };
}

function isMissingRelation(error: { code?: string | null; message?: string | null }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "");
  if (code === "42P01" || code === "PGRST205") return true;
  return /does not exist|could not find the table|schema cache/i.test(message) && !/column/i.test(message);
}

function isMissingColumn(error: { code?: string | null; message?: string | null }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "");
  if (code === "42703" || code === "PGRST204") return true;
  return /column/i.test(message) && /does not exist|schema cache|could not find/i.test(message);
}
