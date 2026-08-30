import Link from "next/link";
import { createSisPartyEvent } from "@/server/sis-workspace/actions";
import type { SisDashboardData } from "@/server/sis-workspace/queries";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { HunterReviewItem } from "@/server/hunter/review";
import type { ContentDraft } from "@/server/content-studio/queries";
import type { OrganizationNote } from "@/server/notes/queries";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { bucketFollowUpQueues, type DeskFollowUpItem } from "@/lib/lions-den/desk-queue";
import { LionsDenCalendarBoard } from "@/components/lions-den/lions-den-calendar";
import { LionsDenNotesBoard } from "@/components/lions-den/lions-den-notes";

type LionsDenOverviewProps = {
  organizationId?: string;
  organizationName: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
  canCreateNotes: boolean;
  sisDashboard?: SisDashboardData | null;
  prospects: OrganizationOpportunity[];
  reviewPile: HunterReviewItem[];
  drafts: ContentDraft[];
  notes: OrganizationNote[];
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function LionsDenOverview({
  organizationId,
  organizationName,
  previewOrgSlug,
  workspaceSlug,
  spanish,
  canCreateNotes,
  sisDashboard,
  prospects,
  reviewPile,
  drafts,
  notes,
}: LionsDenOverviewProps) {
  const href = (path: string) => lionsDenHref(path, previewOrgSlug, workspaceSlug);
  const partyEvents = sisDashboard?.partyEvents ?? [];
  const inboxTasks = sisDashboard?.inboxTasks ?? [];
  const followUpItems: DeskFollowUpItem[] = [
    ...prospects
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `prospect-${item.id}`,
        title: item.name,
        detail: item.nextAction,
        dueAt: item.nextActionDue!,
        href: href("/client/prospects"),
      })),
    ...partyEvents
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `party-${item.id}`,
        title: item.hostName,
        detail: item.nextAction,
        dueAt: item.nextActionDue!,
        href: `/client/sis/party/${item.id}`,
      })),
    ...inboxTasks
      .filter((item) => item.dueAt)
      .map((item) => ({
        id: `task-${item.id}`,
        title: item.title,
        detail: item.party?.hostName ?? (spanish ? "Fiesta" : "Party"),
        dueAt: item.dueAt!,
        href: href("/client/david"),
      })),
  ];
  const queues = bucketFollowUpQueues(followUpItems);
  const dueTodayCount = queues.overdue.length + queues.today.length;
  const dueTodayItems = [...queues.overdue, ...queues.today];

  return (
    <div className="space-y-5">
      <section className="border-b border-[#d8c27a] pb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a6a12]">
          {organizationName}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-[-0.05em] text-[#071b42] sm:text-4xl">
          {spanish ? "La fortuna está en el seguimiento." : "The fortune is in the follow-up."}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Escritorio de trabajo: seguimiento de hoy y mañana, calendario, notas y la lista de llamadas. ATLAS responde a la derecha. Nadie se contacta sin tu aprobación."
            : "Working desk: follow-up for today and tomorrow, calendar, notes, and the call list. ATLAS answers on the right. Nobody is contacted without your approval."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard
          href={href("/client/prospects")}
          label={spanish ? "Prospectos" : "Prospects"}
          note={spanish ? "Lista de llamadas aceptada." : "Accepted call list."}
          value={prospects.length}
        />
        <CountCard
          href={href("/client/david")}
          label={spanish ? "Para hoy" : "Due today"}
          note={
            queues.overdue.length > 0
              ? spanish
                ? `${queues.overdue.length} atrasados.`
                : `${queues.overdue.length} overdue.`
              : spanish
                ? "Necesita atención ahora."
                : "Needs attention now."
          }
          value={dueTodayCount}
        />
        <CountCard
          href={href("/client/notes")}
          label={spanish ? "Notas" : "Notes"}
          note={spanish ? "Solo este espacio." : "This workspace only."}
          value={notes.length}
        />
        <CountCard
          href={href("/client/hunter")}
          label={spanish ? "Revisión HUNTER" : "HUNTER review"}
          note={spanish ? "Esperando tu aceptación." : "Waiting for you to accept."}
          value={reviewPile.length}
        />
      </section>

      {sisDashboard ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <CountCard
            href={href("/client")}
            label={spanish ? "Leads SIS" : "SIS leads"}
            note={spanish ? "Consultas en este espacio." : "Inquiries in this workspace."}
            value={sisDashboard.counts.leads}
          />
          <CountCard
            href={href("/client")}
            label={spanish ? "Cotizaciones" : "Quotes"}
            note={spanish ? "Cotizaciones DEMO o reales." : "DEMO or live quotes."}
            value={sisDashboard.counts.quotes}
          />
          <CountCard
            href={href("/client")}
            label={spanish ? "Pedidos" : "Orders"}
            note={spanish ? "Pedidos en el escritorio." : "Orders on the desk."}
            value={sisDashboard.counts.orders}
          />
        </section>
      ) : null}

      <section className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
              {spanish ? "Fechas de seguimiento" : "Follow-up dates"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
              {spanish ? "Hoy y mañana" : "Today and tomorrow"}
            </h3>
          </div>
          <Link className="text-sm font-semibold text-[#071b42] underline" href={href("/client/david")}>
            {spanish ? "Abrir seguimiento" : "Open follow-up"}
          </Link>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <QueueColumn
            emptyText={spanish ? "Cola despejada." : "Queue clear."}
            items={dueTodayItems}
            label={spanish ? "Hoy" : "Today"}
            overdueIds={new Set(queues.overdue.map((item) => item.id))}
            spanish={spanish}
          />
          <QueueColumn
            emptyText={spanish ? "Nada en cola para mañana." : "Nothing queued for tomorrow."}
            items={queues.tomorrow}
            label={spanish ? "Mañana" : "Tomorrow"}
            spanish={spanish}
          />
        </div>
        {queues.later.length > 0 ? (
          <div className="mt-4 border-t border-[#ece7d8] pt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
              {spanish ? "Más adelante" : "Later"}
            </p>
            <div className="mt-2 divide-y divide-[#ece7d8]">
              {queues.later.slice(0, 4).map((item) => (
                <QueueRow item={item} key={item.id} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        {organizationId ? (
          <LionsDenCalendarBoard
            compact
            organizationId={organizationId}
            partyEvents={partyEvents}
            prospects={prospects}
            spanish={spanish}
          />
        ) : (
          <EmptyDeskCard
            body={spanish ? "Asigna un espacio de trabajo para ver fechas." : "Assign a workspace to see dates."}
            title={spanish ? "Calendario no disponible" : "Calendar unavailable"}
          />
        )}
        {organizationId ? (
          <LionsDenNotesBoard
            canCreate={canCreateNotes}
            compact
            notes={notes}
            organizationId={organizationId}
            returnTo={href("/client")}
            spanish={spanish}
          />
        ) : (
          <EmptyDeskCard
            body={spanish ? "Asigna un espacio de trabajo para escribir notas." : "Assign a workspace to write notes."}
            title={spanish ? "Notas no disponibles" : "Notes unavailable"}
          />
        )}
      </section>

      <section className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
              {spanish ? "Prospectos" : "Prospects"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
              {spanish ? "Lista de llamadas" : "Call list"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#33415c]">
              {spanish
                ? "Solo negocios que ya aceptaste. Atlas no llama, escribe ni envía SMS."
                : "Only businesses you already accepted. Atlas does not call, email, or text."}
            </p>
          </div>
          <Link className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" href={href("/client/prospects")}>
            {spanish ? "Abrir prospectos" : "Open prospects"}
          </Link>
        </div>

        {prospects.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
            {spanish
              ? "La lista de llamadas está vacía. Acepta un hallazgo de HUNTER cuando esté listo. No se inventan contactos aquí."
              : "The call list is empty. Accept a HUNTER find when you are ready. No contacts are invented here."}
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#ece7d8]">
            {prospects.slice(0, 8).map((prospect) => (
              <article className="py-3" key={prospect.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-[#071b42]">{prospect.name}</h4>
                    {prospect.contactName || prospect.contactPhone ? (
                      <p className="mt-1 text-sm text-[#071b42]">
                        {[prospect.contactName, prospect.contactPhone].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {prospect.nextAction ? (
                      <p className="mt-1 text-sm text-[#33415c]">{prospect.nextAction}</p>
                    ) : null}
                  </div>
                  <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                    {prospect.stage.replaceAll("_", " ")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {sisDashboard ? (
        <section className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
                {spanish ? "Fiestas SIS" : "SIS parties"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
                {spanish ? "Consultas de fiesta" : "Party inquiries"}
              </h3>
            </div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#5c6578]">
              {partyEvents.length === 0
                ? spanish
                  ? "Ninguna fiesta en el tablero."
                  : "No parties on the board."
                : `${partyEvents.length} ${spanish ? "en el tablero" : "on the board"}`}
            </p>
          </div>
          {partyEvents.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#d5d0c4] bg-[#fbfaf4] p-4 text-sm leading-6 text-[#5c6578]">
              {spanish
                ? "No hay consultas de fiesta. Agrega la primera abajo."
                : "No party inquiries. Add the first one below."}
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
            <button className="rounded-xl bg-[#f5b932] px-4 py-2 text-sm font-semibold text-[#071b42] hover:bg-[#ffd266]" type="submit">
              {spanish ? "Agregar consulta" : "Add party inquiry"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        <Link className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-4" href={href("/client/hunter")}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">HUNTER</p>
          <p className="mt-2 text-sm leading-6 text-[#33415c]">
            {reviewPile.length === 0
              ? spanish
                ? "La pila de revisión está vacía. Nadie se contacta desde aquí."
                : "The review pile is empty. Nobody is contacted from here."
              : spanish
                ? `${reviewPile.length} hallazgos esperando tu aceptación.`
                : `${reviewPile.length} finds waiting for you to accept.`}
          </p>
        </Link>
        <Link className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-4" href={href("/client/micah")}>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">MICAH</p>
          <p className="mt-2 text-sm leading-6 text-[#33415c]">
            {drafts.length === 0
              ? spanish
                ? "No hay borradores para descargar."
                : "No drafts to download."
              : spanish
                ? `${drafts.length} borradores listos para descargar y publicar tú mismo.`
                : `${drafts.length} drafts ready to download and post yourself.`}
          </p>
        </Link>
      </section>
    </div>
  );
}

function CountCard({
  href,
  label,
  note,
  value,
}: {
  href: string;
  label: string;
  note: string;
  value: number;
}) {
  return (
    <Link className="rounded-[1.1rem] border border-[#d5d0c4] bg-white px-4 py-4" href={href}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5c6578]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#071b42]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5c6578]">{note}</p>
    </Link>
  );
}

function QueueColumn({
  emptyText,
  items,
  label,
  overdueIds,
  spanish,
}: {
  emptyText: string;
  items: DeskFollowUpItem[];
  label: string;
  overdueIds?: Set<string>;
  spanish: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#ece7d8] bg-[#fbfaf4] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-semibold text-[#071b42]">{label}</h4>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c6578]">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-[#5c6578]">{emptyText}</p>
      ) : (
        <div className="mt-3 divide-y divide-[#ece7d8]">
          {items.map((item) => (
            <QueueRow item={item} key={item.id} overdue={overdueIds?.has(item.id)} overdueLabel={spanish ? "Atrasado" : "Overdue"} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  overdue,
  overdueLabel,
}: {
  item: DeskFollowUpItem;
  overdue?: boolean;
  overdueLabel?: string;
}) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[#071b42]">{item.title}</p>
        {overdue ? (
          <span className="rounded-full bg-[#fff1f1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a1f1f]">
            {overdueLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? <p className="mt-1 text-sm text-[#33415c]">{item.detail}</p> : null}
    </>
  );

  if (item.href) {
    return (
      <Link className="block py-3" href={item.href}>
        {inner}
      </Link>
    );
  }

  return <div className="py-3">{inner}</div>;
}

function EmptyDeskCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.2rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5">
      <h3 className="text-lg font-semibold text-[#071b42]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#33415c]">{body}</p>
    </div>
  );
}
