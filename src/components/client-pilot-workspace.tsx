import { formatDateTime } from "@/lib/format";
import { reviewPilotDeliverable } from "@/server/pilot/actions";
import type { PilotWorkspace } from "@/server/pilot/queries";

type ClientPilotWorkspaceProps = {
  organizationId: string;
  canReview: boolean;
  workspace: PilotWorkspace;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function workMessageTitle(
  messageKind: "work_sent" | "approved" | "changes_requested",
  authorDisplayName: string,
) {
  if (messageKind === "work_sent") {
    return `${authorDisplayName} sent work for review`;
  }

  return messageKind === "approved"
    ? `Approved by ${authorDisplayName}`
    : `Changes requested by ${authorDisplayName}`;
}

export function ClientPilotWorkspace({
  organizationId,
  canReview,
  workspace,
}: ClientPilotWorkspaceProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Founding Pilot
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Work &amp; Messages
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your 30-day plan, focused actions, work to review, and every
            response in one place.
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          {workspace.plan?.status ?? "not started"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            30-day goal
          </p>
          <p className="mt-3 text-lg font-semibold leading-7 text-slate-950">
            {workspace.plan?.thirtyDayGoal ?? "Atlas has not published the pilot goal yet."}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-800">Success means: </span>
            {workspace.plan?.successDefinition ?? "Not defined yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Next check-in
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-950">
            {workspace.plan?.nextCheckInAt
              ? formatDateTime(workspace.plan.nextCheckInAt)
              : "Not scheduled yet"}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Atlas will use this check-in to review progress, decisions, and the
            next focused move.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-950">Priorities and actions</h3>
        {workspace.actions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            No pilot actions have been published yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {workspace.actions.map((action) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={action.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    Priority {action.priority}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 ring-1 ring-slate-200">
                    {label(action.status)}
                  </span>
                </div>
                <h4 className="mt-3 font-semibold text-slate-950">{action.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {action.description ?? "No additional detail."}
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Owner: {action.ownerLabel ?? "To be assigned"}
                  {action.dueDate ? ` · Due ${action.dueDate}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-950">Work for your review</h3>
        {workspace.deliverables.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Nothing is ready for your review yet.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {workspace.deliverables.map((deliverable) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                key={deliverable.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-950">{deliverable.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {deliverable.summary ?? "No summary provided."}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                    {label(deliverable.status)}
                  </span>
                </div>

                {deliverable.body ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    {deliverable.body}
                  </div>
                ) : null}

                {deliverable.messages.length > 0 ? (
                  <div className="mt-4 space-y-3" aria-label="Work message history">
                    {deliverable.messages.map((message) => (
                      <div
                        className={`rounded-2xl border p-4 text-sm leading-6 ${
                          message.authorKind === "atlas_admin"
                            ? "border-slate-200 bg-white text-slate-800"
                            : "border-blue-200 bg-blue-50 text-blue-950"
                        }`}
                        key={message.id}
                      >
                        <p className="font-semibold">
                          {workMessageTitle(
                            message.messageKind,
                            message.authorDisplayName,
                          )}
                        </p>
                        {message.message ? <p className="mt-1">{message.message}</p> : null}
                        <p
                          className={`mt-1 text-xs ${
                            message.authorKind === "atlas_admin"
                              ? "text-slate-500"
                              : "text-blue-700"
                          }`}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {deliverable.status === "ready_for_review" && canReview ? (
                  <form action={reviewPilotDeliverable} className="mt-4 space-y-3">
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="deliverableId" type="hidden" value={deliverable.id} />
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        New message
                      </span>
                      <textarea
                        className="mt-2 min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        name="note"
                        placeholder="Write a new message about this version."
                      />
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                        name="decision"
                        type="submit"
                        value="approved"
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        name="decision"
                        type="submit"
                        value="changes_requested"
                      >
                        Request changes
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
