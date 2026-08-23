import Link from "next/link";
import type { Metadata } from "next";
import { HunterSearch } from "@/components/hunter-search";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import type { SiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requireSuperAdmin } from "@/server/auth/guards";
import { createSalesProspect } from "@/server/sales/actions";
import {
  getSalesProspects,
  type SalesProspectStatus,
} from "@/server/sales/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Command | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type SalesPageProps = {
  searchParams?: Promise<{ crm?: string }>;
};

const errorMessages: Record<string, Record<SiteLanguage, string>> = {
  business_name_required: { en: "Enter the prospect's business name.", es: "Escribe el nombre del negocio del prospecto." },
  invalid_website: { en: "Enter a valid business website, such as example.com.", es: "Escribe un sitio web válido, como example.com." },
  invalid_source: { en: "Enter a valid public source URL beginning with a real domain.", es: "Escribe una URL pública válida que comience con un dominio real." },
  invalid_email: { en: "Enter a valid business contact email or leave it blank.", es: "Escribe un correo comercial válido o deja el campo vacío." },
  invalid_contact_basis: { en: "Choose a valid contact basis.", es: "Elige una base de contacto válida." },
  create_failed: { en: "The prospect could not be created. Apply the Atlas Sales CRM migration first.", es: "No se pudo crear el prospecto. Aplica primero la migración del CRM de ventas de Atlas." },
};

const openStatuses = new Set<SalesProspectStatus>([
  "new",
  "researching",
  "review_ready",
  "approved_for_outreach",
  "contacted",
  "replied",
  "qualified",
  "proposal_sent",
]);

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireSuperAdmin("/lions-den/sales");
  const [language, params, prospects] = await Promise.all([
    getSiteLanguage(),
    searchParams,
    getSalesProspects(),
  ]);
  const error = params?.crm ? errorMessages[params.crm]?.[language] : null;
  const openCount = prospects.data.filter((prospect) =>
    openStatuses.has(prospect.status),
  ).length;
  const scheduledCount = prospects.data.filter(
    (prospect) =>
      prospect.nextActionAt &&
      openStatuses.has(prospect.status),
  ).length;
  const now = await getCurrentTimestamp();
  const followUpQueue = prospects.data
    .filter(
      (prospect) =>
        prospect.nextActionAt && openStatuses.has(prospect.status),
    )
    .sort(
      (left, right) =>
        new Date(left.nextActionAt!).getTime() -
        new Date(right.nextActionAt!).getTime(),
    );
  const overdueCount = followUpQueue.filter(
    (prospect) => new Date(prospect.nextActionAt!).getTime() < now,
  ).length;
  const approvedCount = prospects.data.filter(
    (prospect) => prospect.outreachApprovedAt,
  ).length;

  return (
    <SurfaceShell
      description={language === "es" ? "El sistema privado de ventas de Atlas. HUNTER investiga, DAVID mantiene visible cada próxima acción, MICAH prepara borradores aprobados y ATLAS coordina las transferencias." : "The private Atlas sales system. HUNTER researches, DAVID keeps every next step visible, MICAH prepares approved drafts, and ATLAS coordinates the handoffs."}
      eyebrow={language === "es" ? "Operaciones de ingresos de Atlas" : "Atlas Revenue Operations"}
      title={language === "es" ? "Comando de ventas" : "Sales Command"}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={language === "es" ? "Prospectos abiertos" : "Open prospects"} value={openCount} />
        <Metric label={language === "es" ? "Próximas acciones vencidas" : "Overdue next actions"} value={overdueCount} tone={overdueCount ? "amber" : "slate"} />
        <Metric label={language === "es" ? "Acciones programadas" : "Actions scheduled"} value={scheduledCount} tone={scheduledCount ? "blue" : "slate"} />
        <Metric label={language === "es" ? "Contacto aprobado" : "Outreach approved"} value={approvedCount} tone="blue" />
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          {error}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          {language === "es" ? "Límite de lanzamiento" : "Launch boundary"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">
          {language === "es" ? "Investigar primero. Aprobación humana antes del contacto." : "Research first. Human approval before contact."}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {language === "es" ? "Agregar un prospecto no envía correos, mensajes de texto, mensajes sociales ni llamadas. El contacto permanece bloqueado hasta verificar el destino, comprobar supresiones y obtener la aprobación de Manny para el canal específico." : "Adding a prospect does not send email, text, social messages, or calls. Outreach is locked until a destination is verified, suppression is checked, and Manny approves the specific channel."}
        </p>
      </section>

      <HunterSearch />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {language === "es" ? "Enfoque de seguimiento de DAVID" : "DAVID follow-up focus"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {language === "es" ? "No dejes que desaparezca la próxima acción" : "Do not let the next step disappear"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {language === "es" ? "El trabajo vencido aparece primero. Abre el prospecto, completa la acción y programa la siguiente mientras la conversación está fresca." : "Overdue work appears first. Open the prospect, complete the action, and schedule the next one while the conversation is fresh."}
            </p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${overdueCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {overdueCount ? language === "es" ? `${overdueCount} vencidas` : `${overdueCount} overdue` : language === "es" ? "Cola al día" : "Queue current"}
          </span>
        </div>

        {followUpQueue.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {language === "es" ? "Aún no hay fechas de seguimiento programadas. Agrega una próxima acción y fecha límite a cada prospecto activo." : "No follow-up dates are scheduled yet. Add a next action and due date to every active prospect."}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {followUpQueue.slice(0, 8).map((prospect) => {
              const overdue = new Date(prospect.nextActionAt!).getTime() < now;
              return (
                <Link
                  className={`rounded-2xl border p-4 transition hover:shadow-sm ${overdue ? "border-amber-200 bg-amber-50 hover:border-amber-300" : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}
                  href={`/lions-den/sales/${prospect.id}`}
                  key={prospect.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {prospect.businessName}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {prospect.nextAction ?? (language === "es" ? "Elige la próxima acción de seguimiento" : "Choose the next follow-up step")}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${overdue ? "bg-amber-200 text-amber-900" : "bg-blue-100 text-blue-800"}`}>
                      {overdue ? language === "es" ? "Vencida" : "Overdue" : language === "es" ? "Siguiente" : "Next up"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {formatDateTime(prospect.nextActionAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {language === "es" ? "Ingreso de HUNTER" : "HUNTER intake"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {language === "es" ? "Agregar un prospecto investigado" : "Add a researched prospect"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {language === "es" ? "Empieza con datos verificados en el sitio público del negocio, una referencia u otra fuente permitida. Guarda la fuente para poder explicar siempre el origen del registro." : "Start with facts you verified on the business's own public site, a referral, or another permitted source. Save the source so we can always explain where the record came from."}
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            {language === "es" ? "Sin envío automático" : "No auto-send"}
          </span>
        </div>

        <form action={createSalesProspect} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={language === "es" ? "Nombre del negocio" : "Business name"} name="businessName" required />
          <Field label={language === "es" ? "Categoría del negocio" : "Business category"} name="industry" placeholder={language === "es" ? "Reparación de autos, cuidado infantil, fitness, servicios para el hogar..." : "Auto repair, childcare, fitness, home services..."} />
          <Field label={language === "es" ? "Ciudad" : "City"} name="city" />
          <Field label={language === "es" ? "Estado / región" : "State / region"} name="region" placeholder="TX" />
          <Field label={language === "es" ? "Sitio web del negocio" : "Business website"} name="website" placeholder="example.com" type="text" />
          <Field label={language === "es" ? "URL de fuente pública" : "Public source URL"} name="sourceUrl" placeholder="https://example.com/contact" type="url" />
          <Field label={language === "es" ? "Nombre de contacto (si es público)" : "Contact name (if public)"} name="contactName" />
          <Field label={language === "es" ? "Correo comercial (si es público)" : "Business email (if public)"} name="contactEmail" type="email" />
          <Field label={language === "es" ? "Teléfono comercial (si es público)" : "Business phone (if public)"} name="contactPhone" type="tel" />
          <Field label={language === "es" ? "Perfil o usuario social" : "Social profile or handle"} name="socialMedia" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Base de contacto" : "Contact basis"}</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
              defaultValue="public_business_contact"
              name="contactBasis"
            >
              <option value="public_business_contact">{language === "es" ? "Contacto comercial público" : "Public business contact"}</option>
              <option value="referral">{language === "es" ? "Referencia" : "Referral"}</option>
              <option value="prior_relationship">{language === "es" ? "Relación previa" : "Prior relationship"}</option>
              <option value="inbound_consent">{language === "es" ? "Consentimiento entrante" : "Inbound consent"}</option>
              <option value="customer">{language === "es" ? "Cliente actual" : "Current customer"}</option>
              <option value="unknown">{language === "es" ? "Aún no verificado" : "Not verified yet"}</option>
            </select>
          </label>
          <button
            className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:col-span-2"
            type="submit"
          >
            {language === "es" ? "Agregar a la cola de investigación de HUNTER" : "Add to HUNTER research queue"}
          </button>
        </form>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {language === "es" ? "Embudo de DAVID" : "DAVID pipeline"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{language === "es" ? "Prospectos y próximas acciones" : "Prospects and next actions"}</h2>
          </div>
          <span className="text-sm text-slate-500">{prospects.data.length} {language === "es" ? "en total" : "total"}</span>
        </div>

        {prospects.setupRequired ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            {language === "es" ? <>Aplica la migración <code>20260715100000_atlas_sales_crm.sql</code> en Supabase antes de usar Comando de ventas.</> : <>Apply migration <code>20260715100000_atlas_sales_crm.sql</code> in Supabase before using Sales Command.</>}
          </div>
        ) : null}

        {!prospects.setupRequired && prospects.data.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            {language === "es" ? "El embudo está vacío. Agrega arriba el primer negocio investigado; las nuevas evaluaciones del sitio también entrarán automáticamente en este CRM." : "The pipeline is empty. Add the first researched business above; new website assessments will also enter this CRM automatically."}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {prospects.data.map((prospect) => (
            <Link
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
              href={`/lions-den/sales/${prospect.id}`}
              key={prospect.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-950">{prospect.businessName}</h3>
                    <StageBadge language={language} status={prospect.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {prospect.industry ?? (language === "es" ? "Industria sin definir" : "Industry not set")}
                    {prospect.city ? ` · ${prospect.city}${prospect.region ? `, ${prospect.region}` : ""}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {language === "es" ? "Siguiente" : "Next"}: {prospect.nextAction ?? (language === "es" ? "Investigar y elegir la próxima acción" : "Research and choose the next step")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {prospect.nextActionAt
                      ? formatDateTime(prospect.nextActionAt)
                      : language === "es" ? "Sin fecha límite" : "No due date"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    {language === "es" ? "Responsable" : "Owner"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {prospect.assignedRole.toUpperCase()}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {language === "es" ? "Encaje" : "Fit"} {prospect.fitScore ?? "—"}/100
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Link
          className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/lions-den"
        >
          {language === "es" ? "Volver a la Guarida del León" : "Back to the Lion’s Den"}
        </Link>
      </div>
    </SurfaceShell>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "blue" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
    </div>
  );
}

function Field({ label, name, placeholder, required, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function StageBadge({ language, status }: { language: SiteLanguage; status: SalesProspectStatus }) {
  const warm = ["new", "researching", "review_ready"].includes(status);
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${warm ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
      {humanize(status, language)}
    </span>
  );
}

function humanize(value: string, language: SiteLanguage = "en") {
  if (language === "es") {
    const translated = ({ approved_for_outreach: "Aprobado para contacto", contacted: "Contactado", converted: "Convertido", disqualified: "Descalificado", lost: "Perdido", new: "Nuevo", proposal_sent: "Propuesta enviada", qualified: "Calificado", replied: "Respondió", researching: "En investigación", review_ready: "Listo para revisión", won: "Ganado" } as Record<string, string>)[value];
    if (translated) return translated;
  }
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function getCurrentTimestamp() {
  return Date.now();
}
