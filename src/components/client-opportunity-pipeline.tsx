import { formatDateTime } from "@/lib/format";
import type {
  OpportunityRole,
  OpportunityStage,
  OrganizationOpportunityPipeline,
} from "@/server/opportunities/queries";

type ClientOpportunityPipelineProps = {
  pipeline: OrganizationOpportunityPipeline;
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function stageClasses(stage: OpportunityStage) {
  if (["ready_for_follow_up", "follow_up_queued", "responded", "won"].includes(stage)) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (stage === "needs_client_input") {
    return "bg-amber-100 text-amber-800";
  }

  if (["contacted", "qualified"].includes(stage)) {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-slate-100 text-slate-700";
}

function roleLabel(role: OpportunityRole) {
  if (role === "hunter") return "HUNTER";
  if (role === "david") return "DAVID";
  if (role === "atlas") return "ATLAS";
  if (role === "micah") return "MICAH";
  if (role === "client") return "Client";
  return "Manual";
}

function roleClasses(role: OpportunityRole) {
  if (role === "hunter") return "bg-amber-100 text-amber-800";
  if (role === "david") return "bg-indigo-100 text-indigo-800";
  if (role === "atlas") return "bg-blue-100 text-blue-800";
  if (role === "micah") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function formatDate(value: string | null) {
  if (!value) return "No due date";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T12:00:00`));
}

export function ClientOpportunityPipeline({
  pipeline,
}: ClientOpportunityPipelineProps) {
  const followUpCount = pipeline.opportunities.filter((opportunity) =>
    ["ready_for_follow_up", "follow_up_queued"].includes(opportunity.stage),
  ).length;
  const needsInputCount = pipeline.opportunities.filter(
    (opportunity) => opportunity.stage === "needs_client_input",
  ).length;

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-white p-5"
      id="hunter-pipeline"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
            HUNTER Opportunity Pipeline
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Prospects, sponsors &amp; follow-up targets
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            HUNTER finds useful opportunities. DAVID keeps the next follow-up
            visible. Nothing is contacted automatically from this preview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            {pipeline.opportunities.length} targets found
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-800">
            {followUpCount} follow-up ready
          </span>
          {needsInputCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 ring-1 ring-amber-200">
              {needsInputCount} need QTime input
            </span>
          ) : null}
        </div>
      </div>

      {pipeline.opportunities.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          No HUNTER opportunities have been published yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {pipeline.opportunities.map((opportunity) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              key={opportunity.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                    {label(opportunity.opportunityType)}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">
                    {opportunity.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${stageClasses(opportunity.stage)}`}
                  >
                    {label(opportunity.stage)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${roleClasses(opportunity.ownerRole)}`}
                  >
                    {roleLabel(opportunity.ownerRole)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[0.45fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Fit score
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {opportunity.fitScore}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">out of 100</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Next action
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {opportunity.nextAction ?? "No next action published yet."}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Due {formatDate(opportunity.nextActionDue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  HUNTER research
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {opportunity.researchSummary}
                </p>
                {opportunity.fitReason ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-800">Why it fits: </span>
                    {opportunity.fitReason}
                  </p>
                ) : null}
              </div>

              {(opportunity.contactName ||
                opportunity.contactEmail ||
                opportunity.contactPhone ||
                opportunity.contactSocial ||
                opportunity.sourceLabel ||
                opportunity.sourceUrl) ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  {opportunity.sourceLabel ? (
                    <p>
                      <span className="font-semibold text-slate-800">Source: </span>
                      {opportunity.sourceUrl ? (
                        <a
                          className="text-blue-700 underline-offset-4 hover:underline"
                          href={opportunity.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {opportunity.sourceLabel}
                        </a>
                      ) : (
                        opportunity.sourceLabel
                      )}
                    </p>
                  ) : null}
                  {opportunity.contactName ? <p>Contact: {opportunity.contactName}</p> : null}
                  {opportunity.contactEmail ? <p>Email: {opportunity.contactEmail}</p> : null}
                  {opportunity.contactPhone ? <p>Phone: {opportunity.contactPhone}</p> : null}
                  {opportunity.contactSocial ? <p>Social: {opportunity.contactSocial}</p> : null}
                </div>
              ) : null}

              {opportunity.events.length > 0 ? (
                <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    Activity ({opportunity.events.length})
                  </summary>
                  <div className="mt-3 space-y-3">
                    {opportunity.events.map((event) => (
                      <div className="text-sm leading-6 text-slate-600" key={event.id}>
                        <p className="font-semibold text-slate-800">
                          {label(event.eventType)} · {roleLabel(event.actorRole)}
                        </p>
                        <p>{event.summary}</p>
                        {event.body ? <p className="mt-1">{event.body}</p> : null}
                        <p className="text-xs text-slate-500">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
