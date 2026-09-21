import { lionsDenHref } from "@/lib/lions-den/client-hub";
import {
  MAX_DAILY_CALL_GOAL,
  MIN_DAILY_CALL_GOAL,
  callGoalProgress,
  formatDeskCallTime,
  type DeskCallLogEntry,
} from "@/lib/lions-den/call-log";
import { deskDateLabel, shiftDateOnly } from "@/lib/desk-time";
import type { AfeCallDesk } from "@/server/opportunities/desk-call-log";
import { setDailyCallGoal } from "@/server/opportunities/desk-call-log-actions";

function dayHref(
  day: string,
  today: string,
  spanish: boolean,
  previewOrgSlug?: string,
  workspaceSlug?: string,
) {
  const base = lionsDenHref("/client", previewOrgSlug, workspaceSlug);
  const params = new URLSearchParams(base.split("?")[1] ?? "");
  if (day !== today) params.set("callDay", day);
  else params.delete("callDay");
  if (spanish) params.set("lang", "es");
  const query = params.toString();
  return query ? `/client?${query}` : "/client";
}

export function AfeCallLogDesk({
  callDesk,
  organizationId,
  previewOrgSlug,
  spanish,
  workspaceSlug,
}: {
  callDesk: AfeCallDesk;
  organizationId: string;
  previewOrgSlug?: string;
  spanish: boolean;
  workspaceSlug?: string;
}) {
  const { callsToday, goal, entries, selectedDay, today, timeZone, ready, missing } = callDesk;
  const progress = callGoalProgress(callsToday, goal);
  const showingToday = selectedDay === today;
  const previousDay = shiftDateOnly(selectedDay, -1);
  const nextDay = shiftDateOnly(selectedDay, 1);

  return (
    <section className="mb-2 rounded-md border border-[#ece7d8] bg-[#fffdf6] px-2 py-1.5" data-afe-call-log>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8a6a12]" data-calls-today>
          {spanish ? `Llamadas hoy: ${progress.calls}` : `Calls today: ${progress.calls}`}
        </p>
        <p className="text-[11px] font-semibold text-[#071b42]" data-call-goal>
          {spanish ? `${progress.calls} / ${progress.goal} hoy` : `${progress.calls} / ${progress.goal} today`}
        </p>
      </div>
      <div
        aria-label={spanish ? `${progress.calls} de ${progress.goal} hoy` : `${progress.calls} of ${progress.goal} today`}
        aria-valuemax={progress.goal}
        aria-valuemin={0}
        aria-valuenow={Math.min(progress.calls, progress.goal)}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ece7d8]"
        role="progressbar"
      >
        <div className="h-full bg-[#f5b932]" style={{ width: `${progress.percent}%` }} />
      </div>
      <form action={setDailyCallGoal} className="mt-1.5 flex flex-wrap items-center gap-1">
        <input name="organizationId" type="hidden" value={organizationId} />
        {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
        {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
        {selectedDay !== today ? <input name="callDay" type="hidden" value={selectedDay} /> : null}
        {spanish ? <input name="lang" type="hidden" value="es" /> : null}
        <label className="text-[10px] font-semibold text-[#5c6578]">
          {spanish ? "Meta" : "Goal"}
          <input
            className="ml-1 w-16 rounded border border-[#d5d0c4] bg-white px-1.5 py-0.5 text-xs text-[#071b42]"
            defaultValue={goal}
            max={MAX_DAILY_CALL_GOAL}
            min={MIN_DAILY_CALL_GOAL}
            name="dailyCallGoal"
            required
            type="number"
          />
        </label>
        <button className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#071b42]" type="submit">
          {spanish ? "Guardar" : "Save"}
        </button>
      </form>
      {!ready ? (
        <p className="mt-1 text-[10px] leading-4 text-[#8a6a12]">
          {missing
            ? spanish
              ? "El registro del día aún no está en la base. La llamada igual queda marcada en el prospecto."
              : "The daily log is not on this database yet. The prospect is still marked contacted."
            : spanish
              ? "No se pudo cargar el registro de hoy. Inténtalo de nuevo."
              : "Today's log did not load. Try again."}
        </p>
      ) : null}
      <div className="mt-2 border-t border-[#ece7d8] pt-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5c6578]">
            {spanish ? "Registro" : "Call log"} · {deskDateLabel(selectedDay, spanish)}
            {showingToday ? (spanish ? " · hoy" : " · today") : null}
          </p>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <a className="text-[#071b42] underline" href={dayHref(previousDay, today, spanish, previewOrgSlug, workspaceSlug)}>
              {spanish ? "Anterior" : "Previous"}
            </a>
            {showingToday ? null : (
              <a className="text-[#071b42] underline" href={dayHref(today, today, spanish, previewOrgSlug, workspaceSlug)}>
                {spanish ? "Hoy" : "Today"}
              </a>
            )}
            {nextDay <= today ? (
              <a className="text-[#071b42] underline" href={dayHref(nextDay, today, spanish, previewOrgSlug, workspaceSlug)}>
                {spanish ? "Siguiente" : "Next"}
              </a>
            ) : null}
          </div>
        </div>
        <form action="/client" className="mt-1 flex flex-wrap items-center gap-1" method="get">
          {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
          {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
          {spanish ? <input name="lang" type="hidden" value="es" /> : null}
          <label className="text-[10px] font-semibold text-[#5c6578]">
            <span className="sr-only">{spanish ? "Día del registro" : "Call log day"}</span>
            <input
              className="rounded border border-[#d5d0c4] bg-white px-1.5 py-0.5 text-xs text-[#071b42]"
              defaultValue={selectedDay}
              name="callDay"
              type="date"
            />
          </label>
          <button className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#071b42]" type="submit">
            {spanish ? "Ver día" : "Show day"}
          </button>
        </form>
        {entries.length === 0 ? (
          <p className="mt-1 text-[11px] leading-4 text-[#5c6578]">
            {spanish ? "Nada registrado este día." : "No calls logged this day."}
          </p>
        ) : (
          <ol className="mt-1 max-h-36 space-y-1 overflow-auto">
            {entries.map((entry) => (
              <CallLogRow entry={entry} key={entry.id} spanish={spanish} timeZone={timeZone} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function CallLogRow({
  entry,
  spanish,
  timeZone,
}: {
  entry: DeskCallLogEntry;
  spanish: boolean;
  timeZone: string;
}) {
  return (
    <li className="text-[11px] leading-4 text-[#33415c]" data-call-log-row={entry.id}>
      <span className="font-semibold text-[#8a93a3]">{formatDeskCallTime(entry.loggedAt, spanish, timeZone)}</span>{" "}
      <span className="font-semibold text-[#071b42]">{entry.prospectName}</span>
      {entry.note ? <span className="text-[#33415c]"> · {entry.note}</span> : null}
    </li>
  );
}
