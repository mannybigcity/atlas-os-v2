"use client";

import { useActionState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import { HunterFunnelStrip } from "@/components/lions-den/hunter-funnel-strip";
import { acceptHunterReviewItem, dismissHunterReviewItem, searchHunterProspects } from "@/server/hunter/actions";
import type { HunterSearchFind } from "@/server/hunter/review";
import { initialHunterSearchState } from "@/server/hunter/types";

type HunterSearchProps = {
  organizationId?: string;
  prospectsHref?: string;
};

export function HunterSearch({ organizationId, prospectsHref = "/client/prospects" }: HunterSearchProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [state, action, pending] = useActionState(
    searchHunterProspects,
    initialHunterSearchState,
  );
  const reviewCount = state.places.filter((place) => place.lane === "review").length;
  const prospectCount = state.places.filter((place) => place.lane === "prospect").length;

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5" id="hunter-places-search">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            HUNTER
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
            {spanish ? "Busca negocios locales" : "Find local businesses"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
            {organizationId
              ? spanish
                ? "Hasta diez resultados de Google Places por búsqueda. Entran a la PILA DE REVISIÓN. No son prospectos hasta que los aceptes. Atlas no envía correos, llamadas ni SMS."
                : "Up to ten Google Places results per search. They land in the REVIEW PILE. They are not Prospects until you accept them. Atlas does not email, call, or text anyone."
              : spanish
                ? "Un clic realiza una solicitud limitada a Google Places de hasta diez resultados. Los resultados permanecen solo en esta sesión y no se copian al CRM."
                : "One click makes one bounded Google Places request for up to ten results. Results stay only in this page session and are not copied into the CRM."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {spanish ? "Máximo 20 búsquedas/día" : "20 searches/day max"}
        </span>
      </div>

      <HunterFunnelStrip spanish={spanish} />

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_.8fr_.45fr_.45fr_.55fr_auto] sm:items-end">
        {organizationId ? <input name="organizationId" type="hidden" value={organizationId} /> : null}
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Tipo de negocio" : "Business type"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="service"
            placeholder={spanish ? "Taller mecánico o guardería" : "Auto repair shop or daycare"}
            required
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Código postal" : "ZIP code"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="zipCode"
            placeholder="77065"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Ciudad" : "City"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="city"
            placeholder="Katy"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Estado" : "State"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="state"
            placeholder="TX"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Radio" : "Radius"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            min="1"
            name="radiusMiles"
            placeholder="10"
            type="number"
          />
        </label>
        <button
          className="rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c2b63] disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? spanish ? "Buscando…" : "Searching…" : spanish ? "Buscar 10" : "Search 10"}
        </button>
      </form>

      {state.message ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" || state.tableMissing ? "border-rose-200 bg-rose-50 text-rose-900" : "border-[#d8c27a] bg-[#fff8e6] text-[#071b42]"}`}
        >
          {localizeHunterMessage(state.message, language)}
          {organizationId && prospectCount > 0 && reviewCount === 0 && !state.tableMissing ? (
            <p className="mt-3">
              <a className="font-semibold underline" href={prospectsHref}>
                {spanish ? "Abrir Prospectos" : "Open Prospects"}
              </a>
              {spanish ? " — siguiente paso: llamar. Atlas no contactó a nadie." : " — next step: call. Atlas did not contact anyone."}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.places.length ? (
        <div className="mt-5 rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece7d8] pb-3">
            <div>
              <p className="text-sm font-semibold text-[#071b42]">{state.query}</p>
              <p className="mt-1 text-xs leading-5 text-[#5c6578]">
                {searchResultsCaption({ organizationId: Boolean(organizationId), reviewCount, prospectCount, spanish })}
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a93a3]" translate="no">
              {spanish ? "Fuente: Google Maps" : "Source: Google Maps"}
            </p>
          </div>
          <div className="divide-y divide-[#ece7d8]">
            {state.places.map((place) => (
              <HunterSearchFindRow
                key={place.placeId}
                organizationId={organizationId}
                place={place}
                prospectsHref={prospectsHref}
                spanish={spanish}
              />
            ))}
          </div>
          <div className="border-t border-[#ece7d8] pt-3 text-xs leading-5 text-[#8a93a3]">
            {organizationId
              ? spanish
                ? "Google Maps solo es la fuente. Acepta un hallazgo para moverlo a Prospectos. El radio es una sugerencia de búsqueda, no un límite geográfico estricto."
                : "Google Maps is only the source. Accept a find to move it into Prospects. Radius is a search hint, not a hard geofence."
              : spanish
                ? "Los resultados locales de Google Maps se ordenan según factores como relevancia, distancia y prominencia. Atlas no conserva el contenido de estos resultados. El radio se usa como una sugerencia de búsqueda, no como un límite geográfico estricto."
                : "Google Maps local results are ranked using factors including relevance, distance, and prominence. Atlas does not persist this result content. Radius is used as a search hint in the query prompt, not a hard geofence clamp."}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HunterSearchFindRow({
  organizationId,
  place,
  prospectsHref,
  spanish,
}: {
  organizationId?: string;
  place: HunterSearchFind;
  prospectsHref: string;
  spanish: boolean;
}) {
  return (
    <article className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-[#071b42]">{place.name}</h3>
          {place.formattedAddress ? (
            <p className="mt-1 text-sm text-[#5c6578]">{place.formattedAddress}</p>
          ) : null}
          <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
            {place.primaryType?.replaceAll("_", " ") ?? (spanish ? "Negocio" : "Business")}
            {place.businessStatus ? ` · ${place.businessStatus.replaceAll("_", " ")}` : ""}
          </p>
          {organizationId ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#071b42]">
              {place.lane === "prospect"
                ? spanish ? "Ya es prospecto" : "Already a Prospect"
                : place.lane === "review"
                  ? spanish ? "En pila de revisión" : "In REVIEW PILE"
                  : spanish ? "No guardado" : "Not saved"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {organizationId && place.lane === "review" && place.reviewItemId ? (
            <>
              <form action={acceptHunterReviewItem}>
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="reviewItemId" type="hidden" value={place.reviewItemId} />
                <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" type="submit">
                  {spanish ? "Aceptar" : "Accept"}
                </button>
              </form>
              <form action={dismissHunterReviewItem}>
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="reviewItemId" type="hidden" value={place.reviewItemId} />
                <button className="rounded-full border border-[#d5d0c4] bg-white px-4 py-2 text-sm font-semibold text-[#5c6578]" type="submit">
                  {spanish ? "Omitir" : "Skip"}
                </button>
              </form>
            </>
          ) : null}
          {organizationId && place.lane === "review" && !place.reviewItemId ? (
            <span className="rounded-full bg-[#fff8e6] px-4 py-2 text-sm font-semibold text-[#071b42]">
              {spanish ? "Acepta abajo en la pila" : "Accept in the pile below"}
            </span>
          ) : null}
          {organizationId && place.lane === "prospect" ? (
            <a
              className="rounded-full bg-[#071b42] px-4 py-2 text-center text-sm font-semibold text-white"
              href={prospectsHref}
            >
              {spanish ? "Abrir Prospectos" : "Open Prospects"}
            </a>
          ) : null}
          {place.googleMapsUrl ? (
            <a
              className="shrink-0 rounded-full border border-[#071b42] px-4 py-2 text-center text-sm font-semibold text-[#071b42] hover:bg-white"
              href={place.googleMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              {spanish ? "Verificar en Google Maps" : "Verify on Google Maps"}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function searchResultsCaption(input: {
  organizationId: boolean;
  reviewCount: number;
  prospectCount: number;
  spanish: boolean;
}) {
  if (!input.organizationId) {
    return input.spanish ? "Resultados temporales de esta sesión." : "Session-only preview results.";
  }
  if (input.reviewCount > 0 && input.prospectCount > 0) {
    return input.spanish
      ? "Acepta los hallazgos nuevos. Los ya aceptados están en Prospectos."
      : "Accept the new finds. Listings already accepted stay in Prospects.";
  }
  if (input.prospectCount > 0) {
    return input.spanish
      ? "Estos negocios ya son Prospectos. Ábrelos para llamar."
      : "These businesses are already Prospects. Open Prospects to call.";
  }
  if (input.reviewCount > 0) {
    return input.spanish
      ? "Hallazgos en la PILA DE REVISIÓN. Acepta para que el vendedor pueda llamar."
      : "Finds in the REVIEW PILE. Accept to put them on the call list.";
  }
  return input.spanish
    ? "Google Maps solo es la fuente. Todavía no hay hallazgos en la pila."
    : "Google Maps is only the source. Nothing is in the pile yet.";
}

function localizeHunterMessage(message: string, language: "en" | "es") {
  if (language !== "es") return message;

  const persistedMatch = message.match(/^(\d+) Google Maps result/);
  if (persistedMatch) {
    return message
      .replace("Google Maps result", "resultado de Google Maps")
      .replace("Google Maps results", "resultados de Google Maps")
      .replace("listings saved to the REVIEW PILE", "fichas guardadas en la PILA DE REVISIÓN")
      .replace("listing saved to the REVIEW PILE", "ficha guardada en la PILA DE REVISIÓN")
      .replace("They are not Prospects until you accept them.", "No son prospectos hasta que los aceptes.")
      .replace("Atlas will not email, call, or text anyone.", "Atlas no enviará correos, llamadas ni SMS.")
      .replace("These listings are already Prospects. Open Prospects to call. Atlas did not contact anyone.", "Estas fichas ya son prospectos. Abre Prospectos para llamar. Atlas no contactó a nadie.")
      .replace("listings already accepted stay in Prospects.", "fichas ya aceptadas permanecen en Prospectos.")
      .replace("listing already accepted stay in Prospects.", "ficha ya aceptada permanece en Prospectos.")
      .replace("Atlas found these businesses but could not save them to the REVIEW PILE. Try the search again. Atlas did not contact anyone.", "Atlas encontró estos negocios pero no pudo guardarlos en la PILA DE REVISIÓN. Intenta la búsqueda otra vez. Atlas no contactó a nadie.")
      .replace("Atlas found these businesses but could not save them.", "Atlas encontró estos negocios pero no pudo guardarlos.")
      .replace("The review-pile table is missing on this database.", "Falta la tabla de la pila de revisión en esta base de datos.")
      .replace("then search again.", "luego busca otra vez.")
      .replace("No new listings were added to the REVIEW PILE.", "No se agregaron fichas nuevas a la PILA DE REVISIÓN.")
      .replace("Results stay only in this page session and are not copied into the CRM.", "Los resultados permanecen solo en esta sesión y no se copian al CRM.");
  }

  const transientMatch = message.match(/^(\d+) transient Google Maps results\./);
  if (transientMatch) {
    return `${transientMatch[1]} resultados temporales de Google Maps. Abre la ficha oficial, verifica los datos en el sitio del negocio y luego agrega el prospecto.`;
  }

  return ({
    "Enter a business type plus a ZIP code or city/state.": "Escribe un tipo de negocio y un código postal o ciudad/estado.",
    "Radius must be a whole number between 1 and 250 miles.": "El radio debe ser un número entero entre 1 y 250 millas.",
    "Apply the Atlas Agent Usage Ledger migration before using a paid data API.": "Aplica la migración del registro de uso de agentes de Atlas antes de usar una API de datos de pago.",
    "HUNTER reached the 20-search daily safety cap. Review today's results before spending more.": "HUNTER alcanzó el límite diario de 20 búsquedas. Revisa los resultados de hoy antes de gastar más.",
    "The provider returned results, but Atlas could not record API usage. Run the search again only after checking the ledger.": "El proveedor devolvió resultados, pero Atlas no pudo registrar el uso de la API. Repite la búsqueda solo después de revisar el registro.",
    "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment.": "GOOGLE_PLACES_API_KEY no está configurada en el entorno del servidor.",
    "Google Places could not complete this search. The failed request was recorded.": "Google Places no pudo completar la búsqueda. La solicitud fallida quedó registrada.",
  } as Record<string, string>)[message] ?? message;
}
