import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import { signOut } from "@/server/auth/actions";
import {
  clientWorkspaceHref,
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getBusinessProfile } from "@/server/business-profile/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Command Center | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
    content?: string;
    identity?: string;
    message?: string;
    note?: string;
    pilot?: string;
    previewOrg?: string;
    profile?: string;
    status?: string;
  }>;
};

type DepartmentCardProps = {
  accent: "amber" | "blue" | "indigo";
  badge: string;
  description: string;
  href: string;
  metric: string;
  secondaryMetric: string;
  title: string;
};

const accentClasses = {
  amber: {
    border: "border-amber-200 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-800",
    button: "bg-amber-400 text-slate-950 hover:bg-amber-300",
  },
  blue: {
    border: "border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-800",
    button: "bg-blue-700 text-white hover:bg-blue-800",
  },
  indigo: {
    border: "border-indigo-200 hover:border-indigo-400",
    badge: "bg-indigo-100 text-indigo-800",
    button: "bg-indigo-700 text-white hover:bg-indigo-800",
  },
};

function DepartmentCard({
  accent,
  badge,
  description,
  href,
  metric,
  secondaryMetric,
  title,
}: DepartmentCardProps) {
  const classes = accentClasses[accent];

  return (
    <Link
      className={`flex min-h-64 flex-col rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${classes.border}`}
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${classes.badge}`}
        >
          {badge}
        </span>
        <span className="text-sm font-semibold text-slate-400">Open</span>
      </div>
      <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Now
          </p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {metric}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Next
          </p>
          <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {secondaryMetric}
          </p>
        </div>
      </div>
      <span
        className={`mt-4 inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold transition ${classes.button}`}
      >
        View screen
      </span>
    </Link>
  );
}

function StatusAlert({
  children,
  tone = "emerald",
}: {
  children: ReactNode;
  tone?: "emerald" | "amber" | "rose" | "blue";
}) {
  const classes = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-5 text-sm leading-6 ${classes[tone]}`}>
      {children}
    </div>
  );
}

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client", params);
  const {
    isClientPreview,
    memberships,
    previewOrgSlug,
    previewOrganization,
    primaryMembership,
    primaryOrganization,
    user,
  } = workspace;

  const businessProfile = primaryOrganization
    ? await getBusinessProfile(primaryOrganization.id)
    : null;
  const pilot = primaryOrganization
    ? await getPilotWorkspace(primaryOrganization.id)
    : null;
  const contentStudio = primaryOrganization
    ? await getContentStudio(primaryOrganization.id)
    : null;
  const opportunityPipeline = primaryOrganization
    ? await getOpportunityPipeline(primaryOrganization.id)
    : null;

  const businessProfileData =
    businessProfile && !businessProfile.setupRequired ? businessProfile.data : null;
  const pilotData = pilot && !pilot.setupRequired ? pilot.data : null;
  const contentData =
    contentStudio && !contentStudio.setupRequired ? contentStudio.data : null;
  const pipelineData =
    opportunityPipeline && !opportunityPipeline.setupRequired
      ? opportunityPipeline.data
      : null;

  const profileFieldsFilled = [
    businessProfileData?.offer,
    businessProfileData?.targetCustomer,
    businessProfileData?.positioning,
    businessProfileData?.currentGoals,
    businessProfileData?.constraints,
  ].filter(Boolean).length;
  const actionCount = pilotData?.actions.length ?? 0;
  const reviewCount =
    pilotData?.deliverables.filter(
      (deliverable) => deliverable.status === "ready_for_review",
    ).length ?? 0;
  const draftCount = contentData?.drafts.length ?? 0;
  const draftsAwaitingReview =
    contentData?.drafts.filter((draft) => draft.status === "ready_for_review")
      .length ?? 0;
  const targetCount = pipelineData?.opportunities.length ?? 0;
  const followUpReadyCount =
    pipelineData?.opportunities.filter((opportunity) =>
      ["ready_for_follow_up", "follow_up_queued"].includes(opportunity.stage),
    ).length ?? 0;
  const clientName = primaryOrganization?.name ?? "Client Workspace";

  return (
    <SurfaceShell
      description="One screen for today's brief, then focused doors into HUNTER, MICAH, and DAVID."
      eyebrow={isClientPreview ? "Client preview" : "Client command center"}
      title={clientName}
    >
      <div className="space-y-4">
        {params?.status === "welcome" ? (
          <StatusAlert>Welcome to Atlas. Your private workspace is ready.</StatusAlert>
        ) : null}

        {params?.access === "denied" ? (
          <StatusAlert tone="amber">
            Your login worked, but this account is not authorized for that area.
          </StatusAlert>
        ) : null}

        {params?.pilot === "review_saved" || params?.content === "review_saved" ? (
          <StatusAlert>Your review was saved for Atlas.</StatusAlert>
        ) : null}

        {params?.pilot === "review_error" || params?.content === "review_error" ? (
          <StatusAlert tone="rose">
            That review could not be saved. Try again or message Atlas.
          </StatusAlert>
        ) : null}

        {previewOrganization?.setupRequired ? (
          <StatusAlert tone="rose">
            Atlas could not load the requested client preview. Confirm the
            organization slug and workspace access.
          </StatusAlert>
        ) : null}

        {previewOrgSlug && previewOrganization && !previewOrganization.data ? (
          <StatusAlert tone="amber">
            No organization was found for preview slug &ldquo;{previewOrgSlug}&rdquo;.
          </StatusAlert>
        ) : null}

        {isClientPreview ? (
          <StatusAlert tone="blue">
            <p className="font-semibold">Viewer mode</p>
            <p className="mt-1">
              You are seeing the same client command center layout as{" "}
              {primaryOrganization?.name}. Review and edit controls stay off
              here so you can audit the experience without acting as the client.
            </p>
          </StatusAlert>
        ) : null}

        {memberships.setupRequired ? (
          <StatusAlert tone="rose">
            Atlas could not load workspace access. Contact Atlas so we can
            restore the account.
          </StatusAlert>
        ) : null}

        {!memberships.setupRequired && memberships.data.length === 0 ? (
          <StatusAlert tone="amber">
            Your login is active, but a business workspace has not been assigned
            yet. Contact Atlas and we will connect it.
          </StatusAlert>
        ) : null}

        {primaryOrganization ? (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 to-blue-800 p-6 text-white shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Daily brief
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight">
                  Move the strongest opportunity forward today.
                </h2>
                <p className="mt-4 text-sm leading-6 text-blue-100">
                  Atlas is watching three moving parts: the content direction,
                  the sponsor/outreach list, and the follow-up queue. The goal
                  is not more clutter. The goal is one clear next move.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                      Profile
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {profileFieldsFilled}/5
                    </p>
                    <p className="mt-1 text-xs text-blue-100">fields filled</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                      Review
                    </p>
                    <p className="mt-2 text-2xl font-black">{reviewCount}</p>
                    <p className="mt-1 text-xs text-blue-100">work items</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                      Check-in
                    </p>
                    <p className="mt-2 text-base font-black">
                      {pilotData?.plan?.nextCheckInAt
                        ? formatDateTime(pilotData.plan.nextCheckInAt)
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Atlas priority
                </p>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                  {pilotData?.plan?.thirtyDayGoal ??
                    "Install the first focused operating loop."}
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-900">
                    Success means:{" "}
                  </span>
                  {pilotData?.plan?.successDefinition ??
                    "QTime can see the work, approve the next move, and keep follow-up from getting lost."}
                </p>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  Signed in as <span className="font-semibold">{user.email}</span>
                  . Role: <span className="font-semibold">{primaryMembership?.role}</span>.
                </div>
              </aside>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <DepartmentCard
                accent="amber"
                badge="HUNTER"
                description="Leads, sponsors, partners, venues, and warm opportunities that need research or follow-up."
                href={clientWorkspaceHref("/client/hunter", previewOrgSlug)}
                metric={`${targetCount} targets`}
                secondaryMetric={`${followUpReadyCount} ready`}
                title="Leads & Outreach"
              />
              <DepartmentCard
                accent="blue"
                badge="MICAH"
                description="Social images, captions, concepts, campaign drafts, and client review before anything goes public."
                href={clientWorkspaceHref("/client/micah", previewOrgSlug)}
                metric={`${draftCount} drafts`}
                secondaryMetric={`${draftsAwaitingReview} review`}
                title="Social Media"
              />
              <DepartmentCard
                accent="indigo"
                badge="DAVID"
                description="CRM-style follow-up, action items, work review, approvals, and next steps that keep deals moving."
                href={clientWorkspaceHref("/client/david", previewOrgSlug)}
                metric={`${actionCount} actions`}
                secondaryMetric={`${reviewCount} review`}
                title="CRM & Follow-up"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Business memory
                </p>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  {profileFieldsFilled}/5 profile fields filled
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Last updated: {formatDateTime(businessProfileData?.updatedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Client rule
                </p>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  Approval before action.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Drafts, outreach, and CRM work stay visible. Atlas does not
                  contact, publish, or spend without approval.
                </p>
              </div>
            </section>
          </>
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
