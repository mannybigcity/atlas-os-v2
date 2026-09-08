import type { ReactNode } from "react";
import Link from "next/link";
import { ContactButtons } from "@/components/lions-den/contact-buttons";
import {
  PROSPECT_TOUCH_CHANNELS,
  PROSPECT_TOUCH_OUTCOMES,
  stageMoveLabel,
  touchChannelLabel,
  touchOutcomeLabel,
} from "@/lib/lions-den/prospect-actions";
import { prospectPlacesCard, presentedProspectNextAction, presentedProspectStageLabel } from "@/lib/lions-den/prospect-places";
import { trialDaysLeft, trialLinkFromMetadata } from "@/lib/lions-den/trial-prospect";
import {
  logProspectTouch,
  setProspectNextAction,
  setProspectStage,
  updateProspectContact,
} from "@/server/opportunities/actions";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";

type LionsDenProspectDetailProps = {
  prospect: OrganizationOpportunity;
  backHref: string;
  spanish: boolean;
  /** Where the action forms return to (this record's own URL, with previewOrg/workspace kept). */
  returnTo?: string;
  /** False for guest previews, SIS desks, or read-only visitors. */
  allowActions?: boolean;
  statusMessage?: string | null;
  /** Super-admin only: link into the trial owner's own workspace. */
  trialDeskHref?: string | null;
};

const input =
  "w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm text-[#071b42] outline-none focus:border-[#071b42]";
const label = "block text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]";
const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2a63]";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-[#d8c27a] bg-white px-4 py-2 text-sm font-semibold text-[#071b42] hover:bg-[#fff8e6]";

export function LionsDenProspectDetail({
  prospect,
  backHref,
  spanish,
  returnTo,
  allowActions = false,
  statusMessage = null,
  trialDeskHref = null,
}: LionsDenProspectDetailProps) {
  const places = prospectPlacesCard(prospect);
  const trial = trialLinkFromMetadata(prospect.metadata);
  const phone = prospect.contactPhone?.trim() || places.phone;
  const email = prospect.contactEmail?.trim() || null;
  const firstName = prospect.contactName?.trim().split(" ")[0] ?? "";
  const canAct = allowActions && Boolean(returnTo);
  const hidden = (
    <>
      <input name="organizationId" type="hidden" value={prospect.organizationId} />
      <input name="opportunityId" type="hidden" value={prospect.id} />
      <input name="returnTo" type="hidden" value={returnTo ?? ""} />
    </>
  );
  const daysLeft = trialDaysLeft(trial?.endsAt);
  const smsBody = trial
    ? spanish
      ? `Hola${firstName ? ` ${firstName}` : ""}, soy de Atlas For Entrepreneurs. Vi tu prueba de 7 días para ${prospect.name}. ¿Tienes 10 minutos para un recorrido rápido?`
      : `Hi${firstName ? ` ${firstName}` : ""}, this is Atlas For Entrepreneurs. I saw your 7-day trial for ${prospect.name}. Do you have 10 minutes this week for a quick walkthrough?`
    : spanish
      ? `Hola${firstName ? ` ${firstName}` : ""}, te escribo de parte de ${prospect.name}.`
      : `Hi${firstName ? ` ${firstName}` : ""}, reaching out about ${prospect.name}.`;

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <Link className="text-sm font-semibold text-[#071b42] underline" href={backHref}>
        {spanish ? "← Prospectos" : "← Prospects"}
      </Link>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Prospecto" : "Prospect"}
            {prospect.sourceLabel ? ` · ${prospect.sourceLabel}` : ""}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#071b42]">
            {prospect.name}
          </h2>
          {prospect.contactName ? (
            <p className="mt-1 text-sm font-medium text-[#071b42]">{prospect.contactName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {trial ? (
            <span className="w-fit rounded-full bg-[#f5b932] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#071b42]">
              {spanish ? "Prueba 7 días" : "7 Day Trial"}
              {daysLeft !== null ? ` · ${daysLeft} ${spanish ? "días" : daysLeft === 1 ? "day" : "days"}` : ""}
            </span>
          ) : null}
          <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
            {presentedProspectStageLabel(prospect, spanish)}
          </span>
        </div>
      </div>

      {statusMessage ? (
        <p
          className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#071b42]"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[#071b42] bg-[#fbfaf4] p-4">
        <p className={label}>{spanish ? "Contactar desde tu teléfono" : "Contact from your own phone"}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ContactButtons
            email={email}
            emailBody={smsBody}
            emailSubject={
              trial
                ? spanish
                  ? `Tu prueba de 7 días en Atlas · ${prospect.name}`
                  : `Your Atlas 7-day trial · ${prospect.name}`
                : `Follow-up: ${prospect.name}`
            }
            phone={phone}
            smsBody={smsBody}
            spanish={spanish}
          />
          <p className="text-sm text-[#5c6578]">
            {[phone, email].filter(Boolean).join(" · ") ||
              (spanish ? "Agrega un teléfono o correo abajo." : "Add a phone or email below.")}
          </p>
        </div>
      </div>

      {trial ? (
        <div className="mt-4 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4">
          <p className={label}>{spanish ? "Su prueba" : "Their trial"}</p>
          <div className="mt-2 grid gap-3 text-sm text-[#071b42] sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[#8a93a3]">{spanish ? "Inicio" : "Started"}</p>
              <p className="mt-1 font-semibold">{formatDay(trial.startedAt, spanish) ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[#8a93a3]">{spanish ? "Termina" : "Ends"}</p>
              <p className="mt-1 font-semibold">
                {formatDay(trial.endsAt, spanish) ?? "—"}
                {daysLeft !== null ? ` (${daysLeft} ${spanish ? "días" : daysLeft === 1 ? "day" : "days"})` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[#8a93a3]">{spanish ? "Tipo de negocio" : "Business type"}</p>
              <p className="mt-1 font-semibold">{trial.businessType ?? "—"}</p>
            </div>
          </div>
          {trial.primaryGrowthGoal ? (
            <p className="mt-3 text-sm leading-6 text-[#33415c]">
              <span className="font-semibold text-[#071b42]">{spanish ? "Meta en sus palabras: " : "Goal in their words: "}</span>
              {trial.primaryGrowthGoal}
            </p>
          ) : null}
          {trialDeskHref ? (
            <Link
              className="mt-3 inline-flex rounded-full border border-[#071b42] px-4 py-2 text-sm font-semibold text-[#071b42] hover:bg-[#071b42] hover:text-white"
              data-prospect-action="open-trial-desk"
              href={trialDeskHref}
            >
              {spanish ? "Ver su escritorio de prueba →" : "Open their trial desk →"}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DetailField
          label={spanish ? "Teléfono" : "Phone"}
          value={
            phone ? (
              places.phoneHref ? (
                <a className="font-semibold text-[#071b42] underline" href={places.phoneHref}>
                  {phone}
                </a>
              ) : (
                phone
              )
            ) : spanish ? (
              "Sin teléfono guardado."
            ) : (
              "No phone stored."
            )
          }
        />
        <DetailField
          label={spanish ? "Correo" : "Email"}
          value={email ?? (spanish ? "Sin correo guardado." : "No email stored.")}
        />
        <DetailField
          label={spanish ? "Dirección" : "Address"}
          value={places.address || (spanish ? "No hay dirección guardada." : "No address stored.")}
        />
        <DetailField
          label={spanish ? "Sitio web" : "Website"}
          value={
            places.website ? (
              <a
                className="break-all font-semibold text-[#071b42] underline"
                href={places.website}
                rel="noreferrer"
                target="_blank"
              >
                {places.website}
              </a>
            ) : spanish ? (
              "No hay sitio web guardado."
            ) : (
              "No website stored."
            )
          }
        />
        {places.mapsUrl ? (
          <DetailField
            label="Google Maps"
            value={
              <a
                className="font-semibold text-[#071b42] underline"
                href={places.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                {spanish ? "Abrir en Google Maps" : "Open in Google Maps"}
              </a>
            }
          />
        ) : null}
      </div>

      {places.primaryType || places.businessStatus ? (
        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#5c6578]">
          {[places.primaryType?.replaceAll("_", " "), places.businessStatus?.replaceAll("_", " ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl bg-[#fbfaf4] p-4">
        <p className={label}>{spanish ? "Próxima acción" : "Next action"}</p>
        <p className="mt-2 text-sm font-semibold text-[#071b42]">
          {presentedProspectNextAction(prospect, spanish)}
          {prospect.nextActionDue ? (
            <span className="ml-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8a93a3]">
              {spanish ? "para" : "due"} {formatDay(prospect.nextActionDue, spanish)}
            </span>
          ) : null}
        </p>
        {canAct ? (
          <form action={setProspectNextAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            {hidden}
            <div>
              <label className={label} htmlFor="nextAction">
                {spanish ? "Cambiar el próximo paso" : "Change the next step"}
              </label>
              <input
                className={`${input} mt-1`}
                defaultValue={prospect.nextAction ?? ""}
                id="nextAction"
                maxLength={1200}
                name="nextAction"
                placeholder={spanish ? "Ej. Llamar el martes para agendar demo" : "e.g. Call Tuesday to book a demo"}
              />
            </div>
            <div>
              <label className={label} htmlFor="nextActionDue">
                {spanish ? "Fecha" : "Due"}
              </label>
              <input
                className={`${input} mt-1`}
                defaultValue={prospect.nextActionDue ?? ""}
                id="nextActionDue"
                name="nextActionDue"
                type="date"
              />
            </div>
            <button className={primaryButton} data-prospect-action="save-next-step" type="submit">
              {spanish ? "Guardar" : "Save"}
            </button>
          </form>
        ) : null}
      </div>

      {canAct ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form action={logProspectTouch} className="rounded-2xl border border-[#ece7d8] p-4">
            <p className={label}>{spanish ? "Registrar un contacto" : "Log a touch"}</p>
            <p className="mt-1 text-xs text-[#5c6578]">
              {spanish
                ? "Tú hiciste la llamada o el mensaje. Aquí solo queda anotado."
                : "You made the call or sent the message. This just writes it down."}
            </p>
            {hidden}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="channel">
                  {spanish ? "Canal" : "How"}
                </label>
                <select className={`${input} mt-1`} defaultValue="call" id="channel" name="channel">
                  {PROSPECT_TOUCH_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {touchChannelLabel(channel, spanish)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="outcome">
                  {spanish ? "Resultado" : "Outcome"}
                </label>
                <select className={`${input} mt-1`} defaultValue="reached" id="outcome" name="outcome">
                  {PROSPECT_TOUCH_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>
                      {touchOutcomeLabel(outcome, spanish)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className={`${label} mt-3`} htmlFor="note">
              {spanish ? "Notas" : "Notes"}
            </label>
            <textarea
              className={`${input} mt-1 min-h-20`}
              id="note"
              maxLength={2000}
              name="note"
              placeholder={spanish ? "Qué dijeron, qué prometiste…" : "What they said, what you promised…"}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <label className={label} htmlFor="touchNextAction">
                  {spanish ? "Próximo paso (opcional)" : "Next step (optional)"}
                </label>
                <input
                  className={`${input} mt-1`}
                  id="touchNextAction"
                  maxLength={1200}
                  name="nextAction"
                  placeholder={spanish ? "Ej. Enviar propuesta" : "e.g. Send the proposal"}
                />
              </div>
              <div>
                <label className={label} htmlFor="touchNextActionDue">
                  {spanish ? "Fecha" : "Due"}
                </label>
                <input className={`${input} mt-1`} id="touchNextActionDue" name="nextActionDue" type="date" />
              </div>
            </div>
            <button className={`${primaryButton} mt-3`} data-prospect-action="log-touch" type="submit">
              {spanish ? "Registrar" : "Log it"}
            </button>
          </form>

          <form action={updateProspectContact} className="rounded-2xl border border-[#ece7d8] p-4">
            <p className={label}>{spanish ? "Editar contacto" : "Edit contact"}</p>
            <p className="mt-1 text-xs text-[#5c6578]">
              {spanish ? "Corrige el nombre, teléfono, correo o notas." : "Fix the name, phone, email, or notes."}
            </p>
            {hidden}
            <label className={`${label} mt-3`} htmlFor="contactName">
              {spanish ? "Nombre" : "Contact name"}
            </label>
            <input
              className={`${input} mt-1`}
              defaultValue={prospect.contactName ?? ""}
              id="contactName"
              maxLength={180}
              name="contactName"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="contactPhone">
                  {spanish ? "Teléfono" : "Phone"}
                </label>
                <input
                  className={`${input} mt-1`}
                  defaultValue={prospect.contactPhone ?? ""}
                  id="contactPhone"
                  inputMode="tel"
                  maxLength={80}
                  name="contactPhone"
                />
              </div>
              <div>
                <label className={label} htmlFor="contactEmail">
                  {spanish ? "Correo" : "Email"}
                </label>
                <input
                  className={`${input} mt-1`}
                  defaultValue={prospect.contactEmail ?? ""}
                  id="contactEmail"
                  inputMode="email"
                  maxLength={320}
                  name="contactEmail"
                />
              </div>
            </div>
            <label className={`${label} mt-3`} htmlFor="notes">
              {spanish ? "Notas" : "Notes"}
            </label>
            <textarea
              className={`${input} mt-1 min-h-24`}
              defaultValue={prospect.researchSummary}
              id="notes"
              maxLength={3000}
              name="notes"
            />
            <button className={`${primaryButton} mt-3`} data-prospect-action="save-contact" type="submit">
              {spanish ? "Guardar contacto" : "Save contact"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
          <p className={label}>{spanish ? "Notas" : "Notes"}</p>
          <p className="mt-2 text-sm leading-6 text-[#33415c]">{prospect.researchSummary}</p>
        </div>
      )}

      {canAct ? (
        <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
          <p className={label}>{spanish ? "Mover de etapa" : "Move stage"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["won", "lost", "ready_for_follow_up", "archived"] as const)
              .filter((move) => move !== prospect.stage)
              .map((move) => (
                <form action={setProspectStage} key={move}>
                  {hidden}
                  <input name="stage" type="hidden" value={move} />
                  <button
                    className={move === "won" ? primaryButton : secondaryButton}
                    data-prospect-action={`stage-${move}`}
                    type="submit"
                  >
                    {stageMoveLabel(move, spanish)}
                  </button>
                </form>
              ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
        <p className={label}>{spanish ? "Historial" : "History"}</p>
        {prospect.events.length === 0 ? (
          <p className="mt-2 text-sm text-[#5c6578]">
            {spanish ? "Todavía no hay actividad registrada." : "No activity logged yet."}
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {[...prospect.events].reverse().map((event) => (
              <li className="border-l-2 border-[#d8c27a] pl-3" key={event.id}>
                <p className="text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
                  {formatDateTime(event.createdAt, spanish)} · {event.eventType.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#071b42]">{event.summary}</p>
                {event.body ? (
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#33415c]">{event.body}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#071b42]">
        {spanish
          ? "Atlas no llamó, escribió ni envió SMS a nadie."
          : "Atlas did not call, email, or text anyone."}
      </p>
    </section>
  );
}

function DetailField({
  label: fieldLabel,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#fbfaf4] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">{fieldLabel}</p>
      <div className="mt-2 text-sm leading-6 text-[#071b42]">{value}</div>
    </div>
  );
}

function formatDay(value: string | null | undefined, spanish: boolean) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(spanish ? "es" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string, spanish: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(spanish ? "es" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
