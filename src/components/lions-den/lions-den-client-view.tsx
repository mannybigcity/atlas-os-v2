import Link from "next/link";
import type { ClientViewDeskRow } from "@/lib/lions-den/client-view";

type LionsDenClientViewBoardProps = {
  rows: ClientViewDeskRow[];
  setupRequired?: boolean;
  spanish: boolean;
};

export function LionsDenClientViewBoard({
  rows,
  setupRequired = false,
  spanish,
}: LionsDenClientViewBoardProps) {
  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6" data-client-view>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Revisión de Atlas" : "Atlas review"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "Vista de cliente" : "Client View"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Abre el escritorio de un cliente o de una prueba tal como ellos lo ven. Correos, teléfonos, direcciones, pagos, credenciales y mensajes con datos privados quedan ocultos. Los borradores siguen siendo borradores. Atlas no publica ni contacta a nadie."
              : "Open a client or trial desk the way they see it. Emails, phones, street addresses, payment details, credentials, and messages that contain private contact details stay hidden. Drafts stay drafts. Atlas does not publish or contact anyone."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {rows.length} {spanish ? "escritorios" : rows.length === 1 ? "desk" : "desks"}
        </span>
      </div>

      {setupRequired ? (
        <div className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "No pudimos cargar los escritorios. Confirma el acceso de servicio e inténtalo de nuevo."
            : "The desks could not load. Confirm service access and try again."}
        </div>
      ) : null}

      {!setupRequired && rows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish ? "Todavía no hay escritorios de clientes." : "No client desks yet."}
        </div>
      ) : null}

      {!setupRequired && rows.length > 0 ? (
        <div className="mt-5 divide-y divide-[#ece7d8]">
          {rows.map((row) => (
            <article className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" key={row.id}>
              <div>
                <h3 className="font-semibold text-[#071b42]">{row.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
                  {row.slug}
                  {row.createdAt ? ` · ${formatOpened(row.createdAt, spanish)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                  {row.kind === "client"
                    ? spanish
                      ? "Cliente"
                      : "Client"
                    : spanish
                      ? "Prueba"
                      : "Trial"}
                </span>
                <Link
                  className="inline-flex rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2a5c]"
                  data-client-view-open={row.slug}
                  href={row.openHref}
                >
                  {spanish ? "Abrir escritorio" : "Open desk"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function formatOpened(value: string, spanish: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(spanish ? "es" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
