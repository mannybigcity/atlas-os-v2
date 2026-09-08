import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenProspectDetail } from "@/components/lions-den/lions-den-prospect-detail";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { prospectStatusMessage } from "@/lib/lions-den/prospect-actions";
import { trialInboxPreviewHref } from "@/lib/lions-den/trial-inbox";
import { trialLinkFromMetadata } from "@/lib/lions-den/trial-prospect";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getOrganizationOpportunity } from "@/server/opportunities/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Prospect | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ProspectDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
    status?: string;
  }>;
};

export default async function ProspectDetailPage({
  params,
  searchParams,
}: ProspectDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const language = await getSiteLanguage(query?.lang);
  const workspace = await getClientWorkspaceContext(`/client/prospects/${id}`, query);
  if (isQTimeWorkspaceSlug(workspace.primaryOrganization?.slug)) {
    redirect("/client");
  }
  const organization = workspace.primaryOrganization;
  if (!organization) notFound();

  const result = await getOrganizationOpportunity(organization.id, id);
  if (result.setupRequired) {
    throw new Error(result.error ?? "Prospects are not available yet.");
  }
  if (!result.data) notFound();

  const spanish = language === "es";
  const previewOrgSlug = workspace.previewOrgSlug || undefined;
  const workspaceSlug = workspace.selectedWorkspaceSlug || undefined;
  const trialLink = trialLinkFromMetadata(result.data.metadata);

  return (
    <LionsDenBoardScreen board="prospects" workspace={workspace}>
      <LionsDenProspectDetail
        allowActions={
          workspace.canEditBusinessProfile &&
          !workspace.isClientPreview &&
          !isSisOrganization(organization)
        }
        backHref={lionsDenHref("/client/prospects", previewOrgSlug, workspaceSlug)}
        prospect={presentLiveDeskOpportunity(organization, result.data)}
        returnTo={lionsDenHref(`/client/prospects/${id}`, previewOrgSlug, workspaceSlug)}
        spanish={spanish}
        statusMessage={prospectStatusMessage(query?.status, spanish)}
        trialDeskHref={
          workspace.isSuperAdmin && trialLink?.organizationSlug
            ? trialInboxPreviewHref(trialLink.organizationSlug)
            : null
        }
      />
    </LionsDenBoardScreen>
  );
}
