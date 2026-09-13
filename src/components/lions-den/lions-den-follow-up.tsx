import Link from "next/link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { SisInboxTask, SisPartyEventSummary } from "@/server/sis-workspace/queries";
import {
  deleteFollowUpDraft,
  markFollowUpSent,
  updateFollowUpDraft,
} from "@/server/opportunities/actions";
import {
  bucketFollowUpQueues,
  type DeskFollowUpDraftControls,
  type DeskFollowUpItem,
} from "@/lib/lions-den/desk-queue";
import {
  FOLLOW_UP_CHECK_IN_DAYS,
  FOLLOW_UP_OWNER_SEND_HINT_EN,
  FOLLOW_UP_OWNER_SEND_HINT_ES,
  followUpDraftHasVisibleSampleLabel,
  followUpDraftMailto,
  followUpDraftSms,
  followUpDraftText,
} from "@/lib/lions-den/follow-up-drafts";
import { formatUsd, latestDeskQuote } from "@/lib/lions-den/desk-quote";
import {
  concatNotesText,
  latestTimestamp,
  nextMessage,
  type NextMessageResult,
} from "@/lib/lions-den/next-message-engine";
import { prospectDetailPath, publishedPlacePhone } from "@/lib/lions-den/prospect-places";
import { readLastDeskContact } from "@/lib/lions-den/prospect-stages";
import {
  amandaSequenceSteps,
  canOfferAmandaSequence,
  type AmandaBusiness,
  type AmandaDeskInfo,
  type AmandaSequenceRecord,
} from "@/lib/lions-den/amanda-outreach";
import { DeskEmailCompose } from "./desk-email-compose";
import { AmandaSequenceCard } from "./amanda-sequence-card";
import { FollowUpCopyButton } from "./follow-up-copy-button";

type FollowUpDraftControls = DeskFollowUpDraftControls;

export type FollowUpAmandaContext = {
  business: AmandaBusiness;
  sequences: Record<string, AmandaSequenceRecord>;
};

export type FollowUpEngineOwner = {
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
};

export type FollowUpLinkedNote = {
  recordId: string | null;
  createdAt: string;
  title: string;
  body: string | null;
};

type LionsDenFollowUpBoardProps = {
  prospects: OrganizationOpportunity[];
  inboxTasks: SisInboxTask[];
  partyEvents?: SisPartyEventSummary[];
  spanish: boolean;
  allowDraftControls?: boolean;
  returnTo?: string;
  followupStatus?: string;
  /** When set, prospects with a business email get Amanda's approve-to-send card. */
  amanda?: FollowUpAmandaContext | null;
  composeFromEmail?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  engineOwner?: FollowUpEngineOwner | null;
  linkedNotes?: FollowUpLinkedNote[];
};

function amandaInfoFor(
  item: OrganizationOpportunity,
  amanda: FollowUpAmandaContext | null | undefined,
  spanish: boolean,
): AmandaDeskInfo | undefined {
  if (!amanda) return undefined;
  const sequence = amanda.sequences[item.id] ?? null;
  const offerable = canOfferAmandaSequence({
    opportunityType: item.opportunityType,
    contactEmail: item.contactEmail,
    metadata: item.metadata,
    stage: item.stage,
  });
  if (!offerable && !sequence) return undefined;
  const primaryType = item.metadata?.primary_type;
  return {
    toEmail: sequence?.toEmail ?? String(item.contactEmail ?? "").trim().toLowerCase(),
    proposedSteps: amandaSequenceSteps({
      business: amanda.business,
      prospect: {
        prospectName: item.name,
        contactName: item.contactName,
        prospectType: typeof primaryType === "string" ? primaryType.replaceAll("_", " ") : null,
      },
      spanish,
    }),
    sequence,
  };
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function notesTextFor(item: OrganizationOpportunity, linkedNotes: FollowUpLinkedNote[]) {
  const pieces = [
    ...linkedNotes
      .filter((note) => note.recordId === item.id)
      .map((note) => ({
        createdAt: note.createdAt,
        text: [note.title, note.body].filter((part) => String(part ?? "").trim()).join(" — "),
      })),
  ];
  const ownerNotes = typeof item.metadata?.owner_notes === "string" ? item.metadata.owner_notes : "";
  if (ownerNotes.trim()) {
    pieces.push({ createdAt: item.createdAt, text: ownerNotes });
  }
  for (const event of item.events) {
    if (event.eventType !== "note_added") continue;
    pieces.push({ createdAt: event.createdAt, text: event.body || event.summary });
  }
  return concatNotesText(pieces);
}

function lastTouchAtFor(item: OrganizationOpportunity) {
  const contact = readLastDeskContact(item.metadata);
  const ownerContacted =
    typeof item.metadata?.owner_contacted_at === "string" ? item.metadata.owner_contacted_at : null;
  return latestTimestamp([
    contact?.at,
    ownerContacted,
    ...item.events
      .filter((event) => event.eventType === "contacted" || event.eventType === "reply_received")
      .map((event) => event.createdAt),
  ]);
}

function quoteAmountFor(item: OrganizationOpportunity) {
  const quote = latestDeskQuote(item.metadata);
  if (!quote || quote.status === "declined") return null;
  return formatUsd(quote.amountUsd);
}

function nextMessageFor(
  item: OrganizationOpportunity,
  input: {
    spanish: boolean;
    engineOwner: FollowUpEngineOwner;
    linkedNotes: FollowUpLinkedNote[];
    nowIso: string;
  },
): NextMessageResult {
  return nextMessage({
    spanish: input.spanish,
    ownerFirstName: input.engineOwner.ownerFirstName,
    businessName: input.engineOwner.businessName,
    ownerPhone: input.engineOwner.ownerPhone,
    prospectName: item.contactName || item.name,
    prospectCompany: item.name,
    stage: item.stage,
    opportunityType: item.opportunityType,
    lastTouchAt: lastTouchAtFor(item),
    nowIso: input.nowIso,
    notesText: notesTextFor(item, input.linkedNotes),
    quoteAmount: quoteAmountFor(item),
  });
}

export function LionsDenFollowUpBoard({
  prospects,
  inboxTasks,
  partyEvents = [],
  spanish,
  allowDraftControls = false,
  returnTo = "/client/david",
  followupStatus,
  amanda,
  composeFromEmail = "",
  previewOrgSlug,
  workspaceSlug,
  engineOwner = null,
  linkedNotes = [],
}: LionsDenFollowUpBoardProps) {
  const nowIso = new Date().toISOString();
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
              contactPhone: publishedPlacePhone(
                item.contactPhone ||
                  (typeof item.metadata?.national_phone_number === "string"
                    ? item.metadata.national_phone_number
                    : null),
              ),
              contactName: item.contactName,
              draftBody: item.nextAction ?? "",
              amanda: amandaInfoFor(item, amanda, spanish),
              engine: engineOwner
                ? nextMessageFor(item, { spanish, engineOwner, linkedNotes, nowIso })
                : null,
              fromEmail: composeFromEmail,
              previewOrgSlug,
              workspaceSlug,
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
        : status === "sent"
          ? spanish
            ? `Anotado: lo enviaste tú. El prospecto pasó a Contactado y un recordatorio para dar seguimiento aparecerá aquí en ${FOLLOW_UP_CHECK_IN_DAYS} días.`
            : `Logged: you sent it. The prospect is now Contacted and a check-in draft will show here in ${FOLLOW_UP_CHECK_IN_DAYS} days.`
          : status === "sent_failed"
            ? spanish
              ? "No se pudo anotar el envío. Inténtalo de nuevo."
              : "Could not log that send. Try again."
          : status === "sis_blocked"
            ? spanish
              ? "Este control no corre en SIS."
              : "These controls do not run on SIS."
          : status === "amanda_approved"
            ? spanish
              ? "Aprobado. Amanda envía el primer correo en la próxima corrida (cada mañana). Si responden, se detiene y te avisa."
              : "Approved. Amanda sends the first email on the next run (every morning). If they reply, she stops and tells you."
          : status === "amanda_stopped"
            ? spanish
              ? "Amanda se detuvo. Los correos restantes no se enviarán."
              : "Amanda stopped. The remaining emails will not be sent."
          : status === "amanda_no_email"
            ? spanish
              ? "Amanda solo escribe a negocios con correo. Agrega uno al prospecto o llama directo."
              : "Amanda only writes to businesses with an email. Add one to the prospect or call directly."
          : status === "amanda_stop_requested"
            ? spanish
              ? "Ese negocio pidió no recibir más correos. Amanda no volverá a escribirles; puedes llamar."
              : "That business asked us to stop emailing. Amanda will not write them again; you can still call."
          : status === "amanda_failed"
            ? spanish
              ? "No se pudo guardar la aprobación. Inténtalo de nuevo."
              : "Could not save that approval. Try again."
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
  const sms = followUpDraftSms({ phone: controls.contactPhone, body: controls.draftBody });
  const copyText = followUpDraftText({ contactName: controls.contactName, body: controls.draftBody });
  const primary = "inline-flex rounded-full bg-[#071b42] px-3 py-1.5 text-sm font-semibold text-white";
  const disabled =
    "inline-flex cursor-not-allowed rounded-full border border-dashed border-[#d5d0c4] bg-[#fbfaf4] px-3 py-1.5 text-sm font-semibold text-[#9aa3b5]";
  const hiddenScope = (
    <>
      <input name="organizationId" type="hidden" value={controls.organizationId} />
      <input name="opportunityId" type="hidden" value={controls.opportunityId} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );

  return (
    <div className="mt-3 space-y-2" data-followup-controls="draft">
      <div className="flex flex-wrap items-start gap-2">
        {controls.fromEmail != null && controls.fromEmail !== undefined ? (
          <div data-followup-control="email">
            <DeskEmailCompose
              engine={controls.engine ?? null}
              fromEmail={controls.fromEmail}
              opportunityId={controls.opportunityId}
              organizationId={controls.organizationId}
              previewOrgSlug={controls.previewOrgSlug}
              prospectName={prospectName}
              returnTo={returnTo}
              spanish={spanish}
              toEmail={controls.contactEmail}
              workspaceSlug={controls.workspaceSlug}
            />
          </div>
        ) : mailto ? (
          <a className={primary} data-followup-control="email" href={mailto}>
            {spanish ? "Correo" : "Email"}
          </a>
        ) : (
          <span
            className={disabled}
            data-followup-control="email"
            title={spanish ? "Sin correo en el expediente. Edita el prospecto para agregar uno." : "No email on file. Edit the prospect to add one."}
          >
            {spanish ? "Correo" : "Email"}
          </span>
        )}

        {sms ? (
          <a className={primary} data-followup-control="text" href={sms} rel="noreferrer" target="_blank">
            WhatsApp
          </a>
        ) : (
          <span
            className={disabled}
            data-followup-control="text"
            title={spanish ? "Sin teléfono en el expediente. Edita el prospecto para agregar uno." : "No phone on file. Edit the prospect to add one."}
          >
            WhatsApp
          </span>
        )}

        <FollowUpCopyButton spanish={spanish} text={copyText} />

        <details className="group">
          <summary
            className="inline-flex cursor-pointer list-none rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-sm font-semibold text-[#071b42] [&::-webkit-details-marker]:hidden"
            data-followup-control="edit"
          >
            {spanish ? "Editar" : "Edit"}
          </summary>
          <form action={updateFollowUpDraft} className="mt-2 space-y-2 rounded-xl border border-[#ece7d8] bg-[#fbfaf4] p-3">
            {hiddenScope}
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

        <form action={deleteFollowUpDraft}>
          {hiddenScope}
          <button
            className="inline-flex rounded-full border border-[#d5d0c4] bg-white px-3 py-1.5 text-sm font-semibold text-[#5c6578]"
            data-followup-control="delete"
            type="submit"
          >
            {spanish ? "Eliminar" : "Delete"}
          </button>
        </form>
      </div>

      <form action={markFollowUpSent} className="flex flex-wrap items-center gap-2">
        {hiddenScope}
        <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
        <button
          className="inline-flex rounded-full border-2 border-[#8a6a12] bg-[#fff8e6] px-3 py-1.5 text-sm font-bold text-[#8a6a12]"
          data-followup-control="sent"
          type="submit"
        >
          {spanish ? "Ya lo envié" : "I sent this"}
        </button>
        <span className="text-[11px] leading-5 text-[#5c6578]">
          {spanish
            ? `Marca Contactado y programa un recordatorio en ${FOLLOW_UP_CHECK_IN_DAYS} días.`
            : `Marks Contacted and queues a check-in in ${FOLLOW_UP_CHECK_IN_DAYS} days.`}
        </span>
      </form>

      <p className="text-[11px] leading-5 text-[#5c6578]">
        {spanish
          ? "Correo y WhatsApp abren tus propias apps con el borrador listo. Atlas no envía nada."
          : "Email and WhatsApp open your own apps with the draft filled in. Atlas does not send."}
      </p>

      {controls.amanda ? (
        <AmandaSequenceCard
          info={controls.amanda}
          opportunityId={controls.opportunityId}
          organizationId={controls.organizationId}
          returnTo={returnTo}
          spanish={spanish}
        />
      ) : null}
    </div>
  );
}
