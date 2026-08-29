import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClientCrmDashboard } from "@/components/clients-dashboard";
import { ClientPortalShell } from "@/components/client-portal-shell";
import { ClientQTimeDashboard } from "@/components/client-qtime-dashboard";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenOverview } from "@/components/lions-den/lions-den-overview";
import { isSisLionsDenRequest, isSisOrganization, shouldShowSuperAdminCrm } from "@/lib/client-portal/identity";
import { usesLionsDenHub } from "@/lib/lions-den/client-hub";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getClientDashboardData } from "@/server/client-dashboard/queries";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";
import { getSisDashboardData } from "@/server/sis-workspace/queries";
import { getSalesEvents, getSalesProspects } from "@/server/sales/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getHunterReviewPile } from "@/server/hunter/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import { getOrganizationNotes } from "@/server/notes/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "The Lion’s Den" : "The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
    content?: string;
    focus?: string;
    identity?: string;
    message?: string;
    note?: string;
    pilot?: string;
    previewOrg?: string;
    profile?: string;
    panel?: string;
    status?: string;
    workspace?: string;
    lang?: string;
  }>;
};

function StatusAlert({
  children,
  tone = "emerald",
}: {
  children: ReactNode;
  tone?: "emerald" | "amber" | "rose" | "blue";
}) {
  const classes = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-5 text-sm leading-6 ${classes[tone]}`}>
      {children}
    </div>
  );
}

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext("/client", params);
  const { isClientPreview, memberships, previewOrgSlug, previewOrganization, primaryOrganization } =
    workspace;
  const requestedWorkspaceSlug = String(params?.workspace ?? "").trim().toLowerCase();
  const wantsSisLionsDen = isSisLionsDenRequest(previewOrgSlug, requestedWorkspaceSlug)
    || isSisLionsDenRequest(previewOrgSlug, workspace.selectedWorkspaceSlug);
  const organizations = shouldShowSuperAdminCrm({
    isSuperAdmin: workspace.isSuperAdmin,
    isClientPreview,
    selectedWorkspaceSlug: workspace.selectedWorkspaceSlug,
    previewOrgSlug,
    requestedWorkspaceSlug,
  })
    ? await getOrganizationsForSuperAdmin()
    : null;
  const sales = organizations
    ? await Promise.all([getSalesProspects(), getSalesEvents()])
    : null;

  const isSisWorkspace = isSisOrganization(primaryOrganization);
  const useLionsDen = usesLionsDenHub(primaryOrganization?.slug);
  const dashboard = primaryOrganization && !isSisWorkspace && !useLionsDen
    ? await getClientDashboardData(primaryOrganization.id)
    : null;
  const sisDashboard = primaryOrganization && isSisWorkspace
    ? await getSisDashboardData(primaryOrganization.id)
    : null;
  const [pipeline, reviewPile, studio, notes] = useLionsDen && primaryOrganization
    ? await Promise.all([
        getOpportunityPipeline(primaryOrganization.id),
        getHunterReviewPile(primaryOrganization.id),
        getContentStudio(primaryOrganization.id),
        getOrganizationNotes(primaryOrganization.id),
      ])
    : [null, null, null, null];

  const alerts = (
    <div className="mb-5 space-y-4">
      {params?.status === "welcome" ? (
        <StatusAlert>
          {spanish ? "The Lion’s Den está listo." : "The Lion’s Den is ready."}
        </StatusAlert>
      ) : null}
      {params?.access === "denied" ? (
        <StatusAlert tone="amber">
          {spanish
            ? "Tu inicio de sesión funcionó, pero esta cuenta no está autorizada para esa área."
            : "Your login worked, but this account is not authorized for that area."}
        </StatusAlert>
      ) : null}
      {params?.pilot === "review_saved" || params?.content === "review_saved" ? (
        <StatusAlert>{spanish ? "Tu revisión se guardó." : "Your review was saved."}</StatusAlert>
      ) : null}
      {params?.pilot === "review_error" || params?.content === "review_error" ? (
        <StatusAlert tone="rose">
          {spanish
            ? "No se pudo guardar esa revisión. Inténtalo de nuevo o envía un mensaje al equipo de tu espacio de trabajo."
            : "That review could not be saved. Try again or message your workspace team."}
        </StatusAlert>
      ) : null}
      {previewOrganization?.setupRequired ? (
        <StatusAlert tone="rose">
          {spanish
            ? "No pudimos cargar la vista previa del cliente solicitada. Confirma el identificador de la organización y el acceso al espacio de trabajo."
            : "We could not load the requested client preview. Confirm the organization slug and workspace access."}
        </StatusAlert>
      ) : null}
      {previewOrgSlug && previewOrganization && !previewOrganization.data ? (
        <StatusAlert tone="amber">
          {spanish ? "No se encontró ninguna organización para el identificador de vista previa" : "No organization was found for preview slug"}{" "}
          &ldquo;{previewOrgSlug}&rdquo;.
        </StatusAlert>
      ) : null}
      {params?.note === "created" ? (
        <StatusAlert>{spanish ? "Nota guardada." : "Note saved."}</StatusAlert>
      ) : null}
      {params?.note === "error" ? (
        <StatusAlert tone="rose">
          {spanish ? "No se pudo guardar la nota." : "The note could not be saved."}
        </StatusAlert>
      ) : null}
      {memberships.setupRequired ? (
        <StatusAlert tone="rose">
          {spanish
            ? "No pudimos cargar el acceso al espacio de trabajo. Comunícate con tu equipo para que podamos restaurar la cuenta."
            : "We could not load workspace access. Contact your workspace team so we can restore the account."}
        </StatusAlert>
      ) : null}
      {!workspace.isSuperAdmin && !memberships.setupRequired && memberships.data.length === 0 ? (
        <StatusAlert tone="amber">
          {spanish
            ? "Tu inicio de sesión está activo, pero todavía no se ha asignado un espacio de trabajo empresarial. Comunícate con tu equipo y lo conectaremos."
            : "Your login is active, but a business workspace has not been assigned yet. Contact your workspace team and we will connect it."}
        </StatusAlert>
      ) : null}
    </div>
  );

  if (organizations) {
    return (
      <ClientPortalShell
        description={spanish
          ? "Un espacio privado para prioridades, aprobaciones, proyectos, seguimiento, archivos, informes y herramientas aprobadas, limitado a tu organización."
          : "A private workspace for priorities, approvals, projects, follow-up, files, reports, and approved tools—scoped to your organization."}
        eyebrow={isClientPreview ? "Atlas CRM" : spanish ? "CRM privado" : "Private CRM"}
        organizationName={primaryOrganization?.name}
        fullWidth
        showOverviewLink={false}
        workspaces={memberships.data.flatMap((membership) => membership.organization ? [{ name: membership.organization.name, slug: membership.organization.slug ?? "" }] : [])}
      >
        {alerts}
        {organizations.setupRequired ? (
          <StatusAlert tone="rose">
            {spanish
              ? "No pudimos cargar los espacios de trabajo de clientes. Inténtalo de nuevo o comunícate con el equipo de Atlas."
              : "We could not load client workspaces. Try again or contact the Atlas team."}
          </StatusAlert>
        ) : (
          <ClientCrmDashboard
            events={sales?.[1].setupRequired ? [] : sales?.[1].data ?? []}
            focusStage={params?.focus ?? ""}
            organizations={organizations.data}
            previewDashboard={dashboard}
            previewOrganization={previewOrganization?.data ?? null}
            previewWorkspace={workspace.isClientPreview ? workspace : null}
            prospects={sales?.[0].setupRequired ? [] : sales?.[0].data ?? []}
            returnTo="/client"
            selectedPanel={params?.panel ?? ""}
          />
        )}
      </ClientPortalShell>
    );
  }

  if ((useLionsDen && primaryOrganization) || (wantsSisLionsDen && !organizations)) {
    const prospects = pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : [];
    const reviewItems = reviewPile && !reviewPile.setupRequired ? reviewPile.data : [];
    const drafts = studio && !studio.setupRequired ? studio.data.drafts : [];

    return (
      <LionsDenBoardScreen board="overview" workspace={workspace}>
        {alerts}
        {sisDashboard?.setupRequired ? (
          <StatusAlert tone="rose">
            {spanish
              ? "No pudimos cargar la capa de datos del CRM de SIS. La organización existe, pero las tablas del tenant requieren atención."
              : "We could not load the SIS CRM data layer. The organization exists, but the tenant tables need attention."}
          </StatusAlert>
        ) : (
          <LionsDenOverview
            canCreateNotes={workspace.canCreateNotes}
            drafts={drafts}
            notes={notes && !notes.setupRequired ? notes.data : []}
            organizationId={primaryOrganization?.id}
            organizationName={primaryOrganization?.name ?? "SIS Custom Creations"}
            previewOrgSlug={workspace.previewOrgSlug || undefined}
            prospects={prospects}
            reviewPile={reviewItems}
            sisDashboard={sisDashboard && !sisDashboard.setupRequired ? sisDashboard.data : null}
            spanish={spanish}
            workspaceSlug={workspace.selectedWorkspaceSlug || undefined}
          />
        )}
      </LionsDenBoardScreen>
    );
  }

  return (
    <ClientPortalShell
      description={spanish
        ? "Un espacio privado para prioridades, aprobaciones, proyectos, seguimiento, archivos, informes y herramientas aprobadas, limitado a tu organización."
        : "A private workspace for priorities, approvals, projects, follow-up, files, reports, and approved tools—scoped to your organization."}
      eyebrow={isClientPreview ? "Atlas CRM" : spanish ? "CRM privado" : "Private CRM"}
      organizationName={primaryOrganization?.name}
      fullWidth
      showOverviewLink={false}
      workspaces={memberships.data.flatMap((membership) => membership.organization ? [{ name: membership.organization.name, slug: membership.organization.slug ?? "" }] : [])}
    >
      {alerts}
      {primaryOrganization && dashboard ? (
        <ClientQTimeDashboard workspace={workspace} dashboard={dashboard} />
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" href="/">
          {spanish ? "Sitio público" : "Public site"}
        </Link>
      </div>
    </ClientPortalShell>
  );
}
