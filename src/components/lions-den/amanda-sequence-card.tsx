import { amandaSequenceStatusCopy, type AmandaDeskInfo } from "@/lib/lions-den/amanda-outreach";
import { approveAmandaSequence, stopAmandaSequence } from "@/server/outreach/actions";

const DAY_LABEL_EN = ["Today", "Day 3", "Day 7"];
const DAY_LABEL_ES = ["Hoy", "Día 3", "Día 7"];

export function AmandaSequenceCard({
  info,
  organizationId,
  opportunityId,
  returnTo,
  spanish,
}: {
  info: AmandaDeskInfo;
  organizationId: string;
  opportunityId: string;
  returnTo: string;
  spanish: boolean;
}) {
  const sequence = info.sequence;
  const steps = sequence?.steps.length ? sequence.steps : info.proposedSteps;
  const active = sequence ? sequence.status === "approved" || sequence.status === "sending" : false;
  // A STOP reply or a bounce closes the door for good; the owner can call, not re-approve.
  const closed = sequence?.stoppedReason === "stop_request" || sequence?.stoppedReason === "bounced";
  const canApprove = !sequence || (!closed && (sequence.status === "paused" || sequence.status === "done"));
  const hidden = (
    <>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="opportunityId" type="hidden" value={opportunityId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
    </>
  );

  return (
    <div className="mt-3 rounded-xl border border-[#d8c27a] bg-[#fffdf5] p-3" data-amanda-sequence={sequence?.status ?? "proposed"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
          {spanish ? "Amanda · alcance" : "Amanda · outreach"}
        </p>
        <span className="text-[11px] text-[#5c6578]">{info.toEmail}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#071b42]">
        {sequence
          ? amandaSequenceStatusCopy(sequence, spanish)
          : spanish
            ? `Amanda redactó ${steps.length} correos. Nada se envía hasta que apruebes.`
            : `Amanda drafted ${steps.length} emails. Nothing sends until you approve.`}
      </p>

      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-[#071b42] underline" data-amanda-control="preview">
          {spanish ? `Leer los ${steps.length} correos` : `Read the ${steps.length} emails`}
        </summary>
        <ol className="mt-2 space-y-3">
          {steps.map((step, index) => (
            <li className="rounded-lg border border-[#ece7d8] bg-white p-3" key={step.step}>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#5c6578]">
                {(spanish ? DAY_LABEL_ES : DAY_LABEL_EN)[index] ?? `+${step.delayDays}d`}
                {sequence && index < sequence.currentStep ? (spanish ? " · enviado" : " · sent") : ""}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#071b42]">{step.subject}</p>
              <pre className="mt-1 whitespace-pre-wrap font-[inherit] text-sm leading-5 text-[#33415c]">{step.body}</pre>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canApprove ? (
          <form action={approveAmandaSequence}>
            {hidden}
            <button
              className="inline-flex rounded-full bg-[#8a6a12] px-3 py-1.5 text-sm font-bold text-white"
              data-amanda-control="approve"
              type="submit"
            >
              {sequence
                ? spanish ? "Aprobar de nuevo" : "Approve again"
                : spanish ? `Aprobar: Amanda envía los ${steps.length}` : `Approve: Amanda sends all ${steps.length}`}
            </button>
          </form>
        ) : null}
        {active ? (
          <form action={stopAmandaSequence}>
            {hidden}
            <button
              className="inline-flex rounded-full border border-[#d5d0c4] bg-white px-3 py-1.5 text-sm font-semibold text-[#5c6578]"
              data-amanda-control="stop"
              type="submit"
            >
              {spanish ? "Detener a Amanda" : "Stop Amanda"}
            </button>
          </form>
        ) : null}
        <span className="text-[11px] leading-5 text-[#5c6578]">
          {spanish
            ? "Correos de negocio a negocio con opción de baja. Si responden, Amanda se detiene y te avisa."
            : "Business-to-business email with a plain opt-out. If they reply, Amanda stops and tells you."}
        </span>
      </div>
    </div>
  );
}
