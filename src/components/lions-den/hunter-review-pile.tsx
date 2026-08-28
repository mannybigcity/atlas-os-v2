import { acceptHunterReviewItem, dismissHunterReviewItem } from "@/server/hunter/actions";
import type { HunterReviewItem } from "@/server/hunter/review";

type HunterReviewPileProps = {
  organizationId: string;
  items: HunterReviewItem[];
  setupRequired?: boolean;
  spanish: boolean;
};

export function HunterReviewPile({
  organizationId,
  items,
  setupRequired = false,
  spanish,
}: HunterReviewPileProps) {
  return (
    <section className="mt-6 rounded-[1.6rem] border border-[#d8c27a] bg-white p-5" id="hunter-review-pile">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Pila de revisión" : "Review pile"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "Hallazgos de HUNTER, todavía no son prospectos" : "HUNTER finds, not Prospects yet"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Acepta un resultado para que el vendedor pueda llamarlo. Atlas no envía correos, llamadas ni SMS."
              : "Accept a listing to make it a Prospect the salesman can call. Atlas does not email, call, or text anyone."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {items.length} {spanish ? "en revisión" : "in review"}
        </span>
      </div>

      {setupRequired ? (
        <p className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "Aplica la migración de la pila de revisión de HUNTER para guardar hallazgos por organización."
            : "Apply the HUNTER review pile migration to keep finds per organization."}
        </p>
      ) : null}

      {!setupRequired && items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#d5d0c4] bg-[#fbfaf4] p-5 text-sm leading-6 text-[#5c6578]">
          {spanish
            ? "La pila está vacía. Busca un mercado arriba. Los resultados se quedan aquí hasta que los aceptes."
            : "The pile is empty. Search a market above. Results stay here until you accept them."}
        </p>
      ) : null}

      {!setupRequired && items.length > 0 ? (
        <div className="mt-5 divide-y divide-[#ece7d8]">
          {items.map((item) => (
            <article className="py-4" key={item.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-semibold text-[#071b42]">{item.name}</h3>
                  {item.formattedAddress ? (
                    <p className="mt-1 text-sm text-[#5c6578]">{item.formattedAddress}</p>
                  ) : null}
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
                    {(item.primaryType ?? (spanish ? "Negocio" : "Business")).replaceAll("_", " ")}
                    {item.businessStatus ? ` · ${item.businessStatus.replaceAll("_", " ")}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-[#8a93a3]" translate="no">
                    Google Maps · {item.searchQuery}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.googleMapsUrl ? (
                    <a
                      className="rounded-full border border-[#071b42] bg-white px-4 py-2 text-sm font-semibold text-[#071b42]"
                      href={item.googleMapsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {spanish ? "Verificar" : "Verify"}
                    </a>
                  ) : null}
                  <form action={acceptHunterReviewItem}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="reviewItemId" type="hidden" value={item.id} />
                    <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" type="submit">
                      {spanish ? "Aceptar a Prospectos" : "Accept into Prospects"}
                    </button>
                  </form>
                  <form action={dismissHunterReviewItem}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="reviewItemId" type="hidden" value={item.id} />
                    <button className="rounded-full border border-[#d5d0c4] bg-white px-4 py-2 text-sm font-semibold text-[#5c6578]" type="submit">
                      {spanish ? "Descartar" : "Dismiss"}
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
