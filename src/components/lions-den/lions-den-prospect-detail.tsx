import type { ReactNode } from "react";
import Link from "next/link";
import { prospectPlacesCard, presentedProspectNextAction, presentedProspectStageLabel } from "@/lib/lions-den/prospect-places";
import { isTrialSampleOpportunity, trialSampleCopy } from "@/lib/lions-den/trial-samples";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import { SampleBadge } from "@/components/lions-den/sample-badge";
import {
  ProspectContactActions,
  ProspectDeleteForm,
  ProspectEditorForm,
  ProspectNotice,
  ProspectStageButtons,
} from "@/components/lions-den/prospect-controls";

type LionsDenProspectDetailProps = {
  prospect: OrganizationOpportunity;
  backHref: string;
  organizationId?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  notice?: string;
  spanish: boolean;
  fromEmail?: string;
  variant?: "prospect" | "client";
};

export function LionsDenProspectDetail({
  prospect,
  backHref,
  organizationId,
  previewOrgSlug,
  workspaceSlug,
  notice,
  spanish,
  fromEmail,
  variant = "prospect",
}: LionsDenProspectDetailProps) {
  const places = prospectPlacesCard(prospect);
  const clientRecord = variant === "client";
  const scope = organizationId ? { organizationId, previewOrgSlug, workspaceSlug, clientRecord } : null;
  const recordPath = clientRecord ? `/client/clients/${prospect.id}` : `/client/prospects/${prospect.id}`;
  const ownerNotes = typeof prospect.metadata?.owner_notes === "string" ? prospect.metadata.owner_notes : null;
  const history = [...prospect.events].reverse().slice(0, 8);

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <Link className="text-sm font-semibold text-[#071b42] underline" href={backHref}>
        {clientRecord
          ? spanish
            ? "← Clientes"
            : "← Clients"
          : spanish
            ? "← Prospectos"
            : "← Prospects"}
      </Link>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {clientRecord ? (spanish ? "Cliente" : "Client") : spanish ? "Prospecto" : "Prospect"}
          </p>
          <h2 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.05em] text-[#071b42]">
            <span>{prospect.name}</span>
            {isTrialSampleOpportunity(prospect) ? <SampleBadge label={trialSampleCopy(spanish).badge} /> : null}
          </h2>
          {prospect.contactName ? <p className="mt-1 text-sm font-medium text-[#33415c]">{prospect.contactName}</p> : null}
        </div>
        <span className="w-fit rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {presentedProspectStageLabel(prospect, spanish)}
        </span>
      </div>

      <ProspectNotice spanish={spanish} status={notice} />

      <div className="mt-5">
        <ProspectContactActions
          compose={
            organizationId
              ? {
                  fromEmail: fromEmail ?? "",
                  organizationId,
                  opportunityId: prospect.id,
                  previewOrgSlug,
                  returnTo: recordPath,
                  workspaceSlug,
                  initialOpen: notice === "email_found" || notice === "email_sent" || notice === "email_queued",
                }
              : undefined
          }
          prospect={prospect}
          spanish={spanish}
        />
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
              "Sin teléfono. Agrégalo en Editar."
            ) : (
              "No phone on file. Add one under Edit."
            )
          }
        />
        <DetailField
          label="Email"
          value={
            prospect.contactEmail ? (
              <a className="break-all font-semibold text-[#071b42] underline" href={`mailto:${prospect.contactEmail}`}>
                {prospect.contactEmail}
              </a>
            ) : spanish ? (
              "Sin correo guardado."
            ) : (
              "No email stored."
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
        {places.mapsUrl ? (
          <DetailField
            label="Google Maps"
            value={
              <a
                className="font-semibold text-[#071b42] underline"
                href={places.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                {spanish ? "Abrir en Google Maps" : "Open in Google Maps"}
              </a>
            }
          />
        ) : null}
      </div>

      {places.primaryType || places.businessStatus ? (
        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#5c6578]">
          {[places.primaryType?.replaceAll("_", " "), places.businessStatus?.replaceAll("_", " ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {presentedProspectNextAction(prospect, spanish) ? (
        <div className="mt-6 rounded-2xl bg-[#fbfaf4] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
            {spanish ? "Próxima acción" : "Next action"}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#071b42]">
            {presentedProspectNextAction(prospect, spanish)}
          </p>
        </div>
      ) : null}

      {scope ? (
        <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
            {spanish ? "¿Qué pasó?" : "What happened?"}
          </p>
          <p className="mt-1 text-xs text-[#5c6578]">
            {spanish
              ? "Marca la etapa después de cada llamada para que el escritorio sepa qué sigue."
              : "Mark the stage after each call so the desk knows what is next."}
          </p>
          <div className="mt-3">
            <ProspectStageButtons {...scope} prospect={prospect} spanish={spanish} />
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
          {spanish ? "Notas" : "Notes"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#33415c]">{ownerNotes || prospect.researchSummary}</p>
      </div>

      {scope ? (
        <details className="mt-4 rounded-2xl border border-[#ece7d8] p-4" data-prospect-edit>
          <summary className="cursor-pointer text-sm font-semibold text-[#071b42]">
            {clientRecord
              ? spanish
                ? "Editar datos del cliente"
                : "Edit client details"
              : spanish
                ? "Editar datos del prospecto"
                : "Edit prospect details"}
          </summary>
          <div className="mt-3">
            <ProspectEditorForm {...scope} prospect={prospect} spanish={spanish} />
          </div>
        </details>
      ) : null}

      {history.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-[#ece7d8] p-4" data-prospect-history>
          <summary className="cursor-pointer text-sm font-semibold text-[#071b42]">
            {spanish ? `Historial (${history.length})` : `History (${history.length})`}
          </summary>
          <ol className="mt-3 space-y-2">
            {history.map((event) => (
              <li className="text-sm text-[#33415c]" key={event.id}>
                <span className="text-xs text-[#8a93a3]">
                  {new Date(event.createdAt).toLocaleDateString(spanish ? "es-US" : "en-US", { month: "short", day: "numeric" })}
                </span>{" "}
                {event.summary}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {scope ? (
        <div className="mt-4">
          <ProspectDeleteForm {...scope} prospect={prospect} spanish={spanish} />
        </div>
      ) : null}

      <p className="mt-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#071b42]">
        {spanish
          ? "Atlas no llama ni envía SMS. El correo sale solo cuando tú lo escribes y lo envías aquí."
          : "Atlas does not call or text anyone. Email goes out only when you write and send it here."}
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
