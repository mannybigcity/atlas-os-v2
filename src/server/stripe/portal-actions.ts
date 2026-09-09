"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { requireUser } from "@/server/auth/guards";
import { getDeskBillingSummary } from "@/server/stripe/billing-summary";
import { getAtlasStripeClient } from "@/server/stripe/client";

/**
 * Opens the Stripe customer portal for the signed-in customer so they can
 * update a card, download invoices, or cancel without emailing support.
 */
export async function openBillingPortal() {
  const user = await requireUser("/client/settings");
  const billing = await getDeskBillingSummary(user.id);
  const stripe = getAtlasStripeClient();

  if (!billing?.stripeCustomerId || !stripe) {
    redirect("/client/settings?billing=unavailable");
  }

  let portalUrl: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${getSiteUrl()}/client/settings?billing=returned`,
    });
    portalUrl = session.url;
  } catch (error) {
    console.error("Atlas billing portal session failed", error);
  }

  if (!portalUrl) {
    redirect("/client/settings?billing=failed");
  }
  redirect(portalUrl);
}
