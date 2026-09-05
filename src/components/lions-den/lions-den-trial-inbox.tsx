import Link from "next/link";
import type { TrialInboxRow } from "@/lib/lions-den/trial-inbox";

type LionsDenTrialInboxBoardProps = {
  rows: TrialInboxRow[];
  setupRequired?: boolean;
  spanish: boolean;
};

export function LionsDenTrialInboxBoard({
  rows,
  setupRequired = false,
  spanish,
}: LionsDenTrialInboxBoardProps) {
  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Revisión humana" : "Human review"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "Prueba de 7 días" : "7 Day Trial"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Espacios de prueba nuevos. Abre el escritorio para revisar. Atlas no envía correos, llamadas ni SMS."
              : "New trial workspaces. Open a desk to look around. Atlas does not email, call, or text anyone."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {rows.length} {spanish ? "en cola" : "in queue"}
        </span>
      </div>

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
            <article className="py-4" key={`${row.organizationSlug}-${row.userId}`}>
              <Link className="block rounded-2xl outline-offset-4 hover:bg-[#fffdf6]" href={row.previewHref}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[#071b42] underline decoration-[#d8c27a] underline-offset-4">
                      {row.companyName}
                    </h3>
                    {row.ownerName ? (
                      <p className="mt-1 text-sm font-medium text-[#071b42]">{row.ownerName}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-[#5c6578]">{row.email || (spanish ? "Sin correo" : "No email")}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
                      {spanish ? "Inicio" : "Started"} · {formatStarted(row.startedAt, spanish)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                    {emailConfirmLabel(row.emailConfirmedAt, spanish)}
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
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

function emailConfirmLabel(value: string | null, spanish: boolean) {
  if (value) return spanish ? "Correo confirmado" : "Email confirmed";
  return spanish ? "Correo sin confirmar" : "Email not confirmed";
}
