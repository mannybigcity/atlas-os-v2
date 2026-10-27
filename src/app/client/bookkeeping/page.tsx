import type { Metadata } from "next";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import { BookkeepingDesk } from "@/components/bookkeeping-desk";
import { clientWorkspaceHref, getClientWorkspaceContext } from "@/server/client-workspace/context";
import { RECORD_KEEPING_DISCLAIMER } from "@/server/stripe-bookkeeping/compliance";
import { isStripeBookkeepingEnabled } from "@/server/stripe-bookkeeping/config";
import { getBookkeepingView, parseBookkeepingFilters } from "@/server/stripe-bookkeeping/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookkeeping | Client Workspace",
  description: RECORD_KEEPING_DISCLAIMER,
  robots: { index: false, follow: false },
};

type BookkeepingPageProps = {
  searchParams?: Promise<{
    previewOrg?: string;
    workspace?: string;
    clientView?: string;
    from?: string;
    to?: string;
    category?: string;
    stripe?: string;
  }>;
};

const NOTICES: Record<string, string> = {
  connected: "Stripe is connected. The first copy of the ledger is running, and the nightly job continues it.",
  denied: "Stripe did not finish the connection. Nothing was saved.",
  connect_error: "The connection could not be saved. Start it again from this workspace.",
  disconnected: "Stripe access was revoked and this workspace's Stripe records were deleted.",
  disconnected_local: "This workspace's Stripe records were deleted. Also uninstall Atlas Bookkeeping in the Stripe Dashboard so Stripe stops sending events.",
  confirm: "Check the delete box before disconnecting.",
  forbidden: "Only a workspace owner or admin can change the Stripe connection.",
  disabled: "Stripe bookkeeping is turned off.",
  synced: "Sync checked the latest Stripe pages.",
  sync_error: "Sync could not finish. The nightly job will try again.",
  rule_saved: "Category rules were updated. New Stripe rows use them on the next sync.",
  rule_invalid: "That category rule was not saved.",
  rule_error: "That category rule could not be saved.",
};

export default async function BookkeepingPage({ searchParams }: BookkeepingPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client/bookkeeping", params);
  const enabled = isStripeBookkeepingEnabled();
  const filters = parseBookkeepingFilters(params ?? {});
  const organization = workspace.primaryOrganization;
  const canManage =
    enabled &&
    !workspace.isClientPreview &&
    (workspace.primaryMembership?.role === "owner" || workspace.primaryMembership?.role === "admin");
  const view = enabled && organization ? await getBookkeepingView(organization.id, filters) : null;
  const exportParams = new URLSearchParams();

  if (workspace.previewOrgSlug) exportParams.set("previewOrg", workspace.previewOrgSlug);
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  if (filters.category !== "all") exportParams.set("category", filters.category);

  const exportQuery = exportParams.toString();

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", workspace.previewOrgSlug)}
      description="A read-only copy of Stripe charges, refunds, fees, payouts, and invoices for this workspace."
      eyebrow="Bookkeeping"
      organizationName={organization?.name}
      previewMode={workspace.isClientPreview}
    >
      <BookkeepingDesk
        canManage={canManage}
        enabled={enabled}
        exportHref={exportQuery ? `/api/stripe/bookkeeping/export?${exportQuery}` : "/api/stripe/bookkeeping/export"}
        filters={filters}
        notice={params?.stripe ? NOTICES[params.stripe] ?? null : null}
        previewMode={workspace.isClientPreview}
        previewOrgSlug={workspace.previewOrgSlug}
        view={view}
      />
    </ClientWorkspaceScreen>
  );
}
