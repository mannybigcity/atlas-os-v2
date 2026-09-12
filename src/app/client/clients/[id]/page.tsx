import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenProspectDetail } from "@/components/lions-den/lions-den-prospect-detail";
import { ProspectContactActions, ProspectNotice } from "@/components/lions-den/prospect-controls";
import { ClientProfileForm } from "@/components/lions-den/client-profile-form";
import { LinkedNotesPanel } from "@/components/lions-den/linked-notes-panel";
import { WonReviewCard } from "@/components/lions-den/won-review-card";
import { lastDeskContactLabel, sisDeskActivityLines } from "@/lib/lions-den/prospect-stages";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { presentLiveDeskOpportunity } from "@/lib/lions-den/live-desk";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { fillMissingOpportunityEmail } from "@/server/hunter/fill-website-email";
import { getOrganizationOpportunity } from "@/server/opportunities/queries";
import { getSisCustomer } from "@/server/sis-workspace/queries";
import { updateSisCustomer } from "@/server/sis-workspace/actions";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Client | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
    prospect?: string;
  }>;
};

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const language = await getSiteLanguage(query?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext(`/client/clients/${id}`, query);
  const organization = workspace.primaryOrganization;
  if (isQTimeWorkspaceSlug(organization?.slug)) {
    redirect("/client");
  }
  if (!organization) notFound();

  const backHref = lionsDenHref(
    "/client/clients",
    workspace.previewOrgSlug || undefined,
    workspace.selectedWorkspaceSlug || undefined,
  );

  if (isSisOrganization(organization)) {
    const result = await getSisCustomer(organization.id, id);
    if (result.setupRequired) {
      throw new Error(result.error ?? "Clients are not available yet.");
    }
    if (!result.data) notFound();
    const customer = result.data;
    const activity = sisDeskActivityLines(customer.notes);
    const fieldClass =
      "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42]";

    return (
      <LionsDenBoardScreen board="clients" workspace={workspace}>
        <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
          <Link className="text-sm font-semibold text-[#071b42] underline" href={backHref}>
            {spanish ? "← Clientes" : "← Clients"}
          </Link>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
            {spanish ? "Cliente" : "Client"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#071b42]">
            {customer.displayName}
          </h2>
          {customer.businessName ? (
            <p className="mt-1 text-sm font-medium text-[#33415c]">{customer.businessName}</p>
          ) : null}
          {customer.lastContact ? (
            <p className="mt-2 text-xs font-semibold text-[#1246a0]" data-last-contact>
              {spanish ? "Último: " : "Last: "}
              {lastDeskContactLabel(customer.lastContact, spanish)}
            </p>
          ) : null}

          <ProspectNotice spanish={spanish} status={query?.prospect} />

          <div className="mt-5">
            <ProspectContactActions
              compose={{
                customerId: customer.id,
                fromEmail: workspace.user.email ?? "",
                organizationId: organization.id,
                previewOrgSlug: workspace.previewOrgSlug || undefined,
                returnTo: `/client/clients/${customer.id}`,
                workspaceSlug: workspace.selectedWorkspaceSlug || undefined,
                initialOpen: query?.prospect === "email_sent" || query?.prospect === "email_queued",
              }}
              prospect={{
                name: customer.displayName,
                contactEmail: customer.email,
                contactPhone: customer.phone,
                contactSocial: null,
                metadata: {},
              }}
              spanish={spanish}
            />
          </div>

          <form action={updateSisCustomer} className="mt-6 grid gap-3 sm:grid-cols-2" data-client-editor>
            <input name="customerId" type="hidden" value={customer.id} />
            {workspace.previewOrgSlug ? <input name="previewOrg" type="hidden" value={workspace.previewOrgSlug} /> : null}
            {workspace.selectedWorkspaceSlug ? (
              <input name="workspace" type="hidden" value={workspace.selectedWorkspaceSlug} />
            ) : null}
            <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
              {spanish ? "Nombre" : "Name"}
              <input className={fieldClass} defaultValue={customer.displayName} name="displayName" required type="text" />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Negocio" : "Business"}
              <input className={fieldClass} defaultValue={customer.businessName ?? ""} name="businessName" type="text" />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Teléfono" : "Phone"}
              <input className={fieldClass} defaultValue={customer.phone ?? ""} name="phone" type="tel" />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
              Email
              <input className={fieldClass} defaultValue={customer.email ?? ""} name="email" type="email" />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
              {spanish ? "Notas" : "Notes"}
              <textarea className={fieldClass} defaultValue={customer.notes ?? ""} name="notes" rows={4} />
            </label>
            <button
              className="w-fit cursor-pointer rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white"
              type="submit"
            >
              {spanish ? "Guardar cambios" : "Save changes"}
            </button>
          </form>

          <ClientProfileForm
            metadata={customer.metadata}
            organizationId={organization.id}
            previewOrgSlug={workspace.previewOrgSlug || undefined}
            recordId={customer.id}
            recordTable="sis_customer"
            returnPath={`/client/clients/${customer.id}`}
            spanish={spanish}
            workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
          />
          <LinkedNotesPanel
            organizationId={organization.id}
            previewOrgSlug={workspace.previewOrgSlug || undefined}
            record={{ kind: "sis_customer", id: customer.id }}
            recordName={customer.displayName}
            returnPath={`/client/clients/${customer.id}`}
            spanish={spanish}
            workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
          />

          <div className="mt-4 rounded-2xl border border-[#ece7d8] p-4" data-prospect-history>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
              {spanish ? "Actividad" : "Activity"}
            </p>
            <p className="mt-1 text-xs text-[#5c6578]">
              {spanish
                ? "Llamadas, WhatsApp y correos que el vendedor tocó. Atlas no hace la llamada."
                : "Calls, WhatsApp, and emails the salesman started. Atlas does not place the call."}
            </p>
            {activity.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {activity
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((line) => (
                    <li className="text-sm text-[#33415c]" key={line}>
                      {line}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-[#5c6578]">
                {spanish ? "Aún no hay actividad." : "No activity yet."}
              </p>
            )}
          </div>
        </section>
      </LionsDenBoardScreen>
    );
  }

  const result = await getOrganizationOpportunity(organization.id, id);
  if (result.setupRequired) {
    throw new Error(result.error ?? "Clients are not available yet.");
  }
  if (!result.data) notFound();
  if (result.data.stage !== "won") {
    redirect(
      lionsDenHref(`/client/prospects/${id}`, workspace.previewOrgSlug, workspace.selectedWorkspaceSlug),
    );
  }

  const filled = await fillMissingOpportunityEmail(organization.id, result.data.id);
  const prospect = presentLiveDeskOpportunity(organization, {
    ...result.data,
    contactEmail: filled.email ?? result.data.contactEmail,
  });

  return (
    <LionsDenBoardScreen board="clients" workspace={workspace}>
      <LionsDenProspectDetail
        backHref={backHref}
        fromEmail={workspace.user.email ?? ""}
        notice={query?.prospect}
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        prospect={prospect}
        spanish={spanish}
        variant="client"
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
      <WonReviewCard
        businessName={organization.name ?? ""}
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        prospect={result.data}
        spanish={spanish}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
      <ClientProfileForm
        metadata={result.data.metadata}
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        recordId={result.data.id}
        recordTable="opportunity"
        returnPath={`/client/clients/${result.data.id}`}
        spanish={spanish}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
      <LinkedNotesPanel
        organizationId={organization.id}
        previewOrgSlug={workspace.previewOrgSlug || undefined}
        record={{ kind: "client", id: result.data.id }}
        recordName={prospect.name}
        returnPath={`/client/clients/${result.data.id}`}
        spanish={spanish}
        workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
      />
    </LionsDenBoardScreen>
  );
}
