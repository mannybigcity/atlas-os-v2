import { formatDateTime } from "@/lib/format";
import type {
  OpportunityRole,
  OpportunityStage,
  OrganizationOpportunityPipeline,
} from "@/server/opportunities/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientOpportunityPipelineProps = {
  pipeline: OrganizationOpportunityPipeline;
};

function label(value: string, spanish: boolean) {
  if (!spanish) return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    contacted: "contactado",
    follow_up_queued: "seguimiento en cola",
    needs_client_input: "requiere información del cliente",
    qualified: "calificado",
    ready_for_follow_up: "listo para seguimiento",
    researching: "en investigación",
    responded: "respondió",
    won: "ganado",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function stageClasses(stage: OpportunityStage) {
  if (["ready_for_follow_up", "follow_up_queued", "responded", "won"].includes(stage)) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (stage === "needs_client_input") {
    return "bg-amber-100 text-amber-800";
  }

  if (["contacted", "qualified"].includes(stage)) {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-slate-100 text-slate-700";
}

function roleLabel(role: OpportunityRole, spanish = false) {
  if (role === "hunter") return "HUNTER";
  if (role === "david") return "DAVID";
  if (role === "atlas") return "ATLAS";
  if (role === "micah") return "MICAH";
  if (role === "client") return spanish ? "Cliente" : "Client";
  return spanish ? "Manual" : "Manual";
}

function roleClasses(role: OpportunityRole) {
  if (role === "hunter") return "bg-amber-100 text-amber-800";
  if (role === "david") return "bg-indigo-100 text-indigo-800";
  if (role === "atlas") return "bg-blue-100 text-blue-800";
  if (role === "micah") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function formatDate(value: string | null, spanish: boolean) {
  if (!value) return spanish ? "Sin fecha límite" : "No due date";

  return new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
}

export async function ClientOpportunityPipeline({
  pipeline,
}: ClientOpportunityPipelineProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const followUpCount = pipeline.opportunities.filter((opportunity) =>
    ["ready_for_follow_up", "follow_up_queued"].includes(opportunity.stage),
  ).length;
  const needsInputCount = pipeline.opportunities.filter(
    (opportunity) => opportunity.stage === "needs_client_input",
  ).length;

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-white p-5"
      id="hunter-pipeline"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
            {spanish ? "Pipeline de Oportunidades HUNTER" : "HUNTER Opportunity Pipeline"}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {spanish ? "Prospectos, patrocinadores y objetivos de seguimiento" : <>Prospects, sponsors &amp; follow-up targets</>}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {spanish
              ? "HUNTER encuentra oportunidades útiles. DAVID mantiene visible el próximo seguimiento. No se contacta a nadie automáticamente desde esta vista previa."
              : "HUNTER finds useful opportunities. DAVID keeps the next follow-up visible. Nothing is contacted automatically from this preview."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            {pipeline.opportunities.length} {spanish ? "objetivos encontrados" : "targets found"}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-800">
            {followUpCount} {spanish ? "listos para seguimiento" : "follow-up ready"}
          </span>
          {needsInputCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 ring-1 ring-amber-200">
              {needsInputCount} {spanish ? "requieren información de QTime" : "need QTime input"}
            </span>
          ) : null}
        </div>
      </div>

      {pipeline.opportunities.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          {spanish ? "Todavía no se han publicado oportunidades de HUNTER." : "No HUNTER opportunities have been published yet."}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {pipeline.opportunities.map((opportunity) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              key={opportunity.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    {label(opportunity.opportunityType, spanish)}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">
                    {opportunity.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${stageClasses(opportunity.stage)}`}
                  >
                    {label(opportunity.stage, spanish)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${roleClasses(opportunity.ownerRole)}`}
                  >
                    {roleLabel(opportunity.ownerRole, spanish)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[0.45fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {spanish ? "Puntuación de afinidad" : "Fit score"}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {opportunity.fitScore}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{spanish ? "de 100" : "out of 100"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {spanish ? "Próxima acción" : "Next action"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {opportunity.nextAction ?? (spanish ? "Todavía no se ha publicado una próxima acción." : "No next action published yet.")}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {spanish ? "Fecha límite" : "Due"} {formatDate(opportunity.nextActionDue, spanish)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {spanish ? "Investigación de HUNTER" : "HUNTER research"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {opportunity.researchSummary}
                </p>
                {opportunity.fitReason ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-800">{spanish ? "Por qué encaja: " : "Why it fits: "}</span>
                    {opportunity.fitReason}
                  </p>
                ) : null}
              </div>

              {(opportunity.contactName ||
                opportunity.contactEmail ||
                opportunity.contactPhone ||
                opportunity.contactSocial ||
                opportunity.sourceLabel ||
                opportunity.sourceUrl) ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  {opportunity.sourceLabel ? (
                    <p>
                      <span className="font-semibold text-slate-800">{spanish ? "Fuente: " : "Source: "}</span>
                      {opportunity.sourceUrl ? (
                        <a
                          className="text-blue-700 underline-offset-4 hover:underline"
                          href={opportunity.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {opportunity.sourceLabel}
                        </a>
                      ) : (
                        opportunity.sourceLabel
                      )}
                    </p>
                  ) : null}
                  {opportunity.contactName ? <p>{spanish ? "Contacto" : "Contact"}: {opportunity.contactName}</p> : null}
                  {opportunity.contactEmail ? <p>{spanish ? "Correo" : "Email"}: {opportunity.contactEmail}</p> : null}
                  {opportunity.contactPhone ? <p>{spanish ? "Teléfono" : "Phone"}: {opportunity.contactPhone}</p> : null}
                  {opportunity.contactSocial ? <p>{spanish ? "Red social" : "Social"}: {opportunity.contactSocial}</p> : null}
                </div>
              ) : null}

              {opportunity.events.length > 0 ? (
                <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    {spanish ? "Actividad" : "Activity"} ({opportunity.events.length})
                  </summary>
                  <div className="mt-3 space-y-3">
                    {opportunity.events.map((event) => (
                      <div className="text-sm leading-6 text-slate-600" key={event.id}>
                        <p className="font-semibold text-slate-800">
                          {label(event.eventType, spanish)} · {roleLabel(event.actorRole, spanish)}
                        </p>
                        <p>{event.summary}</p>
                        {event.body ? <p className="mt-1">{event.body}</p> : null}
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
