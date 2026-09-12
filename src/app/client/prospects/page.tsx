import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { InboundLeadLinkCard } from "@/components/lions-den/inbound-lead-link-card";
import { LionsDenProspectsBoard } from "@/components/lions-den/lions-den-prospects";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { isInboundOpportunity, leadPageUrl } from "@/lib/lions-den/inbound-leads";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { leadPageBaseUrl } from "@/server/leads/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Prospects | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ProspectsPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
    prospect?: string;
  }>;
};

export default async function ProspectsPage({ searchParams }: ProspectsPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const workspace = await getClientWorkspaceContext("/client/prospects", params);
  if (isQTimeWorkspaceSlug(workspace.primaryOrganization?.slug)) {
    redirect("/client");
  }
  const pipeline = workspace.primaryOrganization
    ? await getOpportunityPipeline(workspace.primaryOrganization.id)
    : null;
  const prospects = pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : [];
  const organization = workspace.primaryOrganization;
  const showLeadPage = Boolean(organization?.slug) && !isSisOrganization(organization);

  return (
    <LionsDenBoardScreen board="prospects" workspace={workspace}>
      {showLeadPage && organization ? (
        <InboundLeadLinkCard
          inboundCount={prospects.filter((item) => isInboundOpportunity(item)).length}
          leadPageUrl={leadPageUrl(leadPageBaseUrl(), organization.slug ?? "")}
          spanish={language === "es"}
        />
      ) : null}
      <LionsDenProspectsBoard
        notice={params?.prospect}
        organizationId={workspace.primaryOrganization?.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        prospects={prospects.map((item) =>
          presentLiveDeskOpportunity(workspace.primaryOrganization, item),
        )}
        spanish={language === "es"}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
    </LionsDenBoardScreen>
  );
}
