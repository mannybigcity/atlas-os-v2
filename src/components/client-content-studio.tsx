import { formatDateTime } from "@/lib/format";
import { reviewContentDraft } from "@/server/content-studio/actions";
import type {
  ContentDraft,
  ContentStudio,
} from "@/server/content-studio/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientContentStudioProps = {
  organizationId: string;
  canReview: boolean;
  studio: ContentStudio;
};

function label(value: string, spanish: boolean) {
  if (!spanish) return value.replaceAll("_", " ");

  const labels: Record<string, string> = {
    approved: "aprobado",
    changes_requested: "cambios solicitados",
    facebook: "Facebook",
    instagram: "Instagram",
    published: "publicado",
    ready_for_review: "listo para revisión",
    review_created: "revisión creada",
    review_updated: "revisión actualizada",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function imageSource(draft: ContentDraft) {
  if (draft.imageUrl) return draft.imageUrl;
  if (draft.imageSvg) return svgDataUrl(draft.imageSvg);
  return null;
}

function statusClasses(status: ContentDraft["status"]) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "changes_requested") return "bg-amber-100 text-amber-800";
  if (status === "published") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

export async function ClientContentStudio({
  organizationId,
  canReview,
  studio,
}: ClientContentStudioProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const reviewCount = studio.drafts.filter(
    (draft) => draft.status === "ready_for_review",
  ).length;

  return (
    <section
      className="rounded-2xl border border-blue-200 bg-white p-5"
      id="content-studio"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            {spanish ? "Estudio de Contenido MICAH" : "MICAH Content Studio"}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {spanish ? "Imágenes sociales y borradores de publicaciones" : <>Social images &amp; post drafts</>}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {spanish
              ? "Atlas prepara el trabajo aquí. No se publica nada hasta que lo revises y apruebes."
              : "Atlas prepares the work here. Nothing is posted until you review and approve it."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            {reviewCount} {spanish ? "en espera de revisión" : "awaiting review"}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
            {studio.automation?.enabled
              ? spanish ? "Estudio diario activo" : "Daily studio active"
              : spanish ? "Estudio manual" : "Manual studio"}
          </span>
        </div>
      </div>

      {studio.automation?.enabled ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          {spanish
            ? `MICAH está configurado para preparar hasta ${studio.automation.dailyLimit} borradores nuevos por día para este espacio. El horario usa ${studio.automation.timezone}.`
            : `MICAH is configured to prepare up to ${studio.automation.dailyLimit} new draft per day for this workspace. The schedule uses ${studio.automation.timezone}.`}
          {studio.automation.lastSuccessfulRunAt
            ? spanish
              ? ` Última ejecución completada ${formatDateTime(studio.automation.lastSuccessfulRunAt)}.`
              : ` Last completed ${formatDateTime(studio.automation.lastSuccessfulRunAt)}.`
            : spanish
              ? " La primera ejecución automatizada está esperando el despliegue a producción."
              : " The first automated run is waiting for production deployment."}
        </div>
      ) : null}

      {studio.drafts.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          {spanish ? "Todavía no hay borradores de contenido listos." : "No content drafts are ready yet."}
        </p>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {studio.drafts.map((draft) => {
            const source = imageSource(draft);
            return (
              <article
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                id={`draft-${draft.id}`}
                key={draft.id}
              >
                {source ? (
                  <div className="bg-slate-950">
                    {/* Generated SVG is assembled by our server from escaped fields. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`${draft.campaign}: ${draft.headline}`}
                      className="aspect-square w-full object-cover"
                      src={source}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-blue-950 to-blue-700 p-8 text-center text-white">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                        {draft.campaign}
                      </p>
                      <p className="mt-4 text-3xl font-black tracking-tight">
                        {draft.headline}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {draft.campaign} · {draft.draftDate}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-slate-950">
                        {draft.title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${statusClasses(draft.status)}`}
                    >
                      {label(draft.status, spanish)}
                    </span>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    {draft.caption}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {draft.platforms.map((platform) => (
                      <span
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        key={platform}
                      >
                        {label(platform, spanish)}
                      </span>
                    ))}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {spanish ? "Preparado por" : "Prepared by"} {draft.generatedBy.toUpperCase()}
                    </span>
                  </div>

                  {source ? (
                    <a
                      className="mt-4 inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      download={`${draft.campaign.toLowerCase().replaceAll(" ", "-")}-${draft.draftDate}.${draft.imageSvg && !draft.imageUrl ? "svg" : "png"}`}
                      href={source}
                    >
                      {spanish ? "Descargar imagen" : "Download image"}
                    </a>
                  ) : null}

                  {draft.events.length > 0 ? (
                    <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                        {spanish ? "Actividad" : "Activity"} ({draft.events.length})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {draft.events.map((event) => (
                          <div className="text-sm leading-6 text-slate-600" key={event.id}>
                            <p className="font-semibold text-slate-800">
                              {label(event.eventType, spanish)} · {event.actorLabel}
                            </p>
                            {event.note ? <p>{event.note}</p> : null}
                            <p className="text-xs text-slate-500">
                              {formatDateTime(event.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  {canReview &&
                  ["ready_for_review", "changes_requested"].includes(draft.status) ? (
                    <form action={reviewContentDraft} className="mt-4 space-y-3">
                      <input name="organizationId" type="hidden" value={organizationId} />
                      <input name="draftId" type="hidden" value={draft.id} />
                      <textarea
                        className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        name="note"
                        placeholder={spanish ? "Comentarios opcionales para Atlas y MICAH" : "Optional feedback for Atlas and MICAH"}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                          name="decision"
                          type="submit"
                          value="approved"
                        >
                          {spanish ? "Aprobar borrador" : "Approve draft"}
                        </button>
                        <button
                          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          name="decision"
                          type="submit"
                          value="changes_requested"
                        >
                          {spanish ? "Solicitar cambios" : "Request changes"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
