import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenTrialInboxBoard } from "@/components/lions-den/lions-den-trial-inbox";
import { canSeeTrialInboxNav } from "@/lib/lions-den/trial-inbox";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getAfeTrialInbox } from "@/server/trials/inbox";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "7 Day Trial | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type TrialInboxPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function TrialInboxPage({ searchParams }: TrialInboxPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const workspace = await getClientWorkspaceContext("/client/trial-inbox", params);
  const allowed = canSeeTrialInboxNav({
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview: workspace.isClientPreview,
    organization: workspace.primaryOrganization,
  });

  if (!allowed) {
    redirect("/client");
  }

  const inbox = await getAfeTrialInbox();

  return (
    <LionsDenBoardScreen
      board="trial-inbox"
      trialInboxCount={inbox.setupRequired ? 0 : inbox.data.length}
      workspace={workspace}
    >
      <LionsDenTrialInboxBoard
        rows={inbox.setupRequired ? [] : inbox.data}
        setupRequired={inbox.setupRequired}
        spanish={language === "es"}
      />
    </LionsDenBoardScreen>
  );
}
