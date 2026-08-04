import type { Metadata } from "next";
import { ClientContentStudio } from "@/components/client-content-studio";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getContentStudio } from "@/server/content-studio/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Studio | Client Workspace",
  robots: { index: false, follow: false },
};

type MicahPageProps = {
  searchParams?: Promise<{
    previewOrg?: string;
  }>;
};

export default async function MicahPage({ searchParams }: MicahPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client/micah", params);
  const {
    canEditBusinessProfile,
    isClientPreview,
    previewOrgSlug,
    primaryOrganization,
  } = workspace;
  const studio = primaryOrganization
    ? await getContentStudio(primaryOrganization.id)
    : null;

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", previewOrgSlug)}
      description="Content Studio prepares social images, captions, campaign directions, and post drafts for review before anything goes public."
      eyebrow="Content Studio"
      organizationName={primaryOrganization?.name}
      previewMode={isClientPreview}
    >
      {studio?.setupRequired ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
          Content Studio is preparing this workspace.
        </div>
      ) : null}

      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          No organization workspace is assigned to this account yet.
        </div>
      ) : null}

      {studio && !studio.setupRequired && primaryOrganization ? (
        <ClientContentStudio
          canReview={canEditBusinessProfile}
          organizationId={primaryOrganization.id}
          studio={studio.data}
        />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
