import { isStripeBookkeepingEnabled, readServerEnv } from "../../src/server/stripe-bookkeeping/config";
import { runOrganizationBackfill } from "../../src/server/stripe-bookkeeping/jobs";
import { oauthStatesMatch } from "../../src/server/stripe-bookkeeping/oauth";

export default async function stripeBookkeepingSyncBackground(req: Request) {
  const expected = readServerEnv("STRIPE_BOOKKEEPING_JOB_SECRET");
  const provided = req.headers.get("x-afe-job-secret");

  if (!expected || !provided || !oauthStatesMatch(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isStripeBookkeepingEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { organizationId?: unknown } | null;
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";

  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) {
    return new Response("Missing workspace", { status: 400 });
  }

  await runOrganizationBackfill(organizationId, 30);
  return new Response("ok");
}
