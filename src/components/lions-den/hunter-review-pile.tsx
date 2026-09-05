import { acceptHunterReviewItem, dismissHunterReviewItem } from "@/server/hunter/actions";
import { formatHunterGapLabel, hunterGapLabels } from "@/server/hunter/filters";
import { HUNTER_REVIEW_PILE_MIGRATION } from "@/server/hunter/review";
import type { HunterReviewItem } from "@/server/hunter/review";

type HunterReviewPileProps = {
  organizationId: string;
  items: HunterReviewItem[];
  setupRequired?: boolean;
  acceptedCount?: number;
  prospectsHref?: string;
  spanish: boolean;
};

export function HunterReviewPile({
  organizationId,
  items,
  setupRequired = false,
  acceptedCount = 0,
  prospectsHref = "/client/prospects",
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
        <div className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">
            {spanish
              ? "Esta mesa aún no puede guardar hallazgos."
              : "This desk cannot save HUNTER finds yet."}
          </p>
          <p className="mt-2">
            {spanish
              ? "Falta la tabla de la pila de revisión en esta base de datos. No es un fallo tuyo — es un paso único del fundador."
              : "The review-pile table is missing on this database. This is a one-time founder setup step, not something the salesman did wrong."}
          </p>
          <p className="mt-2">
            {spanish ? "Fundador: ejecuta " : "Founder: apply "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">{HUNTER_REVIEW_PILE_MIGRATION}</code>
            {spanish
              ? " en el editor SQL de Supabase y recarga esta página."
              : " in the Supabase SQL editor, then reload this page."}
          </p>
        </div>
      ) : null}

      {!setupRequired && items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d5d0c4] bg-[#fbfaf4] p-5 text-sm leading-6 text-[#5c6578]">
          {acceptedCount > 0 ? (
            <>
              <p className="font-semibold text-[#071b42]">
                {spanish ? "Nada en revisión." : "Nothing in review."}
              </p>
              <p className="mt-2">
                {spanish
                  ? "Los hallazgos de esta búsqueda ya son Prospectos. Ábrelos para que el vendedor llame. Atlas no contactó a nadie."
                  : "These finds are already Prospects. Open Prospects so the salesman can call. Atlas did not contact anyone."}
              </p>
              <a
                className="mt-4 inline-flex rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white"
                href={prospectsHref}
              >
                {spanish ? "Abrir Prospectos" : "Open Prospects"}
              </a>
            </>
          ) : (
            <p>
              {spanish
                ? "La pila está vacía. Busca un mercado arriba. Los resultados se quedan aquí hasta que los aceptes."
                : "The pile is empty. Search a market above. Results stay here until you accept them."}
            </p>
          )}
        </div>
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
                  {hunterGapLabels(item).length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hunterGapLabels(item).map((label) => (
                        <span
                          className="rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#071b42]"
                          key={label}
                        >
                          {formatHunterGapLabel(label, spanish)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-[#8a93a3]" translate="no">
                    Google Maps · {item.searchQuery}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      {spanish ? "Omitir" : "Skip"}
                    </button>
                  </form>
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
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
