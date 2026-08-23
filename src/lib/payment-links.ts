import type { AtlasPricingPlanSlug } from "@/lib/pricing";

const planPaymentLinks: Record<AtlasPricingPlanSlug, string> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_ATLAS_BASIC_URL?.trim() ?? "",
  grow: process.env.NEXT_PUBLIC_STRIPE_ATLAS_GROW_URL?.trim() ?? "",
  unlimited: process.env.NEXT_PUBLIC_STRIPE_ATLAS_UNLIMITED_URL?.trim() ?? "",
};

const sprintPaymentLink = process.env.NEXT_PUBLIC_STRIPE_ATLAS_SPRINT_URL?.trim() ?? "";

function normalizePaymentLink(value: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getAtlasPlanPaymentLink(slug: AtlasPricingPlanSlug) {
  return normalizePaymentLink(planPaymentLinks[slug]);
}

export function getAtlasPlanPaymentLinks() {
  return {
    basic: getAtlasPlanPaymentLink("basic"),
    grow: getAtlasPlanPaymentLink("grow"),
    unlimited: getAtlasPlanPaymentLink("unlimited"),
  } satisfies Record<AtlasPricingPlanSlug, string | null>;
}

export function getAtlasSprintPaymentLink() {
  return normalizePaymentLink(sprintPaymentLink);
}
