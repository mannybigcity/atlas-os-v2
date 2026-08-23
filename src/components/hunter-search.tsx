"use client";

import { useActionState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import {
  searchHunterProspects,
  type HunterSearchState,
} from "@/server/hunter/actions";

const initialHunterSearchState: HunterSearchState = {
  status: "idle",
  message: null,
  query: null,
  places: [],
};

export function HunterSearch() {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [state, action, pending] = useActionState(
    searchHunterProspects,
    initialHunterSearchState,
  );

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" id="hunter-places-search">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {spanish ? "Vista previa de descubrimiento de HUNTER" : "HUNTER discovery preview"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {spanish ? "Encuentra negocios dirigidos por sus dueños en un mercado" : "Find owner-led businesses in one market"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            {spanish ? "Un clic realiza una solicitud limitada a Google Places de hasta diez resultados. Busca por código postal, ciudad/estado o radio de mercado antes de revisar y agregar un resultado al CRM. Los resultados permanecen solo en esta sesión y no se copian al CRM." : "One click makes one bounded Google Places request for up to ten results. Search by ZIP code, city/state, or a radius around a market before the result is reviewed and added to the CRM. Results stay only in this page session and are not copied into the CRM."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
          {spanish ? "Máximo 20 búsquedas/día" : "20 searches/day max"}
        </span>
      </div>

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_.8fr_.45fr_.45fr_.55fr_auto] sm:items-end">
        <label>
          <span className="text-sm font-medium text-slate-700">{spanish ? "Tipo de negocio" : "Business type"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="service"
            placeholder={spanish ? "Taller mecánico o guardería" : "Auto repair shop or daycare"}
            required
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">{spanish ? "Código postal" : "ZIP code"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="zipCode"
            placeholder="77065"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">{spanish ? "Ciudad" : "City"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="city"
            placeholder="Katy"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">{spanish ? "Estado" : "State"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="state"
            placeholder="TX"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">{spanish ? "Radio" : "Radius"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            min="1"
            name="radiusMiles"
            placeholder="10"
            type="number"
          />
        </label>
        <button
          className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? spanish ? "Buscando…" : "Searching…" : spanish ? "Buscar 10" : "Search 10"}
        </button>
      </form>

      {state.message ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {localizeHunterMessage(state.message, language)}
        </div>
      ) : null}

      {state.places.length ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <p className="text-sm font-semibold text-slate-900">{state.query}</p>
            <p
              className="text-sm font-normal tracking-normal text-[#5e5e5e]"
              translate="no"
            >
              Google Maps
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {state.places.map((place) => (
              <article className="py-4" key={place.placeId}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{place.name}</h3>
                    {place.formattedAddress ? (
                      <p className="mt-1 text-sm text-slate-600">{place.formattedAddress}</p>
                    ) : null}
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">
                      {place.primaryType?.replaceAll("_", " ") ?? (spanish ? "Negocio" : "Business")}
                      {place.businessStatus ? ` · ${place.businessStatus.replaceAll("_", " ")}` : ""}
                    </p>
                  </div>
                  {place.googleMapsUrl ? (
                    <a
                      className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-slate-50"
                      href={place.googleMapsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {spanish ? "Verificar en Google Maps" : "Verify on Google Maps"}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
            {spanish ? "Los resultados locales de Google Maps se ordenan según factores como relevancia, distancia y prominencia. Atlas no conserva el contenido de estos resultados. El radio se usa como una sugerencia de búsqueda, no como un límite geográfico estricto." : "Google Maps local results are ranked using factors including relevance, distance, and prominence. Atlas does not persist this result content. Radius is used as a search hint in the query prompt, not a hard geofence clamp."}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function localizeHunterMessage(message: string, language: "en" | "es") {
  if (language !== "es") return message;

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
