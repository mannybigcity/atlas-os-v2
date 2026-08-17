import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/guards";
import { generateMicahSocialSample } from "@/server/micah/actions";
import {
  addSalesNote,
  approveSalesOutreach,
  completeSalesTask,
  createSalesTask,
  suppressSalesProspect,
  updateSalesProspect,
} from "@/server/sales/actions";
import {
  getSalesProspect,
  getSalesTasksForProspect,
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

const noticeMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "Prospect added to HUNTER's research queue." },
  updated: { tone: "success", text: "Prospect and next action updated." },
  note_added: { tone: "success", text: "DAVID added the note to the permanent timeline." },
  approved: { tone: "success", text: "Outreach approved for the selected channel(s). Nothing was sent." },
  suppressed: { tone: "success", text: "Contact suppression added and prior approval revoked." },
  invalid_stage: { tone: "error", text: "Choose a valid pipeline stage and owner." },
  invalid_website: { tone: "error", text: "Enter a valid website, such as example.com." },
  invalid_email: { tone: "error", text: "Enter a valid email or leave the field blank." },
  invalid_fit_score: { tone: "error", text: "Fit score must be a whole number from 0 to 100." },
  invalid_next_action_date: { tone: "error", text: "Choose a valid next-action date." },
  business_name_required: { tone: "error", text: "The business name is required." },
  approval_requires_gate: { tone: "error", text: "Use the approval gate to enter Approved for outreach." },
  update_failed: { tone: "error", text: "The prospect could not be updated." },
  note_failed: { tone: "error", text: "The timeline note could not be saved." },
  approval_requires_channel: { tone: "error", text: "Select at least one outreach channel." },
  approval_blocked: { tone: "error", text: "Approval was blocked. Verify a destination exists and no suppression applies." },
  suppression_failed: { tone: "error", text: "The suppression could not be saved, or an active duplicate already exists." },
  micah_draft_created: { tone: "success", text: "MICAH created three draft posts and recorded the model usage. Nothing was published." },
  usage_ledger_required: { tone: "error", text: "Apply the Atlas Agent Usage Ledger migration before spending API tokens." },
  micah_missing_context: { tone: "error", text: "Add an industry, website, or research summary before asking MICAH to draft content." },
  micah_daily_limit: { tone: "error", text: "This prospect has reached the three-run daily MICAH safety limit." },
  openai_not_configured: { tone: "error", text: "OPENAI_API_KEY is not configured in the server deployment environment." },
  micah_generation_failed: { tone: "error", text: "MICAH could not generate a valid draft. The failed run was recorded; try again later." },
  micah_record_failed: { tone: "error", text: "The draft returned, but Atlas could not atomically record it. Nothing was published." },
  task_created: { tone: "success", text: "Task added to the CRM calendar." },
  task_completed: { tone: "success", text: "Task marked complete." },
  task_failed: { tone: "error", text: "The task could not be saved." },
  invalid_task: { tone: "error", text: "Enter a valid task and due date." },
};

export default async function ProspectPage({ params, searchParams }: ProspectPageProps) {
  const { id } = await params;
  await requireSuperAdmin(`/lions-den/sales/${id}`);
  const query = await getSalesProspect(id);
  const search = await searchParams;
  const notice = search?.crm ? noticeMessages[search.crm] : null;

  if (!query.setupRequired && !query.data) notFound();

  if (query.setupRequired || !query.data) {
    return (
      <SurfaceShell wide
        description="Apply the private Atlas Sales CRM migration before opening prospect records."
        eyebrow="Atlas Revenue Operations"
        title="CRM setup required"
      >
        <Link className="font-semibold text-blue-700 hover:underline" href="/lions-den/sales">
          Return to Sales Command
        </Link>
      </SurfaceShell>
    );
  }

  const { prospect, sources, events, suppressions } = query.data;
  const tasksQuery = await getSalesTasksForProspect(prospect.id);
  const activeSuppressions = suppressions.filter((item) => !item.liftedAt);
  const assessmentSource = sources.find(
    (source) => source.sourceType === "business_assessment",
  );
  const assessmentFacts = assessmentSource?.facts ?? {};
  const followUpDraft = buildFollowUpDraft({
    businessName: prospect.businessName,
    contactName: prospect.contactName,
    biggestChallenge: assessmentFacts.biggest_challenge,
    ninetyDayGoal: assessmentFacts.ninety_day_goal,
  });

  return (
    <SurfaceShell wide
      description="Research, qualify, approve, and follow up from one audited record. Nothing leaves Atlas merely because a field or draft exists."
      eyebrow={`${prospect.assignedRole.toUpperCase()} · ${humanize(prospect.status)}`}
      title={prospect.businessName}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link className="text-sm font-semibold text-blue-700 hover:underline" href="/lions-den/sales">← Sales Command</Link>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">{prospect.contactEmail ?? "No email"}</span><span className="rounded-full bg-slate-100 px-3 py-1">{prospect.contactPhone ?? "No phone"}</span></div>
      </div>
      {notice ? (
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {notice.text}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Summary label="Fit score" value={prospect.fitScore === null ? "Not scored" : `${prospect.fitScore}/100`} />
        <Summary label="Next action" value={prospect.nextAction ?? "Not scheduled"} />
        <Summary label="Outreach" value={prospect.outreachApprovedAt ? `Approved: ${prospect.approvedChannels.join(", ")}` : "Not approved"} />
      </div>

      {assessmentSource ? (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Assessment qualification
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            What the owner said they need
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="New leads per month" value={formatFact(assessmentFacts.monthly_lead_volume)} />
            <Summary label="Follow-up speed" value={formatFact(assessmentFacts.follow_up_speed)} />
            <Summary label="Budget range" value={formatFact(assessmentFacts.pilot_budget)} />
            <Summary label="Preferred contact" value={formatFact(assessmentFacts.preferred_contact_method)} />
          </div>
        </section>
      ) : null}

      {activeSuppressions.length ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          <strong>Do not contact:</strong> {activeSuppressions.map((item) => `${humanize(item.channel)} · ${humanize(item.reason)}`).join("; ")}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">ATLAS record</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Research and next step</h2>
        </div>
        <form action={updateSalesProspect} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input name="prospectId" type="hidden" value={prospect.id} />
          <Field defaultValue={prospect.businessName} label="Business name" name="businessName" required />
          <Field defaultValue={prospect.industry} label="Industry" name="industry" />
          <Field defaultValue={prospect.addressLine1} label="Address" name="addressLine1" />
          <Field defaultValue={prospect.city} label="City" name="city" />
          <Field defaultValue={prospect.region} label="State / region" name="region" />
          <Field defaultValue={prospect.postalCode} label="Postal code" name="postalCode" />
          <Field defaultValue={prospect.website} label="Website" name="website" />
          <Field defaultValue={prospect.contactName} label="Contact name" name="contactName" />
          <Field defaultValue={prospect.contactEmail} label="Business email" name="contactEmail" type="email" />
          <Field defaultValue={prospect.contactPhone} label="Business phone" name="contactPhone" type="tel" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Social profiles / handles</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.socialMedia ?? ""} name="socialMedia" />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Pipeline stage</span>
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" defaultValue={prospect.status} name="status">
              {salesProspectStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Workflow owner</span>
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" defaultValue={prospect.assignedRole} name="assignedRole">
              {salesAssignedRoles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
            </select>
          </label>
          <Field defaultValue={prospect.fitScore?.toString()} label="Fit score (0–100)" max={100} min={0} name="fitScore" type="number" />
          <Field defaultValue={toDateInput(prospect.nextActionAt)} label="Next action due" name="nextActionAt" type="date" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Why this business may fit</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.fitReason ?? ""} name="fitReason" />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">HUNTER research summary</span>
            <textarea className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.researchSummary ?? ""} name="researchSummary" />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">DAVID next action</span>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={prospect.nextAction ?? ""} name="nextAction" />
          </label>
          <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:col-span-2" type="submit">
            Save prospect and next action
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" id="tasks">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">CRM tasks & calendar</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Plan the next move</h2><p className="mt-2 text-sm text-slate-600">Tasks stay internal until you choose an approved action elsewhere.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{tasksQuery.data.filter((task) => task.status === "open").length} open</span></div>
        {tasksQuery.data.length ? <div className="mt-4 space-y-2">{tasksQuery.data.map((task) => <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between" key={task.id}><div><p className="font-semibold text-slate-950">{task.title}</p><p className="text-xs text-slate-500">{task.taskType.replaceAll("_", " ")} · {task.dueAt ? formatDateTime(task.dueAt) : "No due date"} · {task.status}</p></div>{task.status === "open" ? <form action={completeSalesTask}><input name="taskId" type="hidden" value={task.id} /><input name="prospectId" type="hidden" value={prospect.id} /><button className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" type="submit">Mark complete</button></form> : null}</div>)}</div> : null}
        <form action={createSalesTask} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"><input name="prospectId" type="hidden" value={prospect.id} /><input className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" name="title" placeholder="Task title" required /><select className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" defaultValue="follow_up" name="taskType"><option value="follow_up">Follow-up</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="research">Research</option><option value="review">Review</option></select><input className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" name="dueAt" type="date" /><button className="rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" type="submit">Add task</button></form>
      </section>

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Review-ready follow-up
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Draft the next conversation
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              This is a working draft for human review. Nothing is sent or approved from this card.
            </p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            Draft only
          </span>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-blue-200 bg-white p-4 text-sm leading-6 text-slate-800">
          {followUpDraft}
        </pre>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Human approval gate</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Approve outreach channels</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">Approval records permission; it does not send anything. Only select destinations you verified.</p>
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
                  <input disabled={!enabled} name="channels" type="checkbox" value={String(channel)} /> <span className="ml-2">{humanize(String(channel))}</span>
                </label>
              ))}
            </div>
            <button className="mt-4 w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800" type="submit">Approve selected channels</button>
          </form>
        </section>

        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Suppression control</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Block contact</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">Use immediately for opt-outs, complaints, invalid destinations, or any reason Atlas should stop.</p>
          <form action={suppressSalesProspect} className="mt-4 space-y-3">
            <input name="prospectId" type="hidden" value={prospect.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" defaultValue="all" name="channel">
                <option value="all">All channels</option><option value="email">Email</option><option value="phone">Phone</option><option value="sms">SMS</option><option value="social">Social</option>
              </select>
              <select className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" defaultValue="manual" name="reason">
                <option value="opt_out">Opt out</option><option value="complaint">Complaint</option><option value="hard_bounce">Hard bounce</option><option value="legal">Legal / policy</option><option value="manual">Manual hold</option><option value="other">Other</option>
              </select>
            </div>
            <textarea className="min-h-20 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm" name="note" placeholder="Why contact is blocked" />
            <button className="w-full rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800" type="submit">Add contact suppression</button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">MICAH content studio</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Create a three-post sample</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">One button makes one bounded OpenAI request. The drafts and token usage enter the timeline; no social account is connected and nothing can publish.</p>
          </div>
          <form action={generateMicahSocialSample}>
            <input name="prospectId" type="hidden" value={prospect.id} />
            <button className="shrink-0 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" type="submit">Generate 3 drafts</button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">DAVID timeline</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Permanent CRM history</h2>
        <form action={addSalesNote} className="mt-4">
          <input name="prospectId" type="hidden" value={prospect.id} />
          <textarea className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" name="body" placeholder="Add research, call notes, reply context, or a handoff..." required />
          <button className="mt-3 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" type="submit">Add DAVID note</button>
        </form>
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={event.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">{event.actorRole.toUpperCase()} · {humanize(event.eventType)}</p><h3 className="mt-1 font-semibold text-slate-950">{event.summary}</h3></div>
                <time className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</time>
              </div>
              {event.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.body}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provenance</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Where the record came from</h2>
        <div className="mt-4 space-y-3">
          {sources.map((source) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" key={source.id}>
              <p className="font-semibold text-slate-900">{humanize(source.sourceType)}</p>
              <p className="mt-1 text-slate-500">Retrieved {formatDateTime(source.retrievedAt)}</p>
              {source.sourceUrl ? <SafeLink value={source.sourceUrl} /> : null}
              {source.externalId ? <p className="mt-1 break-all text-xs text-slate-500">Reference: {source.externalId}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/lions-den/sales">Back to Sales Command</Link>
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/lions-den">Lion&apos;s Den</Link>
      </div>
    </SurfaceShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-slate-950">{value}</p></div>; }

function Field({ defaultValue, label, max, min, name, required, type = "text" }: { defaultValue?: string | null; label: string; max?: number; min?: number; name: string; required?: boolean; type?: string }) { return <label><span className="text-sm font-medium text-slate-700">{label}</span><input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={defaultValue ?? ""} max={max} min={min} name={name} required={required} type={type} /></label>; }

function SafeLink({ value }: { value: string }) {
  const safeUrl = getSafeUrl(value);
  if (!safeUrl) return null;

  return (
    <a
      className="mt-2 block break-all font-semibold text-blue-700 hover:underline"
      href={safeUrl}
      rel="noreferrer"
      target="_blank"
    >
      Open public source
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

function humanize(value: string) { const words = value.replaceAll("_", " ").replaceAll(".", " · "); return words.charAt(0).toUpperCase() + words.slice(1); }

function formatFact(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return "Not captured";

  const normalized = value.replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildFollowUpDraft({
  businessName,
  contactName,
  biggestChallenge,
  ninetyDayGoal,
}: {
  businessName: string;
  contactName: string | null;
  biggestChallenge: unknown;
  ninetyDayGoal: unknown;
}) {
  const greeting = contactName?.trim() ? `Hi ${contactName.trim()},` : "Hello,";
  const challenge = formatFact(biggestChallenge).replace(/[.!?]+$/, "");
  const goal = formatFact(ninetyDayGoal).replace(/[.!?]+$/, "");

  return [
    `Subject: A practical next step for ${businessName}`,
    "",
    greeting,
    "",
    `Thank you for sharing ${businessName}'s company snapshot with us. We will review the details and recommend a practical starting point based on the priorities you shared.`,
    `We noted the current focus as ${challenge.toLowerCase()} and the 90-day goal as ${goal.toLowerCase()}`,
    "",
    "Would you be open to a short conversation about the best next step?",
    "",
    "Best,",
    "Atlas For Entrepreneurs",
  ].join("\n");
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
