import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
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
  const runs = await getRecentAgentRuns(50);
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
      description="A visible command surface for the Atlas agent roster. This shows the roles, budgets, approval boundaries, and real ledger activity when agent workflows run."
      eyebrow="Client Dashboard"
      title="Atlas Agent Command"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        Signed in as {user.email}. ATLAS remains Chief of Staff. HUNTER,
        MICAH, DAVID, and ORACLE support the mission without overriding
        Manny approval.
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Today&apos;s logged runs
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{todayRuns}</p>
          <p className="mt-2 text-sm text-slate-600">
            Real runs from the private usage ledger.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Today&apos;s estimated API cost
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {formatMicroUsd(todayCost)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Cost estimates are tracked per workflow.
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Roster
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              The agents you can see and govern
            </h2>
          </div>
          <Link
            className="text-sm font-bold text-blue-700 hover:text-blue-900"
            href="/lions-den/sales"
          >
            Open Sales Command →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {kingdomAgents.map((agent) => {
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
                      {agent.mascot}
                    </span>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                      {agent.name}
                    </h3>
                    <p className="text-sm font-semibold text-slate-700">
                      {agent.title}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(
                      latestRun?.status,
                    )}`}
                  >
                    {latestRun?.status ?? agent.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {agent.mission}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Room
                    </p>
                    <p className="mt-1 font-bold text-slate-950">{agent.room}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Daily budget
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {formatMicroUsd(agent.dailyBudgetMicrousd)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Approval
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {agent.approvalRequired ? "Required" : "Internal only"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Last run
                    </p>
                    <p className="mt-1 font-bold text-slate-950">
                      {latestRun ? formatDateTime(latestRun.occurredAt) : "No ledger run yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Model and token policy
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {agent.modelPolicy}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Logged today for {agent.name}: {formatMicroUsd(loggedCost)}
                  </p>
                </div>

                <ul className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  {agent.capabilities.map((capability) => (
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
          Real agent activity ledger
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          What they have actually done
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This feed comes from Supabase <code>atlas_agent_runs</code>. It is the
          difference between a mascot and a working system.
        </p>

        {runs.setupRequired ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Agent run ledger is not ready yet. Apply the agent usage ledger
            migration in Supabase.
          </div>
        ) : null}

        {!runs.setupRequired && recentRuns.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            No agent runs have been recorded yet. Run HUNTER research or MICAH
            sample creation from Sales Command and the work will appear here.
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
                      {run.resultCount} results
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(
                        run.status,
                      )}`}
                    >
                      {run.status}
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
