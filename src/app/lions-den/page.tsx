import Link from "next/link";
import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { AdminPilotWorkspace } from "@/components/admin-pilot-workspace";
import { CommandCenterOverview } from "@/components/command-center-overview";
import { formatDateTime } from "@/lib/format";
import {
  acknowledgeAttentionRequest,
  resolveAttentionRequest,
} from "@/server/attention/actions";
import { getActiveAttentionRequests } from "@/server/attention/queries";
import { updateBusinessAssessmentStatus } from "@/server/assessments/admin-actions";
import { getBusinessAssessments } from "@/server/assessments/queries";
import {
  assignClientMembership,
  sendClientLoginEmail,
} from "@/server/auth/admin-actions";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";
import { saveAdminBusinessProfile } from "@/server/business-profile/admin-actions";
import { getBusinessProfile } from "@/server/business-profile/queries";
import { createAdminNoteMessage } from "@/server/notes/actions";
import { getMessagesForNotes } from "@/server/notes/messages";
import {
  getClientAccessRoster,
  getOrganizationsForSuperAdmin,
} from "@/server/organizations/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getRecentAgentRuns } from "@/server/agents/queries";
import { getObsidianVaultSnapshot } from "@/server/brain/obsidian";
import { getSalesProspects } from "@/server/sales/queries";
import { getOperationsSnapshot } from "@/server/operations/queries";
import { SurfaceTargetHud } from "@/components/surface-target-hud";
import { getHudTarget } from "@/lib/hud-targets";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Dashboard | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type LionsDenPageProps = {
  searchParams?: Promise<{
    access?: string;
    attention?: string;
    assessment?: string;
    message?: string;
    pilot?: string;
    profile?: string;
    hud?: string;
  }>;
};

export default async function LionsDenPage({ searchParams }: LionsDenPageProps) {
  const user = await requireSuperAdmin("/lions-den");
  const [params, language] = await Promise.all([searchParams, getSiteLanguage()]);
  const spanish = language === "es";
  const organizations = await getOrganizationsForSuperAdmin();
  const clientAccess = await getClientAccessRoster();
  const assessments = await getBusinessAssessments();
  const [sales, agentRuns, brain, operations] = await Promise.all([
    getSalesProspects(),
    getRecentAgentRuns(50),
    getObsidianVaultSnapshot(),
    getOperationsSnapshot(),
  ]);
  const pilotWorkspaces = await Promise.all(
    organizations.data.map(async (organization) => ({
      organization,
      result: await getPilotWorkspace(organization.id),
    })),
  );
  const clientProfiles = await Promise.all(
    organizations.data.map(async (organization) => ({
      organization,
      result: await getBusinessProfile(organization.id),
    })),
  );
  const attentionRequests = await getActiveAttentionRequests();
  const messages = await getMessagesForNotes(
    attentionRequests.data.map((request) => request.noteId),
  );
  const openRequestCount = attentionRequests.data.filter(
    (request) => request.status === "open",
  ).length;
  const newAssessmentCount = assessments.data.filter(
    (assessment) => assessment.status === "new",
  ).length;

  return (
    <SurfaceShell
      className="lions-den-surface"
      contentClassName="lions-den-content"
      description={spanish ? "Tu centro operativo privado para decisiones, ingresos, salud del cliente y la próxima acción importante." : "Your private operating center for decisions, revenue, client health, and the next action that matters."}
      eyebrow={spanish ? "Súper administrador" : "Super Admin"}
      title={spanish ? "Panel del cliente" : "Client Dashboard"}
    >
      <SurfaceTargetHud target={getHudTarget(params?.hud)} />
      <div className="lions-den-topline">
        <div>
          <p className="lions-den-kicker">ATLAS OS · {spanish ? "Centro de mando personal" : "Personal command center"}</p>
          <h2>{spanish ? "Buenos días. Esto es lo que requiere tu atención." : "Good morning. Here is what needs your attention."}</h2>
          <p>{spanish ? "Vista activa del espacio" : "Live workspace view"} · {user.email}</p>
        </div>
        <div className="lions-den-top-actions">
          <Link href="/lions-den/brain">{spanish ? "Segundo cerebro" : "Second brain"} <span>↗</span></Link>
          <Link href="/lions-den/sales">{spanish ? "CRM / ventas" : "CRM / sales"} <span>↗</span></Link>
          <Link href="/lions-den/missions">{spanish ? "Proyectos y misiones" : "Projects & missions"} <span>↗</span></Link>
          <Link href="/lions-den/cash">{spanish ? "Registro de efectivo" : "Cash ledger"} <span>↗</span></Link>
          <Link href="/lions-den/money">{spanish ? "Dinero" : "Money"} <span>↗</span></Link>
          <form action={signOut}><button type="submit">{spanish ? "Cerrar sesión" : "Sign out"}</button></form>
        </div>
      </div>

      <div className="lions-den-metrics" aria-label={spanish ? "Resumen del espacio" : "Workspace summary"}>
        <MetricCard label={spanish ? "Nuevas oportunidades" : "New opportunities"} value={String(newAssessmentCount)} tone="gold" detail={spanish ? "Evaluaciones de negocio" : "Business assessments"} />
        <MetricCard label={spanish ? "Atención abierta" : "Open attention"} value={String(openRequestCount)} tone="blue" detail={spanish ? "Solicitudes de clientes" : "Client requests"} />
        <MetricCard label={spanish ? "Organizaciones" : "Organizations"} value={String(organizations.data.length)} tone="violet" detail={spanish ? "Espacios conectados" : "Connected workspaces"} />
        <MetricCard label={spanish ? "Estado del sistema" : "System status"} value={spanish ? "Listo" : "Ready"} tone="green" detail={spanish ? "Acceso del servidor aplicado" : "Server-side access enforced"} />
      </div>

      <CommandCenterOverview
        agents={agentRuns}
        brain={brain}
        language={language}
        operations={operations}
        sales={sales}
      />

      <section className="lions-den-command mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">
              {spanish ? "Comando de Atlas" : "Atlas Command"}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              {spanish ? "Ver a los agentes trabajando" : "See the agents working"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {spanish ? "ATLAS sigue siendo el Jefe de Gabinete mientras HUNTER, MICAH, DAVID y ORACLE muestran sus roles, presupuestos, puertas de aprobación y actividad real del registro." : "ATLAS stays Chief of Staff while HUNTER, MICAH, DAVID, and ORACLE show their roles, budgets, approval gates, and real ledger activity."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              className="inline-flex justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              href="/lions-den/agents"
            >
              {spanish ? "Abrir Comando de agentes" : "Open Agent Command"}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        {params?.access === "sent" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Correo de acceso seguro solicitado. Pide al cliente revisar la bandeja de entrada y spam, y usar únicamente el enlace más reciente de Atlas." : "Secure client login email requested. Ask the client to check the inbox and spam folder and use only the newest Atlas link."}
          </div>
        ) : null}

        {params?.access === "membership_linked" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Membresía del cliente vinculada. La organización ahora debe aparecer en la lista de acceso." : "Client membership linked. The organization should now appear in the access roster below."}
          </div>
        ) : null}

        {params?.access === "auth_user_not_found" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            {spanish ? "No se encontró un usuario de Supabase Auth para ese correo. Invita primero al cliente en Supabase Authentication y luego vincula la cuenta aquí." : "No Supabase Auth user was found for that email. Invite the client in Supabase Authentication first, then attach the account here."}
          </div>
        ) : null}

        {params?.access && !["sent", "membership_linked", "auth_user_not_found"].includes(params.access) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            {spanish ? "La actualización de acceso del cliente no se completó. Confirma el correo, la organización, la migración de membresías y los registros de entrega de Supabase Auth." : "The client access update did not complete. Confirm the email, organization, membership migration, and Supabase Auth delivery logs."}
          </div>
        ) : null}

        {params?.attention === "acknowledged" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Solicitud de atención reconocida." : "Attention request acknowledged."}
          </div>
        ) : null}

        {params?.assessment === "updated" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Prospecto de evaluación de negocio actualizado." : "Business Assessment lead updated."}
          </div>
        ) : null}

        {params?.assessment === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            {spanish ? "No se pudo actualizar el prospecto de evaluación. Confirma que la migración de evaluaciones de negocio esté aplicada." : "The Business Assessment lead could not be updated. Confirm that the Business Assessment migration has been applied."}
          </div>
        ) : null}

        {params?.attention === "resolved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Solicitud de atención resuelta." : "Attention request resolved."}
          </div>
        ) : null}

        {params?.attention === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            {spanish ? "No se pudo actualizar la solicitud de atención. Confirma que la migración de la Bandeja de atención esté aplicada." : "The attention request could not be updated. Confirm that the Attention Inbox migration has been applied."}
          </div>
        ) : null}

        {params?.message === "created" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Respuesta del administrador de Atlas enviada." : "Atlas Admin reply sent."}
          </div>
        ) : null}

        {params?.message && params.message !== "created" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            {spanish ? "Agrega una respuesta antes de enviar. Si ya escribiste una, confirma que la migración de conversaciones de notas esté aplicada." : "Add a reply before sending. If a reply was entered, confirm that the Threaded Note Conversations migration has been applied."}
          </div>
        ) : null}

        {params?.pilot && !["error", "missing_plan", "missing_action", "missing_deliverable"].includes(params.pilot) ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            {spanish ? "Espacio del piloto fundador actualizado." : "Founding pilot workspace updated."}
          </div>
        ) : null}

        {params?.pilot && ["error", "missing_plan", "missing_action", "missing_deliverable"].includes(params.pilot) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            {spanish ? "No se pudo guardar la actualización del piloto. Revisa los campos obligatorios y confirma que la migración del flujo de piloto fundador esté aplicada." : "The pilot update could not be saved. Check required fields and confirm that the Founding Pilot Workflow migration has been applied."}
          </div>
        ) : null}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                {spanish ? "Operaciones de ingresos de Atlas" : "Atlas Revenue Operations"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {spanish ? "Comando de ventas HUNTER + DAVID" : "HUNTER + DAVID Sales Command"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                {spanish ? "Investiga prospectos reales, verifica su fuente, programa la próxima acción y exige aprobación antes de cualquier contacto." : "Research real prospects, verify their source, schedule the next action, and require approval before any outreach."}
              </p>
            </div>
            <Link
              className="shrink-0 rounded-full bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
              href="/lions-den/sales"
            >
              {spanish ? "Abrir Comando de ventas" : "Open Sales Command"}
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
                {spanish ? "Nuevos negocios" : "New Business"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {spanish ? "Prospectos de evaluaciones de negocio" : "Business Assessment Leads"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {spanish ? "Revisa lo que necesita cada negocio, contacta al dueño y avanza la oportunidad desde una cola segura." : "Review what each business needs, contact the owner, and move the opportunity forward from one secure queue."}
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              {newAssessmentCount} {spanish ? "nuevos" : "new"}
            </span>
          </div>

          {assessments.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              {spanish ? "La recepción de evaluaciones de negocio aún no está lista. Aplica la migración de evaluaciones públicas en Supabase." : "Business Assessment intake is not ready yet. Apply the Public Business Assessments migration in Supabase."}
            </div>
          ) : null}

          {!assessments.setupRequired && assessments.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              {spanish ? "Aún no se han enviado evaluaciones de negocio." : "No Business Assessments have been submitted yet."}
            </div>
          ) : null}

          {!assessments.setupRequired && assessments.data.length > 0 ? (
            <div className="mt-5 space-y-4">
              {assessments.data.map((assessment) => {
                const salesProspect = sales.data.find(
                  (prospect) => prospect.assessmentSubmissionId === assessment.id,
                );

                return (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    key={assessment.id}
                  >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {assessment.businessName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {assessment.contactName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {spanish ? "Enviado" : "Submitted"} {formatDateTime(assessment.createdAt)}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {humanize(assessment.status, language)}
                    </span>
                    {salesProspect ? (
                      <Link
                        className="w-fit rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-blue-800"
                        href={`/lions-den/sales/${salesProspect.id}`}
                      >
                        {spanish ? "Abrir registro de ventas" : "Open Sales Record"}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <LeadDetail label={spanish ? "A qué se dedica el negocio" : "What the business does"} value={assessment.businessDescription} />
                    <LeadDetail label={spanish ? "Cliente ideal" : "Ideal customer"} value={assessment.idealCustomer} />
                    <LeadDetail label={spanish ? "Mayor desafío" : "Biggest challenge"} value={humanize(assessment.biggestChallenge, language)} />
                    <LeadDetail label={spanish ? "Meta de 90 días" : "90-day goal"} value={assessment.ninetyDayGoal} />
                    <LeadDetail label={spanish ? "Origen de los clientes" : "Customers come from"} value={assessment.customerSources.map((value) => humanize(value, language)).join(", ")} />
                    <LeadDetail label={spanish ? "Áreas para evaluar" : "Areas to evaluate"} value={assessment.evaluationAreas.map((value) => humanize(value, language)).join(", ")} />
                    <LeadDetail label={spanish ? "Tamaño del negocio" : "Business size"} value={humanize(assessment.businessSize, language)} />
                    <LeadDetail label={spanish ? "Herramientas de IA" : "AI tools"} value={assessment.aiTools.map((value) => humanize(value, language)).join(", ")} />
                    <LeadDetail label={spanish ? "Plazo" : "Timing"} value={humanize(assessment.improvementTiming, language)} />
                    <LeadDetail label={spanish ? "Nuevos prospectos por mes" : "New leads per month"} value={humanize(assessment.monthlyLeadVolume, language)} />
                    <LeadDetail label={spanish ? "Velocidad habitual de seguimiento" : "Usual follow-up speed"} value={humanize(assessment.followUpSpeed, language)} />
                    <LeadDetail label={spanish ? "Rango de presupuesto" : "Budget range"} value={humanize(assessment.pilotBudget, language)} />
                    <LeadDetail label={spanish ? "Contacto preferido" : "Preferred contact"} value={humanize(assessment.preferredContactMethod, language)} />
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {spanish ? "Contacto" : "Contact"}
                      </p>
                      <a className="mt-2 block text-sm font-semibold text-blue-700 hover:underline" href={`mailto:${assessment.contactEmail}`}>
                        {assessment.contactEmail}
                      </a>
                      <p className="mt-1 text-sm text-slate-700">{assessment.contactPhone}</p>
                      <WebsiteLink value={assessment.website} />
                      {assessment.socialMedia ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {spanish ? "Redes sociales" : "Social media"}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {assessment.socialMedia}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <form action={updateBusinessAssessmentStatus} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input name="assessmentId" type="hidden" value={assessment.id} />
                    <label className="block flex-1">
                      <span className="text-sm font-medium text-slate-700">{spanish ? "Estado del prospecto" : "Lead status"}</span>
                      <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={assessment.status} name="status">
                        <option value="new">{spanish ? "Nuevo" : "New"}</option>
                        <option value="contacted">{spanish ? "Contactado" : "Contacted"}</option>
                        <option value="qualified">{spanish ? "Calificado" : "Qualified"}</option>
                        <option value="not_a_fit">{spanish ? "No encaja" : "Not a fit"}</option>
                        <option value="converted">{spanish ? "Convertido" : "Converted"}</option>
                      </select>
                    </label>
                    <button className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" type="submit">
                      {spanish ? "Guardar estado" : "Save status"}
                    </button>
                  </form>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                {spanish ? "Atención al cliente" : "Client Attention"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {spanish ? "Bandeja de Atlas" : "Atlas Inbox"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {spanish ? "Revisa solicitudes `@Atlas` de todas las organizaciones desde una cola segura." : "Review `@Atlas` requests across every client organization from one secure queue."}
              </p>
            </div>
            <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              {openRequestCount} {spanish ? "abiertas" : "open"}
            </span>
          </div>

          {attentionRequests.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              {spanish ? "La Bandeja de Atlas aún no está lista. Aplica la migración de la Bandeja de atención en Supabase." : "The Atlas Inbox is not ready yet. Apply the Attention Inbox migration in Supabase."}
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              {spanish ? "Ninguna solicitud de cliente requiere atención." : "No client requests need attention."}
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length > 0 ? (
            <div className="mt-5 space-y-4">
              {attentionRequests.data.map((request) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  key={request.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {request.organizationName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {request.noteTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {spanish ? "Solicitado" : "Requested"} {formatDateTime(request.requestedAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        request.status === "acknowledged"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {humanize(request.status, language)}
                    </span>
                  </div>

                  {messages.setupRequired ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                      {spanish ? "Aplica la migración de conversaciones de notas para leer y responder a esta conversación." : "Apply the Threaded Note Conversations migration to read and reply to this conversation."}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {messages.data
                        .filter((message) => message.noteId === request.noteId)
                        .map((message) => (
                          <div
                            className={`rounded-2xl border p-4 ${
                              message.authorKind === "atlas_admin"
                                ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 bg-white"
                            }`}
                            key={message.id}
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-semibold text-slate-950">
                                {message.authorKind === "atlas_admin"
                                  ? spanish ? "Administrador de Atlas" : "Atlas Admin"
                                  : message.authorDisplayName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {message.body}
                            </p>
                          </div>
                        ))}

                      <form action={createAdminNoteMessage}>
                        <input name="noteId" type="hidden" value={request.noteId} />
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">
                            {spanish ? "Responder como administrador de Atlas" : "Reply as Atlas Admin"}
                          </span>
                          <textarea
                            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                            name="body"
                            placeholder={spanish ? "Escribe una respuesta humana del administrador de Atlas." : "Write a human Atlas Admin response."}
                          />
                        </label>
                        <button
                          className="mt-3 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                          type="submit"
                        >
                          {spanish ? "Enviar respuesta de Atlas" : "Send Atlas reply"}
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {request.status === "open" ? (
                      <form action={acknowledgeAttentionRequest}>
                        <input name="requestId" type="hidden" value={request.id} />
                        <button
                          className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 sm:w-auto"
                          type="submit"
                        >
                          {spanish ? "Reconocer" : "Acknowledge"}
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveAttentionRequest}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <button
                        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                        type="submit"
                      >
                        {spanish ? "Resolver" : "Resolve"}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {organizations.data.length > 0 ? (
          <section
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5"
            id="client-intelligence"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                  {spanish ? "Inteligencia del cliente" : "Client Intelligence"}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {spanish ? "Lo que cada negocio le dijo a Atlas" : "What each business told Atlas"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  {spanish ? "Revisa la oferta, el cliente, el posicionamiento, las metas y las restricciones que tus clientes guardaron en su espacio privado antes de planificar el trabajo." : "Review the offer, customer, positioning, goals, and constraints your clients saved in their private workspace before planning work."}
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                {spanish ? "Limitado a la organización" : "Organization scoped"}
              </span>
            </div>

            {params?.profile === "saved" ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                {spanish ? "Contexto del negocio del cliente guardado." : "Client business context saved."}
              </div>
            ) : null}
            {params?.profile === "error" || params?.profile === "invalid" ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                {spanish ? "No se guardó el contexto del negocio del cliente. Confirma la organización y la migración del Perfil de negocio, luego inténtalo de nuevo." : "Client business context was not saved. Confirm the organization and Business Profile migration, then try again."}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {clientProfiles.map(({ organization, result }) => (
                <article
                  className="rounded-2xl border border-blue-200 bg-white p-5"
                  key={organization.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {spanish ? "Perfil del negocio" : "Business profile"}
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        {organization.name}
                      </h3>
                    </div>
                    {!result.setupRequired && result.data ? (
                      <p className="text-xs text-slate-500">
                        {spanish ? "Actualizado" : "Updated"} {formatDateTime(result.data.updatedAt)}
                      </p>
                    ) : null}
                  </div>

                  {result.setupRequired ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      {spanish ? "Aplica la migración del Perfil de negocio para leer el contexto guardado de este cliente." : "Apply the Business Profile migration to read this client's saved business context."}
                    </div>
                  ) : null}

                  {!result.setupRequired && !result.data ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {spanish ? "Este cliente aún no ha guardado un perfil de negocio." : "This client has not saved a business profile yet."}
                    </div>
                  ) : null}

                  {!result.setupRequired && result.data ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <LeadDetail label={spanish ? "Oferta" : "Offer"} value={result.data.offer ?? (spanish ? "No proporcionado" : "Not provided")} />
                      <LeadDetail label={spanish ? "Cliente objetivo" : "Target customer"} value={result.data.targetCustomer ?? (spanish ? "No proporcionado" : "Not provided")} />
                      <LeadDetail label={spanish ? "Posicionamiento" : "Positioning"} value={result.data.positioning ?? (spanish ? "No proporcionado" : "Not provided")} />
                      <LeadDetail label={spanish ? "Metas actuales" : "Current goals"} value={result.data.currentGoals ?? (spanish ? "No proporcionado" : "Not provided")} />
                      <div className="sm:col-span-2">
                        <LeadDetail label={spanish ? "Restricciones" : "Constraints"} value={result.data.constraints ?? (spanish ? "No proporcionado" : "Not provided")} />
                      </div>
                    </div>
                  ) : null}

                  {!result.setupRequired ? (
                    <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-sm font-bold text-slate-950">
                        {spanish ? "Editar contexto del negocio del cliente" : "Edit client business context"}
                      </summary>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {spanish ? "Guarda solo contexto operativo aprobado por el cliente. Mantén contactos privados, términos legales, contraseñas y datos de cuentas financieras fuera de este perfil general." : "Save only client-approved operating context. Keep private sponsor contacts, legal terms, passwords, and financial account details out of this general profile."}
                      </p>
                      <form action={saveAdminBusinessProfile} className="mt-4 space-y-4">
                        <input
                          name="organizationId"
                          type="hidden"
                          value={organization.id}
                        />
                        <AdminProfileField
                          defaultValue={result.data?.offer}
                          label={spanish ? "Lo que ofreces" : "What you offer"}
                          name="offer"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.targetCustomer}
                          label={spanish ? "Cliente objetivo" : "Target customer"}
                          name="targetCustomer"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.positioning}
                          label={spanish ? "Por qué te eligen los clientes" : "Why customers choose you"}
                          name="positioning"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.currentGoals}
                          label={spanish ? "Metas actuales" : "Current goals"}
                          name="currentGoals"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.constraints}
                          label={spanish ? "Desafíos y límites" : "Challenges and limits"}
                          name="constraints"
                        />
                        <button
                          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          {spanish ? "Guardar contexto del negocio del cliente" : "Save client business context"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {organizations.data.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                {spanish ? "Operaciones del piloto fundador" : "Founding Pilot Operations"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {spanish ? "Espacios de ejecución del cliente" : "Client execution workspaces"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {spanish ? "Las metas, acciones, el trabajo para revisión del cliente y las aprobaciones permanecen en un solo lugar. Las capacidades de agentes aparecerán aquí a medida que cada flujo se conecte, pruebe y apruebe." : "Goals, actions, work for client review, and approvals stay in one place. Agent capabilities will appear here as each workflow is connected, tested, and approved."}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {pilotWorkspaces.map(({ organization, result }) =>
                result.setupRequired ? (
                  <div
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700"
                    key={organization.id}
                  >
                    {spanish ? "Aplica la migración del flujo de piloto fundador para administrar los espacios piloto." : "Apply the Founding Pilot Workflow migration to manage pilot workspaces."}
                  </div>
                ) : (
                  <AdminPilotWorkspace
                    key={organization.id}
                    language={language}
                    organizationId={organization.id}
                    organizationName={organization.name}
                    workspace={result.data}
                  />
                ),
              )}
            </div>
          </section>
        ) : null}

        {organizations.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            {spanish ? "Las tablas del espacio aún no están listas. Aplica la migración base del espacio en Supabase para habilitar la lista de organizaciones." : "Workspace tables are not ready yet. Apply the workspace foundation migration in Supabase to enable the organization list shell."}
          </div>
        ) : null}

        {!organizations.setupRequired && organizations.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            {spanish ? "Aún no existen organizaciones." : "No organizations exist yet."}
          </div>
        ) : null}

        {organizations.data.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {spanish ? "Organizaciones" : "Organizations"}
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {organizations.data.map((organization) => (
                <div
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  key={organization.id}
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {organization.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Slug: {organization.slug ?? (spanish ? "sin definir" : "not set")}
                    </p>
                  </div>
                  {organization.slug ? (
                    <Link
                      className="w-fit rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      href={`/client?previewOrg=${encodeURIComponent(organization.slug)}`}
                    >
                      {spanish ? "Ver panel del cliente" : "View client dashboard"}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                {spanish ? "Acceso de clientes" : "Client access"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {spanish ? "Verificar membresía y enviar un correo de acceso seguro" : "Verify membership and send a secure login email"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {spanish ? "Esto envía un enlace único para configurar o restablecer la contraseña solo cuando coinciden el usuario de Auth y la membresía de la organización. Atlas nunca ve ni envía una contraseña del cliente." : "This sends a one-time password setup/reset link only after the Auth user and organization membership match. Atlas never sees or sends a client password."}
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {spanish ? "Solo súper administrador" : "Super Admin only"}
            </span>
          </div>

          {clientAccess.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {spanish ? <>Aplica la migración <code>20260716120000_atlas_client_access_roster.sql</code> en Supabase para verificar aquí el acceso de QTime.</> : <>Apply migration <code>20260716120000_atlas_client_access_roster.sql</code> in Supabase to verify QTime access here.</>}
            </div>
          ) : null}

          {!clientAccess.setupRequired && clientAccess.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {spanish ? "Aún no hay usuarios de Auth de clientes vinculados a una organización." : "No client Auth users are attached to an organization yet."}
            </div>
          ) : null}

          <form
            action={assignClientMembership}
            className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-slate-950">
                {spanish ? "Vincular un usuario de Auth invitado a una organización" : "Attach an invited Auth user to an organization"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {spanish ? "Primero invita al cliente en Supabase Authentication. Luego escribe aquí el mismo correo para que Atlas pueda crear o reparar la membresía." : "First invite the client in Supabase Authentication. Then enter the same email here so Atlas can create or repair the membership."}
              </p>
            </div>
            <label>
              <span className="text-sm font-medium text-slate-700">
                {spanish ? "Correo del cliente" : "Client email"}
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                name="email"
                placeholder="owner@example.com"
                required
                type="email"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">
                {spanish ? "Organización" : "Organization"}
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                name="organizationId"
                required
              >
                <option value="">{spanish ? "Elige una organización" : "Choose an organization"}</option>
                {organizations.data.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">{spanish ? "Rol" : "Role"}</span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                defaultValue="owner"
                name="role"
              >
                <option value="owner">{spanish ? "Dueño" : "Owner"}</option>
                <option value="admin">{spanish ? "Administrador" : "Admin"}</option>
                <option value="member">{spanish ? "Miembro" : "Member"}</option>
              </select>
            </label>
            <button
              className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:self-end"
              type="submit"
            >
              {spanish ? "Vincular cuenta del cliente" : "Attach client account"}
            </button>
          </form>

          <div className="mt-5 divide-y divide-slate-200">
            {clientAccess.data.map((member) => (
              <div
                className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                key={`${member.organizationId}:${member.userId}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">
                      {member.organizationName}
                    </p>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700">
                      {member.membershipRole}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                        member.emailConfirmedAt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {member.emailConfirmedAt
                        ? spanish ? "Correo confirmado" : "Email confirmed"
                        : spanish ? "Invitación no aceptada" : "Invitation not accepted"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{member.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {spanish ? "Último acceso" : "Last sign-in"}:{" "}
                    {member.lastSignInAt
                      ? formatDateTime(member.lastSignInAt)
                      : spanish ? "Nunca" : "Never"}
                  </p>
                </div>

                {member.emailConfirmedAt ? (
                  <form action={sendClientLoginEmail}>
                    <input
                      name="organizationId"
                      type="hidden"
                      value={member.organizationId}
                    />
                    <input name="userId" type="hidden" value={member.userId} />
                    <input name="email" type="hidden" value={member.email} />
                    <button
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 lg:w-auto"
                      type="submit"
                    >
                      {spanish ? "Enviar correo de acceso seguro" : "Send secure login email"}
                    </button>
                  </form>
                ) : (
                  <p className="max-w-sm text-sm leading-6 text-amber-900">
                    {spanish ? "Reenvía la invitación una sola vez desde Supabase Authentication. No envíes un correo de restablecimiento hasta que la invitación sea aceptada y el correo confirmado." : "Resend the invitation once from Supabase Authentication. Do not send a password-reset email until the invitation is accepted and the email is confirmed."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/"
        >
          {spanish ? "Sitio público" : "Public site"}
        </Link>
        <form action={signOut}>
          <button
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            type="submit"
          >
            {spanish ? "Cerrar sesión" : "Sign out"}
          </button>
        </form>
      </div>
    </SurfaceShell>
  );
}

function AdminProfileField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950"
        defaultValue={defaultValue ?? ""}
        maxLength={10000}
        name={name}
      />
    </label>
  );
}

function MetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "blue" | "gold" | "green" | "violet";
  value: string;
}) {
  return (
    <div className={`lions-den-metric lions-den-metric-${tone}`}>
      <div className="lions-den-metric-label">{label}</div>
      <div className="lions-den-metric-value">{value}</div>
      <div className="lions-den-metric-detail">{detail}</div>
    </div>
  );
}

function humanize(value: string, language: "en" | "es" = "en") {
  if (language === "es") {
    const translated = ({
      acknowledged: "Reconocida", contacted: "Contactado", converted: "Convertido", email: "Email", immediate: "Inmediato", new: "Nuevo", not_a_fit: "No encaja", open: "Abierta", phone: "Teléfono", qualified: "Calificado", resolved: "Resuelta", sms: "SMS", social: "Redes sociales",
    } as Record<string, string>)[value];
    if (translated) return translated;
  }
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function LeadDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function WebsiteLink({ value }: { value?: string | null }) {
  if (!value) {
    return null;
  }

  let safeUrl: string;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    safeUrl = url.toString();
  } catch {
    return null;
  }

  return (
    <a
      className="mt-1 block break-all text-sm text-blue-700 hover:underline"
      href={safeUrl}
      rel="noreferrer"
      target="_blank"
    >
      {value}
    </a>
  );
}
