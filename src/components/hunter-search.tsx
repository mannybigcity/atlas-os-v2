"use client";

import { useActionState, useState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import { HunterFunnelStrip } from "@/components/lions-den/hunter-funnel-strip";
import { acceptHunterReviewItem, dismissHunterReviewItem, searchHunterProspects } from "@/server/hunter/actions";
import {
  formatHunterGapLabel,
  hunterFiltersActive,
  hunterGapLabels,
  isMissingPlacePhone,
} from "@/server/hunter/filters";
import { prospectDetailPath } from "@/lib/lions-den/prospect-places";
import { isSelfSearch, type ReferralTarget, type TrialDeskVertical } from "@/lib/lions-den/trial-desk-market";
import type { HunterSearchFind } from "@/server/hunter/review";
import { initialHunterSearchState } from "@/server/hunter/types";
import { LD_CHIP } from "@/lib/lions-den/desk-chips";

type HunterSearchProps = {
  organizationId?: string;
  prospectsHref?: string;
  defaults?: {
    service?: string;
    zipCode?: string;
    city?: string;
    state?: string;
    ownService?: string;
    vertical?: TrialDeskVertical;
    targets?: ReferralTarget[];
  };
};

export function HunterSearch({
  organizationId,
  prospectsHref = "/client/prospects",
  defaults,
}: HunterSearchProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [state, action, pending] = useActionState(
    searchHunterProspects,
    initialHunterSearchState,
  );
  const [service, setService] = useState(defaults?.service ?? "");
  const [zipCode, setZipCode] = useState(defaults?.zipCode ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");
  const [region, setRegion] = useState(defaults?.state ?? "");
  const [radiusMiles, setRadiusMiles] = useState("");
  const targets = defaults?.targets ?? [];
  const selfSearch =
    defaults?.ownService && defaults.vertical
      ? isSelfSearch(service, { serviceQuery: defaults.ownService, vertical: defaults.vertical })
      : false;
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
            {spanish ? "Busca quien te mande trabajo" : "Find the businesses that send you work"}
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

      {targets.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] p-4" data-hunter-targets>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
            {spanish ? "Quién te manda clientes" : "Who sends you customers"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#33415c]">
            {spanish
              ? "No busques tu propio oficio; esos son tu competencia. Busca a los negocios que necesitan tu oficio todo el año. Toca uno para cargarlo."
              : "Do not search for your own trade; those are your competitors. Search for the businesses that need your trade all year. Tap one to load it."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {targets.map((target) => {
              const active = target.query === service.trim().toLowerCase();
              return (
                <button
                  className={`rounded-full border px-3 py-1.5 text-left text-sm font-semibold transition ${
                    active
                      ? "border-[#071b42] bg-[#071b42] text-white"
                      : "border-[#d5d0c4] bg-white text-[#071b42] hover:border-[#071b42]"
                  }`}
                  data-hunter-target={target.query}
                  key={target.query}
                  onClick={() => setService(target.query)}
                  title={spanish ? target.whyEs : target.why}
                  type="button"
                >
                  {target.query}
                </button>
              );
            })}
          </div>
          {targets.find((target) => target.query === service.trim().toLowerCase()) ? (
            <p className="mt-3 text-sm font-semibold text-[#071b42]">
              {spanish
                ? targets.find((target) => target.query === service.trim().toLowerCase())?.whyEs
                : targets.find((target) => target.query === service.trim().toLowerCase())?.why}
            </p>
          ) : null}
        </div>
      ) : null}

      {selfSearch ? (
        <p
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
          data-hunter-self-search
        >
          {spanish
            ? `“${service.trim()}” es tu propio oficio. Esta búsqueda te dará competidores, no clientes. Elige uno de los tipos de arriba.`
            : `“${service.trim()}” is your own trade. This search returns competitors, not customers. Pick one of the types above instead.`}
        </p>
      ) : null}

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_.8fr_.45fr_.45fr_.55fr_auto] sm:items-end">
        {organizationId ? <input name="organizationId" type="hidden" value={organizationId} /> : null}
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "A quién buscar" : "Who to look for"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="service"
            onChange={(event) => setService(event.target.value)}
            placeholder={spanish ? "Ej. administradora de propiedades" : "e.g. property management company"}
            required
            value={service}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Código postal" : "ZIP code"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="zipCode"
            onChange={(event) => setZipCode(event.target.value)}
            placeholder={spanish ? "Código postal" : "ZIP"}
            value={zipCode}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Ciudad" : "City"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="city"
            onChange={(event) => setCity(event.target.value)}
            placeholder={spanish ? "Ciudad" : "City"}
            value={city}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Estado" : "State"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            name="state"
            onChange={(event) => setRegion(event.target.value)}
            placeholder={spanish ? "Estado" : "State"}
            value={region}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-[#071b42]">{spanish ? "Radio" : "Radius"}</span>
          <input
            className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
            min="1"
            name="radiusMiles"
            onChange={(event) => setRadiusMiles(event.target.value)}
            placeholder="10"
            type="number"
            value={radiusMiles}
          />
        </label>
        <button
          className="rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c2b63] disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? spanish ? "Buscando…" : "Searching…" : spanish ? "Buscar 10" : "Search 10"}
        </button>
        <div className="sm:col-span-2 xl:col-span-full rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#071b42]">
            {spanish ? "Filtros opcionales" : "Optional filters"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#33415c]">
            {spanish
              ? "Déjalos apagados para ver todos los resultados de Google Maps. Atlas solo ve el sitio que Maps lista — no recibe Facebook ni Instagram, y no inventa teléfono ni web."
              : "Leave these off to see every Google Maps result. Atlas only sees the website Maps lists — it does not get Facebook or Instagram fields, and it does not invent a phone or website."}
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#071b42]">
              <input className="h-4 w-4 accent-[#071b42]" name="missingWebsite" type="checkbox" value="yes" />
              {spanish ? "Sin sitio web" : "No website"}
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#071b42]">
              <input className="h-4 w-4 accent-[#071b42]" name="weakSocial" type="checkbox" value="yes" />
              {spanish ? "Redes débiles" : "Weak social"}
            </label>
          </div>
        </div>
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

      {state.status === "success" && !state.places.length && hunterFiltersActive(state.filters) && state.rawCount > 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">
            {spanish ? "Ningún hueco en esta búsqueda." : "No gap leads in this search."}
          </p>
          <p className="mt-2 text-[#33415c]">
            {spanish
              ? "Google Maps sí devolvió negocios. Ninguno coincidió con Sin sitio web o Redes débiles. Quita los filtros para ver la lista completa. Atlas no inventó un sitio ni un teléfono."
              : "Google Maps did return businesses. None matched No website or Weak social. Turn the filters off to see the full list. Atlas did not invent a website or phone."}
          </p>
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
          {place.nationalPhoneNumber || place.internationalPhoneNumber ? (
            <p className="mt-1 text-sm font-medium text-[#071b42]">
              {place.nationalPhoneNumber || place.internationalPhoneNumber}
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-[#8a6a12]">
              {spanish ? "Google no publicó un teléfono." : "Google did not publish a phone number."}
            </p>
          )}
          <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#8a93a3]">
            {place.primaryType?.replaceAll("_", " ") ?? (spanish ? "Negocio" : "Business")}
            {place.businessStatus ? ` · ${place.businessStatus.replaceAll("_", " ")}` : ""}
          </p>
          {hunterGapLabels(place).length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {hunterGapLabels(place).map((label) => (
                <span
                  className="rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#071b42]"
                  key={label}
                >
                  {formatHunterGapLabel(label, spanish)}
                </span>
              ))}
            </div>
          ) : null}
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
              <form
                action={acceptHunterReviewItem}
                onSubmit={(event) => {
                  if (!isMissingPlacePhone(place)) return;
                  const ok = window.confirm(
                    spanish
                      ? "Google no publicó un teléfono. Atlas no inventará uno. ¿Aceptar igual? Esto no será un prospecto para llamar."
                      : "Google did not publish a phone. Atlas will not invent one. Accept anyway? This will not become a Call prospect.",
                  );
                  if (!ok) event.preventDefault();
                }}
              >
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="reviewItemId" type="hidden" value={place.reviewItemId} />
                <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white" type="submit">
                  {spanish ? "Aceptar" : "Accept"}
                </button>
              </form>
              <form action={dismissHunterReviewItem}>
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="reviewItemId" type="hidden" value={place.reviewItemId} />
                <button className={LD_CHIP} type="submit">
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
              href={place.opportunityId ? prospectDetailPath(place.opportunityId, prospectsHref) : prospectsHref}
            >
              {spanish ? "Abrir Prospectos" : "Open Prospects"}
            </a>
          ) : null}
          {place.googleMapsUrl ? (
            <a
              className={`shrink-0 ${LD_CHIP}`}
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

  const filteredEmptyMatch = message.match(
    /^Google Maps returned (\d+) listings?\. None matched (.+)\. Atlas can only see the website Google lists/,
  );
  if (filteredEmptyMatch) {
    const labels = filteredEmptyMatch[2]
      ?.replace("no website", "sin sitio web")
      .replace("weak social", "redes débiles");
    const listingWord = filteredEmptyMatch[1] === "1" ? "ficha" : "fichas";
    return `Google Maps devolvió ${filteredEmptyMatch[1]} ${listingWord}. Ninguna coincidió con ${labels}. Atlas solo ve el sitio que Google lista — no recibe campos de Facebook ni Instagram, y no inventa un sitio ni un teléfono. Quita los filtros para ver la lista completa.`;
  }

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
      .replace("Results stay only in this page session and are not copied into the CRM.", "Los resultados permanecen solo en esta sesión y no se copian al CRM.")
      .replace("narrowed from", "reducidos de")
      .replace("no website", "sin sitio web")
      .replace("weak social", "redes débiles");
  }

  const transientMatch = message.match(/^(\d+) transient Google Maps results\./);
  if (transientMatch) {
    return `${transientMatch[1]} resultados temporales de Google Maps. Abre la ficha oficial, verifica los datos en el sitio del negocio y luego agrega el prospecto.`;
  }

  const httpMatch = message.match(
    /^Google Places could not complete this search \(HTTP (\d+)\)\. The failed request was recorded\.$/,
  );
  if (httpMatch) {
    return `Google Places no pudo completar la búsqueda (HTTP ${httpMatch[1]}). La solicitud fallida quedó registrada.`;
  }

  return ({
    "Enter a business type plus a ZIP code or city/state.": "Escribe un tipo de negocio y un código postal o ciudad/estado.",
    "Radius must be a whole number between 1 and 250 miles.": "El radio debe ser un número entero entre 1 y 250 millas.",
    "Apply the Atlas Agent Usage Ledger migration before using a paid data API.": "Aplica la migración del registro de uso de agentes de Atlas antes de usar una API de datos de pago.",
    "HUNTER reached the 20-search daily safety cap. Review today's results before spending more.": "HUNTER alcanzó el límite diario de 20 búsquedas. Revisa los resultados de hoy antes de gastar más.",
    "The provider returned results, but Atlas could not record API usage. Run the search again only after checking the ledger.": "El proveedor devolvió resultados, pero Atlas no pudo registrar el uso de la API. Repite la búsqueda solo después de revisar el registro.",
    "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment.": "GOOGLE_PLACES_API_KEY no está configurada en el entorno del servidor.",
    "Atlas could not reach Google Places (places.googleapis.com). Check Netlify outbound access, then retry.": "Atlas no pudo contactar Google Places (places.googleapis.com). Revisa el acceso de salida de Netlify e inténtalo de nuevo.",
    "That search request was not valid. Enter a business type plus a ZIP code or city/state.": "Esa búsqueda no es válida. Escribe un tipo de negocio y un código postal o ciudad/estado.",
    "Google Places returned a response Atlas could not read. The failed request was recorded.": "Google Places devolvió una respuesta que Atlas no pudo leer. La solicitud fallida quedó registrada.",
    "GOOGLE_PLACES_API_KEY was rejected by Google. In Netlify, set GOOGLE_PLACES_API_KEY (Builds and Functions scopes) to a valid Places API (New) server key, then redeploy.": "Google rechazó GOOGLE_PLACES_API_KEY. En Netlify, configura GOOGLE_PLACES_API_KEY (ámbitos Builds y Functions) con una clave de servidor válida de Places API (New) y vuelve a desplegar.",
    "GOOGLE_PLACES_API_KEY is restricted to HTTP referrers. Netlify sends no browser referrer, so Places API (New) returns HTTP 403. In Google Cloud Console → Credentials, set Application restrictions to None and API restrictions to Places API (New) only, then retry.": "GOOGLE_PLACES_API_KEY está restringida a referentes HTTP. Netlify no envía un referente de navegador, así que Places API (New) responde HTTP 403. En Google Cloud Console → Credenciales, pon Restricciones de aplicación en Ninguna y Restricciones de API solo en Places API (New), luego reintenta.",
    "GOOGLE_PLACES_API_KEY is restricted to IP addresses that do not include Netlify. Functions do not have a fixed outbound IP. Set Application restrictions to None and API restrictions to Places API (New) only, then retry.": "GOOGLE_PLACES_API_KEY está restringida a direcciones IP que no incluyen Netlify. Las funciones no tienen una IP de salida fija. Pon Restricciones de aplicación en Ninguna y Restricciones de API solo en Places API (New), luego reintenta.",
    "GOOGLE_PLACES_API_KEY has an Android, iOS, or other application restriction. Netlify server calls need Application restrictions set to None and API restrictions set to Places API (New) only, then retry.": "GOOGLE_PLACES_API_KEY tiene una restricción de Android, iOS u otra aplicación. Las llamadas de servidor desde Netlify necesitan Restricciones de aplicación en Ninguna y Restricciones de API solo en Places API (New). Luego reintenta.",
    "GOOGLE_PLACES_API_KEY is not allowed to call Places API (New). Edit the key's API restrictions and allow Places API (New) only. Legacy Places API alone still returns HTTP 403. Enable Places API (New) on the project, then retry.": "GOOGLE_PLACES_API_KEY no puede llamar a Places API (New). Edita las restricciones de API de la clave y permite solo Places API (New). Solo Places API heredada sigue devolviendo HTTP 403. Habilita Places API (New) en el proyecto y reintenta.",
    "Places API (New) is not enabled on the Google Cloud project for GOOGLE_PLACES_API_KEY. Enable Places API (New) and confirm billing is active.": "Places API (New) no está habilitada en el proyecto de Google Cloud de GOOGLE_PLACES_API_KEY. Habilítala y confirma que la facturación está activa.",
    "Google Places denied this search (HTTP 403). For GOOGLE_PLACES_API_KEY: set Application restrictions to None, set API restrictions to Places API (New) only, enable Places API (New), and confirm billing is active. Retry in a few minutes. The failed request was recorded.": "Google Places denegó esta búsqueda (HTTP 403). Para GOOGLE_PLACES_API_KEY: pon Restricciones de aplicación en Ninguna, Restricciones de API solo en Places API (New), habilita Places API (New) y confirma que la facturación está activa. Reintenta en unos minutos. La solicitud fallida quedó registrada.",
    "Google Cloud billing blocked this Places request. Check billing and budgets on the project that owns GOOGLE_PLACES_API_KEY.": "La facturación de Google Cloud bloqueó esta solicitud de Places. Revisa facturación y presupuestos en el proyecto de GOOGLE_PLACES_API_KEY.",
    "Google Places denied the requested contact fields. Enable Places API (New) Pro/Enterprise SKUs for phone and website, then retry.": "Google Places denegó los campos de contacto. Habilita los SKU Pro/Enterprise de Places API (New) para teléfono y sitio web, luego reintenta.",
    "Google Places quota was exceeded. Check Places API (New) quotas in Google Cloud, then retry. Atlas still caps HUNTER at 20 searches/day.": "Se agotó la cuota de Google Places. Revisa las cuotas de Places API (New) en Google Cloud y reintenta. Atlas sigue limitando HUNTER a 20 búsquedas/día.",
    "Google Places rejected this search request. Try a simpler query (business type plus city or ZIP). The failed request was recorded.": "Google Places rechazó esta búsqueda. Prueba una consulta más simple (tipo de negocio más ciudad o código postal). La solicitud fallida quedó registrada.",
    "Google Places could not complete this search. The failed request was recorded.": "Google Places no pudo completar la búsqueda. La solicitud fallida quedó registrada.",
  } as Record<string, string>)[message] ?? message;
}
