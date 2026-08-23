import "server-only";

import Stripe from "stripe";

export type StripeMode = "live" | "test" | "unknown";

let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

export function getAtlasStripeClient(): Stripe | null {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }

  cachedClient = new Stripe(apiKey, {
    apiVersion: "2026-07-29.dahlia",
    appInfo: {
      name: "Atlas for Entrepreneurs Money",
      version: "1.0.0",
    },
    maxNetworkRetries: 1,
    timeout: 5_000,
  });
  cachedKey = apiKey;

  return cachedClient;
}

export function getAtlasStripeMode(): StripeMode {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    return "unknown";
  }

  if (apiKey.startsWith("sk_live_") || apiKey.startsWith("rk_live_")) {
    return "live";
  }

  if (apiKey.startsWith("sk_test_") || apiKey.startsWith("rk_test_")) {
    return "test";
  }

  return "unknown";
}
