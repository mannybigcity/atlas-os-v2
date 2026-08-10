import Link from "next/link";
import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { AdminPilotWorkspace } from "@/components/admin-pilot-workspace";
import { CommandCenterOverview } from "@/components/command-center-overview";
import { formatDateTime } from "@/lib/format";
import {
  acknowledgeAttentionRequest,
  resolveAttentionRequest,
} from "@/server/attention/actions";
import { getActiveAttentionRequests } from "@/server/attention/queries";
import { updateBusinessAssessmentStatus } from "@/server/assessments/admin-actions";
import { getBusinessAssessments } from "@/server/assessments/queries";
import {
  assignClientMembership,
  sendClientLoginEmail,
} from "@/server/auth/admin-actions";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";
import { saveAdminBusinessProfile } from "@/server/business-profile/admin-actions";
import { getBusinessProfile } from "@/server/business-profile/queries";
import { createAdminNoteMessage } from "@/server/notes/actions";
import { getMessagesForNotes } from "@/server/notes/messages";
import {
  getClientAccessRoster,
  getOrganizationsForSuperAdmin,
} from "@/server/organizations/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getRecentAgentRuns } from "@/server/agents/queries";
import { getObsidianVaultSnapshot } from "@/server/brain/obsidian";
import { getSalesProspects } from "@/server/sales/queries";
import { getOperationsSnapshot } from "@/server/operations/queries";
import { SurfaceTargetHud } from "@/components/surface-target-hud";
import { getHudTarget } from "@/lib/hud-targets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Dashboard | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type LionsDenPageProps = {
  searchParams?: Promise<{
    access?: string;
    attention?: string;
    assessment?: string;
    message?: string;
    pilot?: string;
    profile?: string;
    hud?: string;
  }>;
};

export default async function LionsDenPage({ searchParams }: LionsDenPageProps) {
  const user = await requireSuperAdmin("/lions-den");
  const params = await searchParams;
  const organizations = await getOrganizationsForSuperAdmin();
  const clientAccess = await getClientAccessRoster();
  const assessments = await getBusinessAssessments();
  const [sales, agentRuns, brain, operations] = await Promise.all([
    getSalesProspects(),
    getRecentAgentRuns(50),
    getObsidianVaultSnapshot(),
    getOperationsSnapshot(),
  ]);
  const pilotWorkspaces = await Promise.all(
    organizations.data.map(async (organization) => ({
      organization,
      result: await getPilotWorkspace(organization.id),
    })),
  );
  const clientProfiles = await Promise.all(
    organizations.data.map(async (organization) => ({
      organization,
      result: await getBusinessProfile(organization.id),
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
      className="lions-den-surface"
      contentClassName="lions-den-content"
      description="Your private operating center for decisions, revenue, client health, and the next action that matters."
      eyebrow="Super Admin"
      title="Client Dashboard"
    >
      <SurfaceTargetHud target={getHudTarget(params?.hud)} />
      <div className="lions-den-topline">
        <div>
          <p className="lions-den-kicker">ATLAS OS · Personal command center</p>
          <h2>Good morning. Here is what needs your attention.</h2>
          <p>Live workspace view · {user.email}</p>
        </div>
        <div className="lions-den-top-actions">
          <Link href="/lions-den/brain">Second brain <span>↗</span></Link>
          <Link href="/lions-den/sales">CRM / sales <span>↗</span></Link>
          <Link href="/lions-den/missions">Projects &amp; missions <span>↗</span></Link>
          <Link href="/lions-den/cash">Cash ledger <span>↗</span></Link>
          <form action={signOut}><button type="submit">Sign out</button></form>
        </div>
      </div>

      <div className="lions-den-metrics" aria-label="Workspace summary">
        <MetricCard label="New opportunities" value={String(newAssessmentCount)} tone="gold" detail="Business assessments" />
        <MetricCard label="Open attention" value={String(openRequestCount)} tone="blue" detail="Client requests" />
        <MetricCard label="Organizations" value={String(organizations.data.length)} tone="violet" detail="Connected workspaces" />
        <MetricCard label="System status" value="Ready" tone="green" detail="Server-side access enforced" />
      </div>

      <CommandCenterOverview
        agents={agentRuns}
        brain={brain}
        operations={operations}
        sales={sales}
      />

      <section className="lions-den-command mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">
              Atlas Command
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              See the agents working
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              ATLAS stays Chief of Staff while HUNTER, MICAH, DAVID, and
              ORACLE show their roles, budgets, approval gates, and real ledger
              activity.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              className="inline-flex justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200"
              href="/lions-den/agents"
            >
              Open Agent Command
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        {params?.access === "sent" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Secure client login email requested. Ask the client to check the
            inbox and spam folder and use only the newest Atlas link.
          </div>
        ) : null}

        {params?.access === "membership_linked" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Client membership linked. The organization should now appear in the
            access roster below.
          </div>
        ) : null}

        {params?.access === "auth_user_not_found" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            No Supabase Auth user was found for that email. Invite the client in
            Supabase Authentication first, then attach the account here.
          </div>
        ) : null}

        {params?.access && !["sent", "membership_linked", "auth_user_not_found"].includes(params.access) ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The client access update did not complete. Confirm the email,
            organization, membership migration, and Supabase Auth delivery logs.
          </div>
        ) : null}

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
          <section
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5"
            id="client-intelligence"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Client Intelligence
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  What each business told Atlas
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  Review the offer, customer, positioning, goals, and constraints
                  your clients saved in their private workspace before planning work.
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                Organization scoped
              </span>
            </div>

            {params?.profile === "saved" ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                Client business context saved.
              </div>
            ) : null}
            {params?.profile === "error" || params?.profile === "invalid" ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                Client business context was not saved. Confirm the organization
                and Business Profile migration, then try again.
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {clientProfiles.map(({ organization, result }) => (
                <article
                  className="rounded-2xl border border-blue-200 bg-white p-5"
                  key={organization.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                        Business profile
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        {organization.name}
                      </h3>
                    </div>
                    {!result.setupRequired && result.data ? (
                      <p className="text-xs text-slate-500">
                        Updated {formatDateTime(result.data.updatedAt)}
                      </p>
                    ) : null}
                  </div>

                  {result.setupRequired ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      Apply the Business Profile migration to read this client&apos;s
                      saved business context.
                    </div>
                  ) : null}

                  {!result.setupRequired && !result.data ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      This client has not saved a business profile yet.
                    </div>
                  ) : null}

                  {!result.setupRequired && result.data ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <LeadDetail label="Offer" value={result.data.offer ?? "Not provided"} />
                      <LeadDetail label="Target customer" value={result.data.targetCustomer ?? "Not provided"} />
                      <LeadDetail label="Positioning" value={result.data.positioning ?? "Not provided"} />
                      <LeadDetail label="Current goals" value={result.data.currentGoals ?? "Not provided"} />
                      <div className="sm:col-span-2">
                        <LeadDetail label="Constraints" value={result.data.constraints ?? "Not provided"} />
                      </div>
                    </div>
                  ) : null}

                  {!result.setupRequired ? (
                    <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-sm font-bold text-slate-950">
                        Edit client business context
                      </summary>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Save only client-approved operating context. Keep private
                        sponsor contacts, legal terms, passwords, and financial
                        account details out of this general profile.
                      </p>
                      <form action={saveAdminBusinessProfile} className="mt-4 space-y-4">
                        <input
                          name="organizationId"
                          type="hidden"
                          value={organization.id}
                        />
                        <AdminProfileField
                          defaultValue={result.data?.offer}
                          label="What you offer"
                          name="offer"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.targetCustomer}
                          label="Target customer"
                          name="targetCustomer"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.positioning}
                          label="Why customers choose you"
                          name="positioning"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.currentGoals}
                          label="Current goals"
                          name="currentGoals"
                        />
                        <AdminProfileField
                          defaultValue={result.data?.constraints}
                          label="Challenges and limits"
                          name="constraints"
                        />
                        <button
                          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          Save client business context
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
                <div
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  key={organization.id}
                >
                  <div>
                    <p className="font-medium text-slate-950">
                      {organization.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Slug: {organization.slug ?? "not set"}
                    </p>
                  </div>
                  {organization.slug ? (
                    <Link
                      className="w-fit rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      href={`/client?previewOrg=${encodeURIComponent(organization.slug)}`}
                    >
                      View client dashboard
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Client access
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Verify membership and send a secure login email
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                This sends a one-time password setup/reset link only after the
                Auth user and organization membership match. Atlas never sees
                or sends a client password.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Super Admin only
            </span>
          </div>

          {clientAccess.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Apply migration <code>20260716120000_atlas_client_access_roster.sql</code>
              {" "}in Supabase to verify QTime access here.
            </div>
          ) : null}

          {!clientAccess.setupRequired && clientAccess.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              No client Auth users are attached to an organization yet.
            </div>
          ) : null}

          <form
            action={assignClientMembership}
            className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-slate-950">
                Attach an invited Auth user to an organization
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                First invite the client in Supabase Authentication. Then enter
                the same email here so Atlas can create or repair the membership.
              </p>
            </div>
            <label>
              <span className="text-sm font-medium text-slate-700">
                Client email
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                name="email"
                placeholder="owner@example.com"
                required
                type="email"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">
                Organization
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                name="organizationId"
                required
              >
                <option value="">Choose an organization</option>
                {organizations.data.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                defaultValue="owner"
                name="role"
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </label>
            <button
              className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:self-end"
              type="submit"
            >
              Attach client account
            </button>
          </form>

          <div className="mt-5 divide-y divide-slate-200">
            {clientAccess.data.map((member) => (
              <div
                className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                key={`${member.organizationId}:${member.userId}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">
                      {member.organizationName}
                    </p>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700">
                      {member.membershipRole}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                        member.emailConfirmedAt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {member.emailConfirmedAt
                        ? "Email confirmed"
                        : "Invitation not accepted"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{member.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Last sign-in:{" "}
                    {member.lastSignInAt
                      ? formatDateTime(member.lastSignInAt)
                      : "Never"}
                  </p>
                </div>

                {member.emailConfirmedAt ? (
                  <form action={sendClientLoginEmail}>
                    <input
                      name="organizationId"
                      type="hidden"
                      value={member.organizationId}
                    />
                    <input name="userId" type="hidden" value={member.userId} />
                    <input name="email" type="hidden" value={member.email} />
                    <button
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 lg:w-auto"
                      type="submit"
                    >
                      Send secure login email
                    </button>
                  </form>
                ) : (
                  <p className="max-w-sm text-sm leading-6 text-amber-900">
                    Resend the invitation once from Supabase Authentication.
                    Do not send a password-reset email until the invitation is
                    accepted and the email is confirmed.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
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

function AdminProfileField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950"
        defaultValue={defaultValue ?? ""}
        maxLength={10000}
        name={name}
      />
    </label>
  );
}

function MetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "blue" | "gold" | "green" | "violet";
  value: string;
}) {
  return (
    <div className={`lions-den-metric lions-den-metric-${tone}`}>
      <div className="lions-den-metric-label">{label}</div>
      <div className="lions-den-metric-value">{value}</div>
      <div className="lions-den-metric-detail">{detail}</div>
    </div>
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
