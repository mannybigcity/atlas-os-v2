import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/server/auth/guards";
import {
  assertOAuthConfigured,
  isStripeBookkeepingEnabled,
  loadStripeBookkeepingConfig,
  secretKeyForMode,
} from "@/server/stripe-bookkeeping/config";
import { kickOrganizationBackfill } from "@/server/stripe-bookkeeping/jobs";
import { consumeOAuthState, createStripeAdminClient, saveConnectionTokens, seedDefaultCategoryRules } from "@/server/stripe-bookkeeping/store";
import { exchangeStripeAppCode, hashOAuthState } from "@/server/stripe-bookkeeping/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/client/bookkeeping", getSiteUrl(url.origin));

  if (!isStripeBookkeepingEnabled()) {
    destination.searchParams.set("stripe", "disabled");
    return NextResponse.redirect(destination);
  }

  const user = await getVerifiedUser();

  if (!user) {
    const login = new URL("/login", getSiteUrl(url.origin));
    login.searchParams.set("next", "/client/bookkeeping");
    return NextResponse.redirect(login);
  }

  if (url.searchParams.get("error")) {
    destination.searchParams.set("stripe", "denied");
    return NextResponse.redirect(destination);
  }

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  if (!code || !state) {
    destination.searchParams.set("stripe", "denied");
    return NextResponse.redirect(destination);
  }

  try {
    const config = loadStripeBookkeepingConfig();
    assertOAuthConfigured(config);
    const admin = createStripeAdminClient();
    const consumed = await consumeOAuthState(admin, {
      stateHash: hashOAuthState(state),
      userId: user.id,
    });
    const supabase = await createClient();
    const membership = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", consumed.organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    const role = (membership.data as { role?: string } | null)?.role;

    if (role !== "owner" && role !== "admin") {
      destination.searchParams.set("stripe", "forbidden");
      return NextResponse.redirect(destination);
    }

    const tokens = await exchangeStripeAppCode({
      secretKey: secretKeyForMode(config, config.oauthMode === "live"),
      code,
    });
    const connectionId = await saveConnectionTokens(admin, {
      organizationId: consumed.organizationId,
      installedBy: user.id,
      tokens,
      encryptionKey: config.encryptionKey,
      backfillMonths: config.backfillMonths,
    });
    await seedDefaultCategoryRules(admin, {
      organizationId: consumed.organizationId,
      connectionId,
      userId: user.id,
    });
    await kickOrganizationBackfill(consumed.organizationId);
    destination.searchParams.set("stripe", "connected");
  } catch {
    destination.searchParams.set("stripe", "connect_error");
  }

  return NextResponse.redirect(destination);
}
