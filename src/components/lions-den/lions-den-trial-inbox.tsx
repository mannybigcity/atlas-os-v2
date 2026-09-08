import Link from "next/link";
import { ContactButtons } from "@/components/lions-den/contact-buttons";
import { trialInboxStatusLabel, type TrialInboxRow } from "@/lib/lions-den/trial-inbox";
import { addTrialToProspects, syncTrialsToProspects } from "@/server/trials/desk-actions";

type LionsDenTrialInboxBoardProps = {
  rows: TrialInboxRow[];
  setupRequired?: boolean;
  spanish: boolean;
  statusMessage?: string | null;
};

const pill =
  "w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]";
const pillMuted =
  "w-fit rounded-full bg-[#f7f5ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]";
const pillGold =
  "w-fit rounded-full bg-[#f5b932] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#071b42]";

export function LionsDenTrialInboxBoard({
  rows,
  setupRequired = false,
  spanish,
  statusMessage = null,
}: LionsDenTrialInboxBoardProps) {
  const missing = rows.filter((row) => !row.prospectId).length;

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Revisión humana" : "Human review"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "Prueba de 7 días" : "7 Day Trial"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Cada prueba nueva es un lead. Agrégalo a Prospectos, luego llama, escribe o envía correo desde tu propio teléfono. Atlas no envía correos, llamadas ni SMS."
              : "Every new trial is a lead. Add it to Prospects, then call, text, or email from your own phone. Atlas does not email, call, or text anyone."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={pill}>
            {rows.length} {spanish ? "en cola" : "in queue"}
          </span>
          {!setupRequired && missing > 0 ? (
            <form action={syncTrialsToProspects}>
              <button
                className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2a63]"
                data-trial-action="sync-all"
                type="submit"
              >
                {spanish
                  ? `Agregar ${missing} a Prospectos`
                  : `Add ${missing} to Prospects`}
              </button>
            </form>
          ) : null}
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

      {setupRequired ? (
        <div className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "No pudimos cargar la cola de pruebas. Confirma el acceso de servicio e inténtalo de nuevo."
            : "The trial queue could not load. Confirm service access and try again."}
        </div>
      ) : null}

      {!setupRequired && rows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "No hay espacios de prueba nuevos en los últimos 7 días."
            : "No new trial workspaces in the last 7 days."}
        </div>
      ) : null}

      {!setupRequired && rows.length > 0 ? (
        <div className="mt-5 divide-y divide-[#ece7d8]">
          {rows.map((row) => (
            <TrialRow key={`${row.organizationSlug}-${row.userId}`} row={row} spanish={spanish} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TrialRow({ row, spanish }: { row: TrialInboxRow; spanish: boolean }) {
  const firstName = row.ownerName?.split(" ")[0] ?? "";
  const smsBody = spanish
    ? `Hola${firstName ? ` ${firstName}` : ""}, soy de Atlas For Entrepreneurs. Vi que empezaste tu prueba de 7 días para ${row.companyName}. ¿Tienes 10 minutos para que te muestre el escritorio?`
    : `Hi${firstName ? ` ${firstName}` : ""}, this is Atlas For Entrepreneurs. I saw you started your 7-day trial for ${row.companyName}. Do you have 10 minutes this week for a quick walkthrough of your desk?`;

  return (
    <article className="py-5" data-trial-row={row.organizationSlug}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            className="font-semibold text-[#071b42] underline decoration-[#d8c27a] underline-offset-4 hover:bg-[#fffdf6]"
            href={row.previewHref}
          >
            {row.companyName}
          </Link>
          {row.ownerName ? (
            <p className="mt-1 text-sm font-medium text-[#071b42]">{row.ownerName}</p>
          ) : null}
          <p className="mt-1 text-sm text-[#5c6578]">
            {[row.phone, row.email].filter(Boolean).join(" · ") ||
              (spanish ? "Sin teléfono ni correo" : "No phone or email on file")}
          </p>
          {row.businessType || row.primaryGrowthGoal ? (
            <p className="mt-2 text-sm leading-6 text-[#33415c]">
              {row.businessType ? <span className="font-semibold">{row.businessType}. </span> : null}
              {row.primaryGrowthGoal ? (
                <span>
                  {spanish ? "Meta: " : "Goal: "}
                  {row.primaryGrowthGoal.length > 180
                    ? `${row.primaryGrowthGoal.slice(0, 180)}…`
                    : row.primaryGrowthGoal}
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
            {spanish ? "Inicio" : "Started"} · {formatStarted(row.startedAt, spanish)}
            {row.daysRemaining > 0
              ? ` · ${row.daysRemaining} ${spanish ? "días" : "days"} ${spanish ? "restantes" : "left"}`
              : ` · ${spanish ? "terminada" : "ended"}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[20rem] lg:justify-end">
          <span className={pill}>{trialInboxStatusLabel(row.status, spanish)}</span>
          <span className={pillMuted}>
            {row.emailConfirmedAt
              ? spanish
                ? "Correo confirmado"
                : "Email confirmed"
              : spanish
                ? "Correo sin confirmar"
                : "Email not confirmed"}
          </span>
          {row.prospectId ? (
            <span className={pillGold}>
              {spanish ? "En Prospectos" : "In Prospects"}
              {row.prospectStage ? ` · ${row.prospectStage.replaceAll("_", " ")}` : ""}
            </span>
          ) : (
            <span className={pillMuted}>{spanish ? "No está en Prospectos" : "Not in Prospects"}</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ContactButtons
          compact
          email={row.email}
          emailBody={smsBody}
          emailSubject={
            spanish
              ? `Tu prueba de 7 días en Atlas · ${row.companyName}`
              : `Your Atlas 7-day trial · ${row.companyName}`
          }
          phone={row.phone}
          smsBody={smsBody}
          spanish={spanish}
        />
        <span className="hidden h-5 w-px bg-[#ece7d8] sm:block" />
        {row.prospectHref ? (
          <Link
            className="inline-flex items-center rounded-full border border-[#071b42] px-3 py-1.5 text-xs font-semibold text-[#071b42] hover:bg-[#071b42] hover:text-white"
            data-trial-action="open-prospect"
            href={row.prospectHref}
          >
            {spanish ? "Abrir prospecto →" : "Open prospect →"}
          </Link>
        ) : (
          <form action={addTrialToProspects}>
            <input name="userId" type="hidden" value={row.userId} />
            <input name="organizationId" type="hidden" value={row.organizationId} />
            <button
              className="inline-flex items-center rounded-full bg-[#f5b932] px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#071b42] hover:bg-[#ffc84a]"
              data-trial-action="add-to-prospects"
              type="submit"
            >
              {spanish ? "Agregar a Prospectos" : "Add to Prospects"}
            </button>
          </form>
        )}
        <Link
          className="inline-flex items-center rounded-full border border-[#d8c27a] px-3 py-1.5 text-xs font-semibold text-[#071b42] hover:bg-[#fff8e6]"
          data-trial-action="open-desk"
          href={row.previewHref}
        >
          {spanish ? "Ver su escritorio" : "Open their desk"}
        </Link>
      </div>
    </article>
  );
}

function formatStarted(value: string, spanish: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(spanish ? "es" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
