import Link from "next/link";
import type { ObsidianVaultSnapshot } from "@/server/brain/obsidian";
import type { AgentRunSummary } from "@/server/agents/queries";
import type { SalesProspect } from "@/server/sales/queries";
import type { OperationsSnapshot } from "@/server/operations/queries";
import { summarizeOperations } from "@/server/operations/summary";

type QueryState = "connected" | "empty" | "needs-input";

type CommandCenterOverviewProps = {
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
            Unified operating view
          </p>
          <h2
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
            id="command-center-overview-title"
          >
            What is real, waiting, or needs input
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This is a read-only summary of the connected systems. Empty and
            unconfigured surfaces stay visible instead of looking complete.
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
          Authenticated · server-checked
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusCard
          detail={
            sales.setupRequired
              ? "CRM migration is not available to this workspace."
              : `${openProspects.length} open · ${scheduledFollowUps.length} scheduled`
          }
          href="/lions-den/sales"
          label="CRM / follow-up"
          state={salesState(sales.setupRequired, sales.data.length)}
          value={sales.setupRequired ? "Needs setup" : `${openProspects.length} open`}
        />
        <StatusCard
          detail={
            operations.setupRequired
              ? "Project and mission registry migration is not available yet."
              : operationsSummary.openMissionCount > 0
                ? `${operationsSummary.openMissionCount} open mission${operationsSummary.openMissionCount === 1 ? "" : "s"} across ${operationsSummary.activeProjectCount} active project${operationsSummary.activeProjectCount === 1 ? "" : "s"}`
                : "No project or mission records have been added yet."
          }
          href="/lions-den/missions"
          label="Missions / projects"
          state={operations.setupRequired ? "needs-input" : operationsSummary.openMissionCount > 0 ? "connected" : "empty"}
          value={
            operations.setupRequired
              ? "Needs setup"
              : `${operationsSummary.openMissionCount} open`
          }
        />
        <StatusCard
          detail={
            brain.exists
              ? `${brain.noteCount} Markdown notes · ${brain.folderCount} folders`
              : brain.error ?? "Configure a server-side vault path to inspect notes."
          }
          href="/lions-den/brain"
          label="Second brain"
          state={brain.exists ? "connected" : "needs-input"}
          value={brain.exists ? "Connected" : "Needs setup"}
        />
        <StatusCard
          detail={
            agents.setupRequired
              ? "The agent usage ledger is not available yet."
              : `${agents.data.length} logged run${agents.data.length === 1 ? "" : "s"}; no workflow runs are implied by an empty ledger.`
          }
          href="/lions-den/agents"
          label="Agent workflows"
          state={agents.setupRequired ? "needs-input" : readyAgents ? "connected" : "empty"}
          value={agents.setupRequired ? "Needs setup" : readyAgents ? "Ledger active" : "No runs yet"}
        />
        <StatusCard
          detail={
            !operationsReady
              ? "Cash ledger migration is not available yet."
              : !hasCashEntries
                ? "No cash entries have been recorded yet."
                : verifiedSettledCashEntryCount > 0
                  ? `${verifiedSettledCashEntryCount} verified settled or refunded entr${verifiedSettledCashEntryCount === 1 ? "y" : "ies"}`
                  : `${operationsSummary.unverifiedCashEntryCount} entr${operationsSummary.unverifiedCashEntryCount === 1 ? "y needs" : "ies need"} verification before cash is counted`
          }
          label="Cash / payments"
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
              ? "Needs setup"
              : !hasCashEntries
                ? "No entries yet"
                : verifiedSettledCashEntryCount > 0
                  ? `${verifiedSettledCashEntryCount} verified`
                  : "Needs review"
          }
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Approval gates remain in force: customer contact, payments, publishing,
        destructive actions, credentials, schema changes, and deployment are not
        performed from this read-only summary.
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
  state,
  value,
}: {
  detail: string;
  href?: string;
  label: string;
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
          {stateLabel[state]}
        </span>
      </div>
      <strong className="mt-4 block text-lg tracking-tight text-slate-950">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
      {href ? <span className="mt-4 block text-xs font-bold text-blue-700">Open surface →</span> : null}
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

const stateLabel: Record<QueryState, string> = {
  connected: "Real now",
  empty: "Empty",
  "needs-input": "Needs input",
};

const stateClasses: Record<QueryState, string> = {
  connected: "bg-emerald-100 text-emerald-800",
  empty: "bg-slate-200 text-slate-700",
  "needs-input": "bg-amber-100 text-amber-800",
};
