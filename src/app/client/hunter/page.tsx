import type { Metadata } from "next";
import { ClientOpportunityPipeline } from "@/components/client-opportunity-pipeline";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getOpportunityPipeline } from "@/server/opportunities/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HUNTER Leads & Outreach | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type HunterPageProps = {
  searchParams?: Promise<{
    previewOrg?: string;
  }>;
};

export default async function HunterPage({ searchParams }: HunterPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client/hunter", params);
  const { isClientPreview, previewOrgSlug, primaryOrganization } = workspace;
  const pipeline = primaryOrganization
    ? await getOpportunityPipeline(primaryOrganization.id)
    : null;

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", previewOrgSlug)}
      description="HUNTER tracks leads, sponsors, partners, venues, and warm opportunities before DAVID turns them into follow-up."
      eyebrow="HUNTER"
      previewMode={isClientPreview}
      title={`${primaryOrganization?.name ?? "Client"} Leads & Outreach`}
    >
      {pipeline?.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          HUNTER is preparing the opportunity pipeline for this workspace.
        </div>
      ) : null}

      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          No organization workspace is assigned to this account yet.
        </div>
      ) : null}

      {pipeline && !pipeline.setupRequired ? (
        <ClientOpportunityPipeline pipeline={pipeline.data} />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
