import Link from "next/link";
import type { ReactNode } from "react";
import type {
  OrganizationCashEntry,
  OrganizationMission,
  OrganizationProject,
  OperationsSnapshot,
} from "@/server/operations/queries";
import type { WorkspaceQueryResult } from "@/server/organizations/queries";
import { formatDateTime } from "@/lib/format";
import {
  formatMinorAmount,
  getOperationsSurfaceState,
} from "@/server/operations/presentation";

type OperationsSurfaceProps = {
  operations: WorkspaceQueryResult<OperationsSnapshot>;
  organizationNames: ReadonlyMap<string, string>;
};

export function OperationsNavigation({ active }: { active: "missions" | "cash" }) {
  return (
    <nav aria-label="Operations navigation" className="flex flex-wrap gap-2">
      <Link
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50"
        href="/lions-den"
      >
        ← Command center
      </Link>
      <Link
        aria-current={active === "missions" ? "page" : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === "missions" ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50"}`}
        href="/lions-den/missions"
      >
        Projects &amp; missions
      </Link>
      <Link
        aria-current={active === "cash" ? "page" : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active === "cash" ? "bg-blue-700 text-white" : "border border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50"}`}
        href="/lions-den/cash"
      >
        Cash ledger
      </Link>
    </nav>
  );
}

export function ProjectsMissionsSurface({
  operations,
  organizationNames,
}: OperationsSurfaceProps) {
  const { projects, missions } = operations.data;
  const state = getOperationsSurfaceState(
    operations.setupRequired,
    projects.length + missions.length,
  );
  const activeProjects = projects.filter((project) =>
    ["planned", "active", "on_hold"].includes(project.status),
  ).length;
  const openMissions = missions.filter((mission) =>
    ["planned", "ready", "in_progress", "blocked"].includes(mission.status),
  ).length;
  const blockedMissions = missions.filter((mission) => mission.status === "blocked").length;

  return (
    <>
      <OperationsNavigation active="missions" />
      <SurfaceState
        error={operations.error}
        label="Registry status"
        state={state}
        text={
          state === "needs-input"
            ? "The project and mission registry could not be read for this authenticated workspace."
            : state === "empty"
              ? "The registry is connected, but no project or mission records have been added."
              : "Read-only records from the organization-scoped project and mission registry."
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Active projects" value={activeProjects} />
        <Metric label="Open missions" value={openMissions} />
        <Metric label="Blocked missions" value={blockedMissions} tone={blockedMissions ? "amber" : "slate"} />
      </div>

      {state === "empty" ? (
        <EmptyState
          title="Projects and missions are ready for approved records"
          text="Nothing has been seeded or inferred here. When an approved workflow creates organization-scoped records, they will appear with their real owner, dates, and source." 
        />
      ) : null}

      {state === "connected" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <RecordSection title="Projects" count={projects.length}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                organizationName={organizationNames.get(project.organizationId)}
                project={project}
              />
            ))}
          </RecordSection>
          <RecordSection title="Missions" count={missions.length}>
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                organizationName={organizationNames.get(mission.organizationId)}
              />
            ))}
          </RecordSection>
        </div>
      ) : null}
    </>
  );
}

export function CashLedgerSurface({
  operations,
  organizationNames,
}: OperationsSurfaceProps) {
  const { cashEntries } = operations.data;
  const state = getOperationsSurfaceState(operations.setupRequired, cashEntries.length);
  const verifiedEntries = cashEntries.filter(
    (entry) =>
      entry.verificationStatus === "verified" &&
      ["settled", "refunded"].includes(entry.paymentStatus),
  );
  const verifiedInflow = verifiedEntries
    .filter((entry) => entry.entryDirection === "inflow")
    .reduce((total, entry) => BigInt(total) + BigInt(entry.amountMinor), BigInt(0))
    .toString();
  const verifiedOutflow = verifiedEntries
    .filter((entry) => entry.entryDirection === "outflow")
    .reduce((total, entry) => BigInt(total) + BigInt(entry.amountMinor), BigInt(0))
    .toString();
  const unverifiedEntries = cashEntries.filter(
    (entry) => entry.verificationStatus !== "verified",
  ).length;
  const currency = cashEntries[0]?.currency ?? "USD";

  return (
    <>
      <OperationsNavigation active="cash" />
      <SurfaceState
        error={operations.error}
        label="Ledger status"
        state={state}
        text={
          state === "needs-input"
            ? "The cash ledger could not be read for this authenticated workspace."
            : state === "empty"
              ? "The ledger is connected, but no cash entries have been recorded."
              : "Only verified settled or refunded entries are included in the verified totals below."
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Verified inflow"
          value={state === "empty" ? "Not reported" : formatMinorAmount(verifiedInflow, currency)}
          tone="green"
        />
        <Metric
          label="Verified outflow"
          value={state === "empty" ? "Not reported" : formatMinorAmount(verifiedOutflow, currency)}
          tone="slate"
        />
        <Metric label="Needs verification" value={unverifiedEntries} tone={unverifiedEntries ? "amber" : "slate"} />
      </div>

      {state === "empty" ? (
        <EmptyState
          title="No cash entries yet"
          text="No payment or cash records have been created. This surface does not trigger payments, reconcile accounts, or invent a balance."
        />
      ) : null}

      {state === "connected" ? (
        <section aria-labelledby="cash-entry-list-title" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Read-only ledger</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950" id="cash-entry-list-title">Cash entries</h2>
            </div>
            <span className="text-sm text-slate-500">{cashEntries.length} total</span>
          </div>
          <div className="mt-4 space-y-3">
            {cashEntries.map((entry) => (
              <CashEntryCard
                entry={entry}
                key={entry.id}
                organizationName={organizationNames.get(entry.organizationId)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function SurfaceState({
  error,
  label,
  state,
  text,
}: {
  error: string | null;
  label: string;
  state: "connected" | "empty" | "needs-input";
  text: string;
}) {
  return (
    <div className={`mt-5 rounded-2xl border p-5 ${surfaceStateClasses[state]}`} role={state === "needs-input" ? "alert" : "status"}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em]">{label}</p>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">{surfaceStateLabels[state]}</span>
      </div>
      <p className="mt-2 text-sm leading-6">{text}</p>
      {error ? <p className="mt-2 text-xs leading-5">Query detail: {error}</p> : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">No records yet</p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function RecordSection({ children, count, title }: { children: ReactNode; count: number; title: string }) {
  return (
    <section aria-labelledby={`${title.toLowerCase()}-list-title`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950" id={`${title.toLowerCase()}-list-title`}>{title}</h2>
        <span className="text-sm text-slate-500">{count}</span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ProjectCard({ organizationName, project }: { organizationName?: string; project: OrganizationProject }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{project.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{organizationName ?? "Organization scope not named"}</p>
        </div>
        <StatusBadge value={project.status} />
      </div>
      {project.description ? <p className="mt-3 text-sm leading-6 text-slate-700">{project.description}</p> : null}
      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <DataPoint label="Owner" value={project.ownerLabel ?? "Needs input"} />
        <DataPoint label="Source" value={project.sourceType} />
        <DataPoint label="Target" value={project.targetDate ? formatDateTime(project.targetDate) : "Not set"} />
        <DataPoint label="Updated" value={formatDateTime(project.updatedAt)} />
      </dl>
    </article>
  );
}

function MissionCard({ mission, organizationName }: { mission: OrganizationMission; organizationName?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{mission.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{organizationName ?? "Organization scope not named"}</p>
        </div>
        <StatusBadge value={mission.status} />
      </div>
      {mission.objective ? <p className="mt-3 text-sm leading-6 text-slate-700">{mission.objective}</p> : null}
      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <DataPoint label="Owner" value={mission.ownerLabel ?? "Needs input"} />
        <DataPoint label="Source" value={mission.sourceType} />
        <DataPoint label="Due" value={mission.dueDate ? formatDateTime(mission.dueDate) : "Not set"} />
        <DataPoint label="Updated" value={formatDateTime(mission.updatedAt)} />
      </dl>
    </article>
  );
}

function CashEntryCard({ entry, organizationName }: { entry: OrganizationCashEntry; organizationName?: string }) {
  const verified = entry.verificationStatus === "verified";
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-950">{entry.description ?? "Cash entry"}</h3>
          <p className="mt-1 text-xs text-slate-500">{organizationName ?? "Organization scope not named"}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge value={entry.paymentStatus} />
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {verified ? "Verified" : "Needs verification"}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xl font-black text-slate-950">{formatMinorAmount(entry.amountMinor, entry.currency)}</p>
          <p className="mt-1 text-xs text-slate-500">{entry.entryDirection} · {formatDateTime(entry.occurredAt)}</p>
        </div>
        <dl className="grid gap-1 text-right text-xs text-slate-600">
          <DataPoint label="Source" value={entry.sourceType} />
          <DataPoint label="Counterparty" value={entry.counterpartyLabel ?? "Not set"} />
        </dl>
      </div>
    </article>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt><dd className="mt-0.5">{value}</dd></div>;
}

function Metric({ label, tone = "slate", value }: { label: string; tone?: "amber" | "green" | "slate"; value: number | string }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><p className="text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] opacity-70">{label}</p></div>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-800">{value.replaceAll("_", " ")}</span>;
}

const surfaceStateLabels = {
  connected: "Real now",
  empty: "Empty",
  "needs-input": "Needs input",
} as const;

const surfaceStateClasses = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-900",
  empty: "border-slate-200 bg-slate-50 text-slate-700",
  "needs-input": "border-amber-200 bg-amber-50 text-amber-900",
} as const;
