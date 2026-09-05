import type { Metadata } from "next";
import { ClientAiConsole } from "@/components/client-ai-console";
import { ClientOpportunityPipeline } from "@/components/client-opportunity-pipeline";
import { HunterSearch } from "@/components/hunter-search";
import { HunterReviewPile } from "@/components/lions-den/hunter-review-pile";
import { ClientWorkspaceScreen } from "@/components/client-workspace-screen";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { isQTimeWorkspaceSlug } from "@/lib/client-portal/identity";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { defaultClientAiDailyUsage, getClientAiDailyUsage, getClientAiRequests } from "@/server/client-ai/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getHunterReviewPile } from "@/server/hunter/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "HUNTER | The Lion’s Den" : "HUNTER | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type HunterPageProps = {
  searchParams?: Promise<{
    hunter?: string;
    lang?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

function hunterStatusCopy(code: string | undefined, spanish: boolean) {
  const messages: Record<string, { en: string; es: string; tone: "ok" | "warn" }> = {
    accepted: { en: "That listing is now a Prospect. The salesman can call. Atlas did not contact anyone.", es: "Esa ficha ahora es un prospecto. El vendedor puede llamar. Atlas no contactó a nadie.", tone: "ok" },
    already_accepted: { en: "That listing was already accepted into Prospects. Open Prospects to call.", es: "Esa ficha ya estaba aceptada en Prospectos. Abre Prospectos para llamar.", tone: "ok" },
    dismissed: { en: "That listing was removed from the review pile.", es: "Esa ficha se quitó de la pila de revisión.", tone: "ok" },
    duplicate: { en: "A Prospect with that business name already exists. Open Prospects to work that call.", es: "Ya existe un prospecto con ese nombre. Abre Prospectos para esa llamada.", tone: "warn" },
    accept_failed: { en: "The listing could not be accepted. Try Accept again from the REVIEW PILE.", es: "No se pudo aceptar la ficha. Intenta Aceptar otra vez desde la PILA DE REVISIÓN.", tone: "warn" },
    dismiss_failed: { en: "The listing could not be dismissed.", es: "No se pudo descartar la ficha.", tone: "warn" },
    missing: { en: "That review item was not found.", es: "No se encontró ese hallazgo.", tone: "warn" },
    invalid: { en: "That review action was not valid.", es: "Esa acción de revisión no fue válida.", tone: "warn" },
    protected: { en: "SIS Custom Creations is protected. HUNTER cannot change the company name, slug, or identity.", es: "SIS Custom Creations está protegida. HUNTER no puede cambiar el nombre, identificador ni la identidad de la empresa.", tone: "warn" },
  };
  return code ? messages[code] ?? null : null;
}

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
  const reviewPile = primaryOrganization
    ? await getHunterReviewPile(primaryOrganization.id)
    : null;
  const status = hunterStatusCopy(params?.hunter, spanish);
  const prospectsHref = clientWorkspaceHref("/client/prospects", previewOrgSlug);
  const acceptedCount = reviewPile?.acceptedCount ?? 0;
  const showProspectsLink = params?.hunter === "accepted" || params?.hunter === "already_accepted" || params?.hunter === "duplicate";

  const board = (
    <div className="space-y-5">
      {status ? (
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${status.tone === "ok" ? "border-[#d8c27a] bg-[#fff8e6] text-[#071b42]" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {spanish ? status.es : status.en}
          {showProspectsLink ? (
            <p className="mt-2">
              <a className="font-semibold underline" href={prospectsHref}>
                {spanish ? "Abrir Prospectos" : "Open Prospects"}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <HunterSearch organizationId={primaryOrganization?.id} prospectsHref={prospectsHref} />

      {primaryOrganization ? (
        <HunterReviewPile
          acceptedCount={acceptedCount}
          items={reviewPile && !reviewPile.setupRequired ? reviewPile.data : []}
          organizationId={primaryOrganization.id}
          prospectsHref={prospectsHref}
          setupRequired={Boolean(reviewPile?.setupRequired)}
          spanish={spanish}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish ? "Todavía no hay un espacio de trabajo de organización asignado a esta cuenta." : "No organization workspace is assigned to this account yet."}
        </div>
      )}
    </div>
  );

  if (!isQTimeWorkspaceSlug(primaryOrganization?.slug)) {
    return (
      <LionsDenBoardScreen board="hunter" workspace={workspace}>
        {board}
      </LionsDenBoardScreen>
    );
  }

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
      {board}
      {pipeline && !pipeline.setupRequired ? (
        <ClientOpportunityPipeline pipeline={pipeline.data} />
      ) : null}
    </ClientWorkspaceScreen>
  );
}
