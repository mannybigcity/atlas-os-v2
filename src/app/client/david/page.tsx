import type { Metadata } from "next";
import { ClientPilotWorkspace } from "@/components/client-pilot-workspace";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
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
  const {
    canEditBusinessProfile,
    isClientPreview,
    previewOrgSlug,
    primaryOrganization,
  } = workspace;
  const pilot = primaryOrganization
    ? await getPilotWorkspace(primaryOrganization.id)
    : null;

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", previewOrgSlug)}
      description="The Follow-up Desk keeps approvals, open work, and CRM-style next actions from getting lost."
      eyebrow="Follow-up Desk"
      organizationName={primaryOrganization?.name}
      previewMode={isClientPreview}
    >
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <p className="font-semibold">The Follow-up Desk keeps next actions visible.</p>
        <p className="mt-1">
          Today this screen uses the 30-day plan, action queue, work reviews,
          and approval messages. The deeper CRM table can come next, but this is
          enough to keep QTime&apos;s first pilot moving.
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
          canReview={canEditBusinessProfile}
          organizationId={primaryOrganization.id}
          workspace={pilot.data}
        />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
