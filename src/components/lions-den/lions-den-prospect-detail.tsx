import type { ReactNode } from "react";
import Link from "next/link";
import { prospectPlacesCard } from "@/lib/lions-den/prospect-places";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";

type LionsDenProspectDetailProps = {
  prospect: OrganizationOpportunity;
  backHref: string;
  spanish: boolean;
};

export function LionsDenProspectDetail({
  prospect,
  backHref,
  spanish,
}: LionsDenProspectDetailProps) {
  const places = prospectPlacesCard(prospect);

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <Link className="text-sm font-semibold text-[#071b42] underline" href={backHref}>
        {spanish ? "← Prospectos" : "← Prospects"}
      </Link>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Prospecto" : "Prospect"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#071b42]">
            {prospect.name}
          </h2>
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {prospect.stage.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DetailField
          label={spanish ? "Teléfono" : "Phone"}
          value={
            places.phone ? (
              places.phoneHref ? (
                <a className="font-semibold text-[#071b42] underline" href={places.phoneHref}>
                  {places.phone}
                </a>
              ) : (
                places.phone
              )
            ) : spanish ? (
              "Google no publicó un teléfono."
            ) : (
              "Google did not publish a phone number."
            )
          }
        />
        <DetailField
          label={spanish ? "Dirección" : "Address"}
          value={places.address || (spanish ? "No hay dirección guardada." : "No address stored.")}
        />
        <DetailField
          label={spanish ? "Sitio web" : "Website"}
          value={
            places.website ? (
              <a
                className="break-all font-semibold text-[#071b42] underline"
                href={places.website}
                rel="noreferrer"
                target="_blank"
              >
                {places.website}
              </a>
            ) : spanish ? (
              "No hay sitio web guardado."
            ) : (
              "No website stored."
            )
          }
        />
        <DetailField
          label="Google Maps"
          value={
            places.mapsUrl ? (
              <a
                className="font-semibold text-[#071b42] underline"
                href={places.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                {spanish ? "Abrir en Google Maps" : "Open in Google Maps"}
              </a>
            ) : spanish ? (
              "No hay enlace de Maps."
            ) : (
              "No Maps link stored."
            )
          }
        />
      </div>

      {places.primaryType || places.businessStatus ? (
        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#5c6578]">
          {[places.primaryType?.replaceAll("_", " "), places.businessStatus?.replaceAll("_", " ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {prospect.nextAction ? (
        <div className="mt-6 rounded-2xl bg-[#fbfaf4] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
            {spanish ? "Próxima acción" : "Next action"}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#071b42]">{prospect.nextAction}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
          {spanish ? "Notas" : "Notes"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#33415c]">{prospect.researchSummary}</p>
      </div>

      <p className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#071b42]">
        {spanish
          ? "Atlas no llamó, escribió ni envió SMS a nadie."
          : "Atlas did not call, email, or text anyone."}
      </p>
    </section>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#fbfaf4] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">{label}</p>
      <div className="mt-2 text-sm leading-6 text-[#071b42]">{value}</div>
    </div>
  );
}
