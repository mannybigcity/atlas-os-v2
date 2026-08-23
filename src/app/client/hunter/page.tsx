import type { Metadata } from "next";
import { ClientAiConsole } from "@/components/client-ai-console";
import { ClientOpportunityPipeline } from "@/components/client-opportunity-pipeline";
import { HunterSearch } from "@/components/hunter-search";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { defaultClientAiDailyUsage, getClientAiDailyUsage, getClientAiRequests } from "@/server/client-ai/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "Investigación de Crecimiento | Espacio del Cliente" : "Growth Research | Client Workspace",
    robots: { index: false, follow: false },
  };
}

type HunterPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
  }>;
};

export default async function HunterPage({ searchParams }: HunterPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext("/client/hunter", params);
  const { isClientPreview, previewOrgSlug, primaryOrganization } = workspace;
  const aiRequests = primaryOrganization
    ? await getClientAiRequests(primaryOrganization.id, 8)
    : null;
  const aiUsage = primaryOrganization
    ? await getClientAiDailyUsage(primaryOrganization.id)
    : null;
  const pipeline = primaryOrganization
    ? await getOpportunityPipeline(primaryOrganization.id)
    : null;

  return (
    <ClientWorkspaceScreen
      backHref={clientWorkspaceHref("/client", previewOrgSlug)}
      description={spanish
        ? "La investigación de crecimiento rastrea leads, patrocinadores, socios, lugares y oportunidades prometedoras antes de que pasen a seguimiento."
        : "Growth research tracks leads, sponsors, partners, venues, and warm opportunities before they become follow-up."}
      eyebrow={spanish ? "Investigación de crecimiento" : "Growth research"}
      organizationName={primaryOrganization?.name}
      previewMode={isClientPreview}
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {spanish ? "Centro de mando de Hunter" : "Hunter command slot"}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {spanish ? "Pregúntale a Hunter antes de buscar" : "Ask Hunter before you search"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {spanish
                ? "Usa este cuadro para preguntas de prospección, segmentación por ubicación o evaluación de afinidad. Se limita a la investigación de crecimiento y no contacta a nadie automáticamente."
                : "Use this box for prospecting questions, location targeting, or fit checks. It stays scoped to growth research and does not contact anyone automatically."}
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            {spanish ? "Google Places conectado" : "Google Places connected"}
          </span>
        </div>

        {primaryOrganization && aiRequests ? (
          <div className="mt-5">
            <ClientAiConsole
              defaultRole="hunter"
              organizationId={primaryOrganization.id}
              previewMode={isClientPreview}
              requests={aiRequests.setupRequired ? [] : aiRequests.data}
              dailyUsage={aiUsage && !aiUsage.setupRequired ? aiUsage.data : defaultClientAiDailyUsage()}
            />
          </div>
        ) : null}
      </section>

      <HunterSearch />

      {pipeline?.setupRequired ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          {spanish
            ? "La investigación de crecimiento está preparando el pipeline de oportunidades para este espacio de trabajo."
            : "Growth research is preparing the opportunity pipeline for this workspace."}
        </div>
      ) : null}

      {!primaryOrganization ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          {spanish ? "Todavía no hay un espacio de trabajo de organización asignado a esta cuenta." : "No organization workspace is assigned to this account yet."}
        </div>
      ) : null}

      {pipeline && !pipeline.setupRequired ? (
        <ClientOpportunityPipeline pipeline={pipeline.data} />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
