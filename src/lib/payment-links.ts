import type { AtlasPublicPlanSlug } from "@/lib/pricing";

export const ATLAS_CHECKOUT_SUCCESS_PATH = "/checkout/success";

/**
 * Live Payment Links. Each link is subscription mode and includes the monthly
 * price plus the one-time setup fee. These are public checkout URLs.
 * Netlify may still inject the retired monthly-only links; those are ignored.
 */
export const ATLAS_PAYMENT_LINK_DEFAULTS = {
  basic: "https://buy.stripe.com/eVqcN5b5IcGOeB1elb4ko03",
  grow: "https://buy.stripe.com/aFa7sLb5IcGO2Sjcd34ko04",
  unlimited: "https://buy.stripe.com/4gMcN52zc4aifF5cd34ko05",
  elite: "https://buy.stripe.com/9B6dR93DgayGfF52Ct4ko06",
} as const satisfies Record<AtlasPublicPlanSlug, string>;

/** Monthly-only links. They must not be used once setup fees are on the new links. */
export const RETIRED_ATLAS_PAYMENT_LINKS = [
  "https://buy.stripe.com/4gM8wP0r422a3Wn5OF4ko00",
  "https://buy.stripe.com/14A9AT3Dg6iq0Kb3Gx4ko01",
  "https://buy.stripe.com/bJe14nehU0Y6fF54KB4ko02",
] as const;

const paymentLinkEnv: Record<AtlasPublicPlanSlug, string | undefined> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_ATLAS_BASIC_URL,
  grow: process.env.NEXT_PUBLIC_STRIPE_ATLAS_GROW_URL,
  unlimited: process.env.NEXT_PUBLIC_STRIPE_ATLAS_UNLIMITED_URL,
  elite: process.env.NEXT_PUBLIC_STRIPE_ATLAS_ELITE_URL,
};

export function canonicalBuyStripeLink(value: string | null | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com") return null;
    const path = url.pathname.replace(/\/+$/, "");
    return path ? `https://buy.stripe.com${path}` : null;
  } catch {
    return null;
  }
}

export function isRetiredAtlasPaymentLink(value: string | null | undefined) {
  const canonical = canonicalBuyStripeLink(value);
  return canonical !== null && (RETIRED_ATLAS_PAYMENT_LINKS as readonly string[]).includes(canonical);
}

export function resolveAtlasPaymentLink(
  slug: AtlasPublicPlanSlug,
  envValue: string | null | undefined = paymentLinkEnv[slug],
) {
  const fromEnv = canonicalBuyStripeLink(envValue);
  if (fromEnv && !isRetiredAtlasPaymentLink(fromEnv)) return fromEnv;
  return ATLAS_PAYMENT_LINK_DEFAULTS[slug];
}

export function getAtlasPlanPaymentLink(slug: AtlasPublicPlanSlug) {
  return resolveAtlasPaymentLink(slug);
}

export function getAtlasPlanPaymentLinks() {
  return {
    basic: getAtlasPlanPaymentLink("basic"),
    grow: getAtlasPlanPaymentLink("grow"),
    unlimited: getAtlasPlanPaymentLink("unlimited"),
    elite: getAtlasPlanPaymentLink("elite"),
  } satisfies Record<AtlasPublicPlanSlug, string>;
}
