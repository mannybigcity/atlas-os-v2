import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import { getSiteLanguage } from "@/lib/site-language-server";
import {
  formatMicroUsd,
  getKingdomAgent,
  kingdomAgents,
  type KingdomAgentRole,
} from "@/lib/kingdom-agents";
import { getRecentAgentRuns } from "@/server/agents/queries";
import { requireSuperAdmin } from "@/server/auth/guards";

function statusClass(status?: string) {
  if (status === "succeeded") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "blocked") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function roleTone(role: KingdomAgentRole) {
  const tones: Record<KingdomAgentRole, string> = {
    atlas: "border-amber-200 bg-amber-50 text-amber-900",
    hunter: "border-blue-200 bg-blue-50 text-blue-900",
    micah: "border-violet-200 bg-violet-50 text-violet-900",
    david: "border-slate-200 bg-slate-50 text-slate-900",
    oracle: "border-indigo-200 bg-indigo-50 text-indigo-900",
  };

  return tones[role];
}

export default async function LionDenAgentsPage() {
  const user = await requireSuperAdmin("/lions-den/agents");
  const [language, runs] = await Promise.all([
    getSiteLanguage(),
    getRecentAgentRuns(50),
  ]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const recentRuns = runs.data;
  const runsByRole = recentRuns.reduce(
    (accumulator, run) => {
      accumulator[run.role] = [...(accumulator[run.role] ?? []), run];
      return accumulator;
    },
    {} as Record<KingdomAgentRole, typeof recentRuns>,
  );

  const todayCost = recentRuns
    .filter((run) => new Date(run.occurredAt) >= todayStart)
    .reduce((total, run) => total + run.estimatedCostMicrousd, 0);

  const todayRuns = recentRuns.filter(
    (run) => new Date(run.occurredAt) >= todayStart,
  ).length;

  return (
    <SurfaceShell
      description={language === "es" ? "Una superficie de mando visible para el equipo de agentes de Atlas. Muestra roles, presupuestos, límites de aprobación y actividad real del registro cuando se ejecutan los flujos." : "A visible command surface for the Atlas agent roster. This shows the roles, budgets, approval boundaries, and real ledger activity when agent workflows run."}
      eyebrow={language === "es" ? "Panel del cliente" : "Client Dashboard"}
      title={language === "es" ? "Comando de agentes de Atlas" : "Atlas Agent Command"}
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        {language === "es" ? "Sesión iniciada como" : "Signed in as"} {user.email}. {language === "es" ? "ATLAS sigue siendo el Jefe de Gabinete. HUNTER, MICAH, DAVID y ORACLE apoyan la misión sin anular la aprobación de Manny." : "ATLAS remains Chief of Staff. HUNTER, MICAH, DAVID, and ORACLE support the mission without overriding Manny approval."}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {language === "es" ? "Ejecuciones registradas hoy" : "Today’s logged runs"}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{todayRuns}</p>
          <p className="mt-2 text-sm text-slate-600">
            {language === "es" ? "Ejecuciones reales del registro privado de uso." : "Real runs from the private usage ledger."}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {language === "es" ? "Costo estimado de API de hoy" : "Today’s estimated API cost"}
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {formatMicroUsd(todayCost)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {language === "es" ? "Los costos estimados se registran por flujo." : "Cost estimates are tracked per workflow."}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              {language === "es" ? "Equipo" : "Roster"}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {language === "es" ? "Los agentes que puedes ver y gobernar" : "The agents you can see and govern"}
            </h2>
          </div>
          <Link
            className="text-sm font-bold text-blue-700 hover:text-blue-900"
            href="/lions-den/sales"
          >
            {language === "es" ? "Abrir Comando de ventas" : "Open Sales Command"} →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {kingdomAgents.map((agent) => {
            const localizedAgent = language === "es" ? spanishAgentCopy[agent.role] : agent;
            const latestRun = runsByRole[agent.role]?.[0];
            const loggedCost = (runsByRole[agent.role] ?? [])
              .filter((run) => new Date(run.occurredAt) >= todayStart)
              .reduce((total, run) => total + run.estimatedCostMicrousd, 0);

            return (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                key={agent.role}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${roleTone(
                        agent.role,
                      )}`}
                    >
                      {localizedAgent.mascot}
                    </span>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                      {agent.name}
                    </h3>
                    <p className="text-sm font-semibold text-slate-700">
                      {localizedAgent.title}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(
                      latestRun?.status,
                    )}`}
                  >
                    {statusLabel(latestRun?.status ?? agent.status, language)}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {localizedAgent.mission}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {language === "es" ? "Sala" : "Room"}
                    </p>
                    <p className="mt-1 font-bold text-slate-950">{localizedAgent.room}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {language === "es" ? "Presupuesto diario" : "Daily budget"}
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {formatMicroUsd(agent.dailyBudgetMicrousd)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {language === "es" ? "Aprobación" : "Approval"}
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {agent.approvalRequired ? language === "es" ? "Requerida" : "Required" : language === "es" ? "Solo interno" : "Internal only"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {language === "es" ? "Última ejecución" : "Last run"}
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {latestRun ? formatDateTime(latestRun.occurredAt) : language === "es" ? "Aún no hay ejecuciones registradas" : "No ledger run yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {language === "es" ? "Política de modelos y tokens" : "Model and token policy"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {localizedAgent.modelPolicy}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {language === "es" ? "Registrado hoy para" : "Logged today for"} {agent.name}: {formatMicroUsd(loggedCost)}
                  </p>
                </div>

                <ul className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  {localizedAgent.capabilities.map((capability) => (
                    <li className="flex gap-2" key={capability}>
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
          {language === "es" ? "Registro real de actividad de agentes" : "Real agent activity ledger"}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          {language === "es" ? "Lo que realmente han hecho" : "What they have actually done"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {language === "es" ? <>Esta actividad proviene de <code>atlas_agent_runs</code> en Supabase. Es la diferencia entre una mascota y un sistema que funciona.</> : <>This feed comes from Supabase <code>atlas_agent_runs</code>. It is the difference between a mascot and a working system.</>}
        </p>

        {runs.setupRequired ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            {language === "es" ? "El registro de ejecuciones de agentes aún no está listo. Aplica la migración del registro de uso de agentes en Supabase." : "Agent run ledger is not ready yet. Apply the agent usage ledger migration in Supabase."}
          </div>
        ) : null}

        {!runs.setupRequired && recentRuns.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            {language === "es" ? "Aún no se han registrado ejecuciones. Ejecuta una investigación de HUNTER o crea una muestra de MICAH desde Comando de ventas y el trabajo aparecerá aquí." : "No agent runs have been recorded yet. Run HUNTER research or MICAH sample creation from Sales Command and the work will appear here."}
          </div>
        ) : null}

        {!runs.setupRequired && recentRuns.length > 0 ? (
          <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
            {recentRuns.map((run) => {
              const agent = getKingdomAgent(run.role);

              return (
                <article
                  className="grid gap-3 bg-white p-4 sm:grid-cols-[9rem_1fr_auto] sm:items-center"
                  key={run.id}
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {agent?.name ?? run.role.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(run.occurredAt)}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{run.workflow}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {run.provider}
                      {run.model ? ` · ${run.model}` : ""} ·{" "}
                      {run.inputTokens + run.outputTokens} tokens ·{" "}
                      {run.resultCount} {language === "es" ? "resultados" : "results"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(
                        run.status,
                      )}`}
                    >
                      {statusLabel(run.status, language)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {formatMicroUsd(run.estimatedCostMicrousd)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </SurfaceShell>
  );
}

function statusLabel(value: string, language: "en" | "es") {
  if (language !== "es") return value.replaceAll("_", " ");
  return ({ active: "activo", blocked: "bloqueado", connected: "conectado", failed: "fallido", planned: "planificado", succeeded: "exitoso" } as Record<string, string>)[value] ?? value.replaceAll("_", " ");
}

const spanishAgentCopy: Record<KingdomAgentRole, { title: string; mascot: string; room: string; mission: string; modelPolicy: string; capabilities: string[] }> = {
  atlas: {
    title: "Jefe de Gabinete del Reino",
    mascot: "León dorado",
    room: "Sala del Trono",
    mission: "Proteger el enfoque de Manny, hacer cumplir la Constitución del Reino RAMFAM y convertir oportunidades dispersas en la próxima acción práctica de ingresos.",
    modelPolicy: "Usar razonamiento más potente solo cuando la decisión cambie dinero, clientes o dirección.",
    capabilities: ["Priorizar ingresos antes que expansión", "Asignar el trabajo al rol correcto", "Mantener visibles las puertas de aprobación", "Resumir la mejor próxima acción"],
  },
  hunter: {
    title: "Comandante de ingresos",
    mascot: "Águila calva",
    room: "Sala de estrategia de HUNTER",
    mission: "Encontrar oportunidades prácticas de ingresos, calificar prospectos, organizar señales de encaje y traer las mejores opciones para revisión.",
    modelPolicy: "Usar modelos pequeños para limpiar investigación; gastar solo cuando un prospecto merezca revisión.",
    capabilities: ["Seguimiento de fuentes de prospectos", "Resúmenes de señales de encaje", "Notas de oportunidades de ingresos", "Preparación de contacto con aprobación previa"],
  },
  micah: {
    title: "Agente de redes sociales",
    mascot: "Perezoso",
    room: "Estudio multimedia de MICAH",
    mission: "Convertir objetivos de negocio en borradores útiles, ideas de campaña, ofertas, textos, guiones y direcciones visuales que el dueño pueda aprobar.",
    modelPolicy: "Usar muestras limitadas en público; reservar calendarios extensos para paneles de clientes de pago.",
    capabilities: ["Borradores de muestras de contenido", "Enfoques de campaña", "Opciones de texto y llamados a la acción", "Activos de marketing listos para aprobación"],
  },
  david: {
    title: "Agente del CRM",
    mascot: "Lobo",
    room: "Panel del CRM",
    mission: "Evitar que se pierdan prospectos, notas, contexto del cliente, fechas de seguimiento y oportunidades abiertas.",
    modelPolicy: "Usar primero reglas deterministas de base de datos; llamar a IA solo para resumir notas desordenadas.",
    capabilities: ["Visibilidad del embudo", "Recordatorios de próximas acciones", "Organización del contexto del cliente", "Higiene de la cola de seguimiento"],
  },
  oracle: {
    title: "Inteligencia del Reino y vigilancia de tendencias",
    mascot: "Búho",
    room: "Torre de vigilancia de ORACLE",
    mission: "Vigilar herramientas útiles, cambios del mercado, tendencias de repositorios, ideas de flujo y señales de ingresos que puedan fortalecer el Reino.",
    modelPolicy: "Usar análisis programados económicos; escalar solo cuando la señal pueda afectar los ingresos.",
    capabilities: ["Vigilancia de herramientas y repositorios", "Comprobaciones de utilidad de MCP", "Resúmenes de señales de ingresos", "Filtrado de objetos brillantes"],
  },
};
