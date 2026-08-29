import Link from "next/link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import { lionsDenHref } from "@/lib/lions-den/client-hub";

type LionsDenProspectsBoardProps = {
  prospects: OrganizationOpportunity[];
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
};

export function LionsDenProspectsBoard({
  prospects,
  previewOrgSlug,
  workspaceSlug,
  spanish,
}: LionsDenProspectsBoardProps) {
  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
        {spanish ? "Prospectos" : "Prospects"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
        {spanish ? "Negocios que el vendedor puede llamar" : "Businesses the salesman can call"}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
        {spanish
          ? "Solo aparecen aquí después de que aceptas un hallazgo de HUNTER. Atlas no llama, escribe ni envía SMS."
          : "These only appear after you accept a HUNTER find. Atlas does not call, email, or text anyone."}
      </p>

      {prospects.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "La lista de llamadas está vacía." : "The call list is empty."}</p>
          <p className="mt-2">
            {spanish
              ? "Abre HUNTER, revisa la pila y acepta el primer prospecto cuando esté listo para llamar."
              : "Open HUNTER, review the pile, and accept the first prospect when you are ready to call."}
          </p>
          <Link
            className="mt-4 inline-flex rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white"
            href={lionsDenHref("/client/hunter", previewOrgSlug, workspaceSlug)}
          >
            HUNTER
          </Link>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-[#ece7d8]">
          {prospects.map((prospect) => (
            <article className="py-4" key={prospect.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#071b42]">{prospect.name}</h3>
                  <p className="mt-1 text-sm text-[#5c6578]">{prospect.researchSummary}</p>
                </div>
                <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                  {prospect.stage.replaceAll("_", " ")}
                </span>
              </div>
              {prospect.nextAction ? (
                <p className="mt-2 text-sm font-medium text-[#071b42]">{prospect.nextAction}</p>
              ) : null}
              {prospect.sourceUrl ? (
                <a
                  className="mt-2 inline-flex text-sm font-semibold text-[#071b42] underline"
                  href={prospect.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {spanish ? "Verificar en Google Maps" : "Verify on Google Maps"}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
