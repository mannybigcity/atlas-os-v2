import Link from "next/link";
import { formatTodaysFiveReason, todaysFiveNotes, type TodaysFiveDesk } from "@/lib/lions-den/todays-five";

type TodaysFivePanelProps = {
  model: TodaysFiveDesk;
  prospectHref: (opportunityId: string) => string;
  spanish: boolean;
};

export function TodaysFivePanel({ model, prospectHref, spanish }: TodaysFivePanelProps) {
  const title = spanish ? "Los 5 de hoy" : "Today’s 5";
  const notes = todaysFiveNotes({
    rowCount: model.rows.length,
    poolSize: model.poolSize,
    queueSize: model.queueSize,
    loggedOff: model.loggedOff,
    skippedSamples: model.skippedSamples,
    placesChecked: model.placesChecked,
    hunterChecked: model.hunterChecked,
    spanish,
  });
  const thin = model.rows.length < 5;

  return (
    <div
      className="ld-todays-five"
      data-todays-five=""
      data-todays-five-count={model.rows.length}
      data-todays-five-thin={thin ? "" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">{title}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5c6578]">
          {model.rows.length}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-4 text-[#33415c]">
        {spanish ? "Los más fáciles de alcanzar por teléfono. Tú marcas." : "Most likely to answer. You dial."}
      </p>
      {model.rows.length === 0 ? (
        <p className="ld-empty mt-1.5" data-todays-five-empty="">
          {notes.situation}
        </p>
      ) : (
        <ol className="mt-1 list-none">
          {model.rows.map((row, index) => (
            <li
              className="border-b border-[#f0e6c4] py-1.5 last:border-b-0"
              data-todays-five-row={row.id}
              key={row.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-black text-[#8a6a12]">{index + 1}</span>
                    <Link
                      className="truncate text-sm font-semibold text-[#071b42] underline decoration-[#d8c27a] underline-offset-2"
                      href={prospectHref(row.id)}
                    >
                      {row.name}
                    </Link>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.reasons.map((reason) => (
                      <span
                        className="rounded-full border border-[#e9d9a6] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8a6a12]"
                        data-todays-five-reason={reason}
                        key={reason}
                      >
                        {formatTodaysFiveReason(reason, spanish)}
                      </span>
                    ))}
                  </div>
                  {row.hunterEmail ? (
                    <p className="mt-0.5 text-[10px] leading-4 text-[#5c6578]">
                      {spanish ? "Correo en ficha" : "Email on file"}: {row.hunterEmail}
                    </p>
                  ) : null}
                </div>
                <a
                  className="shrink-0 rounded bg-[#071b42] px-2 py-1 text-[10px] font-semibold text-white"
                  data-todays-five-dial={row.id}
                  href={row.phoneHref}
                >
                  {spanish ? "Llamar" : "Call"} {row.phone}
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-1.5 text-[10px] leading-4 text-[#5c6578]" data-todays-five-situation="">
        {model.rows.length === 0 ? notes.footnotes[0] : notes.situation}
      </p>
      {(model.rows.length === 0 ? notes.footnotes.slice(1) : notes.footnotes).map((line) => (
        <p className="text-[10px] leading-4 text-[#5c6578]" key={line}>
          {line}
        </p>
      ))}
    </div>
  );
}
