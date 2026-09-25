import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  signScoutCorsAllowed,
  signScoutExtraOrigins,
} from "@/server/signscout/contract";
import { handleSignScoutIngest, type SignScoutHttpResult } from "@/server/signscout/handler";
import { createSupabaseSignScoutStore } from "@/server/signscout/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extraOrigins() {
  return signScoutExtraOrigins({
    webOrigins: process.env.SIGNSCOUT_WEB_ORIGINS,
    signScoutUrl: process.env.NEXT_PUBLIC_SIGNSCOUT_URL,
  });
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
    "Cache-Control": "no-store",
  });
  if (origin && signScoutCorsAllowed(origin, extraOrigins())) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function toNextResponse(request: Request, result: SignScoutHttpResult) {
  const headers = corsHeaders(request);
  if (result.retryAfter) headers.set("Retry-After", String(result.retryAfter));
  return NextResponse.json(result.body, { status: result.status, headers });
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleSignScoutIngest(request, createSupabaseSignScoutStore());
    return toNextResponse(request, result);
  } catch {
    return toNextResponse(request, { status: 503, body: { ok: false, error: "not_ready" } });
  }
}
