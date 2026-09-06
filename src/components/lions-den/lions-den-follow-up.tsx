import Link from "next/link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { SisInboxTask, SisPartyEventSummary } from "@/server/sis-workspace/queries";
import {
  deleteFollowUpDraft,
  openFollowUpOwnerSend,
  updateFollowUpDraft,
} from "@/server/opportunities/actions";
import {
  bucketFollowUpQueues,
  type DeskFollowUpDraftControls,
  type DeskFollowUpItem,
} from "@/lib/lions-den/desk-queue";
import {
  FOLLOW_UP_OWNER_SEND_HINT_EN,
  FOLLOW_UP_OWNER_SEND_HINT_ES,
  followUpDraftHasVisibleSampleLabel,
  followUpDraftMailto,
} from "@/lib/lions-den/follow-up-drafts";
import { prospectDetailPath } from "@/lib/lions-den/prospect-places";

type FollowUpDraftControls = DeskFollowUpDraftControls;

type LionsDenFollowUpBoardProps = {
  prospects: OrganizationOpportunity[];
  inboxTasks: SisInboxTask[];
  partyEvents?: SisPartyEventSummary[];
  spanish: boolean;
  allowDraftControls?: boolean;
  returnTo?: string;
  followupStatus?: string;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function LionsDenFollowUpBoard({
  prospects,
  inboxTasks,
  partyEvents = [],
  spanish,
  allowDraftControls = false,
  returnTo = "/client/david",
  followupStatus,
}: LionsDenFollowUpBoardProps) {
  const items: DeskFollowUpItem[] = [
    ...prospects
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `prospect-${item.id}`,
        title: item.name,
        detail: item.nextAction,
        dueAt: item.nextActionDue!,
        href: prospectDetailPath(item.id),
        draftControls: allowDraftControls
          ? {
              opportunityId: item.id,
              organizationId: item.organizationId,
              contactEmail: item.contactEmail,
              contactName: item.contactName,
              draftBody: item.nextAction ?? "",
            }
          : undefined,
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
      })),
  ];
  const queues = bucketFollowUpQueues(items);
  const empty =
    queues.overdue.length === 0 &&
    queues.today.length === 0 &&
    queues.tomorrow.length === 0 &&
    queues.later.length === 0;

  return (
    <section className="space-y-5">
      <article className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
          {spanish ? "Seguimiento" : "Follow-up"}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-ui)] text-3xl font-extrabold uppercase tracking-[0.04em] text-[#071b42]">
          {spanish ? "LA FORTUNA ESTÁ EN EL SEGUIMIENTO" : "THE FORTUNE IS IN THE FOLLOW-UP"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish ? FOLLOW_UP_OWNER_SEND_HINT_ES : FOLLOW_UP_OWNER_SEND_HINT_EN}
        </p>
        {followupStatus ? <FollowUpStatusNote spanish={spanish} status={followupStatus} /> : null}
      </article>

      {empty ? (
        <div className="rounded-[1.2rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "Cola despejada." : "Queue clear."}</p>
          <p className="mt-2">
            {spanish
              ? "Acepta un prospecto o agrega una consulta de fiesta y la próxima acción aparecerá aquí."
              : "Accept a prospect or add a party inquiry and the next action will show here."}
          </p>
        </div>
      ) : (
        <div className="ld-followup-columns">
          <QueueCard
            items={[...queues.overdue, ...queues.today]}
            label={spanish ? "Hoy" : "Today"}
            overdueIds={new Set(queues.overdue.map((item) => item.id))}
            returnTo={returnTo}
            spanish={spanish}
          />
          <QueueCard
            items={queues.tomorrow}
            label={spanish ? "Mañana" : "Tomorrow"}
            returnTo={returnTo}
            spanish={spanish}
          />
          <QueueCard
            items={queues.later}
            label={spanish ? "Más adelante" : "Later"}
            returnTo={returnTo}
            spanish={spanish}
          />
        </div>
      )}
    </section>
  );
}

function FollowUpStatusNote({
  status,
  spanish,
}: {
  status: string;
  spanish: boolean;
}) {
  const copy =
    status === "edited"
      ? spanish
        ? "Borrador guardado. Atlas no envió nada."
        : "Draft saved. Atlas did not send anything."
      : status === "deleted"
        ? spanish
          ? "Borrador quitado de la cola. El prospecto sigue en Prospectos."
          : "Draft removed from the queue. The prospect stays on Prospects."
        : status === "copy_draft"
          ? spanish
            ? "No hay correo en el expediente. Copia el borrador y envíalo tú. Atlas no envía."
            : "No email on file. Copy this draft and send it yourself. Atlas does not send."
          : status === "send_opened"
            ? spanish
              ? "Send queda en tu correo. Atlas no envió nada."
              : "Send stays in your email. Atlas did not send anything."
          : status === "sis_blocked"
            ? spanish
              ? "Este control no corre en SIS."
              : "These controls do not run on SIS."
            : null;

  if (!copy) return null;
  return (
    <p className="mt-3 rounded-xl border border-[#d8c27a] bg-[#fff8e6] px-3 py-2 text-sm font-semibold text-[#071b42]">
      {copy}
    </p>
  );
}

function QueueCard({
  items,
  label,
  overdueIds,
  returnTo,
  spanish,
}: {
  items: DeskFollowUpItem[];
  label: string;
  overdueIds?: Set<string>;
  returnTo: string;
  spanish: boolean;
}) {
  return (
    <article className="ld-followup-col rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#071b42]">{label}</h3>
        <span className="rounded-full bg-[#fbfaf4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c6578]">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#5c6578]">
          {spanish ? "Cola despejada." : "Queue clear."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[#ece7d8]">
          {items.map((item) => (
            <FollowUpRow
              item={item}
              key={item.id}
              overdue={overdueIds?.has(item.id)}
              overdueLabel={spanish ? "Atrasado" : "Overdue"}
              returnTo={returnTo}
              spanish={spanish}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function FollowUpRow({
  item,
  overdue,
  overdueLabel,
  returnTo,
  spanish,
}: {
  item: DeskFollowUpItem;
  overdue?: boolean;
  overdueLabel?: string;
  returnTo: string;
  spanish: boolean;
}) {
  const showSample = followUpDraftHasVisibleSampleLabel(item.title, item.detail);
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[#071b42]">{item.title}</p>
        {showSample ? (
          <span className="rounded-full bg-[#fff8e6] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a12]">
            {/\bSAMPLE\b/.test(`${item.title} ${item.detail ?? ""}`) ? "SAMPLE" : "DEMO"}
          </span>
        ) : null}
        {overdue ? (
          <span className="rounded-full bg-[#fff1f1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a1f1f]">
            {overdueLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? <p className="mt-1 text-sm text-[#33415c]">{item.detail}</p> : null}
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#5c6578]">{formatDate(item.dueAt)}</p>
    </>
  );

  return (
    <div className="py-3" data-followup-row={item.id}>
      {item.href ? (
        <Link className="block" href={item.href}>
          {body}
        </Link>
      ) : (
        <div>{body}</div>
      )}
      {item.draftControls ? (
        <FollowUpDraftActions
          controls={item.draftControls}
          prospectName={item.title}
          returnTo={returnTo}
          spanish={spanish}
        />
      ) : null}
    </div>
  );
}

function FollowUpDraftActions({
  controls,
  prospectName,
  returnTo,
  spanish,
}: {
  controls: FollowUpDraftControls;
  prospectName: string;
  returnTo: string;
  spanish: boolean;
}) {
  const mailto = followUpDraftMailto({
    email: controls.contactEmail,
    prospectName,
    contactName: controls.contactName,
    body: controls.draftBody,
  });

  return (
    <div className="mt-3 space-y-2" data-followup-controls="draft">
      <div className="flex flex-wrap gap-2">
        <details className="group">
          <summary
            className="inline-flex cursor-pointer list-none rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-sm font-semibold text-[#071b42] [&::-webkit-details-marker]:hidden"
            data-followup-control="edit"
          >
            {spanish ? "Editar" : "Edit"}
          </summary>
          <form action={updateFollowUpDraft} className="mt-2 space-y-2 rounded-xl border border-[#ece7d8] bg-[#fbfaf4] p-3">
            <input name="organizationId" type="hidden" value={controls.organizationId} />
            <input name="opportunityId" type="hidden" value={controls.opportunityId} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#5c6578]">
              {spanish ? "Borrador" : "Draft body"}
              <textarea
                className="mt-1 min-h-28 w-full rounded-lg border border-[#d5d0c4] bg-white p-2 text-sm leading-5 text-[#071b42]"
                defaultValue={controls.draftBody}
                name="draftBody"
                required
              />
            </label>
            <button
              className="rounded-full bg-[#071b42] px-3 py-1.5 text-sm font-semibold text-white"
              type="submit"
            >
              {spanish ? "Guardar borrador" : "Save draft"}
            </button>
          </form>
        </details>

        {mailto ? (
          <a
            className="inline-flex rounded-full bg-[#071b42] px-3 py-1.5 text-sm font-semibold text-white"
            data-followup-control="send"
            href={mailto}
          >
            {spanish ? "Enviar" : "Send"}
          </a>
        ) : (
          <form action={openFollowUpOwnerSend}>
            <input name="organizationId" type="hidden" value={controls.organizationId} />
            <input name="opportunityId" type="hidden" value={controls.opportunityId} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <button
              className="inline-flex rounded-full bg-[#071b42] px-3 py-1.5 text-sm font-semibold text-white"
              data-followup-control="send"
              type="submit"
            >
              {spanish ? "Enviar" : "Send"}
            </button>
          </form>
        )}

        <form action={deleteFollowUpDraft}>
          <input name="organizationId" type="hidden" value={controls.organizationId} />
          <input name="opportunityId" type="hidden" value={controls.opportunityId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button
            className="inline-flex rounded-full border border-[#d5d0c4] bg-white px-3 py-1.5 text-sm font-semibold text-[#5c6578]"
            data-followup-control="delete"
            type="submit"
          >
            {spanish ? "Eliminar" : "Delete"}
          </button>
        </form>
      </div>
      <p className="text-[11px] leading-5 text-[#5c6578]">
        {spanish
          ? "Send abre tu correo. Atlas no envía nada."
          : "Send opens your email. Atlas does not send."}
      </p>
    </div>
  );
}
