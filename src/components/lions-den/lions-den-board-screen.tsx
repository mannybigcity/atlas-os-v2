import type { ReactNode } from "react";
import Link from "next/link";
import { LionsDenClientHub } from "@/components/lions-den/lions-den-client-hub";
import { getClientPortalOrgLabel } from "@/lib/client-portal/identity";
import { presentLiveDeskAiRequest } from "@/lib/lions-den/live-desk";
import { freshDeskChatRequests } from "@/lib/lions-den/desk-chat";
import type { LionsDenBoard } from "@/lib/lions-den/client-hub";
import { canSeeSignScoutNav, getSignScoutUrl } from "@/lib/lions-den/signscout";
import { canSeeClientViewNav } from "@/lib/lions-den/client-view";
import { canSeeTrialInboxNav } from "@/lib/lions-den/trial-inbox";
import { getSiteLanguage } from "@/lib/site-language-server";
import {
  defaultClientAiDailyUsage,
  getClientAiDailyUsage,
  getClientAiRequests,
} from "@/server/client-ai/queries";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import { getAfeTrialInboxCount } from "@/server/trials/inbox";

export async function LionsDenBoardScreen({
  board,
  workspace,
  trialInboxCount,
  children,
}: {
  board: LionsDenBoard;
  workspace: ClientWorkspaceContext;
  trialInboxCount?: number;
  children: ReactNode;
}) {
  const organization = workspace.primaryOrganization;
  const [aiRequests, aiUsage] = organization
    ? await Promise.all([
        getClientAiRequests(organization.id, 4),
        getClientAiDailyUsage(organization.id),
      ])
    : [null, null];
  const operatorChrome = {
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview: workspace.isClientPreview,
    organization,
  };
  const showTrialInbox = canSeeTrialInboxNav(operatorChrome);
  const showClientView = canSeeClientViewNav(operatorChrome) || workspace.clientView;
  const showSignScout = canSeeSignScoutNav(operatorChrome);
  const resolvedTrialInboxCount = showTrialInbox
    ? trialInboxCount ?? (await getAfeTrialInboxCount())
    : 0;

  const visibleRequests =
    aiRequests && !aiRequests.setupRequired
      ? freshDeskChatRequests(
          aiRequests.data.map((request) => presentLiveDeskAiRequest(organization, request)),
        )
      : [];
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LionsDenClientHub
      aiRequests={visibleRequests}
      aiUsage={aiUsage && !aiUsage.setupRequired ? aiUsage.data : defaultClientAiDailyUsage()}
      board={board}
      organizationId={organization?.id ?? ""}
      organizationName={organization?.name}
      organizationSlug={organization?.slug}
      clientView={workspace.clientView}
      previewOrgSlug={workspace.previewOrgSlug || undefined}
      showClientView={showClientView}
      showSignScout={showSignScout}
      showTrialInbox={showTrialInbox}
      signScoutUrl={showSignScout ? getSignScoutUrl() : null}
      trial={workspace.trial}
      trialInboxCount={resolvedTrialInboxCount}
      workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      workspaces={workspace.memberships.data.flatMap((membership) =>
        membership.organization
          ? [{
              name: getClientPortalOrgLabel(membership.organization) || membership.organization.name,
              slug: membership.organization.slug ?? "",
            }]
          : [],
      )}
    >
      {workspace.clientView ? (
        <div
          className="mb-4 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] px-4 py-3 text-sm leading-6 text-[#071b42]"
          data-client-view-banner
        >
          {spanish
            ? "Vista de cliente. Ves la estructura del escritorio, los borradores y las etiquetas. Correos, teléfonos, direcciones, pagos, credenciales y mensajes con datos privados están ocultos. Nada se publica desde aquí."
            : "Client View. You see the desk structure, drafts, and labels. Emails, phones, street addresses, payment details, credentials, and messages that contain private contact details are withheld. Nothing publishes from here."}
        </div>
      ) : null}
      {workspace.readOnly ? (
        <div
          className="mb-4 rounded-2xl border border-[#ffb4a2] bg-[#fff4f1] px-4 py-3 text-sm text-[#071b42]"
          data-trial-readonly-banner
        >
          <span>
            {spanish
              ? "Tu prueba terminó. Puedes leer todo; mejora tu plan para seguir trabajando. "
              : "Your trial ended. You can read everything; upgrade to keep working. "}
          </span>
          <Link className="font-semibold underline" href="/pricing?trial=expired">
            {spanish ? "Elegir plan" : "Choose a plan"}
          </Link>
        </div>
      ) : null}
      {children}
    </LionsDenClientHub>
  );
}
