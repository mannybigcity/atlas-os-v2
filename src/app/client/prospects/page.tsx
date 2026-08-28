import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenProspectsBoard } from "@/components/lions-den/lions-den-prospects";
import { isQTimeWorkspaceSlug } from "@/lib/client-portal/identity";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
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

  return (
    <LionsDenBoardScreen board="prospects" workspace={workspace}>
      <LionsDenProspectsBoard
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        prospects={pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : []}
        spanish={language === "es"}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
    </LionsDenBoardScreen>
  );
}
