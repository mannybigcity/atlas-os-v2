import { LionsDenClientHub } from "@/components/lions-den/lions-den-client-hub";
import { getClientPortalOrgLabel } from "@/lib/client-portal/identity";
import { presentLiveDeskAiRequest } from "@/lib/lions-den/live-desk";
import type { LionsDenBoard } from "@/lib/lions-den/client-hub";
import { canSeeTrialInboxNav } from "@/lib/lions-den/trial-inbox";
import {
  defaultClientAiDailyUsage,
  getClientAiDailyUsage,
  getClientAiRequests,
} from "@/server/client-ai/queries";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import { getAfeTrialInboxCount } from "@/server/trials/inbox";
import type { ReactNode } from "react";

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
  const showTrialInbox = canSeeTrialInboxNav({
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview: workspace.isClientPreview,
    organization,
  });
  const resolvedTrialInboxCount = showTrialInbox
    ? trialInboxCount ?? (await getAfeTrialInboxCount())
    : 0;

  const visibleRequests =
    aiRequests && !aiRequests.setupRequired
      ? aiRequests.data.map((request) => presentLiveDeskAiRequest(organization, request))
      : [];

  return (
    <LionsDenClientHub
      aiRequests={visibleRequests}
      aiUsage={aiUsage && !aiUsage.setupRequired ? aiUsage.data : defaultClientAiDailyUsage()}
      board={board}
      organizationId={organization?.id ?? ""}
      organizationName={organization?.name}
      organizationSlug={organization?.slug}
      previewOrgSlug={workspace.previewOrgSlug || undefined}
      showTrialInbox={showTrialInbox}
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
      {children}
    </LionsDenClientHub>
  );
}
