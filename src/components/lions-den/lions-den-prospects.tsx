import Link from "next/link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { prospectDetailPath, prospectPlacesCard, presentedProspectNextAction, presentedProspectStageLabel } from "@/lib/lions-den/prospect-places";
import { lastDeskContactLabel, readLastDeskContact } from "@/lib/lions-den/prospect-stages";
import { isInboundOpportunity } from "@/lib/lions-den/inbound-leads";
import { isTrialSampleOpportunity, trialSampleCopy } from "@/lib/lions-den/trial-samples";
import { SampleBadge } from "@/components/lions-den/sample-badge";
import {
  ProspectContactActions,
  ProspectEditorForm,
  ProspectNotice,
} from "@/components/lions-den/prospect-controls";

type LionsDenProspectsBoardProps = {
  prospects: OrganizationOpportunity[];
  organizationId?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  notice?: string;
  spanish: boolean;
};

export function LionsDenProspectsBoard({
  prospects,
  organizationId,
  previewOrgSlug,
  workspaceSlug,
  notice,
  spanish,
}: LionsDenProspectsBoardProps) {
  const listHref = lionsDenHref("/client/prospects", previewOrgSlug, workspaceSlug);
  const canEdit = Boolean(organizationId);
  const active = prospects.filter((item) => item.stage !== "won" && item.stage !== "lost");
  const closed = prospects.filter((item) => item.stage === "won" || item.stage === "lost");

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
          ? "Llegan aquí cuando aceptas un hallazgo de HUNTER o los agregas tú. Atlas no llama ni envía SMS. El correo sale solo cuando tú lo escribes."
          : "They land here when you accept a HUNTER find or add one yourself. Atlas does not call or text. Email goes out only when you write and send it."}
      </p>

      <ProspectNotice spanish={spanish} status={notice} />

      {canEdit && organizationId ? (
        <details className="mt-5 rounded-2xl border border-[#ece7d8] bg-[#fbfaf4] p-4" data-add-prospect>
          <summary className="cursor-pointer text-sm font-semibold text-[#071b42]">
            {spanish ? "+ Agregar un prospecto a mano" : "+ Add a prospect by hand"}
          </summary>
          <p className="mt-2 text-xs text-[#5c6578]">
            {spanish
              ? "Un referido, alguien que conociste, una tarjeta de presentación. Con teléfono va directo a la lista de llamadas."
              : "A referral, someone you met, a business card. With a phone number it goes straight to the call list."}
          </p>
          <div className="mt-3">
            <ProspectEditorForm
              organizationId={organizationId}
              previewOrgSlug={previewOrgSlug}
              spanish={spanish}
              workspaceSlug={workspaceSlug}
            />
          </div>
        </details>
      ) : null}

      {prospects.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "La lista de llamadas está vacía." : "The call list is empty."}</p>
          <p className="mt-2">
            {spanish
              ? "Abre HUNTER, revisa la pila y acepta el primer prospecto cuando esté listo para llamar. O agrega uno a mano arriba."
              : "Open HUNTER, review the pile, and accept the first prospect when you are ready to call. Or add one by hand above."}
          </p>
          <Link
            className="mt-4 inline-flex rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white"
            href={lionsDenHref("/client/hunter", previewOrgSlug, workspaceSlug)}
          >
            HUNTER
          </Link>
        </div>
      ) : (
        <>
          <ProspectList
            listHref={listHref}
            organizationId={organizationId}
            previewOrgSlug={previewOrgSlug}
            prospects={active}
            spanish={spanish}
            workspaceSlug={workspaceSlug}
          />
          {closed.length > 0 ? (
            <details className="mt-6 rounded-2xl border border-[#ece7d8] p-4" data-closed-prospects>
              <summary className="cursor-pointer text-sm font-semibold text-[#071b42]">
                {spanish ? `Ganados y perdidos (${closed.length})` : `Won and lost (${closed.length})`}
              </summary>
              <ProspectList
                listHref={listHref}
                organizationId={organizationId}
                previewOrgSlug={previewOrgSlug}
                prospects={closed}
                spanish={spanish}
                workspaceSlug={workspaceSlug}
              />
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

function ProspectList({
  prospects,
  listHref,
  organizationId,
  previewOrgSlug,
  workspaceSlug,
  spanish,
}: {
  prospects: OrganizationOpportunity[];
  listHref: string;
  organizationId?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
}) {
  if (prospects.length === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-[#ece7d8] bg-[#fbfaf4] p-4 text-sm text-[#5c6578]">
        {spanish ? "Todo cerrado. Acepta más hallazgos en HUNTER." : "Everything is closed out. Accept more finds in HUNTER."}
      </p>
    );
  }
  return (
    <div className="mt-5 divide-y divide-[#ece7d8]">
      {prospects.map((prospect) => {
        const places = prospectPlacesCard(prospect);
        const href = prospectDetailPath(prospect.id, listHref);
        const lastContact = readLastDeskContact(prospect.metadata);
        return (
          <article className="py-4" data-prospect-row={prospect.id} key={prospect.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 font-semibold text-[#071b42]">
                  <Link className="underline decoration-[#d8c27a] underline-offset-4 hover:decoration-[#071b42]" href={href}>
                    {prospect.name}
                  </Link>
                  {isTrialSampleOpportunity(prospect) ? <SampleBadge label={trialSampleCopy(spanish).badge} /> : null}
                  {isInboundOpportunity(prospect) ? (
                    <span
                      className="rounded-full bg-[#fff1f1] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#8a1f1f]"
                      data-inbound-badge
                      title={spanish ? "Este cliente te contactó por tu página. Llama primero." : "This customer reached out through your lead page. Call them first."}
                    >
                      {spanish ? "Entrante · caliente" : "Inbound · hot"}
                    </span>
                  ) : null}
                </h3>
                {prospect.contactName || places.phone ? (
                  <p className="mt-1 text-sm font-medium text-[#071b42]">
                    {[prospect.contactName, places.phone].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {places.address ? <p className="mt-1 text-sm text-[#5c6578]">{places.address}</p> : null}
                <p className="mt-1 text-sm text-[#5c6578]">
                  {presentedProspectNextAction(prospect, spanish) || prospect.researchSummary}
                </p>
                {lastContact ? (
                  <p className="mt-1 text-xs font-semibold text-[#1246a0]" data-last-contact>
                    {spanish ? "Último: " : "Last: "}
                    {lastDeskContactLabel(lastContact, spanish)}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ProspectContactActions
                    compact
                    compose={
                      organizationId
                        ? {
                            detailHref: href,
                            fromEmail: "",
                            organizationId,
                            opportunityId: prospect.id,
                            previewOrgSlug,
                            workspaceSlug,
                          }
                        : undefined
                    }
                    prospect={prospect}
                    spanish={spanish}
                  />
                  <Link
                    className="inline-flex items-center rounded-full border border-[#d5d0c4] px-3 py-1 text-xs font-semibold text-[#5c6578] transition hover:border-[#071b42] hover:text-[#071b42]"
                    href={href}
                  >
                    {spanish ? "Abrir · editar" : "Open · edit"}
                  </Link>
                </div>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                {presentedProspectStageLabel(prospect, spanish)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
