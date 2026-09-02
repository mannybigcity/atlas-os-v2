import { LionsDenClientHub } from "@/components/lions-den/lions-den-client-hub";
import type { LionsDenBoard } from "@/lib/lions-den/client-hub";
import {
  defaultClientAiDailyUsage,
  getClientAiDailyUsage,
  getClientAiRequests,
} from "@/server/client-ai/queries";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import type { ReactNode } from "react";

export async function LionsDenBoardScreen({
  board,
  workspace,
  children,
}: {
  board: LionsDenBoard;
  workspace: ClientWorkspaceContext;
  children: ReactNode;
}) {
  const organization = workspace.primaryOrganization;
  const [aiRequests, aiUsage] = organization
    ? await Promise.all([
        getClientAiRequests(organization.id, 4),
        getClientAiDailyUsage(organization.id),
      ])
    : [null, null];

  return (
    <LionsDenClientHub
      aiRequests={aiRequests && !aiRequests.setupRequired ? aiRequests.data : []}
      aiUsage={aiUsage && !aiUsage.setupRequired ? aiUsage.data : defaultClientAiDailyUsage()}
      board={board}
      organizationId={organization?.id ?? ""}
      organizationName={organization?.name}
      previewOrgSlug={workspace.previewOrgSlug || undefined}
      workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      workspaces={workspace.memberships.data.flatMap((membership) =>
        membership.organization
          ? [{ name: membership.organization.name, slug: membership.organization.slug ?? "" }]
          : [],
      )}
    >
      {children}
    </LionsDenClientHub>
  );
}
