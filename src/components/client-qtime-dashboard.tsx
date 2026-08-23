import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/format";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import { clientWorkspaceHref } from "@/server/client-workspace/context";
import type { ClientDashboardData } from "@/server/client-dashboard/queries";
import { hasServerIntegrationSecret } from "@/server/integrations/server-env";
import { QTimeAskAtlasCard } from "@/components/qtime-ask-atlas-card";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { SiteLanguage } from "@/lib/site-language";

type ClientQTimeDashboardProps = {
  workspace: ClientWorkspaceContext;
  dashboard: ClientDashboardData;
};

type TrendPoint = {
  label: string;
  value: number;
  href?: string;
};

type FollowUpCard = {
  id: string;
  title: string;
  objective: string;
  suggestedAction: string;
  channel: string;
  dueDate: string | null;
  dueTimeLabel: string;
  priorActivity: string;
  notes: string;
  ownerLabel: string;
  stageLabel: string;
  channelHint: string;
};

type CalendarItem = {
  id: string;
  kind: "check-in" | "ad request" | "follow-up";
  date: string;
  title: string;
  detail: string;
  href: string | null;
  ctaLabel?: string;
};

function humanize(value: string, spanish = false) {
  if (!spanish) return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    ad_request: "solicitud de anuncio",
    approved: "aprobado",
    changes_requested: "cambios solicitados",
    completed: "completado",
    failed: "falló",
    follow_up_queued: "seguimiento en cola",
    needs_client_input: "requiere información",
    published: "publicado",
    ready_for_review: "listo para revisión",
  };
  return labels[value] ?? value.replaceAll("_", " ");
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

function stageLabel(value: string, spanish = false) {
  const labels: Record<string, string> = {
    researching: spanish ? "Investigando" : "Researching",
    qualified: spanish ? "Calificado" : "Qualified",
    needs_client_input: spanish ? "Requiere información" : "Needs Input",
    ready_for_follow_up: spanish ? "Listo" : "Ready",
    follow_up_queued: spanish ? "Listo" : "Ready",
    contacted: spanish ? "Contactado" : "Contacted",
    responded: spanish ? "Respondió" : "Responded",
    won: spanish ? "Ganado" : "Won",
    lost: spanish ? "Perdido" : "Lost",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function stageLensHref(focusStage: string, previewOrgSlug: string | null) {
  const search = previewOrgSlug
    ? `?previewOrg=${encodeURIComponent(previewOrgSlug)}&focus=${encodeURIComponent(focusStage)}#stage-lens`
    : `?focus=${encodeURIComponent(focusStage)}#stage-lens`;

  return `/client${search}`;
}

function metadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function draftReviewHref(
  draft: {
    id: string;
    imageUrl: string | null;
    imageSvg: string | null;
    metadata: Record<string, unknown>;
  },
  previewOrgSlug: string | null,
) {
  const explicitHref = metadataString(draft.metadata, [
    "reviewHref",
    "review_url",
    "reviewUrl",
    "sourceHref",
    "source_href",
    "sourceUrl",
    "source_url",
    "href",
    "url",
  ]);

  if (explicitHref) {
    return explicitHref;
  }

  return `${clientWorkspaceHref("/client/micah", previewOrgSlug ?? undefined)}#draft-${draft.id}`;
}

function formatShortDate(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatCalendarDate(value: string | null, language: SiteLanguage) {
  if (!value) {
    return language === "es" ? "Sin fecha límite guardada" : "No due date stored";
  }

  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
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

function MetricTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

function MiniBars({
  title,
  subtitle,
  points,
  accent = "blue",
}: {
  title: string;
  subtitle: string;
  points: TrendPoint[];
  accent?: "blue" | "gold";
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const fillClass = accent === "gold" ? "bg-[#d8b15a]" : "bg-[#5672f0]";

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {points.map((point) => (
          point.href ? (
            <Link
              className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 rounded-2xl border border-transparent px-2 py-1 text-left transition hover:border-[#5672f0] hover:bg-white"
              href={point.href}
              key={point.label}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {point.label}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className={`h-full rounded-full ${fillClass}`}
                  style={{ width: `${(point.value / max) * 100}%` }}
                />
              </div>
              <p className="text-right text-sm font-semibold text-slate-950">
                {point.value}
              </p>
            </Link>
          ) : (
            <div className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3" key={point.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {point.label}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className={`h-full rounded-full ${fillClass}`}
                  style={{ width: `${(point.value / max) * 100}%` }}
                />
              </div>
              <p className="text-right text-sm font-semibold text-slate-950">
                {point.value}
              </p>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function QueueChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "gold" | "ink";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    gold: "border-amber-200 bg-amber-50 text-amber-900",
    ink: "border-slate-700 bg-slate-950 text-white",
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      <span className="uppercase tracking-[0.12em]">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  children,
  tone = "light",
  id,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "light" | "ink";
  id?: string;
  className?: string;
}) {
  const classes =
    tone === "ink"
      ? "border-slate-900 bg-slate-950 text-white"
      : "border-slate-200 bg-white text-slate-950";

  return (
    <article
      className={`rounded-[2rem] border p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] ${classes} ${className ?? ""}`}
      id={id}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              tone === "ink" ? "text-white" : "text-[#5672f0]"
            }`}
          >
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
            {title}
          </h3>
          {description ? (
            <p
              className={`mt-2 max-w-3xl text-sm leading-6 ${
                tone === "ink" ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function buildDailySeries<T>(
  rows: T[],
  key: keyof T,
  language: SiteLanguage,
) {
  const today = new Date();
  const points = Array.from({ length: 7 }, (_value, index) => {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));

    return {
      key: day.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", { weekday: "short" }).format(day),
      value: 0,
    };
  });

  rows.forEach((row) => {
    const stamp = row[key];
    if (typeof stamp !== "string" || !stamp) {
      return;
    }

    const index = points.findIndex(
      (point) => point.key === new Date(stamp).toISOString().slice(0, 10),
    );

    if (index >= 0) {
      points[index].value += 1;
    }
  });

  return points.map(({ label, value }) => ({ label, value }));
}

function getFollowUpChannel(opportunity: {
  contactEmail: string | null;
  contactPhone: string | null;
  contactSocial: string | null;
  sourceLabel: string | null;
}, spanish: boolean) {
  if (opportunity.contactSocial) {
    return { label: spanish ? "Mensaje en red social" : "Social DM", hint: spanish ? "Es la mejor opción para el perfil social visible del contacto." : "Best fit for the contact's visible social profile." };
  }

  if (opportunity.contactEmail) {
    return { label: spanish ? "Correo" : "Email", hint: spanish ? "Es la mejor opción para un mensaje escrito y conciso." : "Best fit for a concise written outreach update." };
  }

  if (opportunity.contactPhone) {
    return { label: spanish ? "Llamada / mensaje" : "Call / text", hint: spanish ? "Es la mejor opción para una revisión directa por voz o mensaje." : "Best fit for a direct verbal or text check-in." };
  }

  if (opportunity.sourceLabel) {
    return { label: spanish ? "Seguimiento de la fuente" : "Source follow-up", hint: spanish ? "Usa la fuente original como próximo punto de contacto." : "Use the original source as the next touchpoint." };
  }

  return { label: spanish ? "Revisión interna" : "Internal review", hint: spanish ? "Todavía no se ha guardado un método de contacto externo." : "No external contact method is stored yet." };
}

function getFollowUpObjective(opportunity: {
  nextAction: string | null;
  researchSummary: string;
}) {
  return (
    opportunity.nextAction ??
    opportunity.researchSummary.slice(0, 140) + (opportunity.researchSummary.length > 140 ? "..." : "")
  );
}

function getFollowUpActivity(opportunity: {
  events: Array<{
    summary: string;
    body: string | null;
    createdAt: string;
  }>;
  fitReason: string | null;
}, spanish: boolean) {
  const latest = opportunity.events.at(-1);

  if (latest) {
    return `${latest.summary}${latest.body ? ` ${latest.body}` : ""}`.trim();
  }

  return (
    opportunity.fitReason ??
    (spanish ? "Todavía no se ha registrado actividad previa para esta oportunidad." : "No prior activity is recorded yet for this opportunity.")
  );
}

function buildFollowUps(
  opportunities: Array<{
    id: string;
    name: string;
    stage: string;
    ownerRole: string;
    nextAction: string | null;
    nextActionDue: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactSocial: string | null;
    sourceLabel: string | null;
    researchSummary: string;
    fitReason: string | null;
    events: Array<{
      summary: string;
      body: string | null;
      createdAt: string;
    }>;
  }>,
  noteSummary: string,
  spanish: boolean,
) {
  return opportunities.slice(0, 5).map((opportunity) => {
    const channel = getFollowUpChannel(opportunity, spanish);
    const contact = opportunity.contactName ?? opportunity.sourceLabel ?? (spanish ? "Oportunidad sin nombre" : "Unnamed opportunity");

    return {
      id: opportunity.id,
      title: contact,
      objective: getFollowUpObjective(opportunity),
      suggestedAction:
        opportunity.nextAction ??
        (spanish ? `Usa ${channel.label.toLowerCase()} como punto de contacto y registra el resultado.` : `Use the ${channel.label.toLowerCase()} touchpoint and log the result.`),
      channel: channel.label,
      dueDate: opportunity.nextActionDue,
      dueTimeLabel: opportunity.nextActionDue
        ? spanish ? "La hora no está guardada en los datos de origen" : "Time not stored in source data"
        : spanish ? "Sin hora límite guardada" : "No due time stored",
      priorActivity: getFollowUpActivity(opportunity, spanish),
      notes: noteSummary,
      ownerLabel: humanize(opportunity.ownerRole, spanish),
      stageLabel: stageLabel(opportunity.stage, spanish),
      channelHint: channel.hint,
    } satisfies FollowUpCard;
  });
}

export async function ClientQTimeDashboard({
  workspace,
  dashboard,
}: ClientQTimeDashboardProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const organization = workspace.primaryOrganization;
  const plan = dashboard.pilot.setupRequired ? null : dashboard.pilot.data.plan;
  const pilotDeliverables = dashboard.pilot.setupRequired
    ? []
    : dashboard.pilot.data.deliverables;
  const contentStudio = dashboard.contentStudio.setupRequired
    ? null
    : dashboard.contentStudio.data;
  const pipeline = dashboard.opportunityPipeline.setupRequired
    ? null
    : dashboard.opportunityPipeline.data;
  const allPipeline = pipeline?.opportunities ?? [];
  const notes = dashboard.notes.setupRequired ? [] : dashboard.notes.data;
  const activity = dashboard.activity.setupRequired ? [] : dashboard.activity.data;
  const aiRequests = dashboard.aiRequests.setupRequired
    ? []
    : dashboard.aiRequests.data;
  const aiUsage = dashboard.aiUsage.data;

  const approvalQueue = [
    ...pilotDeliverables.filter((item) => item.status === "ready_for_review"),
    ...(contentStudio?.drafts.filter((item) =>
      ["ready_for_review", "changes_requested"].includes(item.status),
    ) ?? []),
    ...notes.filter((item) => item.attentionRequested),
  ];

  const openPipeline = allPipeline.filter((opportunity) =>
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

  const readyForFollowUp = openPipeline.filter((opportunity) =>
    ["ready_for_follow_up", "follow_up_queued"].includes(opportunity.stage),
  );

  const recentActivity = activity.slice(0, 7);
  const recentAiRequests = aiRequests.slice(0, 5);
  const readyReviewCount = approvalQueue.length;
  const followUpCount = readyForFollowUp.length;
  const contentDraftCount = contentStudio?.drafts.length ?? 0;

  const flyerConceptCount = (contentStudio?.drafts ?? []).filter((draft) =>
    draft.metadata.asset_type === "flyer_concept",
  ).length;
  const socialDraftCount = (contentStudio?.drafts ?? []).filter((draft) =>
    draft.metadata.asset_type === "social_post",
  ).length;
  const noteSummary =
    notes.find((item) => item.attentionRequested)?.body ??
    notes[0]?.body ??
    (spanish ? "Todavía no se ha guardado una nota del espacio." : "No workspace note is captured yet.");

  const followUps = buildFollowUps(readyForFollowUp, noteSummary, spanish);
  const topFollowUps = followUps.slice(0, 2);
  const davidWorkspaceHref = clientWorkspaceHref("/client/david", workspace.previewOrgSlug);
  const activityTrend = buildDailySeries(recentActivity, "occurredAt", language);
  const requestTrend = buildDailySeries(recentAiRequests, "createdAt", language);
  const openAiReady = hasServerIntegrationSecret("OPENAI_API_KEY");

  const pipelineStages = [
    {
      key: "researching",
      label: spanish ? "Investigando" : "Researching",
      count: allPipeline.filter((item) => item.stage === "researching").length,
    },
    {
      key: "qualified",
      label: spanish ? "Calificado" : "Qualified",
      count: allPipeline.filter((item) => item.stage === "qualified").length,
    },
    {
      key: "needs_client_input",
      label: spanish ? "Requiere información" : "Needs Input",
      count: allPipeline.filter((item) => item.stage === "needs_client_input").length,
    },
    {
      key: "ready_for_follow_up",
      label: spanish ? "Listo" : "Ready",
      count: allPipeline.filter((item) =>
        ["ready_for_follow_up", "follow_up_queued"].includes(item.stage),
      ).length,
    },
    {
      key: "contacted",
      label: spanish ? "Contactado" : "Contacted",
      count: allPipeline.filter((item) => item.stage === "contacted").length,
    },
    {
      key: "responded",
      label: spanish ? "Respondió" : "Responded",
      count: allPipeline.filter((item) => item.stage === "responded").length,
    },
    {
      key: "won",
      label: spanish ? "Ganado" : "Won",
      count: allPipeline.filter((item) => item.stage === "won").length,
    },
    {
      key: "lost",
      label: spanish ? "Perdido" : "Lost",
      count: allPipeline.filter((item) => item.stage === "lost").length,
    },
  ].map((stage) => ({
    ...stage,
    href: stageLensHref(stage.key, workspace.previewOrgSlug),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.18),transparent_26%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
              {organization?.name ?? "Q Time Productions"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl">
              {spanish ? "Gestor de Relaciones con Clientes" : "Customer Relations Manager"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {spanish
                ? "Un panel para aprobaciones, pipeline, seguimiento, calendario, actividad y Pregunta a Atlas."
                : "One dashboard for approvals, pipeline, follow-up, calendar, activity, and Ask Atlas."}
            </p>
          </div>

          <nav aria-label={spanish ? "Navegación de QTime" : "QTime navigation"} className="grid gap-2 sm:grid-cols-2 xl:min-w-[30rem]">
            {[
              [spanish ? "Resumen" : "Overview", "#overview", String(openPipeline.length)],
              [spanish ? "Aprobaciones" : "Approvals", "#approvals", String(readyReviewCount)],
              ["Pipeline", "#pipeline", String(openPipeline.length)],
              [spanish ? "Calendario" : "Calendar", "#calendar", String(contentDraftCount + followUpCount)],
              [spanish ? "Actividad" : "Activity", "#activity", String(recentActivity.length)],
              [spanish ? "Notas" : "Notes", "#notes", String(notes.length)],
            ].map(([label, href, value]) =>
              String(href).startsWith("#") ? (
                <a
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#5672f0] hover:bg-slate-50"
                  href={String(href)}
                  key={String(label)}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
                    {value}
                  </span>
                </a>
              ) : (
                <Link
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#5672f0] hover:bg-slate-50"
                  href={String(href)}
                  key={String(label)}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
                    {value}
                  </span>
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="mt-5">
          <QTimeAskAtlasCard
            dailyUsage={aiUsage}
            enabled={openAiReady}
            organizationId={organization?.id ?? ""}
            workspaceName={organization?.name ?? "Q Time Productions"}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="space-y-5">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]" id="follow-up-dates">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#5672f0]">
                  {spanish ? "Centro de Seguimiento" : "Follow-up Desk"}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                  {spanish ? "La fortuna está en el seguimiento" : "The fortune is in the follow-up"}
                </h3>
              </div>
              <Link
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                href={davidWorkspaceHref}
              >
                {spanish ? "Abrir Centro de Seguimiento" : "Open Follow-up Desk"}
              </Link>
            </div>
            {topFollowUps.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{spanish ? "Cola despejada." : "Queue clear."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold !text-white transition hover:bg-slate-800 hover:!text-white focus:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                    href="#pipeline"
                  >
                    {spanish ? "Abrir pipeline" : "Open Pipeline"}
                  </Link>
                  <Link
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    href="#calendar"
                  >
                    {spanish ? "Programar seguimiento" : "Schedule follow-up"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {topFollowUps.map((item) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                          {item.stageLabel}
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-950">
                          {item.title}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatCalendarDate(item.dueDate, language)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.channel} · {item.objective}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="space-y-5">
          <SectionShell
            eyebrow={spanish ? "Cola de aprobación" : "Approval queue"}
            id="approvals"
            title={spanish ? "Lo que necesita revisión ahora" : "What needs review now"}
          >
            <div className="space-y-3">
              {approvalQueue.length === 0
                ? emptyState({
                    title: spanish ? "No hay nada esperando revisión." : "Nothing is waiting for review.",
                    body: spanish
                      ? "Todavía no hay contenido, entregables ni solicitudes de atención listos para el cliente. La próxima entrada será el primer elemento por aprobar."
                      : "There are no client-ready content, deliverables, or attention requests yet. The next input is the first item to approve.",
                  })
                : approvalQueue.slice(0, 5).map((item) => {
                    if ("title" in item && "attentionRequested" in item) {
                      return (
                        <article
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                          key={item.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                                 {spanish ? "Nota" : "Note"}
                              </p>
                              <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                                {item.title}
                              </h4>
                            </div>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
                              {spanish ? "se requiere información" : "input needed"}
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
                      const reviewHref = draftReviewHref(item, workspace.previewOrgSlug);
                      return (
                        <Link
                          className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#5672f0] hover:bg-white"
                          href={reviewHref}
                          key={item.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                                 {spanish ? "Solicitud de anuncio" : "Ad request"}
                              </p>
                              <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                                {item.title}
                              </h4>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${statusTone(item.status)}`}
                            >
                              {humanize(item.status, spanish)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {item.caption ?? item.headline ?? (spanish ? "No se proporcionó texto." : "No caption provided.")}
                          </p>
                        </Link>
                      );
                    }

                    return (
                      <article
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        key={item.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                              {spanish ? "Trabajo del cliente" : "Client work"}
                            </p>
                            <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                              {item.title}
                            </h4>
                          </div>
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-blue-800">
                            {spanish ? "revisión" : "review"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {item.summary ?? (spanish ? "No se proporcionó un resumen." : "No summary provided.")}
                        </p>
                      </article>
                    );
                  })}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow="Pipeline"
            id="pipeline"
            title={spanish ? "Oportunidades abiertas y conversión por etapa" : "Open opportunities and stage conversion"}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_0.86fr]">
              <div className="space-y-3">
                {openPipeline.length === 0
                  ? emptyState({
                      title: spanish ? "Todavía no hay oportunidades abiertas." : "No open opportunities yet.",
                      body: spanish
                        ? "El espacio no tiene una lista actual de prospectos. Ese es el próximo lugar que debe completar la herramienta de investigación de crecimiento."
                        : "The workspace does not have a current prospect list. That is the next place the growth research tool should fill in.",
                    })
                  : openPipeline.slice(0, 6).map((opportunity) => (
                      <article
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        key={opportunity.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                              {opportunity.opportunityType}
                            </p>
                            <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                              {opportunity.name}
                            </h4>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${statusTone(opportunity.stage)}`}
                          >
                            {stageLabel(opportunity.stage, spanish)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span>{spanish ? "Afinidad" : "Fit"} {opportunity.fitScore}/100</span>
                          <span>{opportunity.ownerRole.toUpperCase()}</span>
                          {opportunity.nextActionDue ? (
                            <span>{spanish ? "Fecha límite" : "Due"} {formatShortDate(opportunity.nextActionDue, language)}</span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {opportunity.nextAction ?? opportunity.researchSummary}
                        </p>
                      </article>
                    ))}
              </div>

              <div className="space-y-4">
                <MiniBars
                  accent="blue"
                  points={pipelineStages.map((stage) => ({
                    label: stage.label,
                    value: stage.count,
                    href: stage.href,
                  }))}
                  subtitle={spanish ? "Totales ordenados por etapa." : "Ordered stage totals."}
                  title={spanish ? "Etapas del pipeline" : "Pipeline stages"}
                />
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {spanish ? "Totales por etapa" : "Stage totals"}
                  </p>
                  <div className="mt-4 space-y-3">
                    {pipelineStages.map((stage) => (
                      <Link
                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-white hover:shadow-sm"
                        href={stage.href}
                        key={stage.label}
                      >
                        <p className="text-sm font-semibold text-slate-950">
                          {stage.label}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {stage.count}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            eyebrow={spanish ? "Actividad" : "Activity"}
            id="activity"
            title={spanish ? "Historial visible del espacio" : "Visible workspace history"}
          >
            <div className="space-y-3">
              {recentActivity.length === 0
                ? emptyState({
                    title: spanish ? "Todavía no hay actividad visible." : "No activity is visible yet.",
                    body: spanish
                      ? "El feed de actividad se llenará cuando comiencen a avanzar las notas, actualizaciones del perfil empresarial y aprobaciones."
                      : "The activity feed will populate as notes, business profile updates, and approval work start moving.",
                  })
                : recentActivity.map((event) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      key={event.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                            {humanize(event.eventType, spanish)}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                            {event.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 ring-1 ring-slate-200">
                          {formatDateTime(event.occurredAt)}
                        </span>
                      </div>
                    </article>
                  ))}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow={spanish ? "Solicitudes de anuncios" : "Ad requests"}
            id="ad-requests"
            title={spanish ? "Solicitudes creativas y estado de revisión" : "Creative requests and review status"}
          >
            <div className="space-y-3">
              {contentDraftCount === 0
                ? emptyState({
                    title: spanish ? "Todavía no hay borradores de contenido." : "No content drafts yet.",
                    body: spanish
                      ? "No hay borradores de contenido visibles en este espacio. La herramienta creativa todavía puede prepararlos, pero el estado actual es claro: nada está listo para revisión."
                      : "There are no visible content drafts in this workspace. The creative tool can still draft them, but the current state is honest: nothing is ready for review yet.",
                  })
                : contentStudio!.drafts.map((draft) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      key={draft.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                            {draft.campaign}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                            {draft.title}
                          </h4>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${statusTone(draft.status)}`}
                        >
                           {humanize(draft.status, spanish)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {draft.caption}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {spanish ? "Fecha del borrador" : "Draft date"} {formatShortDate(draft.draftDate, language)}
                      </p>
                    </article>
                  ))}
            </div>
          </SectionShell>
        </div>

        <div className="space-y-5">
          <SectionShell
            className="hidden"
            eyebrow={spanish ? "Centro de seguimiento" : "Follow-up desk"}
            id="follow-up-dates-legacy"
            title={spanish ? "La fortuna está en el seguimiento" : "The fortune is in the follow-up"}
            tone="ink"
          >
            <div className="space-y-3">
              {followUps.length === 0
                ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">{spanish ? "Cola despejada." : "Queue clear."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold !text-slate-950 transition hover:bg-slate-100 hover:!text-slate-950 focus:!text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        href="#pipeline"
                      >
                        {spanish ? "Abrir pipeline" : "Open Pipeline"}
                      </a>
                      <a
                        className="rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        href="#calendar"
                      >
                        {spanish ? "Programar seguimiento" : "Schedule follow-up"}
                      </a>
                    </div>
                  </div>
                )
                : followUps.map((item) => (
                    <article
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      key={item.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-white">
                            {item.stageLabel}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
                            {item.title}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {spanish ? "Responsable" : "Owner"}: {item.ownerLabel}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <QueueChip label={spanish ? "Canal" : "Channel"} value={item.channel} tone="gold" />
                          <QueueChip label={spanish ? "Fecha límite" : "Due"} value={formatCalendarDate(item.dueDate, language)} tone="blue" />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.92fr]">
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-white">
                              {spanish ? "Objetivo" : "Objective"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white">
                              {item.objective}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-white">
                              {spanish ? "Actividad previa / notas" : "Prior activity / notes"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white">
                              {item.priorActivity}
                            </p>
                            <p className="mt-3 text-xs font-medium text-white">
                              {spanish ? "Nota del espacio" : "Workspace note"}: {item.notes}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-[#d8b15a]/20 bg-[#f9f3e3] p-4 text-slate-950">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8b6b17]">
                            {spanish ? "Acción sugerida" : "Suggested action"}
                          </p>
                          <p className="text-sm leading-6 text-slate-800">
                            {item.suggestedAction}
                          </p>
                          <p className="text-xs font-medium text-slate-600">
                            {item.channelHint}
                          </p>
                          <div className="space-y-2 pt-2">
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                 {spanish ? "Canal de contacto" : "Outreach channel"}
                              </span>
                              <select
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                                defaultValue={item.channel}
                                disabled
                              >
                                <option>{item.channel}</option>
                                <option>{spanish ? "Correo" : "Email"}</option>
                                <option>{spanish ? "Mensaje en red social" : "Social DM"}</option>
                                <option>{spanish ? "Llamada / mensaje" : "Call / text"}</option>
                                <option>{spanish ? "Revisión interna" : "Internal review"}</option>
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                 {spanish ? "Registrar resultado" : "Record outcome"}
                              </span>
                              <textarea
                                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-700"
                                defaultValue={`${spanish ? "Fecha límite" : "Due"} ${formatCalendarDate(item.dueDate, language)}. ${item.dueTimeLabel}.`}
                                disabled
                              />
                            </label>
                            <button
                              className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white opacity-70"
                              type="button"
                            >
                              {spanish ? "Completar seguimiento" : "Complete follow-up"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow={spanish ? "Calendario" : "Calendar"}
            id="calendar"
            title={spanish ? "Próximos elementos con fecha" : "Upcoming dated items"}
          >
            <div className="space-y-3">
              {(
                [
                  ...(plan?.nextCheckInAt
                    ? [
                        {
                          id: `check-in-${plan.nextCheckInAt}`,
                          kind: "check-in" as const,
                          date: plan.nextCheckInAt,
                           title: spanish ? "Próxima revisión" : "Next check-in",
                           detail: plan.thirtyDayGoal ?? (spanish ? "Confirma la meta de 30 días." : "Confirm the 30-day goal."),
                          href: null,
                        },
                      ]
                    : []),
                  ...(contentStudio?.drafts ?? []).map((draft) => ({
                    id: `content-${draft.id}`,
                    kind: "ad request" as const,
                    date: `${draft.draftDate}T00:00:00.000Z`,
                    title: draft.title,
                    detail: draft.caption ?? draft.headline ?? draft.campaign,
                    href: draftReviewHref(draft, workspace.previewOrgSlug),
                    ctaLabel: spanish ? "Abrir revisión" : "Open review",
                  })),
                  ...readyForFollowUp
                    .filter((opportunity) => Boolean(opportunity.nextActionDue))
                    .map((opportunity) => ({
                      id: `follow-up-${opportunity.id}`,
                      kind: "follow-up" as const,
                      date: `${opportunity.nextActionDue}T00:00:00.000Z`,
                       title: `${opportunity.name} ${spanish ? "seguimiento" : "follow-up"}`,
                      detail: opportunity.nextAction ?? opportunity.researchSummary.slice(0, 120),
                      href: davidWorkspaceHref,
                    })),
                ] as CalendarItem[]
              )
                .sort((left, right) => left.date.localeCompare(right.date))
                .slice(0, 6)
                .map((item) =>
                  item.href ? (
                    <Link
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#5672f0] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                      href={item.href}
                      key={item.id}
                       aria-label={`${spanish ? "Abrir" : "Open"} ${item.title}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                             {item.kind === "check-in" ? (spanish ? "revisión" : "check-in") : item.kind === "ad request" ? (spanish ? "solicitud de anuncio" : "ad request") : spanish ? "seguimiento" : "follow-up"}
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-950">
                            {item.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 ring-1 ring-slate-200">
                           {formatShortDate(item.date, language)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {item.detail}
                      </p>
                      {item.ctaLabel ? (
                        <span className="mt-4 inline-flex rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                          {item.ctaLabel}
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                             {item.kind === "check-in" ? (spanish ? "revisión" : "check-in") : item.kind === "ad request" ? (spanish ? "solicitud de anuncio" : "ad request") : spanish ? "seguimiento" : "follow-up"}
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-950">
                            {item.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 ring-1 ring-slate-200">
                           {formatShortDate(item.date, language)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {item.detail}
                      </p>
                      <span className="mt-4 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                         {spanish ? "Todavía no hay una fuente vinculada" : "No linked source yet"}
                      </span>
                    </article>
                  ),
                )}
            </div>
          </SectionShell>

          <SectionShell
            eyebrow={spanish ? "Notas" : "Notes"}
            id="notes"
            title={spanish ? "Notas del espacio que requieren atención" : "Workspace notes that need attention"}
          >
            <div className="space-y-3">
              {notes.length === 0
                ? emptyState({
                    title: spanish ? "Todavía no se han guardado notas." : "No notes have been captured yet.",
                    body: spanish
                      ? "Las notas aparecerán aquí cuando el espacio comience a registrar solicitudes, aprobaciones o elementos de atención."
                      : "Notes will appear here once the workspace starts logging requests, approvals, or attention items.",
                  })
                : notes.slice(0, 5).map((item) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                            {spanish ? "nota" : "note"}
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-950">
                            {item.title}
                          </h4>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800">
                           {item.attentionRequested
                             ? spanish ? "atención" : "attention"
                             : spanish ? "referencia" : "reference"}
                        </span>
                      </div>
                      {item.body ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {item.body}
                        </p>
                      ) : null}
                    </article>
                  ))}
            </div>
          </SectionShell>

        </div>
      </section>
    </div>
  );
}
