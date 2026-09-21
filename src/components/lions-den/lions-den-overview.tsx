import Link from "next/link";
import { createSisPartyEvent } from "@/server/sis-workspace/actions";
import { acceptHunterReviewItem, dismissHunterReviewItem } from "@/server/hunter/actions";
import type { SisDashboardData } from "@/server/sis-workspace/queries";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { HunterReviewItem } from "@/server/hunter/review";
import type { ContentDraft } from "@/server/content-studio/queries";
import type { OrganizationNote } from "@/server/notes/queries";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { prospectDetailPath, prospectPlacesCard, presentedProspectNextAction, presentedProspectStageLabel } from "@/lib/lions-den/prospect-places";
import { prospectBelongsOnCallsToMake } from "@/lib/lions-den/calls-to-make";
import type { TodaysFiveDesk } from "@/lib/lions-den/todays-five";
import { TodaysFivePanel } from "@/components/lions-den/todays-five-panel";
import { countWonOpportunities } from "@/lib/lions-den/desk-clients";
import { bucketFollowUpQueues, type DeskFollowUpItem } from "@/lib/lions-den/desk-queue";
import {
  belongsOnFollowUpDesk,
  followUpQueueDueAt,
  presentedFollowUpNextAction,
} from "@/lib/lions-den/follow-up-queue";
import { LionsDenCalendarBoard } from "@/components/lions-den/lions-den-calendar";
import { LionsDenNotesBoard } from "@/components/lions-den/lions-den-notes";
import { LionsDenActivationChecklist } from "@/components/lions-den/lions-den-activation-checklist";
import { AfeCallLogDesk } from "@/components/lions-den/afe-call-log";
import { ProspectNoteForm } from "@/components/lions-den/prospect-controls";
import type { AfeCallDesk } from "@/server/opportunities/desk-call-log";
import {
  isActivationSampleWalkthrough,
  shouldShowActivationChecklist,
} from "@/lib/lions-den/activation-checklist";
import {
  countRealHunterFinds,
  countRealProspects,
  hasTrialSamples,
  isTrialSampleDraft,
  isTrialSampleHunterItem,
  isTrialSampleOpportunity,
  trialSampleCopy,
} from "@/lib/lions-den/trial-samples";
import { clearTrialSamples } from "@/server/trials/sample-actions";

type LionsDenOverviewProps = {
  organizationId?: string;
  organizationName: string;
  organizationSlug?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
  canCreateNotes: boolean;
  sisDashboard?: SisDashboardData | null;
  prospects: OrganizationOpportunity[];
  /** Dedicated Follow-up fetch (contacted + dated). Falls back to `prospects`. */
  followUpProspects?: OrganizationOpportunity[];
  reviewPile: HunterReviewItem[];
  acceptedCount?: number;
  foundCount?: number;
  drafts: ContentDraft[];
  notes: OrganizationNote[];
  /** AFE Calls to make counter, goal, and day log. SIS leaves this unset. */
  callDesk?: AfeCallDesk | null;
  todaysFive?: TodaysFiveDesk | null;
};

export function LionsDenOverview({
  organizationId,
  organizationName,
  organizationSlug,
  previewOrgSlug,
  workspaceSlug,
  spanish,
  canCreateNotes,
  sisDashboard,
  prospects,
  followUpProspects,
  reviewPile,
  acceptedCount = 0,
  foundCount,
  drafts,
  notes,
  callDesk = null,
  todaysFive = null,
}: LionsDenOverviewProps) {
  const href = (path: string) => lionsDenHref(path, previewOrgSlug, workspaceSlug);
  const sampleCopy = trialSampleCopy(spanish);
  const showSampleBanner =
    Boolean(organizationId) &&
    !sisDashboard &&
    hasTrialSamples({ opportunities: prospects, hunterItems: reviewPile, drafts });
  const realFoundCount = countRealHunterFinds(reviewPile) + countRealProspects(prospects.filter((item) => item.stage !== "won"));
  const realAcceptedCount = countRealProspects(prospects);
  const deskOrganization = {
    name: organizationName,
    slug: organizationSlug || workspaceSlug || previewOrgSlug,
  };
  const showActivation = shouldShowActivationChecklist({
    organization: deskOrganization,
    organizationId,
    sisDesk: Boolean(sisDashboard),
  });
  const sampleWalkthrough = isActivationSampleWalkthrough(deskOrganization);
  const partyEvents = sisDashboard?.partyEvents ?? [];
  const inboxTasks = sisDashboard?.inboxTasks ?? [];
  const followUpSource = followUpProspects ?? prospects;
  const followUpItems: DeskFollowUpItem[] = [
    ...followUpSource
      .filter((item) => belongsOnFollowUpDesk(item))
      .map((item) => ({
        id: `prospect-${item.id}`,
        title: item.name,
        detail: presentedFollowUpNextAction(item, spanish) || item.nextAction,
        dueAt: followUpQueueDueAt(item),
        href: prospectDetailPath(item.id, href("/client/prospects")),
        sample: isTrialSampleOpportunity(item),
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
  const followUpBandTitle = showActivation
    ? spanish
      ? "LA FORTUNA ESTÁ EN EL SEGUIMIENTO"
      : "THE FORTUNE IS IN THE FOLLOW-UP"
    : spanish
      ? "Seguimiento"
      : "Follow-up";
  const sisDesk = Boolean(sisDashboard);
  const callsToMake = sisDesk ? prospects : prospects.filter(prospectBelongsOnCallsToMake);
  const callsToMakeTitle = sisDesk
    ? spanish
      ? "Prospectos"
      : "Prospects"
    : spanish
      ? "Llamadas por hacer"
      : "Calls to make";

  return (
    <div aria-label={spanish ? `Escritorio de ${organizationName || "The Lion’s Den"}` : `${organizationName || "The Lion’s Den"} desk`} className="ld-desk">
      <section className="ld-desk-metrics space-y-1.5">
        {showActivation && organizationId ? (
          <LionsDenActivationChecklist
            acceptedCount={sampleWalkthrough ? acceptedCount : realAcceptedCount}
            drafts={drafts.filter((draft) => sampleWalkthrough || !isTrialSampleDraft(draft))}
            foundCount={sampleWalkthrough ? foundCount : realFoundCount}
            hunterHref={href("/client/hunter")}
            micahHref={`${href("/client/micah")}#micah-week-desk`}
            organizationId={organizationId}
            pendingCount={sampleWalkthrough ? reviewPile.length : countRealHunterFinds(reviewPile)}
            prospectsHref={href("/client/prospects")}
            sampleWalkthrough={sampleWalkthrough}
            spanish={spanish}
          />
        ) : null}
        {showSampleBanner && organizationId ? (
          <div className="ld-sample-banner flex flex-col gap-2 rounded-md border border-[#e9d9a6] bg-[#fff8e6] px-3 py-2 sm:flex-row sm:items-center sm:justify-between" role="note">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8a6a12]">
                {sampleCopy.badge} · {sampleCopy.bannerTitle}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[#5c4a12]">{sampleCopy.bannerBody}</p>
            </div>
            <form action={clearTrialSamples} className="shrink-0">
              <input name="organizationId" type="hidden" value={organizationId} />
              {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
              <button
                className="rounded-full border border-[#8a6a12] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a12] transition hover:bg-[#8a6a12] hover:text-white"
                type="submit"
              >
                {sampleCopy.clear}
              </button>
            </form>
          </div>
        ) : null}
        <div className="ld-desk-metrics-row">
          <MetricChip href={href("/client/prospects")} label={spanish ? "Prospectos" : "Prospects"} value={prospects.length} />
          <MetricChip href={href("/client/david")} label={spanish ? "Hoy" : "Due today"} value={dueTodayCount} />
          <MetricChip href={href("/client/notes")} label={spanish ? "Notas" : "Notes"} value={notes.length} />
          <MetricChip href={href("/client/hunter")} label={spanish ? "HUNTER" : "HUNTER"} value={reviewPile.length} />
          <MetricChip
            href={href("/client/clients")}
            label={spanish ? "Clientes" : "Clients"}
            value={sisDashboard ? sisDashboard.counts.customers : countWonOpportunities(prospects)}
          />
          {sisDashboard ? (
            <>
              <MetricChip href={href("/client")} label={spanish ? "Leads SIS" : "SIS leads"} value={sisDashboard.counts.leads} />
              <MetricChip href={href("/client")} label={spanish ? "Cotiz." : "Quotes"} value={sisDashboard.counts.quotes} />
              <MetricChip href={href("/client")} label={spanish ? "Pedidos" : "Orders"} value={sisDashboard.counts.orders} />
            </>
          ) : null}
          <MetricChip href={href("/client/micah")} label="MICAH" value={drafts.length} />
        </div>
      </section>

      <div className="ld-desk-pipeline">
        <section className="ld-panel ld-desk-pile">
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
                        {isTrialSampleHunterItem(item) ? <DemoBadge label={sampleCopy.badge} /> : null}
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
            {reviewPile.length > 0 ? (
              <p className="mt-1 text-[10px] leading-4 text-[#8a6a12]">
                {spanish
                  ? "Teléfono se confirma al aceptar. Atlas no inventa números."
                  : "Phone is checked on Accept. Atlas will not invent a number."}
              </p>
            ) : null}
          </div>
        </section>

        <section className="ld-panel ld-desk-pile" data-calls-to-make={!sisDesk || undefined}>
          <div className="ld-panel-head">
            <p>{callsToMakeTitle}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5c6578]">
                {callsToMake.length}
              </span>
              <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/prospects")}>
                {spanish ? "Abrir" : "Open"}
              </Link>
            </div>
          </div>
          <div className="ld-panel-body">
            {!sisDesk && todaysFive ? (
              <TodaysFivePanel
                model={todaysFive}
                prospectHref={(id) => prospectDetailPath(id, href("/client/prospects"))}
                spanish={spanish}
              />
            ) : null}
            {!sisDesk && callDesk && organizationId ? (
              <AfeCallLogDesk
                callDesk={callDesk}
                organizationId={organizationId}
                previewOrgSlug={previewOrgSlug}
                spanish={spanish}
                workspaceSlug={workspaceSlug}
              />
            ) : null}
            {callsToMake.length === 0 ? (
              <p className="ld-empty">
                {sisDesk
                  ? spanish
                    ? "Lista de llamadas vacía. Acepta un hallazgo de HUNTER. Atlas no llama, escribe ni envía SMS."
                    : "Call list empty. Accept a HUNTER find. Atlas does not call, email, or text."
                  : spanish
                    ? "Nada por llamar. Solo aparecen prospectos con teléfono que aún no contactaste. Sin teléfono se quedan en Prospectos."
                    : "No calls to make. Only prospects with a phone you have not marked contacted show here. No-phone rows stay on Prospects."}
              </p>
            ) : (
              callsToMake.slice(0, 10).map((prospect) => {
                const places = prospectPlacesCard(prospect);
                const detailHref = prospectDetailPath(prospect.id, href("/client/prospects"));
                return (
                  <article
                    className="border-b border-[#ece7d8] py-1.5 last:border-b-0"
                    data-calls-to-make-row={sisDesk ? undefined : prospect.id}
                    key={prospect.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link
                            className="truncate text-sm font-semibold text-[#071b42] underline decoration-[#d8c27a] underline-offset-2 hover:bg-[#fffdf6]"
                            href={detailHref}
                          >
                            {prospect.name}
                          </Link>
                          {isTrialSampleOpportunity(prospect) ? <DemoBadge label={sampleCopy.badge} /> : null}
                        </div>
                        {prospect.contactName || places.phone ? (
                          <p className="truncate text-[11px] text-[#071b42]">
                            {[prospect.contactName, places.phone].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {presentedProspectNextAction(prospect, spanish) ? (
                          <p className="truncate text-[11px] text-[#33415c]">
                            {presentedProspectNextAction(prospect, spanish)}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#fff8e6] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#071b42]">
                        {presentedProspectStageLabel(prospect, spanish)}
                      </span>
                    </div>
                    {!sisDesk && organizationId ? (
                      <ProspectNoteForm
                        compact
                        organizationId={organizationId}
                        previewOrgSlug={previewOrgSlug}
                        prospect={prospect}
                        returnTo="/client"
                        spanish={spanish}
                        variant="log-call"
                        workspaceSlug={workspaceSlug}
                      />
                    ) : null}
                  </article>
                );
              })
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
                    {isTrialSampleDraft(draft) ? <DemoBadge label={sampleCopy.badge} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="ld-desk-followup">
        <section className="ld-panel">
          <div className="ld-panel-head">
            <p>{followUpBandTitle}</p>
            <Link className="text-[11px] font-semibold text-[#071b42] underline" href={href("/client/david")}>
              {spanish ? "Abrir" : "Open"}
            </Link>
          </div>
          <div className="ld-panel-body ld-followup-columns">
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
      </section>
      {organizationId ? (
        <LionsDenCalendarBoard
          compact
          organizationId={organizationId}
          partyEvents={partyEvents}
          prospects={prospects}
          spanish={spanish}
        />
      ) : (
        <div className="ld-calendar ld-calendar-compact ld-panel">
          <div className="ld-panel-head">
            <p>{spanish ? "Calendario" : "Calendar"}</p>
          </div>
          <div className="ld-panel-body">
            <p className="ld-empty">{spanish ? "Asigna un espacio de trabajo para ver fechas." : "Assign a workspace to see dates."}</p>
          </div>
        </div>
      )}

      <section className="ld-desk-work">
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

function DemoBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full bg-[#fff8e6] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#8a6a12]"
      title="Sample record added by Atlas so you can see how the desk works. Not a real business."
    >
      {label}
    </span>
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
    <Link className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[#d5d0c4] bg-white px-2.5 py-1.5" href={href}>
      <span className="min-w-0 text-[10px] font-black uppercase leading-tight tracking-[0.08em] text-[#5c6578]">{label}</span>
      <span className="shrink-0 font-[family-name:var(--font-display)] text-lg leading-none text-[#071b42]">{value}</span>
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
  const sampleLabel = trialSampleCopy(spanish).badge;
  return (
    <div className="ld-followup-col min-h-0 overflow-auto rounded-md border border-[#ece7d8] bg-[#fbfaf4] p-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-[#071b42]">{label}</h4>
        <span className="text-[10px] font-semibold text-[#5c6578]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-[#5c6578]">{emptyText}</p>
      ) : (
        items.slice(0, 8).map((item) => (
          <QueueRow item={item} key={item.id} overdue={overdueIds?.has(item.id)} overdueLabel={spanish ? "Atrasado" : "Overdue"} sampleLabel={sampleLabel} />
        ))
      )}
    </div>
  );
}

function QueueRow({
  item,
  overdue,
  overdueLabel,
  sampleLabel,
}: {
  item: DeskFollowUpItem;
  overdue?: boolean;
  overdueLabel?: string;
  sampleLabel: string;
}) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <p className="text-sm font-semibold leading-5 text-[#071b42]">{item.title}</p>
        {item.sample ? <DemoBadge label={sampleLabel} /> : null}
        {overdue ? (
          <span className="rounded-full bg-[#fff1f1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a1f1f]">
            {overdueLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? <p className="mt-0.5 text-xs leading-5 text-[#33415c]">{item.detail}</p> : null}
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
