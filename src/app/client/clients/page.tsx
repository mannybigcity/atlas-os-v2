import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenClientsBoard } from "@/components/lions-den/lions-den-clients";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { wonOpportunityToDeskClient, type DeskClient } from "@/lib/lions-den/desk-clients";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getWonOpportunities } from "@/server/opportunities/queries";
import { getSisCustomers } from "@/server/sis-workspace/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Clients | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ClientsPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const workspace = await getClientWorkspaceContext("/client/clients", params);
  if (isQTimeWorkspaceSlug(workspace.primaryOrganization?.slug)) {
    redirect("/client");
  }

  const organization = workspace.primaryOrganization;
  const sisDesk = isSisOrganization(organization);
  let customers: DeskClient[] = [];
  let setupRequired = false;

  if (organization) {
    if (sisDesk) {
      const sisCustomers = await getSisCustomers(organization.id);
      customers = sisCustomers.setupRequired ? [] : sisCustomers.data;
      setupRequired = sisCustomers.setupRequired;
    } else {
      const won = await getWonOpportunities(organization.id);
      customers = won.setupRequired ? [] : won.data.map(wonOpportunityToDeskClient);
      setupRequired = won.setupRequired;
    }
  }

  return (
    <LionsDenBoardScreen board="clients" workspace={workspace}>
      <LionsDenClientsBoard
        customers={customers}
        setupRequired={setupRequired}
        spanish={language === "es"}
      />
    </LionsDenBoardScreen>
  );
}
