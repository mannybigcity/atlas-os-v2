import { getVerifiedUser } from "@/server/auth/guards";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { isStripeBookkeepingEnabled } from "@/server/stripe-bookkeeping/config";
import { transactionsToCsv } from "@/server/stripe-bookkeeping/csv";
import { getBookkeepingView, parseBookkeepingFilters } from "@/server/stripe-bookkeeping/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isStripeBookkeepingEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const user = await getVerifiedUser();

  if (!user) {
    return new Response("Sign in required", { status: 401 });
  }

  const url = new URL(request.url);
  const previewOrg = url.searchParams.get("previewOrg") ?? undefined;
  const workspace = await getClientWorkspaceContext("/client/bookkeeping", { previewOrg });
  const organization = workspace.primaryOrganization;

  if (!organization) {
    return new Response("No workspace", { status: 404 });
  }

  const filters = parseBookkeepingFilters({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });
  const view = await getBookkeepingView(organization.id, filters);

  if (view.setupRequired) {
    return new Response("Bookkeeping storage is not ready", { status: 503 });
  }

  const csv = transactionsToCsv(view.transactions);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"atlas-bookkeeping.csv\"",
      "Cache-Control": "no-store",
    },
  });
}
