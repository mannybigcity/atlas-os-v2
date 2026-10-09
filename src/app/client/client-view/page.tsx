import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenClientViewBoard } from "@/components/lions-den/lions-den-client-view";
import { canSeeClientViewNav } from "@/lib/lions-den/client-view";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { listAfeClientViewDesks } from "@/server/client-view/desks";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Client View | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ClientViewPageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export default async function ClientViewPage({ searchParams }: ClientViewPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const workspace = await getClientWorkspaceContext("/client/client-view");
  const allowed = canSeeClientViewNav({
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview: workspace.isClientPreview,
    organization: workspace.primaryOrganization,
  });

  if (!allowed) {
    redirect("/client");
  }

  const desks = await listAfeClientViewDesks();

  return (
    <LionsDenBoardScreen board="client-view" workspace={workspace}>
      <LionsDenClientViewBoard
        rows={desks.setupRequired ? [] : desks.data}
        setupRequired={desks.setupRequired}
        spanish={language === "es"}
      />
    </LionsDenBoardScreen>
  );
}
