import {
  createPilotAction,
  createPilotDeliverable,
  savePilotPlan,
  updatePilotAction,
  updatePilotDeliverable,
} from "@/server/pilot/actions";
import { formatDateTime } from "@/lib/format";
import type { PilotWorkspace } from "@/server/pilot/queries";

type AdminPilotWorkspaceProps = {
  organizationId: string;
  organizationName: string;
  workspace: PilotWorkspace;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

function datetimeLocalValue(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function reviewDecisionLabel(decision: "approved" | "changes_requested") {
  return decision === "approved" ? "Approved" : "Changes requested";
}

export function AdminPilotWorkspace({
  organizationId,
  organizationName,
  workspace,
}: AdminPilotWorkspaceProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            {organizationName}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Founding pilot control</h3>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
          {workspace.plan?.status ?? "not started"}
        </span>
      </div>

      <form action={savePilotPlan} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label className="md:col-span-2">
          <span className="text-sm font-medium text-slate-700">30-day goal</span>
          <textarea className={`${inputClass} min-h-20`} defaultValue={workspace.plan?.thirtyDayGoal ?? ""} name="thirtyDayGoal" />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Success definition</span>
          <textarea className={`${inputClass} min-h-20`} defaultValue={workspace.plan?.successDefinition ?? ""} name="successDefinition" />
        </label>
        <div className="grid gap-3">
          <label>
            <span className="text-sm font-medium text-slate-700">Next check-in</span>
            <input className={inputClass} defaultValue={datetimeLocalValue(workspace.plan?.nextCheckInAt)} name="nextCheckInAt" type="datetime-local" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select className={inputClass} defaultValue={workspace.plan?.status ?? "active"} name="status">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <button className="w-fit rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Save pilot plan
        </button>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="font-semibold text-slate-950">Actions</h4>
          <div className="mt-3 space-y-2">
            {workspace.actions.map((action) => (
              <form action={updatePilotAction} className="rounded-xl border border-slate-200 bg-white p-3" key={action.id}>
                <input name="actionId" type="hidden" value={action.id} />
                <p className="text-sm font-semibold text-slate-950">{action.priority}. {action.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" defaultValue={action.status} name="status">
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button className="text-xs font-semibold text-blue-700" type="submit">Update</button>
                </div>
              </form>
            ))}
          </div>
          <form action={createPilotAction} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input className={inputClass} name="title" placeholder="Action title" />
            <textarea className={`${inputClass} min-h-16`} name="description" placeholder="What needs to happen?" />
            <div className="grid grid-cols-2 gap-2">
              <select className={inputClass} defaultValue="1" name="priority">
                <option value="1">Priority 1</option><option value="2">Priority 2</option><option value="3">Priority 3</option>
              </select>
              <input className={inputClass} name="ownerLabel" placeholder="Owner" />
            </div>
            <input className={inputClass} name="dueDate" type="date" />
            <input name="status" type="hidden" value="not_started" />
            <button className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Add action</button>
          </form>
        </div>

        <div>
          <h4 className="font-semibold text-slate-950">Deliverables</h4>
          <div className="mt-3 space-y-2">
            {workspace.deliverables.map((deliverable) => (
              <form action={updatePilotDeliverable} className="rounded-xl border border-slate-200 bg-white p-3" key={deliverable.id}>
                <input name="deliverableId" type="hidden" value={deliverable.id} />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">{deliverable.title}</p>
                  <div className="flex items-center gap-2">
                    <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" defaultValue={deliverable.status} name="status">
                      <option value="draft">Draft</option>
                      <option value="ready_for_review">Ready for review</option>
                      <option value="delivered">Delivered</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button className="text-xs font-semibold text-blue-700" type="submit">Update</button>
                  </div>
                </div>
                {deliverable.review ? (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                    <p className="font-semibold">
                      {reviewDecisionLabel(deliverable.review.decision)} by{" "}
                      {deliverable.review.reviewedByDisplayName} on{" "}
                      {formatDateTime(deliverable.review.reviewedAt)}
                    </p>
                    <p className="mt-1">
                      {deliverable.review.note ?? "No review note was added."}
                    </p>
                  </div>
                ) : null}
              </form>
            ))}
          </div>
          <form action={createPilotDeliverable} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input className={inputClass} name="title" placeholder="Deliverable title" />
            <textarea className={`${inputClass} min-h-16`} name="summary" placeholder="Short summary" />
            <textarea className={`${inputClass} min-h-24`} name="body" placeholder="Human-reviewed deliverable content" />
            <select className={inputClass} defaultValue="draft" name="status">
              <option value="draft">Draft</option>
              <option value="ready_for_review">Ready for client review</option>
              <option value="delivered">Delivered</option>
            </select>
            <button className="mt-3 rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">Add deliverable</button>
          </form>
        </div>
      </div>
    </article>
  );
}
