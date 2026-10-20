import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { stripeOAuthUrls } from "./config.ts";

export const STRIPE_APPS_SCOPE = "stripe_apps";

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string;
  stripeUserId: string;
  livemode: boolean;
  scope: string;
  expiresInSeconds: number;
};

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function oauthStatesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildStripeAppAuthorizeUrl(input: {
  authorizeBaseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(input.authorizeBaseUrl);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);

  if (url.hostname === "connect.stripe.com") {
    throw new Error("Refusing Stripe Connect OAuth. Use the Stripe App authorize URL.");
  }

  return url.toString();
}

export async function exchangeStripeAppCode(input: {
  secretKey: string;
  code: string;
  fetchImpl?: typeof fetch;
}) {
  return requestToken(input.secretKey, {
    grant_type: "authorization_code",
    code: input.code,
  }, input.fetchImpl);
}

export async function refreshStripeAppToken(input: {
  secretKey: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}) {
  return requestToken(input.secretKey, {
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  }, input.fetchImpl);
}

export async function deauthorizeStripeApp(input: {
  secretKey: string;
  clientId: string;
  stripeUserId: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(stripeOAuthUrls().deauthorize, {
    method: "POST",
    headers: {
      Authorization: basicAuth(input.secretKey),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      stripe_user_id: input.stripeUserId,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}

async function requestToken(
  secretKey: string,
  body: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokenSet> {
  const response = await fetchImpl(stripeOAuthUrls().token, {
    method: "POST",
    headers: {
      Authorization: basicAuth(secretKey),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload) {
    throw new Error(`Stripe App token request failed (${response.status}).`);
  }

  const scope = String(payload.scope ?? "");

  if (scope !== STRIPE_APPS_SCOPE) {
    throw new Error("Refusing a token whose scope is not stripe_apps.");
  }

  const accessToken = stringField(payload, "access_token");
  const refreshToken = stringField(payload, "refresh_token");
  const stripeUserId = stringField(payload, "stripe_user_id");

  if (!accessToken || !refreshToken || !stripeUserId.startsWith("acct_")) {
    throw new Error("Stripe App token response was incomplete.");
  }

  const expiresIn = Number(payload.expires_in ?? 3600);

  return {
    accessToken,
    refreshToken,
    stripeUserId,
    livemode: payload.livemode === true,
    scope,
    expiresInSeconds: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
  };
}

function basicAuth(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

function stringField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}
