import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deskDateOnly, shiftDateOnly } from "@/lib/desk-time";
import {
  monthBounds,
  parsePublicPartyHold,
  publicAvailabilityResponse,
  publicHoldsFromSlotRows,
  suggestPublicSlots,
} from "@/lib/sis/public-party-availability";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    ""
  );
}

function allowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (url.protocol === "http:" && (host === "localhost" || host === "127.0.0.1")) return true;
    if (url.protocol !== "https:") return false;
    if (host === "atlasforentrepreneurs.com" || host === "www.atlasforentrepreneurs.com") return true;
    return host.endsWith(".netlify.app") || host.endsWith(".vercel.app") || host.endsWith(".github.io");
  } catch {
    return false;
  }
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, X-Idempotency-Key",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
  if (origin && allowedOrigin(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(request: NextRequest, body: object, status: number, extra?: HeadersInit) {
  const headers = corsHeaders(request);
  headers.set("Cache-Control", status === 200 && request.method === "GET" ? "public, max-age=15" : "no-store");
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }
  return NextResponse.json(body, { status, headers });
}

type SlotRow = { preferred_date: string; party_slot: string | null };

async function readSlots(from: string, to: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("list_sis_party_public_slots", { p_from: from, p_to: to });
  if (error) throw new Error("unavailable");
  return ((data ?? []) as SlotRow[]).map((row) => ({
    date: String(row.preferred_date).slice(0, 10),
    slot: row.party_slot,
  }));
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month")?.trim() || deskDateOnly().slice(0, 7);
  const bounds = monthBounds(month);
  if (!bounds) return jsonResponse(request, { ok: false, error: "invalid_request", issues: ["month"] }, 400);
  try {
    const holds = await readSlots(bounds.from, bounds.to);
    const payload = publicAvailabilityResponse({ monthKey: month, holds });
    if (!payload) return jsonResponse(request, { ok: false, error: "invalid_request", issues: ["month"] }, 400);
    return jsonResponse(request, payload, 200);
  } catch {
    return jsonResponse(request, { ok: false, error: "unavailable" }, 503);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonResponse(request, { ok: false, error: "invalid_request" }, 415);
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(request, { ok: false, error: "invalid_request" }, 400);
  }
  const requestId =
    request.headers.get("idempotency-key")?.trim() ||
    request.headers.get("x-idempotency-key")?.trim() ||
    null;
  const parsed = parsePublicPartyHold(rawBody, requestId);
  if (!parsed.ok) {
    if (parsed.honeypot) return jsonResponse(request, { ok: true, status: "accepted" }, 202);
    return jsonResponse(request, { ok: false, error: "invalid_request", issues: parsed.issues }, 400);
  }
  const input = parsed.value;
  const ip = requestIp(request);
  const ipHash = ip ? sha256Hex(ip) : null;
  const emailHash = sha256Hex(input.email);
  const fingerprint = sha256Hex(`${input.email}|${input.date}|${input.slot}|${input.startTime}`);
  const sourceUrl = input.sourceUrl ?? request.headers.get("referer");

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("create_sis_party_public_hold", {
      p_request_id: input.requestId,
      p_host_name: input.hostName,
      p_email: input.email,
      p_phone: input.phone,
      p_party_type: input.partyType,
      p_guest_count: input.guestCount,
      p_preferred_date: input.date,
      p_party_slot: input.slot,
      p_start_time: input.startTime,
      p_zip: input.zip,
      p_notes: input.notes,
      p_source_url: sourceUrl,
      p_ip_hash: ipHash,
      p_email_hash: emailHash,
      p_fingerprint: fingerprint,
    });
    if (error) return jsonResponse(request, { ok: false, error: "unavailable" }, 503, { "X-Request-Id": input.requestId });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return jsonResponse(request, { ok: false, error: "unavailable" }, 503, { "X-Request-Id": input.requestId });

    if (row.outcome === "rate_limited") {
      const retryAfter = row.outcome_reason === "email_rate_limit" ? 86400 : 3600;
      return jsonResponse(
        request,
        { ok: false, error: "rate_limited" },
        429,
        { "Retry-After": String(retryAfter), "X-Request-Id": input.requestId },
      );
    }
    if (row.outcome === "invalid") {
      return jsonResponse(
        request,
        { ok: false, error: "invalid_request", issues: [String(row.outcome_reason || "invalid")] },
        400,
        { "X-Request-Id": input.requestId },
      );
    }
    if (row.outcome === "conflict") {
      let suggestions: Array<{ date: string; slot: "am" | "pm" }> = [];
      try {
        const today = deskDateOnly();
        const wide = await readSlots(today, shiftDateOnly(today, 56));
        suggestions = suggestPublicSlots({
          holds: publicHoldsFromSlotRows(wide),
          fromDate: today,
          avoid: { date: input.date, slot: input.slot },
        });
      } catch {
        suggestions = [];
      }
      return jsonResponse(
        request,
        { ok: false, error: "slot_taken", suggestions },
        409,
        { "X-Request-Id": input.requestId },
      );
    }
    if (row.outcome !== "held") {
      return jsonResponse(request, { ok: false, error: "unavailable" }, 503, { "X-Request-Id": input.requestId });
    }
    return jsonResponse(
      request,
      {
        ok: true,
        status: "tentative",
        date: input.date,
        slot: input.slot,
        startTime: input.startTime,
        requestId: input.requestId,
      },
      201,
      { "X-Request-Id": input.requestId },
    );
  } catch {
    return jsonResponse(request, { ok: false, error: "unavailable" }, 503, { "X-Request-Id": input.requestId });
  }
}
