import { ClientPilotWorkspace } from "@/components/client-pilot-workspace";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenFollowUpBoard } from "@/components/lions-den/lions-den-follow-up";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { canShowFollowUpDraftControls } from "@/lib/lions-den/follow-up-drafts";
import { nextMessageOwnerFromBusiness } from "@/lib/lions-den/next-message-engine";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { defaultClientAiDailyUsage, getClientAiDailyUsage, getClientAiRequests } from "@/server/client-ai/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getOrganizationNotes } from "@/server/notes/queries";
import { getFollowUpOpportunities } from "@/server/opportunities/queries";
import { amandaBusinessFromWorkspace, getAmandaSequences } from "@/server/outreach/queries";
import { getSisDashboardData } from "@/server/sis-workspace/queries";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { LionsDenBoard } from "@/lib/lions-den/client-hub";

export type FollowUpDeskSearchParams = {
  lang?: string;
  previewOrg?: string;
  workspace?: string;
  followup?: string;
};

export async function FollowUpDeskScreen({
  board,
  workspacePath,
  searchParams,
}: {
  board: Extract<LionsDenBoard, "follow-up" | "amanda">;
  workspacePath: "/client/david" | "/client/amanda";
  searchParams?: FollowUpDeskSearchParams;
}) {
  const language = await getSiteLanguage(searchParams?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext(workspacePath, searchParams);
  const { isClientPreview, previewOrgSlug, primaryOrganization } = workspace;
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
    ? await getFollowUpOpportunities(primaryOrganization.id)
    : null;
  const sisDashboard = primaryOrganization && isSisOrganization(primaryOrganization)
    ? await getSisDashboardData(primaryOrganization.id)
    : null;
  const allowDraftControls = canShowFollowUpDraftControls(primaryOrganization);
  const [amandaSequences, linkedNotes] = primaryOrganization && allowDraftControls
    ? await Promise.all([
        getAmandaSequences(primaryOrganization.id),
        getOrganizationNotes(primaryOrganization.id, { limit: 200 }),
      ])
    : [null, null];
  const engineBusiness = primaryOrganization && allowDraftControls
    ? amandaBusinessFromWorkspace({
        organizationName: primaryOrganization.name,
        organizationSlug: primaryOrganization.slug,
        userMetadata: workspace.user.user_metadata as Record<string, unknown>,
      })
    : null;
  const amanda = primaryOrganization && amandaSequences && !amandaSequences.setupRequired && engineBusiness
    ? {
        business: engineBusiness,
        sequences: amandaSequences.data,
      }
    : null;
  const engineOwner = engineBusiness ? nextMessageOwnerFromBusiness(engineBusiness) : null;

  if (!isQTimeWorkspaceSlug(primaryOrganization?.slug)) {
    return (
      <LionsDenBoardScreen board={board} workspace={workspace}>
        <LionsDenFollowUpBoard
          allowDraftControls={allowDraftControls}
          amanda={amanda}
          composeFromEmail={workspace.user.email ?? ""}
          engineOwner={engineOwner}
          inboxTasks={sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data.inboxTasks : []}
          linkedNotes={
            linkedNotes && !linkedNotes.setupRequired
              ? linkedNotes.data.map((note) => ({
                  recordId: note.recordId,
                  createdAt: note.createdAt,
                  title: note.title,
                  body: note.body,
                }))
              : []
          }
          partyEvents={sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data.partyEvents : []}
          previewOrgSlug={previewOrgSlug || undefined}
          prospects={(pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : []).map((item) =>
            presentLiveDeskOpportunity(primaryOrganization, item),
          )}
          readOnly={workspace.readOnly}
          returnTo={clientWorkspaceHref(workspacePath, previewOrgSlug)}
          followupStatus={searchParams?.followup}
          spanish={spanish}
          workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
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
