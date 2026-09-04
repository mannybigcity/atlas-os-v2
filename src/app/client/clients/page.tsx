import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenClientsBoard } from "@/components/lions-den/lions-den-clients";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
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
  if (!isSisOrganization(workspace.primaryOrganization)) {
    redirect("/client");
  }

  const customers = workspace.primaryOrganization
    ? await getSisCustomers(workspace.primaryOrganization.id)
    : null;

  return (
    <LionsDenBoardScreen board="clients" workspace={workspace}>
      <LionsDenClientsBoard
        customers={customers && !customers.setupRequired ? customers.data : []}
        setupRequired={Boolean(customers?.setupRequired)}
        spanish={language === "es"}
      />
    </LionsDenBoardScreen>
  );
}
