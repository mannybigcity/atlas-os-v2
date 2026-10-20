import assert from "node:assert/strict";
import test from "node:test";
import { buildStripeAppAuthorizeUrl, deauthorizeStripeApp, exchangeStripeAppCode, STRIPE_APPS_SCOPE } from "./oauth";

test("authorize URL stays on the Stripe App host", () => {
  const url = new URL(buildStripeAppAuthorizeUrl({
    authorizeBaseUrl: "https://marketplace.stripe.com/oauth/v2/authorize",
    clientId: "ca_test",
    redirectUri: "https://atlasforentrepreneurs.com/api/stripe/bookkeeping/callback",
    state: "state-token",
  }));

  assert.equal(url.hostname, "marketplace.stripe.com");
  assert.equal(url.searchParams.get("client_id"), "ca_test");
  assert.equal(url.searchParams.get("state"), "state-token");
  assert.equal(url.searchParams.has("scope"), false);
});

test("Connect OAuth hosts are refused", () => {
  assert.throws(
    () => buildStripeAppAuthorizeUrl({
      authorizeBaseUrl: "https://connect.stripe.com/oauth/authorize",
      clientId: "ca_test",
      redirectUri: "https://atlasforentrepreneurs.com/api/stripe/bookkeeping/callback",
      state: "state-token",
    }),
    /Stripe Connect/,
  );
});

test("token exchange accepts only the stripe_apps scope", async () => {
  const fetchImpl: typeof fetch = async (_input, init) => {
    const body = String(init?.body ?? "");
    assert.match(body, /grant_type=authorization_code/);
    assert.equal(String(init?.headers && (init.headers as Record<string, string>).Authorization).startsWith("Basic "), true);

    return new Response(JSON.stringify({
      access_token: "sk_test_access",
      refresh_token: "rt_test",
      stripe_user_id: "acct_123",
      livemode: false,
      scope: STRIPE_APPS_SCOPE,
      token_type: "bearer",
    }));
  };

  const tokens = await exchangeStripeAppCode({ secretKey: "sk_test_app", code: "ac_123", fetchImpl });
  assert.equal(tokens.stripeUserId, "acct_123");
  assert.equal(tokens.scope, "stripe_apps");

  const connectFetch: typeof fetch = async () => new Response(JSON.stringify({
    access_token: "sk_test_access",
    refresh_token: "rt_test",
    stripe_user_id: "acct_123",
    scope: "read_only",
  }));

  await assert.rejects(
    exchangeStripeAppCode({ secretKey: "sk_test_app", code: "ac_123", fetchImpl: connectFetch }),
    /stripe_apps/,
  );
});

test("deauthorize posts to the Stripe App OAuth host", async () => {
  let called = "";
  const fetchImpl: typeof fetch = async (input) => {
    called = String(input);
    return new Response(JSON.stringify({ stripe_user_id: "acct_123" }), { status: 200 });
  };

  const result = await deauthorizeStripeApp({
    secretKey: "sk_test_app",
    clientId: "ca_test",
    stripeUserId: "acct_123",
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(called, "https://api.stripe.com/v1/oauth/deauthorize");
  assert.equal(called.includes("connect.stripe.com"), false);
});
