import Link from "next/link";
import { setSalesProspectStage } from "@/server/sales/actions";
import {
  convertTrialToClient,
  extendTrial,
  syncTrialToCrm,
} from "@/server/trials/admin-actions";
import type { TrialRosterEntry } from "@/server/trials/admin-queries";

type TrialLifecycleActionsProps = {
  trial: TrialRosterEntry;
  returnTo: string;
  showOpenRecord?: boolean;
};

const button =
  "inline-flex items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

// The decisions Manny makes on a trial: keep it alive, make it a client, or
// close it. Every button is a server action that writes to the CRM timeline.
export function TrialLifecycleActions({ returnTo, showOpenRecord = true, trial }: TrialLifecycleActionsProps) {
  const converted = trial.stage === "converted";
  const closed = trial.prospectStatus === "lost" || trial.prospectStatus === "disqualified";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showOpenRecord ? (
        trial.prospectId ? (
          <Link className={`${button} bg-slate-950 text-white hover:bg-slate-800`} href={`/lions-den/sales/${trial.prospectId}`}>
            Open CRM record
          </Link>
        ) : (
          <form action={syncTrialToCrm}>
            <input name="userId" type="hidden" value={trial.userId} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <button className={`${button} bg-amber-500 text-slate-950 hover:bg-amber-400`} type="submit">
              Add to CRM
            </button>
          </form>
        )
      ) : null}

      {converted ? (
        <Link
          className={`${button} border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
          href={trial.convertedOrganizationSlug ? `/client?previewOrg=${encodeURIComponent(trial.convertedOrganizationSlug)}` : "/lions-den"}
        >
          Open client workspace
        </Link>
      ) : (
        <>
          <form action={extendTrial}>
            <input name="userId" type="hidden" value={trial.userId} />
            <input name="days" type="hidden" value="7" />
            <input name="returnTo" type="hidden" value={returnTo} />
            <button className={`${button} border border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:text-blue-700`} type="submit">
              Extend 7 days
            </button>
          </form>

          <details className="relative">
            <summary className={`${button} cursor-pointer list-none bg-emerald-700 text-white hover:bg-emerald-800`}>
              Convert to client
            </summary>
            <form
              action={convertTrialToClient}
              className="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl"
            >
              <input name="userId" type="hidden" value={trial.userId} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Client workspace name</span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={trial.businessName}
                  maxLength={200}
                  name="organizationName"
                  required
                />
              </label>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Creates the organization, makes {trial.fullName.split(" ")[0]} its owner, and marks the CRM record Won. Billing stays manual.
              </p>
              <button className={`${button} mt-3 w-full bg-emerald-700 text-white hover:bg-emerald-800`} type="submit">
                Create client workspace
              </button>
            </form>
          </details>

          {trial.prospectId && !closed ? (
            <form action={setSalesProspectStage}>
              <input name="prospectId" type="hidden" value={trial.prospectId} />
              <input name="status" type="hidden" value="lost" />
              <input name="returnTo" type="hidden" value={returnTo} />
              <button className={`${button} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`} type="submit">
                Not a fit
              </button>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
