"use client";

import { useActionState } from "react";
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
  const [state, action, pending] = useActionState(
    searchHunterProspects,
    initialHunterSearchState,
  );

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            HUNTER discovery preview
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Find local service businesses
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            One click makes one bounded Google Places request for up to ten results.
            Results stay only in this page session and are not copied into the CRM.
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
          20 searches/day max
        </span>
      </div>

      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label>
          <span className="text-sm font-medium text-slate-700">Business type</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="service"
            placeholder="HVAC contractor"
            required
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">City or service area</span>
          <input
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-950"
            name="location"
            placeholder="Katy, Texas"
            required
          />
        </label>
        <button
          className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Searching…" : "Search 10"}
        </button>
      </form>

      {state.message ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {state.message}
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
                      {place.primaryType?.replaceAll("_", " ") ?? "Business"}
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
                      Verify on Google Maps
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
            Google Maps local results are ranked using factors including relevance,
            distance, and prominence. Atlas does not persist this result content.
          </div>
        </div>
      ) : null}
    </section>
  );
}
