import { isStripeBookkeepingEnabled } from "../../src/server/stripe-bookkeeping/config";
import { runNightlyBookkeepingSync } from "../../src/server/stripe-bookkeeping/jobs";

export default async function stripeBookkeepingNightly() {
  if (!isStripeBookkeepingEnabled()) {
    return new Response("Stripe bookkeeping is disabled", { status: 200 });
  }

  const result = await runNightlyBookkeepingSync();
  return Response.json(result);
}

export const config = {
  schedule: "15 8 * * *",
};
