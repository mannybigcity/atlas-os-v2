import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenCalendarBoard } from "@/components/lions-den/lions-den-calendar";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getSisDashboardData } from "@/server/sis-workspace/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Calendar | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type CalendarPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const workspace = await getClientWorkspaceContext("/client/calendar", params);
  if (isQTimeWorkspaceSlug(workspace.primaryOrganization?.slug)) {
    redirect("/client");
  }
  const organization = workspace.primaryOrganization;
  const pipeline = organization ? await getOpportunityPipeline(organization.id) : null;
  const sisDashboard = organization && isSisOrganization(organization)
    ? await getSisDashboardData(organization.id)
    : null;

  return (
    <LionsDenBoardScreen board="calendar" workspace={workspace}>
      {organization ? (
        <LionsDenCalendarBoard
          organizationId={organization.id}
          partyEvents={sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data.partyEvents : []}
          prospects={(pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : []).map((item) =>
            presentLiveDeskOpportunity(organization, item),
          )}
          spanish={language === "es"}
        />
      ) : (
        <p className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {language === "es"
            ? "Todavía no hay un espacio de trabajo asignado."
            : "No organization workspace is assigned to this account yet."}
        </p>
      )}
    </LionsDenBoardScreen>
  );
}
