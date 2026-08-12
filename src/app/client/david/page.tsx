import type { Metadata } from "next";
import { ClientPilotWorkspace } from "@/components/client-pilot-workspace";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getClientAiRequests } from "@/server/client-ai/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Follow-up Desk | Client Workspace",
  robots: { index: false, follow: false },
};

type DavidPageProps = {
  searchParams?: Promise<{
    previewOrg?: string;
  }>;
};

export default async function DavidPage({ searchParams }: DavidPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client/david", params);
  const { isClientPreview, previewOrgSlug, primaryOrganization } = workspace;
  const aiRequests = primaryOrganization
    ? await getClientAiRequests(primaryOrganization.id, 8)
    : null;
  const pilot = primaryOrganization
    ? await getPilotWorkspace(primaryOrganization.id)
    : null;

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/clients", previewOrgSlug)}
      description="The Follow-up Desk keeps follow-up notes, check-ins, and business messages close to the CRM."
      eyebrow="Follow-up Desk"
      organizationName={primaryOrganization?.name}
      previewMode={isClientPreview}
    >
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <p className="font-semibold">The Follow-up Desk keeps next actions visible.</p>
        <p className="mt-1">
          Use this page for follow-up notes, prospect reminders, messages, and
          the next check-in. The CRM can handle the graphs and recording; this
          page is the deeper working view.
        </p>
      </div>

      {pilot?.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          The Follow-up Desk is preparing this workspace.
        </div>
      ) : null}

      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          No organization workspace is assigned to this account yet.
        </div>
      ) : null}

      {pilot && !pilot.setupRequired && primaryOrganization ? (
        <ClientPilotWorkspace
          organizationId={primaryOrganization.id}
          aiRequests={aiRequests && !aiRequests.setupRequired ? aiRequests.data : []}
          workspace={pilot.data}
        />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
