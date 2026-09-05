import type { Metadata } from "next";
import { ClientMicahIntake } from "@/components/client-micah-intake";
import { ClientContentStudio } from "@/components/client-content-studio";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import {
  isAfeCrmDemoOrganization,
  isQTimeWorkspaceSlug,
} from "@/lib/client-portal/identity";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getClientAiRequests } from "@/server/client-ai/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "MICAH | The Lion’s Den" : "MICAH | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type MicahPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function MicahPage({ searchParams }: MicahPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
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
  const aiRequests = primaryOrganization
    ? await getClientAiRequests(primaryOrganization.id, 6)
    : null;

  const board = (
    <div className="space-y-5">
      {studio?.setupRequired ? (
        <div className="rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish ? "MICAH está preparando este espacio de trabajo." : "MICAH is preparing this workspace."}
        </div>
      ) : null}
      {!primaryOrganization ? (
        <div className="rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish ? "Todavía no hay un espacio de trabajo de organización asignado a esta cuenta." : "No organization workspace is assigned to this account yet."}
        </div>
      ) : null}
      {studio && !studio.setupRequired && primaryOrganization ? (
        <ClientContentStudio
          canReview={canEditBusinessProfile}
          demoDesk={isAfeCrmDemoOrganization(primaryOrganization)}
          organizationId={primaryOrganization.id}
          organizationName={primaryOrganization.name}
          studio={studio.data}
        />
      ) : null}
    </div>
  );

  if (isQTimeWorkspaceSlug(primaryOrganization?.slug)) {
    return (
      <ClientWorkspaceScreen
        backHref={clientWorkspaceHref("/client", previewOrgSlug)}
        description={spanish
          ? "El Estudio de Contenido prepara imágenes sociales, textos, direcciones de campaña y borradores para revisión antes de publicar cualquier cosa."
          : "Content Studio prepares social images, captions, campaign directions, and post drafts for review before anything goes public."}
        eyebrow={spanish ? "Estudio de Contenido" : "Content Studio"}
        organizationName={primaryOrganization?.name}
        previewMode={isClientPreview}
      >
        {studio && !studio.setupRequired && primaryOrganization ? (
          <div className="space-y-5">
            <ClientMicahIntake
              organizationId={primaryOrganization.id}
              previewMode={isClientPreview}
              recentRequests={
                aiRequests && !aiRequests.setupRequired ? aiRequests.data : []
              }
            />
            {board}
          </div>
        ) : (
          board
        )}
      </ClientWorkspaceScreen>
    );
  }

  return (
    <LionsDenBoardScreen board="micah" workspace={workspace}>
      {board}
    </LionsDenBoardScreen>
  );
}
