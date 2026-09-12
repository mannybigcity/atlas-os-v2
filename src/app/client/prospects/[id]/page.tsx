import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenProspectDetail } from "@/components/lions-den/lions-den-prospect-detail";
import { ClientProfileForm } from "@/components/lions-den/client-profile-form";
import { LinkedNotesPanel } from "@/components/lions-den/linked-notes-panel";
import { noteRecordKindForStage } from "@/lib/lions-den/note-links";
import { isQTimeWorkspaceSlug } from "@/lib/client-portal/identity";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { fillMissingOpportunityEmail } from "@/server/hunter/fill-website-email";
import { getOrganizationOpportunity } from "@/server/opportunities/queries";
import { getSiteLanguage } from "@/lib/site-language-server";
import { getDeskPayLink } from "@/server/trials/desk-settings";

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
    prospect?: string;
    quote?: string;
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

  const [filled, payLink] = await Promise.all([
    fillMissingOpportunityEmail(organization.id, result.data.id),
    getDeskPayLink(organization.id),
  ]);
  const prospect = presentLiveDeskOpportunity(organization, {
    ...result.data,
    contactEmail: filled.email ?? result.data.contactEmail,
  });

  return (
    <LionsDenBoardScreen board="prospects" workspace={workspace}>
      <LionsDenProspectDetail
        backHref={lionsDenHref(
          "/client/prospects",
          workspace.previewOrgSlug || undefined,
          workspace.selectedWorkspaceSlug || undefined,
        )}
        fromEmail={workspace.user.email ?? ""}
        notice={query?.prospect}
        businessName={organization.name}
        openQuoteId={query?.quote}
        payLink={payLink}
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        prospect={prospect}
        spanish={language === "es"}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
      <ClientProfileForm
        metadata={result.data.metadata}
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        recordId={result.data.id}
        recordTable="opportunity"
        returnPath={`/client/prospects/${result.data.id}`}
        spanish={language === "es"}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
      <LinkedNotesPanel
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        record={{ kind: noteRecordKindForStage(result.data.stage), id: result.data.id }}
        recordName={prospect.name}
        returnPath={`/client/prospects/${result.data.id}`}
        spanish={language === "es"}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
    </LionsDenBoardScreen>
  );
}
