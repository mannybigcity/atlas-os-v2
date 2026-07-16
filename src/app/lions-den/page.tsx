import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { AdminPilotWorkspace } from "@/components/admin-pilot-workspace";
import { formatDateTime } from "@/lib/format";
import {
  acknowledgeAttentionRequest,
  resolveAttentionRequest,
} from "@/server/attention/actions";
import { getActiveAttentionRequests } from "@/server/attention/queries";
import { updateBusinessAssessmentStatus } from "@/server/assessments/admin-actions";
import { getBusinessAssessments } from "@/server/assessments/queries";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";
import { createAdminNoteMessage } from "@/server/notes/actions";
import { getMessagesForNotes } from "@/server/notes/messages";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";

export const dynamic = "force-dynamic";

type LionsDenPageProps = {
  searchParams?: Promise<{
    attention?: string;
    assessment?: string;
    message?: string;
    pilot?: string;
  }>;
};

export default async function LionsDenPage({ searchParams }: LionsDenPageProps) {
  const user = await requireSuperAdmin("/lions-den");
  const params = await searchParams;
  const organizations = await getOrganizationsForSuperAdmin();
  const assessments = await getBusinessAssessments();
  const pilotWorkspaces = await Promise.all(
    organizations.data.map(async (organization) => ({
      organization,
      result: await getPilotWorkspace(organization.id),
    })),
  );
  const attentionRequests = await getActiveAttentionRequests();
  const messages = await getMessagesForNotes(
    attentionRequests.data.map((request) => request.noteId),
  );
  const openRequestCount = attentionRequests.data.filter(
    (request) => request.status === "open",
  ).length;
  const newAssessmentCount = assessments.data.filter(
    (assessment) => assessment.status === "new",
  ).length;

  return (
    <SurfaceShell
      description="The secure internal operations surface for Atlas Super Admin users, intentionally isolated from the client dashboard."
      eyebrow="Super Admin"
      title="The Lion's Den"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        Signed in as Super Admin {user.email}. Privileged access is enforced
        server-side.
      </div>

      <div className="mt-4 space-y-4">
        {params?.attention === "acknowledged" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Attention request acknowledged.
          </div>
        ) : null}

        {params?.assessment === "updated" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Business Assessment lead updated.
          </div>
        ) : null}

        {params?.assessment === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The Business Assessment lead could not be updated. Confirm that the
            Business Assessment migration has been applied.
          </div>
        ) : null}

        {params?.attention === "resolved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Attention request resolved.
          </div>
        ) : null}

        {params?.attention === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The attention request could not be updated. Confirm that the
            Attention Inbox migration has been applied.
          </div>
        ) : null}

        {params?.message === "created" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Atlas Admin reply sent.
          </div>
        ) : null}

        {params?.message && params.message !== "created" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            Add a reply before sending. If a reply was entered, confirm that
            the Threaded Note Conversations migration has been applied.
          </div>
        ) : null}

        {params?.pilot && !["error", "missing_plan", "missing_action", "missing_deliverable"].includes(params.pilot) ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Founding pilot workspace updated.
          </div>
        ) : null}

        {params?.pilot && ["error", "missing_plan", "missing_action", "missing_deliverable"].includes(params.pilot) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The pilot update could not be saved. Check required fields and confirm
            that the Founding Pilot Workflow migration has been applied.
          </div>
        ) : null}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Atlas Revenue Operations
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                HUNTER + DAVID Sales Command
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                Research real prospects, verify their source, schedule the next
                action, and require approval before any outreach.
              </p>
            </div>
            <Link
              className="shrink-0 rounded-full bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
              href="/lions-den/sales"
            >
              Open Sales Command
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
                New Business
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Business Assessment Leads
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review what each business needs, contact the owner, and move the
                opportunity forward from one secure queue.
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              {newAssessmentCount} new
            </span>
          </div>

          {assessments.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              Business Assessment intake is not ready yet. Apply the Public
              Business Assessments migration in Supabase.
            </div>
          ) : null}

          {!assessments.setupRequired && assessments.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No Business Assessments have been submitted yet.
            </div>
          ) : null}

          {!assessments.setupRequired && assessments.data.length > 0 ? (
            <div className="mt-5 space-y-4">
              {assessments.data.map((assessment) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  key={assessment.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {assessment.businessName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {assessment.contactName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Submitted {formatDateTime(assessment.createdAt)}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {humanize(assessment.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <LeadDetail label="What the business does" value={assessment.businessDescription} />
                    <LeadDetail label="Ideal customer" value={assessment.idealCustomer} />
                    <LeadDetail label="Biggest challenge" value={humanize(assessment.biggestChallenge)} />
                    <LeadDetail label="90-day goal" value={assessment.ninetyDayGoal} />
                    <LeadDetail label="Customers come from" value={assessment.customerSources.map(humanize).join(", ")} />
                    <LeadDetail label="Areas to evaluate" value={assessment.evaluationAreas.map(humanize).join(", ")} />
                    <LeadDetail label="Business size" value={humanize(assessment.businessSize)} />
                    <LeadDetail label="AI tools" value={assessment.aiTools.map(humanize).join(", ")} />
                    <LeadDetail label="Timing" value={humanize(assessment.improvementTiming)} />
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Contact
                      </p>
                      <a className="mt-2 block text-sm font-semibold text-blue-700 hover:underline" href={`mailto:${assessment.contactEmail}`}>
                        {assessment.contactEmail}
                      </a>
                      <p className="mt-1 text-sm text-slate-700">{assessment.contactPhone}</p>
                      <WebsiteLink value={assessment.website} />
                      {assessment.socialMedia ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Social media
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {assessment.socialMedia}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <form action={updateBusinessAssessmentStatus} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input name="assessmentId" type="hidden" value={assessment.id} />
                    <label className="block flex-1">
                      <span className="text-sm font-medium text-slate-700">Lead status</span>
                      <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950" defaultValue={assessment.status} name="status">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="not_a_fit">Not a fit</option>
                        <option value="converted">Converted</option>
                      </select>
                    </label>
                    <button className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" type="submit">
                      Save status
                    </button>
                  </form>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Client Attention
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Atlas Inbox
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review `@Atlas` requests across every client organization from
                one secure queue.
              </p>
            </div>
            <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              {openRequestCount} open
            </span>
          </div>

          {attentionRequests.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              The Atlas Inbox is not ready yet. Apply the Attention Inbox
              migration in Supabase.
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No client requests need attention.
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length > 0 ? (
            <div className="mt-5 space-y-4">
              {attentionRequests.data.map((request) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  key={request.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {request.organizationName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {request.noteTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Requested {formatDateTime(request.requestedAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        request.status === "acknowledged"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {messages.setupRequired ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                      Apply the Threaded Note Conversations migration to read
                      and reply to this conversation.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {messages.data
                        .filter((message) => message.noteId === request.noteId)
                        .map((message) => (
                          <div
                            className={`rounded-2xl border p-4 ${
                              message.authorKind === "atlas_admin"
                                ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 bg-white"
                            }`}
                            key={message.id}
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-semibold text-slate-950">
                                {message.authorKind === "atlas_admin"
                                  ? "Atlas Admin"
                                  : message.authorDisplayName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {message.body}
                            </p>
                          </div>
                        ))}

                      <form action={createAdminNoteMessage}>
                        <input name="noteId" type="hidden" value={request.noteId} />
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">
                            Reply as Atlas Admin
                          </span>
                          <textarea
                            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                            name="body"
                            placeholder="Write a human Atlas Admin response."
                          />
                        </label>
                        <button
                          className="mt-3 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                          type="submit"
                        >
                          Send Atlas reply
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {request.status === "open" ? (
                      <form action={acknowledgeAttentionRequest}>
                        <input name="requestId" type="hidden" value={request.id} />
                        <button
                          className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 sm:w-auto"
                          type="submit"
                        >
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveAttentionRequest}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <button
                        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                        type="submit"
                      >
                        Resolve
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {organizations.data.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Founding Pilot Operations
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Client execution workspaces
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Goals, actions, work for client review, and approvals stay in one
                place. Agent capabilities will appear here as each workflow is
                connected, tested, and approved.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {pilotWorkspaces.map(({ organization, result }) =>
                result.setupRequired ? (
                  <div
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700"
                    key={organization.id}
                  >
                    Apply the Founding Pilot Workflow migration to manage pilot
                    workspaces.
                  </div>
                ) : (
                  <AdminPilotWorkspace
                    key={organization.id}
                    organizationId={organization.id}
                    organizationName={organization.name}
                    workspace={result.data}
                  />
                ),
              )}
            </div>
          </section>
        ) : null}

        {organizations.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Workspace tables are not ready yet. Apply the workspace foundation
            migration in Supabase to enable the organization list shell.
          </div>
        ) : null}

        {!organizations.setupRequired && organizations.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            No organizations exist yet.
          </div>
        ) : null}

        {organizations.data.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Organizations
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {organizations.data.map((organization) => (
                <div className="py-4 first:pt-0 last:pb-0" key={organization.id}>
                  <p className="font-medium text-slate-950">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Slug: {organization.slug ?? "not set"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/"
        >
          Public site
        </Link>
        <form action={signOut}>
          <button
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </SurfaceShell>
  );
}

function humanize(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function LeadDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function WebsiteLink({ value }: { value?: string | null }) {
  if (!value) {
    return null;
  }

  let safeUrl: string;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    safeUrl = url.toString();
  } catch {
    return null;
  }

  return (
    <a
      className="mt-1 block break-all text-sm text-blue-700 hover:underline"
      href={safeUrl}
      rel="noreferrer"
      target="_blank"
    >
      {value}
    </a>
  );
}
