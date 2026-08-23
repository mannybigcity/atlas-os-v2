import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import type { SiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requireSuperAdmin } from "@/server/auth/guards";
import { generateMicahSocialSample } from "@/server/micah/actions";
import {
  addSalesNote,
  approveSalesOutreach,
  suppressSalesProspect,
  updateSalesProspect,
} from "@/server/sales/actions";
import {
  getSalesProspect,
  salesAssignedRoles,
  salesProspectStatuses,
} from "@/server/sales/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prospect Record | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type ProspectPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ crm?: string }>;
};

const noticeMessages: Record<string, { tone: "success" | "error"; text: Record<SiteLanguage, string> }> = {
  created: { tone: "success", text: { en: "Prospect added to HUNTER's research queue.", es: "Prospecto agregado a la cola de investigación de HUNTER." } },
  updated: { tone: "success", text: { en: "Prospect and next action updated.", es: "Prospecto y próxima acción actualizados." } },
  note_added: { tone: "success", text: { en: "DAVID added the note to the permanent timeline.", es: "DAVID agregó la nota al historial permanente." } },
  approved: { tone: "success", text: { en: "Outreach approved for the selected channel(s). Nothing was sent.", es: "Contacto aprobado para los canales seleccionados. No se envió nada." } },
  suppressed: { tone: "success", text: { en: "Contact suppression added and prior approval revoked.", es: "Supresión de contacto agregada y aprobación previa revocada." } },
  invalid_stage: { tone: "error", text: { en: "Choose a valid pipeline stage and owner.", es: "Elige una etapa del embudo y un responsable válidos." } },
  invalid_website: { tone: "error", text: { en: "Enter a valid website, such as example.com.", es: "Escribe un sitio web válido, como example.com." } },
  invalid_email: { tone: "error", text: { en: "Enter a valid email or leave the field blank.", es: "Escribe un correo válido o deja el campo vacío." } },
  invalid_fit_score: { tone: "error", text: { en: "Fit score must be a whole number from 0 to 100.", es: "La puntuación de encaje debe ser un número entero de 0 a 100." } },
  invalid_next_action_date: { tone: "error", text: { en: "Choose a valid next-action date.", es: "Elige una fecha válida para la próxima acción." } },
  business_name_required: { tone: "error", text: { en: "The business name is required.", es: "El nombre del negocio es obligatorio." } },
  approval_requires_gate: { tone: "error", text: { en: "Use the approval gate to enter Approved for outreach.", es: "Usa la puerta de aprobación para pasar a Aprobado para contacto." } },
  update_failed: { tone: "error", text: { en: "The prospect could not be updated.", es: "No se pudo actualizar el prospecto." } },
  note_failed: { tone: "error", text: { en: "The timeline note could not be saved.", es: "No se pudo guardar la nota del historial." } },
  approval_requires_channel: { tone: "error", text: { en: "Select at least one outreach channel.", es: "Selecciona al menos un canal de contacto." } },
  approval_blocked: { tone: "error", text: { en: "Approval was blocked. Verify a destination exists and no suppression applies.", es: "La aprobación fue bloqueada. Verifica que exista un destino y que no haya supresiones." } },
  suppression_failed: { tone: "error", text: { en: "The suppression could not be saved, or an active duplicate already exists.", es: "No se pudo guardar la supresión o ya existe un duplicado activo." } },
  micah_draft_created: { tone: "success", text: { en: "MICAH created three draft posts and recorded the model usage. Nothing was published.", es: "MICAH creó tres borradores y registró el uso del modelo. No se publicó nada." } },
  usage_ledger_required: { tone: "error", text: { en: "Apply the Atlas Agent Usage Ledger migration before spending API tokens.", es: "Aplica la migración del registro de uso de agentes de Atlas antes de gastar tokens de API." } },
  micah_missing_context: { tone: "error", text: { en: "Add an industry, website, or research summary before asking MICAH to draft content.", es: "Agrega una industria, sitio web o resumen de investigación antes de pedir contenido a MICAH." } },
  micah_daily_limit: { tone: "error", text: { en: "This prospect has reached the three-run daily MICAH safety limit.", es: "Este prospecto alcanzó el límite diario de tres ejecuciones de MICAH." } },
  openai_not_configured: { tone: "error", text: { en: "OPENAI_API_KEY is not configured in the server deployment environment.", es: "OPENAI_API_KEY no está configurada en el entorno del servidor." } },
  micah_generation_failed: { tone: "error", text: { en: "MICAH could not generate a valid draft. The failed run was recorded; try again later.", es: "MICAH no pudo generar un borrador válido. La ejecución fallida quedó registrada; inténtalo más tarde." } },
  micah_record_failed: { tone: "error", text: { en: "The draft returned, but Atlas could not atomically record it. Nothing was published.", es: "El borrador regresó, pero Atlas no pudo registrarlo de forma atómica. No se publicó nada." } },
};

export default async function ProspectPage({ params, searchParams }: ProspectPageProps) {
  const { id } = await params;
  await requireSuperAdmin(`/lions-den/sales/${id}`);
  const [language, query, search] = await Promise.all([
    getSiteLanguage(),
    getSalesProspect(id),
    searchParams,
  ]);
  const notice = search?.crm ? noticeMessages[search.crm] : null;

  if (!query.setupRequired && !query.data) notFound();

  if (query.setupRequired || !query.data) {
    return (
      <SurfaceShell
        description={language === "es" ? "Aplica la migración privada del CRM de ventas de Atlas antes de abrir registros de prospectos." : "Apply the private Atlas Sales CRM migration before opening prospect records."}
        eyebrow={language === "es" ? "Operaciones de ingresos de Atlas" : "Atlas Revenue Operations"}
        title={language === "es" ? "El CRM requiere configuración" : "CRM setup required"}
      >
        <Link className="font-semibold text-blue-700 hover:underline" href="/lions-den/sales">
          {language === "es" ? "Volver a Comando de ventas" : "Return to Sales Command"}
        </Link>
      </SurfaceShell>
    );
  }

  const { prospect, sources, events, suppressions } = query.data;
  const activeSuppressions = suppressions.filter((item) => !item.liftedAt);
  const assessmentSource = sources.find(
    (source) => source.sourceType === "business_assessment",
  );
  const assessmentFacts = assessmentSource?.facts ?? {};

  return (
    <SurfaceShell
      description={language === "es" ? "Investiga, califica, aprueba y da seguimiento desde un registro auditado. Nada sale de Atlas solo porque exista un campo o borrador." : "Research, qualify, approve, and follow up from one audited record. Nothing leaves Atlas merely because a field or draft exists."}
      eyebrow={`${prospect.assignedRole.toUpperCase()} · ${humanize(prospect.status, language)}`}
      title={prospect.businessName}
    >
      {notice ? (
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {notice.text[language]}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Summary label={language === "es" ? "Puntuación de encaje" : "Fit score"} value={prospect.fitScore === null ? language === "es" ? "Sin puntuar" : "Not scored" : `${prospect.fitScore}/100`} />
        <Summary label={language === "es" ? "Próxima acción" : "Next action"} value={prospect.nextAction ?? (language === "es" ? "Sin programar" : "Not scheduled")} />
        <Summary label={language === "es" ? "Contacto" : "Outreach"} value={prospect.outreachApprovedAt ? `${language === "es" ? "Aprobado" : "Approved"}: ${prospect.approvedChannels.join(", ")}` : language === "es" ? "No aprobado" : "Not approved"} />
      </div>

      {assessmentSource ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {language === "es" ? "Calificación de la evaluación" : "Assessment qualification"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            {language === "es" ? "Lo que el dueño dijo que necesita" : "What the owner said they need"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label={language === "es" ? "Nuevos prospectos por mes" : "New leads per month"} value={formatFact(assessmentFacts.monthly_lead_volume, language)} />
            <Summary label={language === "es" ? "Velocidad de seguimiento" : "Follow-up speed"} value={formatFact(assessmentFacts.follow_up_speed, language)} />
            <Summary label={language === "es" ? "Rango de presupuesto" : "Budget range"} value={formatFact(assessmentFacts.pilot_budget, language)} />
            <Summary label={language === "es" ? "Contacto preferido" : "Preferred contact"} value={formatFact(assessmentFacts.preferred_contact_method, language)} />
          </div>
        </section>
      ) : null}

      {activeSuppressions.length ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          <strong>{language === "es" ? "No contactar" : "Do not contact"}:</strong> {activeSuppressions.map((item) => `${humanize(item.channel, language)} · ${humanize(item.reason, language)}`).join("; ")}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{language === "es" ? "Registro de ATLAS" : "ATLAS record"}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{language === "es" ? "Investigación y próxima acción" : "Research and next step"}</h2>
        </div>
        <form action={updateSalesProspect} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input name="prospectId" type="hidden" value={prospect.id} />
          <Field defaultValue={prospect.businessName} label={language === "es" ? "Nombre del negocio" : "Business name"} name="businessName" required />
          <Field defaultValue={prospect.industry} label={language === "es" ? "Industria" : "Industry"} name="industry" />
          <Field defaultValue={prospect.addressLine1} label={language === "es" ? "Dirección" : "Address"} name="addressLine1" />
          <Field defaultValue={prospect.city} label={language === "es" ? "Ciudad" : "City"} name="city" />
          <Field defaultValue={prospect.region} label={language === "es" ? "Estado / región" : "State / region"} name="region" />
          <Field defaultValue={prospect.postalCode} label={language === "es" ? "Código postal" : "Postal code"} name="postalCode" />
          <Field defaultValue={prospect.website} label={language === "es" ? "Sitio web" : "Website"} name="website" />
          <Field defaultValue={prospect.contactName} label={language === "es" ? "Nombre de contacto" : "Contact name"} name="contactName" />
          <Field defaultValue={prospect.contactEmail} label={language === "es" ? "Correo comercial" : "Business email"} name="contactEmail" type="email" />
          <Field defaultValue={prospect.contactPhone} label={language === "es" ? "Teléfono comercial" : "Business phone"} name="contactPhone" type="tel" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Perfiles / usuarios sociales" : "Social profiles / handles"}</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.socialMedia ?? ""} name="socialMedia" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Etapa del embudo" : "Pipeline stage"}</span>
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" defaultValue={prospect.status} name="status">
              {salesProspectStatuses.map((status) => <option key={status} value={status}>{humanize(status, language)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Responsable del flujo" : "Workflow owner"}</span>
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" defaultValue={prospect.assignedRole} name="assignedRole">
              {salesAssignedRoles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
            </select>
          </label>
          <Field defaultValue={prospect.fitScore?.toString()} label={language === "es" ? "Puntuación de encaje (0–100)" : "Fit score (0–100)"} max={100} min={0} name="fitScore" type="number" />
          <Field defaultValue={toDateInput(prospect.nextActionAt)} label={language === "es" ? "Vencimiento de la próxima acción" : "Next action due"} name="nextActionAt" type="date" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Por qué este negocio puede encajar" : "Why this business may fit"}</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.fitReason ?? ""} name="fitReason" />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Resumen de investigación de HUNTER" : "HUNTER research summary"}</span>
            <textarea className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.researchSummary ?? ""} name="researchSummary" />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{language === "es" ? "Próxima acción de DAVID" : "DAVID next action"}</span>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.nextAction ?? ""} name="nextAction" />
          </label>
          <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-2" type="submit">
            {language === "es" ? "Guardar prospecto y próxima acción" : "Save prospect and next action"}
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{language === "es" ? "Puerta de aprobación humana" : "Human approval gate"}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{language === "es" ? "Aprobar canales de contacto" : "Approve outreach channels"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{language === "es" ? "La aprobación registra permiso; no envía nada. Selecciona solo destinos que hayas verificado." : "Approval records permission; it does not send anything. Only select destinations you verified."}</p>
          <form action={approveSalesOutreach} className="mt-4">
            <input name="prospectId" type="hidden" value={prospect.id} />
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-800">
              {[
                ["email", Boolean(prospect.contactEmail)],
                ["phone", Boolean(prospect.contactPhone)],
                ["sms", Boolean(prospect.contactPhone)],
                ["social", Boolean(prospect.socialMedia)],
              ].map(([channel, enabled]) => (
                <label className={`rounded-xl border border-emerald-200 bg-white p-3 ${enabled ? "" : "opacity-50"}`} key={String(channel)}>
                  <input disabled={!enabled} name="channels" type="checkbox" value={String(channel)} /> <span className="ml-2">{humanize(String(channel), language)}</span>
                </label>
              ))}
            </div>
            <button className="mt-4 w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800" type="submit">{language === "es" ? "Aprobar canales seleccionados" : "Approve selected channels"}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">{language === "es" ? "Control de supresión" : "Suppression control"}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{language === "es" ? "Bloquear contacto" : "Block contact"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{language === "es" ? "Úsalo de inmediato para bajas, quejas, destinos inválidos o cualquier razón por la que Atlas deba detenerse." : "Use immediately for opt-outs, complaints, invalid destinations, or any reason Atlas should stop."}</p>
          <form action={suppressSalesProspect} className="mt-4 space-y-3">
            <input name="prospectId" type="hidden" value={prospect.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" defaultValue="all" name="channel">
                <option value="all">{language === "es" ? "Todos los canales" : "All channels"}</option><option value="email">Email</option><option value="phone">{language === "es" ? "Teléfono" : "Phone"}</option><option value="sms">SMS</option><option value="social">{language === "es" ? "Redes sociales" : "Social"}</option>
              </select>
              <select className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" defaultValue="manual" name="reason">
                <option value="opt_out">{language === "es" ? "Baja solicitada" : "Opt out"}</option><option value="complaint">{language === "es" ? "Queja" : "Complaint"}</option><option value="hard_bounce">{language === "es" ? "Rebote permanente" : "Hard bounce"}</option><option value="legal">{language === "es" ? "Legal / política" : "Legal / policy"}</option><option value="manual">{language === "es" ? "Retención manual" : "Manual hold"}</option><option value="other">{language === "es" ? "Otro" : "Other"}</option>
              </select>
            </div>
            <textarea className="min-h-20 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" name="note" placeholder={language === "es" ? "Por qué está bloqueado el contacto" : "Why contact is blocked"} />
            <button className="w-full rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800" type="submit">{language === "es" ? "Agregar supresión de contacto" : "Add contact suppression"}</button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{language === "es" ? "Estudio de contenido de MICAH" : "MICAH content studio"}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{language === "es" ? "Crear una muestra de tres publicaciones" : "Create a three-post sample"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{language === "es" ? "Un botón realiza una solicitud limitada a OpenAI. Los borradores y el uso de tokens entran al historial; no hay cuentas sociales conectadas y nada puede publicarse." : "One button makes one bounded OpenAI request. The drafts and token usage enter the timeline; no social account is connected and nothing can publish."}</p>
          </div>
          <form action={generateMicahSocialSample}>
            <input name="prospectId" type="hidden" value={prospect.id} />
            <button className="shrink-0 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" type="submit">{language === "es" ? "Generar 3 borradores" : "Generate 3 drafts"}</button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{language === "es" ? "Historial de DAVID" : "DAVID timeline"}</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{language === "es" ? "Historial permanente del CRM" : "Permanent CRM history"}</h2>
        <form action={addSalesNote} className="mt-4">
          <input name="prospectId" type="hidden" value={prospect.id} />
          <textarea className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" name="body" placeholder={language === "es" ? "Agrega investigación, notas de llamadas, contexto de respuesta o una transferencia..." : "Add research, call notes, reply context, or a handoff..."} required />
          <button className="mt-3 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" type="submit">{language === "es" ? "Agregar nota de DAVID" : "Add DAVID note"}</button>
        </form>
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={event.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">{event.actorRole.toUpperCase()} · {humanize(event.eventType, language)}</p><h3 className="mt-1 font-semibold text-slate-950">{event.summary}</h3></div>
                <time className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</time>
              </div>
              {event.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.body}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{language === "es" ? "Procedencia" : "Provenance"}</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">{language === "es" ? "De dónde provino el registro" : "Where the record came from"}</h2>
        <div className="mt-4 space-y-3">
          {sources.map((source) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" key={source.id}>
              <p className="font-semibold text-slate-900">{humanize(source.sourceType, language)}</p>
              <p className="mt-1 text-slate-500">{language === "es" ? "Recuperado" : "Retrieved"} {formatDateTime(source.retrievedAt)}</p>
              {source.sourceUrl ? <SafeLink language={language} value={source.sourceUrl} /> : null}
              {source.externalId ? <p className="mt-1 break-all text-xs text-slate-500">{language === "es" ? "Referencia" : "Reference"}: {source.externalId}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/lions-den/sales">{language === "es" ? "Volver a Comando de ventas" : "Back to Sales Command"}</Link>
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/lions-den">{language === "es" ? "Guarida del León" : "Lion’s Den"}</Link>
      </div>
    </SurfaceShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-slate-950">{value}</p></div>; }

function Field({ defaultValue, label, max, min, name, required, type = "text" }: { defaultValue?: string | null; label: string; max?: number; min?: number; name: string; required?: boolean; type?: string }) { return <label><span className="text-sm font-medium text-slate-700">{label}</span><input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={defaultValue ?? ""} max={max} min={min} name={name} required={required} type={type} /></label>; }

function SafeLink({ language, value }: { language: SiteLanguage; value: string }) {
  const safeUrl = getSafeUrl(value);
  if (!safeUrl) return null;

  return (
    <a
      className="mt-2 block break-all font-semibold text-blue-700 hover:underline"
      href={safeUrl}
      rel="noreferrer"
      target="_blank"
    >
      {language === "es" ? "Abrir fuente pública" : "Open public source"}
    </a>
  );
}

function getSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function humanize(value: string, language: SiteLanguage = "en") {
  if (language === "es") {
    const translated = ({
      all: "Todos", approved_for_outreach: "Aprobado para contacto", business_assessment: "Evaluación de negocio", complaint: "Queja", contacted: "Contactado", converted: "Convertido", email: "Email", hard_bounce: "Rebote permanente", legal: "Legal", lost: "Perdido", manual: "Retención manual", new: "Nuevo", note_added: "Nota agregada", opt_out: "Baja solicitada", other: "Otro", phone: "Teléfono", proposal_sent: "Propuesta enviada", qualified: "Calificado", replied: "Respondió", researching: "En investigación", review_ready: "Listo para revisión", sms: "SMS", social: "Redes sociales", updated: "Actualizado", won: "Ganado",
    } as Record<string, string>)[value];
    if (translated) return translated;
  }
  const words = value.replaceAll("_", " ").replaceAll(".", " · ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatFact(value: unknown, language: SiteLanguage) {
  return typeof value === "string" && value.length > 0 ? humanize(value, language) : language === "es" ? "No capturado" : "Not captured";
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
