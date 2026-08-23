import type { Metadata } from "next";
import { ClientMicahIntake } from "@/components/client-micah-intake";
import { ClientContentStudio } from "@/components/client-content-studio";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
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
    title: language === "es" ? "Estudio de Contenido | Espacio del Cliente" : "Content Studio | Client Workspace",
    robots: { index: false, follow: false },
  };
}

type MicahPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
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
      {studio?.setupRequired ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
          {spanish ? "El Estudio de Contenido está preparando este espacio de trabajo." : "Content Studio is preparing this workspace."}
        </div>
      ) : null}

      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          {spanish ? "Todavía no hay un espacio de trabajo de organización asignado a esta cuenta." : "No organization workspace is assigned to this account yet."}
        </div>
      ) : null}

      {studio && !studio.setupRequired && primaryOrganization ? (
        <div className="space-y-5">
          <ClientMicahIntake
            organizationId={primaryOrganization.id}
            previewMode={isClientPreview}
            recentRequests={
              aiRequests && !aiRequests.setupRequired ? aiRequests.data : []
            }
          />

          <ClientContentStudio
            canReview={canEditBusinessProfile}
            organizationId={primaryOrganization.id}
            studio={studio.data}
          />
        </div>
      ) : null}
    </ClientWorkspaceScreen>
  );
}
