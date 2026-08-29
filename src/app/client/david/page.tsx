import type { Metadata } from "next";
import { ClientPilotWorkspace } from "@/components/client-pilot-workspace";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenFollowUpBoard } from "@/components/lions-den/lions-den-follow-up";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { usesLionsDenHub } from "@/lib/lions-den/client-hub";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { defaultClientAiDailyUsage, getClientAiDailyUsage, getClientAiRequests } from "@/server/client-ai/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getSisDashboardData } from "@/server/sis-workspace/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "Seguimiento | The Lion’s Den" : "Follow-up | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type FollowUpPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function FollowUpPage({ searchParams }: FollowUpPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext("/client/david", params);
  const { isClientPreview, previewOrgSlug, primaryOrganization } = workspace;
  const useLionsDen = usesLionsDenHub(primaryOrganization?.slug);
  const aiRequests = primaryOrganization
    ? await getClientAiRequests(primaryOrganization.id, 8)
    : null;
  const aiUsage = primaryOrganization
    ? await getClientAiDailyUsage(primaryOrganization.id)
    : null;
  const pilot = primaryOrganization
    ? await getPilotWorkspace(primaryOrganization.id)
    : null;
  const pipeline = primaryOrganization
    ? await getOpportunityPipeline(primaryOrganization.id)
    : null;
  const sisDashboard = isSisOrganization(primaryOrganization)
    ? await getSisDashboardData(primaryOrganization.id)
    : null;

  if (useLionsDen) {
    return (
      <LionsDenBoardScreen board="follow-up" workspace={workspace}>
        <LionsDenFollowUpBoard
          inboxTasks={sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data.inboxTasks : []}
          prospects={pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : []}
          spanish={spanish}
        />
      </LionsDenBoardScreen>
    );
  }

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", previewOrgSlug)}
      description={spanish
        ? "El Centro de Seguimiento mantiene las notas, revisiones y mensajes comerciales cerca del CRM."
        : "The Follow-up Desk keeps follow-up notes, check-ins, and business messages close to the CRM."}
      eyebrow={spanish ? "Centro de Seguimiento" : "Follow-up Desk"}
      organizationName={primaryOrganization?.name}
      previewMode={isClientPreview}
    >
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <p className="font-semibold">
          {spanish ? "El Centro de Seguimiento mantiene visibles las próximas acciones." : "The Follow-up Desk keeps next actions visible."}
        </p>
        <p className="mt-1">
          {spanish
            ? "Usa esta página para notas de seguimiento, recordatorios de prospectos, mensajes y la próxima revisión. El CRM administra las gráficas y los registros; esta es la vista de trabajo detallada."
            : "Use this page for follow-up notes, prospect reminders, messages, and the next check-in. The CRM can handle the graphs and recording; this page is the deeper working view."}
        </p>
      </div>
      {pilot?.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {spanish ? "El Centro de Seguimiento está preparando este espacio de trabajo." : "The Follow-up Desk is preparing this workspace."}
        </div>
      ) : null}
      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          {spanish ? "Todavía no hay un espacio de trabajo de organización asignado a esta cuenta." : "No organization workspace is assigned to this account yet."}
        </div>
      ) : null}
      {pilot && !pilot.setupRequired && primaryOrganization ? (
        <ClientPilotWorkspace
          organizationId={primaryOrganization.id}
          aiRequests={aiRequests && !aiRequests.setupRequired ? aiRequests.data : []}
          aiUsage={aiUsage && !aiUsage.setupRequired ? aiUsage.data : defaultClientAiDailyUsage()}
          workspace={pilot.data}
        />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
