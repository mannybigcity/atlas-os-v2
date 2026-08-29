import Link from "next/link";
import { createSisPartyEvent } from "@/server/sis-workspace/actions";
import type { SisDashboardData } from "@/server/sis-workspace/queries";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { HunterReviewItem } from "@/server/hunter/review";
import type { ContentDraft } from "@/server/content-studio/queries";
import { lionsDenHref } from "@/lib/lions-den/client-hub";

type LionsDenOverviewProps = {
  organizationName: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
  sisDashboard?: SisDashboardData | null;
  prospects: OrganizationOpportunity[];
  reviewPile: HunterReviewItem[];
  drafts: ContentDraft[];
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function LionsDenOverview({
  organizationName,
  previewOrgSlug,
  workspaceSlug,
  spanish,
  sisDashboard,
  prospects,
  reviewPile,
  drafts,
}: LionsDenOverviewProps) {
  const href = (path: string) => lionsDenHref(path, previewOrgSlug, workspaceSlug);
  const partyEvents = sisDashboard?.partyEvents ?? [];
  const hasAnything =
    prospects.length > 0 ||
    reviewPile.length > 0 ||
    drafts.length > 0 ||
    partyEvents.length > 0;

  return (
    <div className="space-y-5">
      <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f5b932]">
          {spanish ? "The Lion’s Den" : "The Lion’s Den"}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em] text-[#071b42]">
          {organizationName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Un centro de operaciones. HUNTER encuentra prospectos locales. Tú aceptas antes de que el vendedor llame. MICAH prepara borradores para descargar. ATLAS es personal, no un closer."
            : "A working operations hub. HUNTER finds local prospects. You accept before the salesman calls. MICAH prepares drafts to download. ATLAS is staff, not a closer."}
        </p>
      </section>

      {!hasAnything ? (
        <section className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "El escritorio está listo." : "The desk is open."}</p>
          <p className="mt-2">
            {spanish
              ? "Empieza en HUNTER cuando quieras hallazgos locales, o anota la primera consulta de fiesta. Nadie se contacta hasta que aceptes un prospecto."
              : "Start in HUNTER when you want local finds, or take the first party inquiry. Nobody is contacted until you accept a prospect."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" href={href("/client/hunter")}>
              HUNTER
            </Link>
            <Link className="rounded-full border border-[#071b42] bg-white px-4 py-2 text-sm font-semibold text-[#071b42]" href={href("/client/prospects")}>
              {spanish ? "Prospectos" : "Prospects"}
            </Link>
          </div>
        </section>
      ) : null}

      {sisDashboard ? (
        <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
                {spanish ? "Fiestas SIS" : "SIS parties"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
                {spanish ? "Pipeline de fiestas" : "Party pipeline"}
              </h3>
            </div>
            <p className="text-xs text-[#5c6578]">
              {partyEvents.length === 0
                ? spanish
                  ? "Ninguna fiesta en el tablero."
                  : "No parties on the board."
                : `${partyEvents.length} ${spanish ? "en el tablero" : "on the board"}`}
            </p>
          </div>
          {partyEvents.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[#d5d0c4] bg-[#fbfaf4] p-4 text-sm leading-6 text-[#5c6578]">
              {spanish
                ? "No hay consultas de fiesta en el tablero. Agrega la primera abajo."
                : "No party inquiries on the board. Add the first one below."}
            </p>
          ) : (
            <div className="mt-4 divide-y divide-[#ece7d8]">
              {partyEvents.slice(0, 8).map((event) => (
                <Link
                  className="flex flex-col gap-1 py-3 transition hover:text-[#071b42] sm:flex-row sm:items-center sm:justify-between"
                  href={`/client/sis/party/${event.id}`}
                  key={event.id}
                >
                  <span className="font-semibold text-[#071b42]">{event.hostName}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[#5c6578]">
                    {event.stage.replaceAll("_", " ")}
                    {event.partyStartsAt ? ` · ${formatDate(event.partyStartsAt)}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <form action={createSisPartyEvent} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input aria-label="Host name" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm" name="hostName" placeholder={spanish ? "Nombre del anfitrión" : "Host name"} required />
            <input aria-label="Phone" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm" name="phone" placeholder={spanish ? "Teléfono" : "Phone"} />
            <input aria-label="Email" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm" name="email" placeholder="Email" type="email" />
            <input aria-label="Guest count" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm" min="1" name="guestCount" placeholder={spanish ? "Invitados" : "Guest count"} type="number" />
            <input aria-label="Next action" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm md:col-span-2" name="nextAction" placeholder={spanish ? "Próxima acción" : "Required next action"} required />
            <input aria-label="Next action due date" className="rounded-xl border border-[#d5d0c4] px-3 py-2 text-sm" name="nextActionDue" required type="date" />
            <button className="rounded-xl bg-[#071b42] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2b63]" type="submit">
              {spanish ? "Agregar consulta" : "Add party inquiry"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <BoardCard
          href={href("/client/hunter")}
          kicker="HUNTER"
          title={spanish ? "Pila de revisión" : "Review pile"}
          body={
            reviewPile.length === 0
              ? spanish
                ? "La pila de revisión está vacía. Busca negocios locales cuando quieras. No se contacta a nadie."
                : "The review pile is empty. Search local businesses when you are ready. Nobody is contacted."
              : spanish
                ? `${reviewPile.length} hallazgos esperando tu aceptación.`
                : `${reviewPile.length} finds waiting for you to accept.`
          }
        />
        <BoardCard
          href={href("/client/prospects")}
          kicker={spanish ? "Prospectos" : "Prospects"}
          title={spanish ? "Listos para llamar" : "Ready to call"}
          body={
            prospects.length === 0
              ? spanish
                ? "No hay prospectos aceptados en la lista de llamadas. Acepta uno desde HUNTER cuando esté listo."
                : "No accepted prospects on the call list. Accept one from HUNTER when you are ready."
              : spanish
                ? `${prospects.length} prospectos aceptados. El vendedor puede llamar.`
                : `${prospects.length} accepted prospects. The salesman can call.`
          }
        />
        <BoardCard
          href={href("/client/micah")}
          kicker="MICAH"
          title={spanish ? "Galería de borradores" : "Draft gallery"}
          body={
            drafts.length === 0
              ? spanish
                ? "No hay borradores en espera. MICAH guarda aquí los archivos para que los descargues."
                : "No drafts waiting. MICAH will hold files here for you to download."
              : spanish
                ? `${drafts.length} borradores listos para descargar y publicar tú mismo.`
                : `${drafts.length} drafts ready to download and post yourself.`
          }
        />
      </section>
    </div>
  );
}

function BoardCard({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 transition hover:border-[#071b42]" href={href}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">{kicker}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#071b42]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#33415c]">{body}</p>
    </Link>
  );
}
