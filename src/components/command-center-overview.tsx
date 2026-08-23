import Link from "next/link";
import type { SiteLanguage } from "@/lib/site-language";
import type { ObsidianVaultSnapshot } from "@/server/brain/obsidian";
import type { AgentRunSummary } from "@/server/agents/queries";
import type { SalesProspect } from "@/server/sales/queries";
import type { OperationsSnapshot } from "@/server/operations/queries";
import { summarizeOperations } from "@/server/operations/summary";

type QueryState = "connected" | "empty" | "needs-input";

type CommandCenterOverviewProps = {
  language: SiteLanguage;
  sales: {
    data: SalesProspect[];
    setupRequired: boolean;
  };
  brain: ObsidianVaultSnapshot;
  agents: {
    data: AgentRunSummary[];
    setupRequired: boolean;
  };
  operations: {
    data: OperationsSnapshot;
    setupRequired: boolean;
  };
};

const openSalesStatuses = new Set([
  "new",
  "researching",
  "review_ready",
  "approved_for_outreach",
  "contacted",
  "replied",
  "qualified",
  "proposal_sent",
]);

export function CommandCenterOverview({
  agents,
  brain,
  language,
  operations,
  sales,
}: CommandCenterOverviewProps) {
  const openProspects = sales.data.filter((prospect) =>
    openSalesStatuses.has(prospect.status),
  );
  const scheduledFollowUps = openProspects.filter((prospect) => prospect.nextActionAt);

  const readyAgents = !agents.setupRequired && agents.data.length > 0;
  const operationsSummary = summarizeOperations(operations.data);
  const operationsReady = !operations.setupRequired;
  const hasCashEntries = operations.data.cashEntries.length > 0;
  const verifiedSettledCashEntryCount = operations.data.cashEntries.filter(
    (entry) =>
      entry.verificationStatus === "verified" &&
      ["settled", "refunded"].includes(entry.paymentStatus),
  ).length;

  return (
    <section
      aria-labelledby="command-center-overview-title"
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            {language === "es" ? "Vista operativa unificada" : "Unified operating view"}
          </p>
          <h2
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
            id="command-center-overview-title"
          >
            {language === "es" ? "Qué es real, qué está pendiente y qué requiere información" : "What is real, waiting, or needs input"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {language === "es" ? "Este es un resumen de solo lectura de los sistemas conectados. Las superficies vacías o sin configurar permanecen visibles en vez de aparentar estar completas." : "This is a read-only summary of the connected systems. Empty and unconfigured surfaces stay visible instead of looking complete."}
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
          {language === "es" ? "Autenticado · verificado por el servidor" : "Authenticated · server-checked"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusCard
          detail={
            sales.setupRequired
              ? language === "es" ? "La migración del CRM no está disponible en este espacio." : "CRM migration is not available to this workspace."
              : language === "es" ? `${openProspects.length} abiertos · ${scheduledFollowUps.length} programados` : `${openProspects.length} open · ${scheduledFollowUps.length} scheduled`
          }
          href="/lions-den/sales"
          label={language === "es" ? "CRM / seguimiento" : "CRM / follow-up"}
          language={language}
          state={salesState(sales.setupRequired, sales.data.length)}
          value={sales.setupRequired ? language === "es" ? "Requiere configuración" : "Needs setup" : language === "es" ? `${openProspects.length} abiertos` : `${openProspects.length} open`}
        />
        <StatusCard
          detail={
            operations.setupRequired
              ? language === "es" ? "La migración del registro de proyectos y misiones aún no está disponible." : "Project and mission registry migration is not available yet."
              : operationsSummary.openMissionCount > 0
                ? language === "es" ? `${operationsSummary.openMissionCount} misiones abiertas en ${operationsSummary.activeProjectCount} proyectos activos` : `${operationsSummary.openMissionCount} open mission${operationsSummary.openMissionCount === 1 ? "" : "s"} across ${operationsSummary.activeProjectCount} active project${operationsSummary.activeProjectCount === 1 ? "" : "s"}`
                : language === "es" ? "Todavía no se han agregado proyectos ni misiones." : "No project or mission records have been added yet."
          }
          href="/lions-den/missions"
          label={language === "es" ? "Misiones / proyectos" : "Missions / projects"}
          language={language}
          state={operations.setupRequired ? "needs-input" : operationsSummary.openMissionCount > 0 ? "connected" : "empty"}
          value={
            operations.setupRequired
              ? language === "es" ? "Requiere configuración" : "Needs setup"
              : language === "es" ? `${operationsSummary.openMissionCount} abiertas` : `${operationsSummary.openMissionCount} open`
          }
        />
        <StatusCard
          detail={
            brain.exists
              ? language === "es" ? `${brain.noteCount} notas Markdown · ${brain.folderCount} carpetas` : `${brain.noteCount} Markdown notes · ${brain.folderCount} folders`
              : brain.error ?? (language === "es" ? "Configura una ruta de bóveda en el servidor para inspeccionar las notas." : "Configure a server-side vault path to inspect notes.")
          }
          href="/lions-den/brain"
          label={language === "es" ? "Segundo cerebro" : "Second brain"}
          language={language}
          state={brain.exists ? "connected" : "needs-input"}
          value={brain.exists ? language === "es" ? "Conectado" : "Connected" : language === "es" ? "Requiere configuración" : "Needs setup"}
        />
        <StatusCard
          detail={
            agents.setupRequired
              ? language === "es" ? "El registro de uso de agentes aún no está disponible." : "The agent usage ledger is not available yet."
              : language === "es" ? `${agents.data.length} ejecuciones registradas; un registro vacío no implica que haya ejecuciones.` : `${agents.data.length} logged run${agents.data.length === 1 ? "" : "s"}; no workflow runs are implied by an empty ledger.`
          }
          href="/lions-den/agents"
          label={language === "es" ? "Flujos de agentes" : "Agent workflows"}
          language={language}
          state={agents.setupRequired ? "needs-input" : readyAgents ? "connected" : "empty"}
          value={agents.setupRequired ? language === "es" ? "Requiere configuración" : "Needs setup" : readyAgents ? language === "es" ? "Registro activo" : "Ledger active" : language === "es" ? "Aún no hay ejecuciones" : "No runs yet"}
        />
        <StatusCard
          detail={
            !operationsReady
              ? language === "es" ? "La migración del registro de efectivo aún no está disponible." : "Cash ledger migration is not available yet."
              : !hasCashEntries
                ? language === "es" ? "Aún no se han registrado movimientos de efectivo." : "No cash entries have been recorded yet."
                : verifiedSettledCashEntryCount > 0
                  ? language === "es" ? `${verifiedSettledCashEntryCount} entradas liquidadas o reembolsadas verificadas` : `${verifiedSettledCashEntryCount} verified settled or refunded entr${verifiedSettledCashEntryCount === 1 ? "y" : "ies"}`
                  : language === "es" ? `${operationsSummary.unverifiedCashEntryCount} entradas requieren verificación antes de contar el efectivo` : `${operationsSummary.unverifiedCashEntryCount} entr${operationsSummary.unverifiedCashEntryCount === 1 ? "y needs" : "ies need"} verification before cash is counted`
          }
          label={language === "es" ? "Efectivo / pagos" : "Cash / payments"}
          language={language}
          href="/lions-den/cash"
          state={
            !operationsReady
              ? "needs-input"
              : !hasCashEntries
                ? "empty"
                : verifiedSettledCashEntryCount > 0
                  ? "connected"
                  : "needs-input"
          }
          value={
            !operationsReady
              ? language === "es" ? "Requiere configuración" : "Needs setup"
              : !hasCashEntries
                ? language === "es" ? "Aún no hay entradas" : "No entries yet"
                : verifiedSettledCashEntryCount > 0
                  ? language === "es" ? `${verifiedSettledCashEntryCount} verificadas` : `${verifiedSettledCashEntryCount} verified`
                  : language === "es" ? "Requiere revisión" : "Needs review"
          }
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {language === "es" ? "Las puertas de aprobación siguen vigentes: este resumen de solo lectura no realiza contactos con clientes, pagos, publicaciones, acciones destructivas, cambios de credenciales o esquema ni despliegues." : "Approval gates remain in force: customer contact, payments, publishing, destructive actions, credentials, schema changes, and deployment are not performed from this read-only summary."}
      </p>
    </section>
  );
}

function salesState(setupRequired: boolean, count: number): QueryState {
  if (setupRequired) return "needs-input";
  return count > 0 ? "connected" : "empty";
}

function StatusCard({
  detail,
  href,
  label,
  language,
  state,
  value,
}: {
  detail: string;
  href?: string;
  label: string;
  language: SiteLanguage;
  state: QueryState;
  value: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${stateClasses[state]}`}>
          {stateLabel[language][state]}
        </span>
      </div>
      <strong className="mt-4 block text-lg tracking-tight text-slate-950">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
      {href ? <span className="mt-4 block text-xs font-bold text-blue-700">{language === "es" ? "Abrir superficie" : "Open surface"} →</span> : null}
    </>
  );

  return href ? (
    <Link className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" href={href}>
      {content}
    </Link>
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">{content}</div>
  );
}

const stateLabel: Record<SiteLanguage, Record<QueryState, string>> = {
  en: { connected: "Real now", empty: "Empty", "needs-input": "Needs input" },
  es: { connected: "Real ahora", empty: "Vacío", "needs-input": "Requiere información" },
};

const stateClasses: Record<QueryState, string> = {
  connected: "bg-emerald-100 text-emerald-800",
  empty: "bg-slate-200 text-slate-700",
  "needs-input": "bg-amber-100 text-amber-800",
};
