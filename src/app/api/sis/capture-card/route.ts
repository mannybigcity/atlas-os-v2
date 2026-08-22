import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseSisCaptureCardInput } from "@/server/sis-capture-card/intake";

export const runtime = "nodejs";

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIpHash(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidates = [
    forwardedFor?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
    request.headers.get("cf-connecting-ip")?.trim(),
  ].filter(Boolean) as string[];

  const ip = candidates[0];
  return ip ? sha256Hex(ip) : null;
}

function requestUserAgent(request: NextRequest) {
  return request.headers.get("user-agent")?.trim() || null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  requestId?: string | null,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(requestId ? { "X-Request-Id": requestId } : {}),
      ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  });
}

async function recordInvalidAttempt(params: {
  requestId: string;
  fingerprintSeed: string;
  request: NextRequest;
  issues: string[];
}) {
  const supabase = createServiceClient();
  const ipHash = requestIpHash(params.request);
  const userAgent = requestUserAgent(params.request);

  await supabase.from("atlas_public_intake_attempts").upsert(
    {
      request_id: params.requestId,
      source: "sis_capture_card",
      outcome: "invalid_request",
      outcome_reason: params.issues.join(","),
      fingerprint: sha256Hex(params.fingerprintSeed),
      ip_hash: ipHash,
      user_agent: userAgent,
    },
    { onConflict: "request_id" },
  );
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return jsonResponse({ ok: false, error: "invalid_request" }, 415, null);
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_request" }, 400, null);
  }

  const requestIdOverride =
    request.headers.get("idempotency-key")?.trim() ??
    request.headers.get("x-idempotency-key")?.trim() ??
    null;
  const parsed = parseSisCaptureCardInput(rawBody, requestIdOverride);

  if (!parsed.ok) {
    if (parsed.failure.requestId) {
      try {
        await recordInvalidAttempt({
          requestId: parsed.failure.requestId,
          fingerprintSeed: `invalid|${parsed.failure.requestId}`,
          request,
          issues: parsed.failure.issues,
        });
      } catch {
        // Best-effort audit logging only.
      }
    }

    return jsonResponse(
      {
        ok: false,
        error: "invalid_request",
        issues: parsed.failure.issues,
      },
      400,
      parsed.failure.requestId,
    );
  }

  const input = parsed.value;
  const ipHash = requestIpHash(request);
  const userAgent = requestUserAgent(request);
  const emailHash = input.contactEmail ? sha256Hex(input.contactEmail) : null;
  const phoneHash = input.contactPhone
    ? sha256Hex(input.contactPhone.replace(/[^0-9]/g, ""))
    : null;
  const fingerprint = sha256Hex(input.fingerprintSeed);
  const sourceUrl = input.sourceUrl ?? request.headers.get("referer");

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("capture_sis_capture_card_intake", {
      p_request_id: input.requestId,
      p_business_name: input.businessName,
      p_contact_name: input.contactName,
      p_contact_email: input.contactEmail,
      p_contact_phone: input.contactPhone,
      p_website: input.website,
      p_website_domain: input.websiteDomain,
      p_social_media: input.socialMedia,
      p_source_url: sourceUrl,
      p_ip_hash: ipHash,
      p_email_hash: emailHash,
      p_phone_hash: phoneHash,
      p_fingerprint: fingerprint,
      p_user_agent: userAgent,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      throw new Error("capture_sis_capture_card_intake returned no result.");
    }

    if (row.outcome === "rate_limited") {
      const retryAfterSeconds = row.outcome_reason === "ip_rate_limit" ? 3600 : 86400;

      return jsonResponse(
        { ok: false, error: "rate_limited" },
        429,
        input.requestId,
        retryAfterSeconds,
      );
    }

    const { error: tenantLeadError } = await supabase.rpc("capture_sis_tenant_lead", {
      p_request_id: input.requestId,
      p_business_name: input.businessName,
      p_contact_name: input.contactName,
      p_contact_email: input.contactEmail,
      p_contact_phone: input.contactPhone,
      p_website: input.website,
      p_social_media: input.socialMedia,
      p_source_url: sourceUrl,
    });

    if (tenantLeadError) {
      throw new Error(tenantLeadError.message);
    }

    return jsonResponse(
      { ok: true, status: "accepted", requestId: input.requestId },
      202,
      input.requestId,
    );
  } catch (error) {
    try {
      const supabase = createServiceClient();

      await supabase.from("atlas_public_intake_attempts").upsert(
        {
          request_id: input.requestId,
          source: "sis_capture_card",
          outcome: "failed",
          outcome_reason:
            error instanceof Error ? error.message.slice(0, 2000) : "capture_failed",
          fingerprint,
          ip_hash: ipHash,
          email_hash: emailHash,
          phone_hash: phoneHash,
          user_agent: userAgent,
        },
        { onConflict: "request_id" },
      );
    } catch {
      // Best-effort audit logging only.
    }

    return jsonResponse(
      { ok: false, error: "service_unavailable" },
      503,
      input.requestId,
    );
  }
}

export async function GET() {
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, null);
}
