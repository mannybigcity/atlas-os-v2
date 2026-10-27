export type StripeBookkeepingConfig = {
  enabled: boolean;
  clientId: string;
  liveSecretKey: string;
  testSecretKey: string;
  oauthMode: "live" | "test";
  authorizeBaseUrl: string;
  webhookSecrets: string[];
  encryptionKey: string;
  jobSecret: string;
  backfillMonths: number;
  siteUrl: string;
};

const AUTHORIZE_URL = "https://marketplace.stripe.com/oauth/v2/authorize";
const TOKEN_URL = "https://api.stripe.com/v1/oauth/token";
const DEAUTHORIZE_URL = "https://api.stripe.com/v1/oauth/deauthorize";

export function stripeOAuthUrls() {
  return {
    authorize: AUTHORIZE_URL,
    token: TOKEN_URL,
    deauthorize: DEAUTHORIZE_URL,
  };
}

export function readServerEnv(name: string) {
  const runtime = globalThis as {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
  };
  const fromNetlify = runtime.Netlify?.env?.get?.(name);

  return (fromNetlify ?? process.env[name] ?? "").trim();
}

export function isStripeBookkeepingEnabled() {
  return readServerEnv("STRIPE_BOOKKEEPING_ENABLED") === "true";
}

export function loadStripeBookkeepingConfig(): StripeBookkeepingConfig {
  const oauthMode = readServerEnv("STRIPE_APP_OAUTH_MODE") === "test" ? "test" : "live";
  const webhookSecrets = [
    readServerEnv("STRIPE_BOOKKEEPING_WEBHOOK_SECRET"),
    readServerEnv("STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST"),
  ].filter(Boolean);

  return {
    enabled: isStripeBookkeepingEnabled(),
    clientId: readServerEnv("STRIPE_APP_CLIENT_ID"),
    liveSecretKey: readServerEnv("STRIPE_APP_SECRET_KEY"),
    testSecretKey: readServerEnv("STRIPE_APP_TEST_SECRET_KEY"),
    oauthMode,
    authorizeBaseUrl: readServerEnv("STRIPE_APP_AUTHORIZE_URL") || AUTHORIZE_URL,
    webhookSecrets,
    encryptionKey: readServerEnv("STRIPE_TOKEN_ENCRYPTION_KEY"),
    jobSecret: readServerEnv("STRIPE_BOOKKEEPING_JOB_SECRET"),
    backfillMonths: clampBackfillMonths(readServerEnv("STRIPE_BOOKKEEPING_BACKFILL_MONTHS")),
    siteUrl: readServerEnv("NEXT_PUBLIC_SITE_URL") || readServerEnv("URL") || "http://localhost:3000",
  };
}

export function secretKeyForMode(config: StripeBookkeepingConfig, livemode: boolean) {
  return livemode ? config.liveSecretKey : config.testSecretKey || config.liveSecretKey;
}

export function clampBackfillMonths(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 24;
  }

  return Math.min(24, Math.max(12, Math.trunc(parsed)));
}

export function callbackUrl(siteUrl: string) {
  return new URL("/api/stripe/bookkeeping/callback", siteUrl).toString();
}

export function assertOAuthConfigured(config: StripeBookkeepingConfig) {
  const missing: string[] = [];

  if (!config.clientId) missing.push("STRIPE_APP_CLIENT_ID");
  if (!config.encryptionKey) missing.push("STRIPE_TOKEN_ENCRYPTION_KEY");
  if (config.oauthMode === "test") {
    if (!config.testSecretKey && !config.liveSecretKey) missing.push("STRIPE_APP_TEST_SECRET_KEY");
  } else if (!config.liveSecretKey) {
    missing.push("STRIPE_APP_SECRET_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Stripe bookkeeping is missing ${missing.join(", ")}.`);
  }
}
