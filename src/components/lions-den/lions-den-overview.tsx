import Link from "next/link";
import { createSisPartyEvent } from "@/server/sis-workspace/actions";
import { acceptHunterReviewItem, dismissHunterReviewItem } from "@/server/hunter/actions";
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
    <div aria-label={spanish ? `Escritorio de ${organizationName || "The Lion’s Den"}` : `${organizationName || "The Lion’s Den"} desk`} className="ld-desk">
      <section className="ld-desk-metrics grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        <MetricChip href={href("/client/prospects")} label={spanish ? "Prospectos" : "Prospects"} value={prospects.length} />
        <MetricChip href={href("/client/david")} label={spanish ? "Hoy" : "Due today"} value={dueTodayCount} />
        <MetricChip href={href("/client/notes")} label={spanish ? "Notas" : "Notes"} value={notes.length} />
        <MetricChip href={href("/client/hunter")} label={spanish ? "HUNTER" : "HUNTER"} value={reviewPile.length} />
        {sisDashboard ? (
          <>
            <MetricChip href={href("/client")} label={spanish ? "Leads SIS" : "SIS leads"} value={sisDashboard.counts.leads} />
            <MetricChip href={href("/client")} label={spanish ? "Cotiz." : "Quotes"} value={sisDashboard.counts.quotes} />
            <MetricChip href={href("/client")} label={spanish ? "Pedidos" : "Orders"} value={sisDashboard.counts.orders} />
          </>
        ) : null}
        <MetricChip href={href("/client/micah")} label="MICAH" value={drafts.length} />
      </section>

      <div className="ld-desk-pipeline">
        <section className="ld-panel">
          <div className="ld-panel-head">
            <p>HUNTER</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5c6578]">
                {reviewPile.length}
              </span>
              <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/hunter")}>
                {spanish ? "Abrir" : "Open"}
              </Link>
            </div>
          </div>
          <div className="ld-panel-body">
            {reviewPile.length === 0 ? (
              <p className="ld-empty">
                {spanish
                  ? "Nada en la pila. Busca en HUNTER. Aceptar mueve el hallazgo a Prospectos. Nadie se contacta desde aquí."
                  : "Nothing in the pile. Search in HUNTER. Accept moves a find into Prospects. Nobody is contacted from here."}
              </p>
            ) : (
              reviewPile.slice(0, 8).map((item) => (
                <article className="border-b border-[#ece7d8] py-1.5 last:border-b-0" key={item.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <h3 className="truncate text-sm font-semibold text-[#071b42]">{item.name}</h3>
                      </div>
                      {item.formattedAddress ? (
                        <p className="truncate text-[11px] text-[#5c6578]">{item.formattedAddress}</p>
                      ) : null}
                    </div>
                    {organizationId ? (
                      <div className="flex shrink-0 gap-1">
                        <form action={acceptHunterReviewItem}>
                          <input name="organizationId" type="hidden" value={organizationId} />
                          <input name="reviewItemId" type="hidden" value={item.id} />
                          <button className="rounded bg-[#071b42] px-2 py-1 text-[10px] font-semibold text-white" type="submit">
                            {spanish ? "Aceptar" : "Accept"}
                          </button>
                        </form>
                        <form action={dismissHunterReviewItem}>
                          <input name="organizationId" type="hidden" value={organizationId} />
                          <input name="reviewItemId" type="hidden" value={item.id} />
                          <button className="rounded border border-[#d5d0c4] bg-white px-2 py-1 text-[10px] font-semibold text-[#5c6578]" type="submit">
                            {spanish ? "Quitar" : "Dismiss"}
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="ld-panel">
          <div className="ld-panel-head">
            <p>{spanish ? "Prospectos" : "Prospects"}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5c6578]">
                {prospects.length}
              </span>
              <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/prospects")}>
                {spanish ? "Abrir" : "Open"}
              </Link>
            </div>
          </div>
          <div className="ld-panel-body">
            {prospects.length === 0 ? (
              <p className="ld-empty">
                {spanish
                  ? "Lista de llamadas vacía. Acepta un hallazgo de HUNTER. Atlas no llama, escribe ni envía SMS."
                  : "Call list empty. Accept a HUNTER find. Atlas does not call, email, or text."}
              </p>
            ) : (
              prospects.slice(0, 10).map((prospect) => (
                <article className="border-b border-[#ece7d8] py-1.5 last:border-b-0" key={prospect.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <h3 className="truncate text-sm font-semibold text-[#071b42]">{prospect.name}</h3>
                      </div>
                      {prospect.contactName || prospect.contactPhone ? (
                        <p className="truncate text-[11px] text-[#071b42]">
                          {[prospect.contactName, prospect.contactPhone].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {prospect.nextAction ? (
                        <p className="truncate text-[11px] text-[#33415c]">{prospect.nextAction}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#fff8e6] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#071b42]">
                      {prospect.stage.replaceAll("_", " ")}
                    </span>
                  </div>
                </article>
              ))
            )}
            {sisDashboard ? (
              <div className="mt-2 border-t border-[#ece7d8] pt-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a12]">
                  {spanish ? "Fiestas SIS" : "SIS parties"}
                </p>
                {partyEvents.length === 0 ? (
                  <p className="mt-1 text-[11px] text-[#5c6578]">
                    {spanish ? "Ninguna fiesta en el tablero." : "No parties on the board."}
                  </p>
                ) : (
                  partyEvents.slice(0, 4).map((event) => (
                    <Link className="flex items-center justify-between gap-2 py-1 text-xs" href={`/client/sis/party/${event.id}`} key={event.id}>
                      <span className="truncate font-semibold text-[#071b42]">{event.hostName}</span>
                      <span className="shrink-0 uppercase tracking-[0.08em] text-[#5c6578]">{event.stage.replaceAll("_", " ")}</span>
                    </Link>
                  ))
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-[#071b42]">
                    {spanish ? "Agregar consulta" : "Add party inquiry"}
                  </summary>
                  <form action={createSisPartyEvent} className="mt-2 grid gap-1.5">
                    <input aria-label="Host name" className="rounded-md border border-[#d5d0c4] px-2 py-1 text-xs" name="hostName" placeholder={spanish ? "Nombre del anfitrión" : "Host name"} required />
                    <input aria-label="Phone" className="rounded-md border border-[#d5d0c4] px-2 py-1 text-xs" name="phone" placeholder={spanish ? "Teléfono" : "Phone"} />
                    <input aria-label="Next action" className="rounded-md border border-[#d5d0c4] px-2 py-1 text-xs" name="nextAction" placeholder={spanish ? "Próxima acción" : "Required next action"} required />
                    <input aria-label="Next action due date" className="rounded-md border border-[#d5d0c4] px-2 py-1 text-xs" name="nextActionDue" required type="date" />
                    <button className="rounded-md bg-[#f5b932] px-2 py-1 text-xs font-semibold text-[#071b42]" type="submit">
                      {spanish ? "Agregar" : "Add"}
                    </button>
                  </form>
                </details>
              </div>
            ) : null}
          </div>
        </section>

        <section className="ld-panel">
          <div className="ld-panel-head">
            <p>MICAH</p>
            <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/micah")}>
              {spanish ? "Galería" : "Gallery"}
            </Link>
          </div>
          <div className="ld-panel-body">
            {drafts.length === 0 ? (
              <p className="ld-empty">
                {spanish ? "No hay borradores para descargar. MICAH no publica." : "No drafts to download. MICAH does not publish."}
              </p>
            ) : (
              <ul className="space-y-1">
                {drafts.slice(0, 4).map((draft) => (
                  <li className="flex items-center justify-between gap-2 text-xs" key={draft.id}>
                    <span className="truncate font-semibold text-[#071b42]">{draft.title || draft.headline}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="ld-desk-followup ld-panel">
        <div className="ld-panel-head">
          <p>{spanish ? "Seguimiento" : "Follow-up"}</p>
          <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/david")}>
            {spanish ? "Abrir" : "Open"}
          </Link>
        </div>
        <div className="ld-panel-body grid min-h-0 grid-cols-1 gap-2 md:grid-cols-3">
          <QueueColumn
            emptyText={spanish ? "Cola despejada." : "Queue clear."}
            items={dueTodayItems}
            label={spanish ? "Hoy" : "Today"}
            overdueIds={new Set(queues.overdue.map((item) => item.id))}
            spanish={spanish}
          />
          <QueueColumn
            emptyText={spanish ? "Nada para mañana." : "Nothing for tomorrow."}
            items={queues.tomorrow}
            label={spanish ? "Mañana" : "Tomorrow"}
            spanish={spanish}
          />
          <QueueColumn
            emptyText={spanish ? "Nada más adelante." : "Nothing later."}
            items={queues.later}
            label={spanish ? "Luego" : "Later"}
            spanish={spanish}
          />
        </div>
      </section>

      <section className="ld-desk-work">
        {organizationId ? (
          <LionsDenCalendarBoard
            compact
            organizationId={organizationId}
            partyEvents={partyEvents}
            prospects={prospects}
            spanish={spanish}
          />
        ) : (
          <div className="ld-panel">
            <div className="ld-panel-head">
              <p>{spanish ? "Calendario" : "Calendar"}</p>
            </div>
            <div className="ld-panel-body">
              <p className="ld-empty">{spanish ? "Asigna un espacio de trabajo para ver fechas." : "Assign a workspace to see dates."}</p>
            </div>
          </div>
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
          <div className="ld-panel">
            <div className="ld-panel-head">
              <p>{spanish ? "Notas" : "Notes"}</p>
            </div>
            <div className="ld-panel-body">
              <p className="ld-empty">{spanish ? "Asigna un espacio de trabajo para escribir notas." : "Assign a workspace to write notes."}</p>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

function MetricChip({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link className="flex items-center justify-between gap-2 rounded-md border border-[#d5d0c4] bg-white px-2.5 py-1.5" href={href}>
      <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#5c6578]">{label}</span>
      <span className="font-[family-name:var(--font-display)] text-lg leading-none text-[#071b42]">{value}</span>
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
    <div className="min-h-0 overflow-auto rounded-md border border-[#ece7d8] bg-[#fbfaf4] p-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#071b42]">{label}</h4>
        <span className="text-[10px] font-semibold text-[#5c6578]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-[#5c6578]">{emptyText}</p>
      ) : (
        items.slice(0, 8).map((item) => (
          <QueueRow item={item} key={item.id} overdue={overdueIds?.has(item.id)} overdueLabel={spanish ? "Atrasado" : "Overdue"} />
        ))
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
      <div className="flex flex-wrap items-center gap-1">
        <p className="truncate text-xs font-semibold text-[#071b42]">{item.title}</p>
        {overdue ? (
          <span className="rounded-full bg-[#fff1f1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a1f1f]">
            {overdueLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#33415c]">{item.detail}</p> : null}
    </>
  );

  if (item.href) {
    return (
      <Link className="block border-b border-[#ece7d8] py-1.5 last:border-b-0" href={item.href}>
        {inner}
      </Link>
    );
  }

  return <div className="border-b border-[#ece7d8] py-1.5 last:border-b-0">{inner}</div>;
}
