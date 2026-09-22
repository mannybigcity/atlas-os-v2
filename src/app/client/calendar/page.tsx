import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenCalendarBoard } from "@/components/lions-den/lions-den-calendar";
import { SisPartyAvailabilityCalendar } from "@/components/lions-den/sis-party-availability-calendar";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { deskDateOnly } from "@/lib/desk-time";
import { SIS_PARTY_SLOT_MIGRATION } from "@/lib/sis/party-availability";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getFollowUpOpportunities } from "@/server/opportunities/queries";
import { getSisDashboardData, getSisPartyCalendar } from "@/server/sis-workspace/queries";
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
    date?: string;
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
  const sisDesk = Boolean(organization && isSisOrganization(organization));
  const pipeline = organization ? await getFollowUpOpportunities(organization.id) : null;
  const sisDashboard = sisDesk && organization
    ? await getSisDashboardData(organization.id)
    : null;
  const partyCalendar = sisDesk && organization
    ? await getSisPartyCalendar(organization.id)
    : null;
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(params?.date ?? "") ? params?.date ?? "" : "";
  const prospects = organization
    ? (pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : []).map((item) =>
        presentLiveDeskOpportunity(organization, item),
      )
    : [];
  const partyEvents = sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data.partyEvents : [];

  return (
    <LionsDenBoardScreen board="calendar" workspace={workspace}>
      {sisDesk && organization ? (
        <div className="space-y-5">
          {partyCalendar?.setupRequired ? (
            <p className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              {partyCalendar.error === "migration"
                ? language === "es"
                  ? `La disponibilidad de fiestas espera una actualización de la base. Ejecuta ${SIS_PARTY_SLOT_MIGRATION} en el editor SQL de Supabase. Los seguimientos de abajo siguen funcionando.`
                  : `Party availability is waiting on a database update. Run ${SIS_PARTY_SLOT_MIGRATION} in the Supabase SQL editor. Follow-up reminders below still work.`
                : partyCalendar.error}
            </p>
          ) : (
            <SisPartyAvailabilityCalendar
              holds={partyCalendar?.data.holds ?? []}
              initialDate={requestedDate || deskDateOnly()}
              parties={partyCalendar?.data.parties ?? []}
              spanish={language === "es"}
              today={deskDateOnly()}
            />
          )}
          <LionsDenCalendarBoard
            organizationId={organization.id}
            partyEvents={partyEvents}
            prospects={prospects}
            spanish={language === "es"}
            variant="follow-up"
          />
        </div>
      ) : organization ? (
        <LionsDenCalendarBoard
          organizationId={organization.id}
          partyEvents={partyEvents}
          prospects={prospects}
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
