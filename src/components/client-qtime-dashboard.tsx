import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { clientWorkspaceHref } from "@/server/client-workspace/context";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import type { ClientDashboardData } from "@/server/client-dashboard/queries";
import { ClientAiConsole } from "@/components/client-ai-console";

type ClientQTimeDashboardProps = {
  workspace: ClientWorkspaceContext;
  dashboard: ClientDashboardData;
};

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(value: string) {
  if (value === "approved" || value === "published" || value === "completed") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    value === "changes_requested" ||
    value === "blocked" ||
    value === "declined" ||
    value === "failed"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (value === "ready_for_review" || value === "follow_up_queued") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-slate-100 text-slate-700";
}

function stageLabel(value: string) {
  const pretty = value.replaceAll("_", " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getPlanPriority(
  dashboard: ClientDashboardData,
  organizationName: string,
) {
  const plan = dashboard.pilot.setupRequired ? null : dashboard.pilot.data.plan;
  const contentStudio = dashboard.contentStudio.setupRequired
    ? null
    : dashboard.contentStudio.data;
  const opportunities = dashboard.opportunityPipeline.setupRequired
    ? null
    : dashboard.opportunityPipeline.data;

  if (plan?.thirtyDayGoal) {
    return {
      title: plan.thirtyDayGoal,
      detail: plan.successDefinition,
      needsInput: false,
    };
  }

  if ((contentStudio?.drafts.length ?? 0) > 0) {
    return {
      title: "Complete the first reviewed Roll'n Wars content package.",
      detail:
        "The workspace already has draft concepts. The next useful move is to confirm the review order and the missing event details.",
      needsInput: true,
    };
  }

  if ((opportunities?.opportunities.length ?? 0) > 0) {
    return {
      title: "Turn the researched opportunities into a real follow-up sequence.",
      detail:
        "The pipeline already has candidate leads. The missing step is to confirm which contacts are ready for follow-up.",
      needsInput: true,
    };
  }

  return {
    title: `Add the first 30-day priority for ${organizationName}.`,
    detail:
      "Atlas needs one clear goal, one success definition, and the next check-in date before the plan can turn into a repeatable weekly loop.",
    needsInput: true,
  };
}

function emptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2">{body}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

function PackageCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

export function ClientQTimeDashboard({
  workspace,
  dashboard,
}: ClientQTimeDashboardProps) {
  const organization = workspace.primaryOrganization;
  const isPreview = workspace.isClientPreview;
  const plan = dashboard.pilot.setupRequired ? null : dashboard.pilot.data.plan;
  const pilotActions = dashboard.pilot.setupRequired
    ? []
    : dashboard.pilot.data.actions;
  const pilotDeliverables = dashboard.pilot.setupRequired
    ? []
    : dashboard.pilot.data.deliverables;
  const contentStudio = dashboard.contentStudio.setupRequired
    ? null
    : dashboard.contentStudio.data;
  const pipeline = dashboard.opportunityPipeline.setupRequired
    ? null
    : dashboard.opportunityPipeline.data;
  const notes = dashboard.notes.setupRequired ? [] : dashboard.notes.data;
  const activity = dashboard.activity.setupRequired ? [] : dashboard.activity.data;
  const aiRequests = dashboard.aiRequests.setupRequired
    ? []
    : dashboard.aiRequests.data;
  const businessProfile = dashboard.businessProfile.setupRequired
    ? null
    : dashboard.businessProfile.data;

  const priority = getPlanPriority(dashboard, organization?.name ?? "Client");
  const approvalQueue = [
    ...pilotDeliverables.filter((item) => item.status === "ready_for_review"),
    ...(contentStudio?.drafts.filter((item) =>
      ["ready_for_review", "changes_requested"].includes(item.status),
    ) ?? []),
    ...notes.filter((item) => item.attentionRequested),
  ];
  const calendarItems = [
    ...(plan?.nextCheckInAt
      ? [
          {
            kind: "check-in",
            date: plan.nextCheckInAt,
            title: "Next check-in",
            detail: plan.thirtyDayGoal ?? "Confirm the 30-day goal.",
          },
        ]
      : []),
    ...(contentStudio?.drafts ?? []).map((draft) => ({
      kind: "content",
      date: `${draft.draftDate}T00:00:00.000Z`,
      title: `${draft.campaign} review`,
      detail: draft.title,
    })),
    ...(pipeline?.opportunities ?? [])
      .filter((opportunity) => Boolean(opportunity.nextActionDue))
      .map((opportunity) => ({
        kind: "follow-up",
        date: `${opportunity.nextActionDue}T00:00:00.000Z`,
        title: `${opportunity.name} follow-up`,
        detail: opportunity.nextAction ?? opportunity.researchSummary.slice(0, 120),
      })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const openPipeline = (pipeline?.opportunities ?? []).filter((opportunity) =>
    [
      "researching",
      "qualified",
      "needs_client_input",
      "ready_for_follow_up",
      "follow_up_queued",
      "contacted",
      "responded",
    ].includes(opportunity.stage),
  );
  const openFollowUps = openPipeline.filter((opportunity) =>
    ["ready_for_follow_up", "follow_up_queued"].includes(opportunity.stage),
  );
  const recentActivity = activity.slice(0, 7);
  const recentAiRequests = aiRequests.slice(0, 5);
  const weeklyActivityCount = dashboard.weeklyCounts.activity;
  const weeklyAiCount = dashboard.weeklyCounts.aiRequests;
  const readyReviewCount = approvalQueue.length;
  const openNotesCount = notes.length;
  const flyerConceptCount = (contentStudio?.drafts ?? []).filter((draft) =>
    draft.metadata.asset_type === "flyer_concept",
  ).length;
  const socialDraftCount = (contentStudio?.drafts ?? []).filter((draft) =>
    draft.metadata.asset_type === "social_post",
  ).length;
  const venueProspectCount = (pipeline?.opportunities ?? []).filter(
    (opportunity) => opportunity.opportunityType === "venue",
  ).length;
  const foodTruckProspectCount = (pipeline?.opportunities ?? []).filter(
    (opportunity) => opportunity.opportunityType === "food_truck",
  ).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.16),transparent_33%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#5672f0]">
                Current priority
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
                {priority.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                {priority.detail}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                {organization?.name ?? "Client workspace"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Signed in as{" "}
                <span className="font-semibold text-slate-900">
                  {workspace.user.email}
                </span>
                .
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Role:{" "}
                <span className="font-semibold text-slate-900">
                  {workspace.primaryMembership?.role ?? "member"}
                </span>
                .
              </p>
              {plan?.nextCheckInAt ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Next check-in:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(plan.nextCheckInAt)}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Next check-in date still needs to be set.
                </p>
              )}
            </div>
          </div>

          {priority.needsInput ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Truthful gap: Atlas still needs either a saved 30-day plan or a
              clear next check-in date to make this priority fully concrete.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Approval queue"
              note="Items ready for client review."
              value={String(readyReviewCount)}
            />
            <MetricCard
              label="Pipeline"
              note="Open opportunities that still need attention."
              value={String(openPipeline.length)}
            />
            <MetricCard
              label="Activity"
              note="Visible workspace updates in the last 7 days."
              value={String(weeklyActivityCount)}
            />
            <MetricCard
              label="AI requests"
              note="Logged console requests in the last 7 days."
              value={String(weeklyAiCount)}
            />
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#5672f0]">
            Weekly scorecard
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            What moved this week
          </h3>
          <div className="mt-5 space-y-4">
            <ScoreRow
              label="Ready for review"
              value={readyReviewCount}
              note="Content drafts, deliverables, and notes that need client attention."
            />
            <ScoreRow
              label="Open follow-ups"
              value={openFollowUps.length}
              note="Opportunities already close to a next action."
            />
            <ScoreRow
              label="Open notes"
              value={openNotesCount}
              note="Workspace notes visible in the current tenant."
            />
            <ScoreRow
              label="Pilot actions"
              value={pilotActions.length}
              note="The action queue that supports the 30-day plan."
            />
          </div>

          {businessProfile ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Business profile
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {businessProfile.offer ?? "Offer still needs to be captured."}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {businessProfile.targetCustomer ??
                  "Target customer still needs to be captured."}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              The business profile has not been saved yet. That is the next
              input needed before Atlas can give a sharper plan.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-[1.8rem] border border-indigo-200 bg-indigo-50/60 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700">
              This week&apos;s Q-Time package
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              Research and creative are ready for review
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              All items below are drafts. No outreach was sent, no post was
              published, and no event, availability, or result is being claimed.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            Approval required
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PackageCount label="Flyer concepts" value={flyerConceptCount} />
          <PackageCount label="Social drafts" value={socialDraftCount} />
          <PackageCount label="Venue prospects" value={venueProspectCount} />
          <PackageCount label="Food-truck prospects" value={foodTruckProspectCount} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            className="rounded-full bg-white px-4 py-2 text-indigo-800 ring-1 ring-indigo-200 transition hover:bg-indigo-100"
            href={clientWorkspaceHref("/client/micah", workspace.previewOrgSlug)}
          >
            Review MICAH package
          </Link>
          <Link
            className="rounded-full bg-white px-4 py-2 text-indigo-800 ring-1 ring-indigo-200 transition hover:bg-indigo-100"
            href={clientWorkspaceHref("/client/hunter", workspace.previewOrgSlug)}
          >
            Review HUNTER research
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            Approval queue
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            What needs review now
          </h3>
          <div className="mt-4 space-y-3">
            {approvalQueue.length === 0
              ? emptyState({
                  title: "Nothing is waiting for review.",
                  body:
                    "Atlas does not have any client-ready content, deliverables, or attention requests yet. The next input is the first item to approve.",
                })
              : approvalQueue.slice(0, 4).map((item) => {
                  if ("title" in item && "attentionRequested" in item) {
                    return (
                      <article
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                              Note
                            </p>
                            <h4 className="mt-2 text-sm font-semibold text-slate-950">
                              {item.title}
                            </h4>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-800">
                            input needed
                          </span>
                        </div>
                        {item.body ? (
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {item.body}
                          </p>
                        ) : null}
                      </article>
                    );
                  }

                  if ("campaign" in item) {
                    return (
                      <article
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                              Content
                            </p>
                            <h4 className="mt-2 text-sm font-semibold text-slate-950">
                              {item.title}
                            </h4>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone(item.status)}`}>
                            {humanize(item.status)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {item.caption ?? item.headline ?? "No caption provided."}
                        </p>
                      </article>
                    );
                  }

                  return (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                            Pilot
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-950">
                            {item.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-800">
                          review
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.summary ?? "No summary provided."}
                      </p>
                    </article>
                  );
                })}
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            Calendar
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Dates that actually exist
          </h3>
          <div className="mt-4 space-y-3">
            {calendarItems.length === 0
              ? emptyState({
                  title: "No dated items yet.",
                  body:
                    "Add a plan date, a content draft date, or a follow-up date to give the workspace a real calendar spine.",
                })
              : calendarItems.slice(0, 6).map((item) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={`${item.kind}-${item.date}-${item.title}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                          {item.kind}
                        </p>
                        <h4 className="mt-2 text-sm font-semibold text-slate-950">
                          {item.title}
                        </h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 ring-1 ring-slate-200">
                        {formatShortDate(item.date)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {item.detail}
                    </p>
                  </article>
                ))}
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            Opportunity pipeline
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Current leads and fit
          </h3>
          <div className="mt-4 space-y-3">
            {openPipeline.length === 0
              ? emptyState({
                  title: "No open opportunities yet.",
                  body:
                    "The workspace does not have a current prospect list. That is the next place HUNTER should fill in.",
                })
              : openPipeline.slice(0, 5).map((opportunity) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={opportunity.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                          {opportunity.opportunityType}
                        </p>
                        <h4 className="mt-2 text-sm font-semibold text-slate-950">
                          {opportunity.name}
                        </h4>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone(opportunity.stage)}`}>
                        {stageLabel(opportunity.stage)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                      <span>Fit {opportunity.fitScore}/100</span>
                      <span>{opportunity.ownerRole.toUpperCase()}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {opportunity.nextAction ?? opportunity.researchSummary}
                    </p>
                  </article>
                ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            Activity
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Visible workspace history
          </h3>
          <div className="mt-4 space-y-3">
            {recentActivity.length === 0
              ? emptyState({
                  title: "No activity is visible yet.",
                  body:
                    "The activity feed will populate as notes, business profile updates, and approval work start moving.",
                })
              : recentActivity.map((event) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={event.id}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                      {humanize(event.eventType)}
                    </p>
                    <h4 className="mt-2 text-sm font-semibold text-slate-950">
                      {event.title}
                    </h4>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatDateTime(event.occurredAt)}
                    </p>
                  </article>
                ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            Content and review
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Ready-to-review material
          </h3>
          <div className="mt-4 space-y-3">
            {contentStudio?.drafts.length ?? 0 ? (
              contentStudio!.drafts.map((draft) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  key={draft.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                        {draft.campaign}
                      </p>
                      <h4 className="mt-2 text-sm font-semibold text-slate-950">
                        {draft.title}
                      </h4>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone(draft.status)}`}>
                      {humanize(draft.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {draft.caption}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Draft date {formatShortDate(draft.draftDate)}
                  </p>
                </article>
              ))
            ) : (
              emptyState({
                title: "No content drafts yet.",
                body:
                  "There are no visible content drafts in this workspace. Atlas can still draft them, but the current state is honest: nothing is ready for review yet.",
              })
            )}
          </div>
        </div>
      </section>

      <ClientAiConsole
        organizationId={organization?.id ?? ""}
        previewMode={isPreview}
        requests={recentAiRequests}
      />

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
              Account actions
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              Jump to the role screens
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              Preview {isPreview ? "on" : "off"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <RoleLink
            href={clientWorkspaceHref("/client/hunter", workspace.previewOrgSlug)}
            label="Hunter"
            note="Opportunity research and lead fit."
          />
          <RoleLink
            href={clientWorkspaceHref("/client/micah", workspace.previewOrgSlug)}
            label="Micah"
            note="Drafts, captions, and content review."
          />
          <RoleLink
            href={clientWorkspaceHref("/client/david", workspace.previewOrgSlug)}
            label="David"
            note="CRM, follow-up, and review status."
          />
        </div>
      </section>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  );
}

function RoleLink({
  href,
  label,
  note,
}: {
  href: string;
  label: string;
  note: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-[#5672f0] hover:bg-white"
      href={href}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{note}</p>
      <p className="mt-3 text-sm font-medium text-slate-500">
        Open the role screen
      </p>
    </Link>
  );
}
