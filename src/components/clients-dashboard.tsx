import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { ClientQTimeDashboard } from "@/components/client-qtime-dashboard";
import { ClientCalendar } from "@/components/clients-calendar";
import { ProspectDeleteDialog } from "@/components/prospect-delete-dialog";
import {
  completeSalesFollowUp,
  convertSalesProspectToClient,
  createSalesProspect,
  logSalesFollowUp,
  updateSalesProspect,
} from "@/server/sales/actions";
import type { OrganizationSummary } from "@/server/organizations/queries";
import type { ClientDashboardData } from "@/server/client-dashboard/queries";
import type { ClientWorkspaceContext } from "@/server/client-workspace/context";
import type { SalesEvent, SalesProspect } from "@/server/sales/queries";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { SiteLanguage } from "@/lib/site-language";

type StageFocus =
  | "researching"
  | "review_ready"
  | "approved_for_outreach"
  | "contacted"
  | "replied"
  | "proposal_sent"
  | "won";

type ClientsDashboardProps = {
  organizations: OrganizationSummary[];
  previewOrganization: OrganizationSummary | null;
  previewWorkspace: ClientWorkspaceContext | null;
  previewDashboard: ClientDashboardData | null;
  prospects: SalesProspect[];
  events: SalesEvent[];
  focusStage: string;
  selectedPanel: string;
  returnTo: string;
};

function humanize(value: string, spanish = false) {
  if (!spanish) return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    approved_for_outreach: "aprobado para contacto",
    blocked: "bloqueado",
    completed: "completado",
    contacted: "contactado",
    disqualified: "descalificado",
    duplicate: "duplicado",
    failed: "falló",
    lost: "perdido",
    new: "nuevo",
    proposal_sent: "propuesta enviada",
    qualified: "calificado",
    replied: "respondió",
    researching: "investigando",
    review_ready: "listo para revisión",
    won: "ganado",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function titleCase(value: string, spanish = false) {
  const humanized = humanize(value, spanish);
  return humanized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isOpenProspect(status: SalesProspect["status"]) {
  return !["won", "lost", "disqualified", "duplicate"].includes(status);
}

function isStageFocus(value: string): value is StageFocus {
  return [
    "researching",
    "review_ready",
    "approved_for_outreach",
    "contacted",
    "replied",
    "proposal_sent",
    "won",
  ].includes(value as StageFocus);
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInput(value: string | null) {
  return value ? toLocalDateKey(value) : "";
}

function toTimeInput(value: string | null) {
  if (!value) return "09:00";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getHealthBand(prospect: SalesProspect) {
  const score = prospect.fitScore ?? 0;
  if (prospect.status === "won") return "hot";
  if (prospect.status === "lost" || prospect.status === "disqualified") return "cold";
  if (score >= 75 || ["approved_for_outreach", "contacted", "replied", "proposal_sent"].includes(prospect.status)) {
    return "hot";
  }
  if (score >= 50) return "warm";
  return "cold";
}

function statusTone(value: string) {
  if (value === "won" || value === "approved" || value === "completed") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (value === "lost" || value === "blocked" || value === "disqualified" || value === "failed") {
    return "bg-rose-100 text-rose-800";
  }
  if (value === "review_ready" || value === "follow_up_queued" || value === "approved_for_outreach") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-slate-100 text-slate-700";
}

function healthTone(value: "hot" | "warm" | "cold") {
  if (value === "hot") return "bg-rose-100 text-rose-800";
  if (value === "warm") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function formatShortDate(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatClock(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isSameDay(left: string, right: Date) {
  const leftDate = new Date(left);
  return (
    leftDate.getFullYear() === right.getFullYear() &&
    leftDate.getMonth() === right.getMonth() &&
    leftDate.getDate() === right.getDate()
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function buildDailySeries(rows: Array<{ occurredAt: string }>, days: number, language: SiteLanguage) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const start = end - (days - 1) * 24 * 60 * 60 * 1000;
  const slots = Array.from({ length: days }, (_, index) => ({
    label: new Date(start + index * 24 * 60 * 60 * 1000).toLocaleDateString(language === "es" ? "es-US" : "en-US", {
      day: "numeric",
    }),
    value: 0,
  }));

  rows.forEach((row) => {
    const date = new Date(row.occurredAt).getTime();
    if (!date || date < start || date > end + 24 * 60 * 60 * 1000) {
      return;
    }

    const slotIndex = Math.min(
      slots.length - 1,
      Math.max(0, Math.floor((date - start) / (24 * 60 * 60 * 1000))),
    );

    slots[slotIndex].value += 1;
  });

  return slots;
}

function chartBars({
  items,
}: {
  items: Array<{ label: string; value: number; tone?: string; href: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <Link
          className="group rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-[#5672f0] hover:bg-white"
          href={item.href}
          key={item.label}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-slate-950">{item.value}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div
              className={`h-full rounded-full ${item.tone ?? "bg-[#5672f0]"}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0)}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href: string;
}) {
  return (
    <Link
      className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-[#5672f0] hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)]"
      href={href}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
        {value}
      </p>
      {note ? <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p> : null}
    </Link>
  );
}

function StatusBanner({
  tone,
  title,
  body,
}: {
  tone: "emerald" | "amber" | "rose" | "blue";
  title: string;
  body: string;
}) {
  const classes = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${classes[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  );
}

function StageFocusPanel({
  focusStage,
  prospects,
  events,
  language,
}: {
  focusStage: StageFocus;
  prospects: SalesProspect[];
  events: SalesEvent[];
  language: SiteLanguage;
}) {
  const spanish = language === "es";
  const now = new Date();
  const recentCutoff = addDays(startOfDay(now), -3).getTime();
  const dateLabel = new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const stageProspects =
    focusStage === "researching"
      ? prospects.filter((prospect) => prospect.status === "researching")
      : focusStage === "review_ready"
        ? prospects.filter((prospect) => prospect.status === "review_ready")
        : focusStage === "approved_for_outreach"
          ? prospects.filter((prospect) => prospect.status === "approved_for_outreach")
          : focusStage === "contacted"
            ? prospects.filter(
                (prospect) =>
                  prospect.status === "contacted" &&
                  prospect.lastContactedAt &&
                  new Date(prospect.lastContactedAt).getTime() >= recentCutoff,
              )
            : focusStage === "replied"
              ? prospects.filter(
                  (prospect) => prospect.status === "replied" && Boolean(prospect.nextActionAt),
                )
              : focusStage === "proposal_sent"
                ? prospects.filter(
                    (prospect) =>
                      prospect.status === "proposal_sent" && Boolean(prospect.nextActionAt),
                  )
                : prospects.filter((prospect) => prospect.status === "won");

  const description =
    focusStage === "researching"
      ? spanish ? "Prospectos marcados actualmente como en investigación en los datos guardados del CRM." : "Prospects currently marked researching in the stored CRM data."
      : focusStage === "review_ready"
        ? spanish ? "Prospectos listos para revisión humana." : "Prospects marked review_ready, ready for human review."
        : focusStage === "approved_for_outreach"
          ? spanish ? "Prospectos que tienen registrada una aprobación para contacto." : "Prospects that have an outreach approval recorded."
          : focusStage === "contacted"
            ? spanish ? "Prospectos contactados durante los últimos tres días. Se consideran leads calientes." : "Contacted prospects from the last three days. These are treated as hot leads."
            : focusStage === "replied"
              ? spanish ? "Prospectos con una respuesta guardada y un próximo horario de seguimiento." : "Prospects with a stored reply and a next follow-up time."
              : focusStage === "proposal_sent"
                ? spanish ? "Prospectos con propuesta enviada que pasan a la cola de seguimiento." : "Proposal-sent prospects flowing into the follow-up queue."
                : spanish ? "Registros ganados con actividad reciente y una vista breve de tendencia." : "Won records with recent activity and a short trend view.";

  const winTrend =
    focusStage === "won"
      ? chartBars({
          items: buildDailySeries(
            events.filter((event) => stageProspects.some((prospect) => prospect.id === event.prospectId)),
            7,
            language,
          ).map((slot, index) => ({
            label: slot.label,
            value: slot.value,
            tone: "bg-emerald-500",
            href: "#activity",
          })),
        })
      : null;

  return (
    <section
      className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
      id="stage-lens"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            {spanish ? "Enfoque del pipeline" : "Pipeline focus"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            {titleCase(focusStage, spanish)}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {stageProspects.length} {spanish ? "registros" : "records"}
        </span>
      </div>

      {focusStage === "proposal_sent" ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            {spanish ? "La fortuna está en el seguimiento." : "The fortune is in the follow-up."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {spanish
              ? "Los registros con propuesta enviada se muestran aquí porque alimentan la cola de seguimiento."
              : "Proposal-sent records are shown here because they feed the follow-up queue."}
          </p>
        </div>
      ) : null}

      {focusStage === "won" && winTrend ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {spanish ? "Tendencia de ganados" : "Won trend"}
          </p>
          <div className="mt-3">{winTrend}</div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {stageProspects.length === 0 ? (
          <StatusBanner
            body={spanish ? "Ningún prospecto coincide con este filtro de etapa en los datos actuales." : "No prospects match this stage filter in the current dataset."}
            title={spanish ? "Sin registros coincidentes" : "No matching records"}
            tone="amber"
          />
        ) : (
          stageProspects.slice(0, 6).map((prospect) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={prospect.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                    {humanize(prospect.status, spanish)}
                  </p>
                  <h4 className="mt-2 text-sm font-semibold text-slate-950">
                    {prospect.businessName}
                  </h4>
                </div>
                <Link
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  href={`/lions-den/sales/${prospect.id}`}
                >
                  {spanish ? "Abrir" : "Open"}
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {prospect.fitReason ?? prospect.researchSummary ?? prospect.nextAction ?? (spanish ? "No se guardaron notas adicionales." : "No extra notes captured.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${healthTone(getHealthBand(prospect))}`}>
                  {{ hot: spanish ? "caliente" : "hot", warm: spanish ? "tibio" : "warm", cold: spanish ? "frío" : "cold" }[getHealthBand(prospect)]}
                </span>
                {prospect.nextActionAt ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 ring-1 ring-slate-200">
                    {dateLabel.format(new Date(prospect.nextActionAt))}
                  </span>
                ) : null}
                {prospect.approvedChannels.length > 0 ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 ring-1 ring-slate-200">
                    {prospect.approvedChannels.join(", ")}
                  </span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {focusStage === "contacted" ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {spanish
            ? "Se consideran leads calientes porque fueron contactados durante los últimos tres días."
            : "These are treated as hot leads because they were contacted within the last three days."}
        </p>
      ) : null}
    </section>
  );
}

export async function ClientCrmDashboard({
  organizations,
  previewOrganization,
  previewWorkspace,
  previewDashboard,
  prospects,
  events,
  focusStage,
  selectedPanel,
  returnTo,
}: ClientsDashboardProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const openProspects = prospects.filter((prospect) => isOpenProspect(prospect.status));
  const activeFocusStage = isStageFocus(focusStage) ? focusStage : null;
  const sortedProspects = [...prospects].sort((left, right) => {
    const leftTime = left.nextActionAt ? new Date(left.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.nextActionAt ? new Date(right.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime;
  });
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  const followUpItems = openProspects
    .filter((prospect) => prospect.nextActionAt)
    .map((prospect) => ({
      prospect,
      date: new Date(prospect.nextActionAt!),
    }))
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  const overdue = followUpItems.filter((item) => item.date.getTime() < today.getTime());
  const todayQueue = followUpItems.filter((item) => isSameCalendarDay(item.date, today));
  const tomorrowQueue = followUpItems.filter((item) => isSameCalendarDay(item.date, tomorrow));
  const laterQueue = followUpItems.filter(
    (item) => item.date.getTime() >= addDays(tomorrow, 1).getTime(),
  );

  const healthCounts = prospects.reduce(
    (counts, prospect) => {
      counts[getHealthBand(prospect)] += 1;
      return counts;
    },
    { hot: 0, warm: 0, cold: 0 },
  );

  const recentWindow = addDays(today, -3);
  const researchingProspects = prospects.filter((prospect) => prospect.status === "researching");
  const reviewReadyProspects = prospects.filter((prospect) => prospect.status === "review_ready");
  const approvedOutreachProspects = prospects.filter(
    (prospect) => prospect.status === "approved_for_outreach",
  );
  const contactedProspects = prospects.filter(
    (prospect) =>
      prospect.status === "contacted" &&
      prospect.lastContactedAt &&
      new Date(prospect.lastContactedAt).getTime() >= recentWindow.getTime(),
  );
  const repliedProspects = prospects.filter(
    (prospect) => prospect.status === "replied" && Boolean(prospect.nextActionAt),
  );
  const proposalSentProspects = prospects.filter(
    (prospect) => prospect.status === "proposal_sent" && Boolean(prospect.nextActionAt),
  );
  const wonProspects = prospects.filter((prospect) => prospect.status === "won");
  const wonProspectIds = new Set(wonProspects.map((prospect) => prospect.id));
  const wonActivity = events.filter((event) => wonProspectIds.has(event.prospectId));
  const wonTrend = buildDailySeries(wonActivity, 7, language).map((slot, index) => ({
    label: `${spanish ? "Día" : "Day"} ${index + 1}`,
    value: slot.value,
    tone: "bg-emerald-500",
    href: "#activity",
  }));

  const pipelineStages = [
    {
      key: "researching",
      label: spanish ? "Investigando" : "Researching",
      value: researchingProspects.length,
      tone: "bg-[#5672f0]",
    },
    {
      key: "review_ready",
      label: spanish ? "Listo para revisión" : "Review Ready",
      value: reviewReadyProspects.length,
      tone: "bg-sky-500",
    },
    {
      key: "approved_for_outreach",
      label: spanish ? "Contacto aprobado" : "Approved Outreach",
      value: approvedOutreachProspects.length,
      tone: "bg-blue-500",
    },
    {
      key: "contacted",
      label: spanish ? "Contactado" : "Contacted",
      value: contactedProspects.length,
      tone: "bg-cyan-500",
    },
    {
      key: "replied",
      label: spanish ? "Respondió" : "Replied",
      value: repliedProspects.length,
      tone: "bg-amber-500",
    },
    {
      key: "proposal_sent",
      label: spanish ? "Propuesta enviada" : "Proposal Sent",
      value: proposalSentProspects.length,
      tone: "bg-violet-500",
    },
    { key: "won", label: spanish ? "Ganado" : "Won", value: wonProspects.length, tone: "bg-emerald-500" },
  ].map((stage) => ({
    label: stage.label,
    value: stage.value,
    tone: stage.tone,
    href: `/client?focus=${stage.key}#stage-lens`,
  }));

  const followUpHealth = [
    { label: spanish ? "Atrasado" : "Overdue", value: overdue.length, tone: "bg-rose-500" },
    { label: spanish ? "Hoy" : "Today", value: todayQueue.length, tone: "bg-[#5672f0]" },
    { label: spanish ? "Mañana" : "Tomorrow", value: tomorrowQueue.length, tone: "bg-emerald-500" },
    { label: spanish ? "Después" : "Later", value: laterQueue.length, tone: "bg-slate-400" },
  ];

  const activitySeries = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, -6 + index);
    const count = events.filter((event) => isSameCalendarDay(new Date(event.occurredAt), date)).length;
    return {
      label: new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", { weekday: "short" }).format(date),
      value: count,
      tone: "bg-cyan-500",
      href: "#activity",
    };
  });

  const approvalsQueue = sortedProspects.filter((prospect) =>
    ["review_ready", "approved_for_outreach"].includes(prospect.status),
  );
  const qtimeOrganization = organizations.find((org) => org.slug === "qtime-productions") ?? null;
  const qtimeWorkspace = previewWorkspace?.isClientPreview ? previewWorkspace : null;
  const qtimeDashboard = qtimeWorkspace && previewDashboard ? previewDashboard : null;
  const qtimePreviewActive = selectedPanel === "qtime" && previewOrganization?.slug === "qtime-productions";
  const qtimeCommandCenter =
    qtimeOrganization && qtimeWorkspace && qtimeDashboard ? (
      <section id="qtime-command-center">
        <ClientQTimeDashboard workspace={qtimeWorkspace} dashboard={qtimeDashboard} />
      </section>
    ) : null;

  const contextOptions = [
    ...sortedProspects.map((prospect) => ({
      id: `prospect:${prospect.id}`,
      label: prospect.businessName,
      href: `/lions-den/sales/${prospect.id}`,
    })),
    ...organizations.map((organization) => ({
      id: `organization:${organization.id}`,
      label: organization.name,
      href: organization.slug ? `/client?previewOrg=${encodeURIComponent(organization.slug)}` : "/client",
    })),
  ];

  const calendarItems = followUpItems.map((item) => ({
    id: `follow-up-${item.prospect.id}-${item.date.toISOString()}`,
    title: item.prospect.nextAction ?? `${item.prospect.businessName} ${spanish ? "seguimiento" : "follow-up"}`,
    notes: item.prospect.fitReason ?? item.prospect.researchSummary ?? (spanish ? "Seguimiento del CRM desde el espacio activo" : "CRM follow-up from the live workspace"),
    dateTime: item.prospect.nextActionAt!,
    reminderOffsetMinutes: 120,
    kind: "task" as const,
    contextId: `prospect:${item.prospect.id}`,
    contextLabel: item.prospect.businessName,
    contextHref: `/lions-den/sales/${item.prospect.id}`,
    source: "follow-up" as const,
  }));

  const visibleActivity = events.slice(0, 10);

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
            ATLAS CRM
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
            {spanish ? "Gestor de Relaciones con Clientes" : "Customer Relations Manager"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {spanish
              ? `${organizations.length} clientes, ${openProspects.length} prospectos abiertos, una superficie de mando activa.`
              : `${organizations.length} clients, ${openProspects.length} open prospects, one live command surface.`}
          </p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-slate-200">
            <p className="font-semibold text-white">
              {qtimeOrganization ? qtimeOrganization.name : "QTime Productions"}
            </p>
            <p className="mt-1">
              {qtimeOrganization
                ? spanish ? "Cargado desde los registros locales del CRM." : "Loaded from local CRM records."
                : spanish ? "La configuración local de la organización está pendiente." : "Local organization seed pending."}
            </p>
          </div>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#f5b932] px-4 text-center text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]"
            href="/client?previewOrg=sis-custom-creations"
          >
            {spanish ? "Abrir Lion’s Den (SIS Custom Creations)" : "Open Lion's Den (SIS Custom Creations)"}
          </Link>
        </div>

        <nav aria-label={spanish ? "Navegación del CRM" : "CRM navigation"} className="mt-4 space-y-2">
          {[
            [spanish ? "Resumen" : "Overview", "#overview", String(organizations.length)],
            [spanish ? "Clientes" : "Clients", "#clients", String(organizations.length)],
            [spanish ? "Prospectos" : "Prospects", "#prospects", String(openProspects.length)],
            [spanish ? "Fechas de seguimiento" : "Follow-up Dates", "#follow-up-dates", String(followUpItems.length)],
            [spanish ? "Calendario" : "Calendar", "#calendar", String(calendarItems.length)],
            [spanish ? "Aprobaciones" : "Approvals", "#approvals", String(approvalsQueue.length)],
            [spanish ? "Actividad" : "Activity", "/client?panel=activity#activity", String(visibleActivity.length)],
          ].map(([label, href, value]) =>
            String(href).startsWith("#") ? (
              <a
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href={String(href)}
                key={String(label)}
              >
                <span>{label}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
                  {value}
                </span>
              </a>
            ) : (
              <Link
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href={String(href)}
                key={String(label)}
              >
                <span>{label}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
                  {value}
                </span>
              </Link>
            ),
          )}
        </nav>
      </aside>

      <main className="space-y-6">
        {qtimeCommandCenter}

        <section
          className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
          id="overview"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
                {spanish ? "La fortuna está en el seguimiento." : "The fortune is in the follow-up."}
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#071b42] px-5 text-sm font-black text-[#f5b932] transition hover:bg-[#0a2659]"
              href="/client?previewOrg=sis-custom-creations"
            >
              {spanish ? "Abrir Lion’s Den (SIS Custom Creations)" : "Open Lion's Den (SIS Custom Creations)"}
            </Link>
          </div>
          {!qtimePreviewActive ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:min-w-[22rem]">
              <MetricCard
                href="#clients"
                label={spanish ? "Clientes" : "Clients"}
                value={String(organizations.length)}
              />
              <MetricCard
                href="#prospects"
                label={spanish ? "Prospectos abiertos" : "Open prospects"}
                value={String(openProspects.length)}
                note={spanish ? "Pipeline activo." : "Active pipeline."}
              />
              <MetricCard
                href="#follow-up-dates"
                label={spanish ? "Para hoy" : "Due today"}
                value={String(todayQueue.length + overdue.length)}
                note={spanish ? "Requiere atención ahora." : "Needs attention now."}
              />
              <MetricCard
                href="#approvals"
                label={spanish ? "Aprobaciones" : "Approvals"}
                value={String(approvalsQueue.length)}
                note={spanish ? "En espera de revisión." : "Waiting for review."}
              />
            </div>
          ) : null}
          {activeFocusStage ? (
            <div className="mt-5">
              <StageFocusPanel
                events={events}
                focusStage={activeFocusStage}
                language={language}
                prospects={prospects}
              />
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                    Pipeline
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                    {spanish ? "Distribución por etapa" : "Stage mix"}
                  </h3>
                </div>
                <Link
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  href="#prospects"
                >
                  {spanish ? "Prospectos abiertos" : "Open prospects"}
                </Link>
              </div>
              <div className="mt-4">{chartBars({ items: pipelineStages })}</div>
            </article>

            <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                    {spanish ? "Estado del seguimiento" : "Follow-up health"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                    {spanish ? "Caliente, tibio, frío" : "Hot, warm, cold"}
                  </h3>
                </div>
                <Link
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  href="#follow-up-dates"
                >
                  {spanish ? "Cola" : "Queue"}
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  { key: "hot", label: spanish ? "Caliente" : "Hot", value: healthCounts.hot, tone: "bg-rose-500" },
                  { key: "warm", label: spanish ? "Tibio" : "Warm", value: healthCounts.warm, tone: "bg-amber-500" },
                  { key: "cold", label: spanish ? "Frío" : "Cold", value: healthCounts.cold, tone: "bg-slate-400" },
                ].map((item) => (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={item.label}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {item.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${healthTone(item.key as "hot" | "warm" | "cold")}`}>
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      <div
                        className={`h-full rounded-full ${item.tone}`}
                        style={{
                          width: `${Math.max((item.value / Math.max(healthCounts.hot + healthCounts.warm + healthCounts.cold, 1)) * 100, item.value > 0 ? 6 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                    {spanish ? "Actividad" : "Activity"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                    {spanish ? "Últimos 7 días" : "Last 7 days"}
                  </h3>
                </div>
              <a
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                href="#activity"
              >
                {spanish ? "Cronología" : "Timeline"}
              </a>
              </div>
              <div className="mt-4">{chartBars({ items: activitySeries })}</div>
            </article>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]" id="clients">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                {spanish ? "Clientes" : "Clients"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {spanish ? "Clientes" : "Clients"}
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {organizations.length} {spanish ? "registros" : "records"}
            </span>
          </div>

          {organizations.length === 0 ? (
            <StatusBanner
              body={spanish ? "No hay registros de organizaciones disponibles en el espacio actual." : "No organization records are available in the current workspace."}
              title={spanish ? "Lista de clientes vacía" : "Client list empty"}
              tone="amber"
            />
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {organizations.map((organization) => {
                const highlight = organization.slug === "qtime-productions";
                return (
                  <article
                    className={`rounded-2xl border p-4 transition ${
                      highlight
                        ? "border-[#5672f0] bg-[#eef3ff]"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                    key={organization.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                          {spanish ? "Cliente" : "Client"}
                        </p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-950">
                          {organization.name}
                        </h4>
                        {organization.slug ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {spanish ? "Identificador" : "Slug"}: {organization.slug}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {highlight ? (
                          <span className="rounded-full bg-[#5672f0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                            QTime
                          </span>
                        ) : null}
                        {organization.slug ? (
                          <Link
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                            href={
                              organization.slug === "qtime-productions"
                                ? `/client?previewOrg=${encodeURIComponent(organization.slug)}&panel=qtime#qtime-command-center`
                                : `/client?previewOrg=${encodeURIComponent(organization.slug)}`
                            }
                          >
                            {organization.slug === "sis-custom-creations"
                              ? spanish
                                ? "Abrir Lion’s Den"
                                : "Open Lion's Den"
                              : spanish
                                ? "Vista previa"
                                : "Preview"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {spanish ? "Creado" : "Created"} {formatDateTime(organization.createdAt)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]" id="prospects">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                {spanish ? "Prospectos" : "Prospects"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {spanish ? "Agregar, editar, registrar, completar y convertir" : "Add, edit, log, complete, and convert"}
              </h3>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              {spanish ? "Sin envíos salientes" : "No outbound sending"}
            </span>
          </div>

          <form action={createSalesProspect} className="mt-5 grid gap-4 sm:grid-cols-2">
            <input name="returnTo" type="hidden" value={returnTo} />
            <Field label={spanish ? "Nombre del negocio" : "Business name"} name="businessName" required />
            <Field label={spanish ? "Industria" : "Industry"} name="industry" placeholder={spanish ? "Servicios para el hogar, fitness, eventos..." : "Home services, fitness, events..."} />
            <Field label={spanish ? "Ciudad" : "City"} name="city" />
            <Field label={spanish ? "Estado / región" : "State / region"} name="region" placeholder="TX" />
            <Field label={spanish ? "Sitio web" : "Website"} name="website" placeholder="example.com" />
            <Field label={spanish ? "URL de fuente pública" : "Public source URL"} name="sourceUrl" placeholder="https://example.com/contact" />
            <Field label={spanish ? "Nombre del contacto" : "Contact name"} name="contactName" />
            <Field label={spanish ? "Correo del negocio" : "Business email"} name="contactEmail" type="email" />
            <Field label={spanish ? "Teléfono del negocio" : "Business phone"} name="contactPhone" type="tel" />
            <Field label={spanish ? "Perfil social" : "Social profile"} name="socialMedia" />
              <SelectField
                defaultValue="public_business_contact"
                label={spanish ? "Base de contacto" : "Contact basis"}
                name="contactBasis"
                options={[
                  ["public_business_contact", spanish ? "Contacto comercial público" : "Public business contact"],
                  ["referral", spanish ? "Referencia" : "Referral"],
                  ["prior_relationship", spanish ? "Relación previa" : "Prior relationship"],
                  ["inbound_consent", spanish ? "Consentimiento entrante" : "Inbound consent"],
                  ["customer", spanish ? "Cliente actual" : "Current customer"],
                  ["unknown", spanish ? "Aún no verificado" : "Not verified yet"],
                ]}
              />
            <button
              className="rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#465fd1] sm:col-span-2"
              type="submit"
            >
              {spanish ? "Agregar prospecto" : "Add prospect"}
            </button>
          </form>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {sortedProspects.length === 0 ? (
              <StatusBanner
                body={spanish ? "La lista de prospectos está vacía. Agrega el primer negocio arriba para iniciar el flujo." : "The prospect list is empty. Add the first business above to start the workflow."}
                title={spanish ? "Todavía no hay prospectos" : "No prospects yet"}
                tone="amber"
              />
            ) : (
              sortedProspects.map((prospect) => {
                const health = getHealthBand(prospect);
                const converted = prospect.convertedOrganizationId
                  ? organizations.find((organization) => organization.id === prospect.convertedOrganizationId) ?? null
                  : null;

                return (
                  <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4" key={prospect.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-slate-950">
                            {prospect.businessName}
                          </h4>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone(prospect.status)}`}>
                            {humanize(prospect.status, spanish)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${healthTone(health)}`}>
                            {{ hot: spanish ? "caliente" : "hot", warm: spanish ? "tibio" : "warm", cold: spanish ? "frío" : "cold" }[health]}
                          </span>
                          {converted ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                              {spanish ? "Convertido en" : "Converted to"} {converted.name}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {prospect.industry ?? (spanish ? "Industria no guardada" : "Industry not captured")}
                          {prospect.city ? ` · ${prospect.city}${prospect.region ? `, ${prospect.region}` : ""}` : ""}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {spanish ? "Próxima acción" : "Next action"}: {prospect.nextAction ?? (spanish ? "Aún no programada" : "Not scheduled yet")}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {prospect.nextActionAt ? formatDateTime(prospect.nextActionAt) : spanish ? "Sin fecha de seguimiento" : "No follow-up date"}
                        </p>
                      </div>
                      <Link
                        className="w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        href={`/lions-den/sales/${prospect.id}`}
                      >
                        {spanish ? "Abrir registro" : "Open record"}
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <details open className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                          {spanish ? "Editar prospecto" : "Edit prospect"}
                        </summary>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {spanish ? "Editando" : "Editing"} {prospect.businessName}
                          </p>
                          <ProspectDeleteDialog
                            prospectId={prospect.id}
                            prospectName={prospect.businessName}
                            returnTo={returnTo}
                          />
                        </div>
                        <form action={updateSalesProspect} className="mt-4 grid gap-4 sm:grid-cols-2">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <Field defaultValue={prospect.businessName} label={spanish ? "Nombre del negocio" : "Business name"} name="businessName" required />
                          <Field defaultValue={prospect.industry} label={spanish ? "Industria" : "Industry"} name="industry" />
                          <Field defaultValue={prospect.addressLine1} label={spanish ? "Dirección" : "Address"} name="addressLine1" />
                          <Field defaultValue={prospect.city} label={spanish ? "Ciudad" : "City"} name="city" />
                          <Field defaultValue={prospect.region} label={spanish ? "Estado / región" : "State / region"} name="region" />
                          <Field defaultValue={prospect.postalCode} label={spanish ? "Código postal" : "Postal code"} name="postalCode" />
                          <Field defaultValue={prospect.website} label={spanish ? "Sitio web" : "Website"} name="website" />
                          <Field defaultValue={prospect.contactName} label={spanish ? "Nombre del contacto" : "Contact name"} name="contactName" />
                          <Field defaultValue={prospect.contactEmail} label={spanish ? "Correo del negocio" : "Business email"} name="contactEmail" type="email" />
                          <Field defaultValue={prospect.contactPhone} label={spanish ? "Teléfono del negocio" : "Business phone"} name="contactPhone" type="tel" />
                          <Field defaultValue={prospect.socialMedia} label={spanish ? "Redes sociales" : "Social media"} name="socialMedia" />
                          <Field defaultValue={String(prospect.fitScore ?? "")} label={spanish ? "Puntuación de afinidad" : "Fit score"} name="fitScore" type="number" />
                          <SelectField
                            defaultValue={prospect.status}
                            label={spanish ? "Estado" : "Status"}
                            name="status"
                            options={[
                              ["new", spanish ? "Nuevo" : "New"],
                              ["researching", spanish ? "Investigando" : "Researching"],
                              ["review_ready", spanish ? "Listo para revisión" : "Review ready"],
                              ["approved_for_outreach", spanish ? "Aprobado para contacto" : "Approved for outreach"],
                              ["contacted", spanish ? "Contactado" : "Contacted"],
                              ["replied", spanish ? "Respondió" : "Replied"],
                              ["qualified", spanish ? "Calificado" : "Qualified"],
                              ["proposal_sent", spanish ? "Propuesta enviada" : "Proposal sent"],
                              ["won", spanish ? "Ganado" : "Won"],
                              ["lost", spanish ? "Perdido" : "Lost"],
                              ["disqualified", spanish ? "Descalificado" : "Disqualified"],
                              ["duplicate", spanish ? "Duplicado" : "Duplicate"],
                            ]}
                          />
                          <SelectField
                            defaultValue={prospect.assignedRole}
                            label={spanish ? "Responsable asignado" : "Assigned owner"}
                            name="assignedRole"
                            options={[
                              ["manny", "Manny"],
                              ["atlas", "Atlas"],
                              ["hunter", "Hunter"],
                              ["micah", "Micah"],
                              ["david", "David"],
                            ]}
                          />
                          <Field defaultValue={toDateInput(prospect.nextActionAt)} label={spanish ? "Fecha de próxima acción" : "Next action date"} name="nextActionDate" type="date" />
                          <Field defaultValue={toTimeInput(prospect.nextActionAt)} label={spanish ? "Hora de próxima acción" : "Next action time"} name="nextActionTime" type="time" />
                          <Field defaultValue="120" label={spanish ? "Minutos de anticipación" : "Reminder offset minutes"} name="reminderOffsetMinutes" type="number" />
                          <textarea
                            className="sm:col-span-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                            defaultValue={prospect.fitReason ?? ""}
                            name="fitReason"
                            placeholder={spanish ? "Por qué este negocio podría encajar" : "Why this business may fit"}
                          />
                          <textarea
                            className="sm:col-span-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                            defaultValue={prospect.researchSummary ?? ""}
                            name="researchSummary"
                            placeholder={spanish ? "Resumen de investigación" : "Research summary"}
                          />
                          <textarea
                            className="sm:col-span-2 min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                            defaultValue={prospect.nextAction ?? ""}
                            name="nextAction"
                            placeholder={spanish ? "Próxima acción" : "Next action"}
                          />
                          <button
                            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
                            type="submit"
                          >
                            {spanish ? "Guardar prospecto" : "Save prospect"}
                          </button>
                        </form>
                      </details>

                      <details open className="rounded-2xl border border-slate-200 bg-white p-4">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                          {spanish ? "Registrar seguimiento" : "Log follow-up"}
                        </summary>
                        <form action={logSalesFollowUp} className="mt-4 grid gap-3">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <Field defaultValue={spanish ? "Seguimiento registrado" : "Follow-up logged"} label={spanish ? "Resumen" : "Summary"} name="summary" />
                          <Field defaultValue={prospect.nextAction ?? ""} label={spanish ? "Próxima acción" : "Next action"} name="nextAction" />
                          <Field defaultValue={toDateInput(prospect.nextActionAt)} label={spanish ? "Fecha límite" : "Due date"} name="nextActionDate" type="date" />
                          <Field defaultValue={toTimeInput(prospect.nextActionAt)} label={spanish ? "Hora límite" : "Due time"} name="nextActionTime" type="time" />
                          <Field defaultValue="120" label={spanish ? "Minutos de anticipación" : "Reminder offset minutes"} name="reminderOffsetMinutes" type="number" />
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                            defaultValue=""
                            name="note"
                            placeholder={spanish ? "Registra la llamada, nota o próxima tarea" : "Log the call, note, or next task"}
                          />
                          <button className="rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#465fd1]" type="submit">
                            {spanish ? "Registrar seguimiento" : "Log follow-up"}
                          </button>
                        </form>
                      </details>

                      <details open className="rounded-2xl border border-slate-200 bg-white p-4">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                          {spanish ? "Completar seguimiento" : "Complete follow-up"}
                        </summary>
                        <form action={completeSalesFollowUp} className="mt-4 grid gap-3">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <Field defaultValue={spanish ? "Seguimiento completado" : "Follow-up completed"} label={spanish ? "Resumen" : "Summary"} name="summary" />
                          <Field defaultValue={prospect.nextAction ?? ""} label={spanish ? "Próxima acción" : "Next action"} name="nextAction" />
                          <Field defaultValue={toDateInput(prospect.nextActionAt)} label={spanish ? "Próxima fecha límite" : "Next due date"} name="nextActionDate" type="date" />
                          <Field defaultValue={toTimeInput(prospect.nextActionAt)} label={spanish ? "Próxima hora límite" : "Next due time"} name="nextActionTime" type="time" />
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                            defaultValue=""
                            name="note"
                            placeholder={spanish ? "Qué ocurrió en la llamada o respuesta" : "What happened on the call or reply"}
                          />
                          <button className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800" type="submit">
                            {spanish ? "Completar seguimiento" : "Complete follow-up"}
                          </button>
                        </form>
                      </details>

                      <details open className="rounded-2xl border border-slate-200 bg-white p-4">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                          {spanish ? "Convertir en cliente" : "Convert to client"}
                        </summary>
                        <form action={convertSalesProspectToClient} className="mt-4 grid gap-3">
                          <input name="prospectId" type="hidden" value={prospect.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <SelectField
                            defaultValue={prospect.convertedOrganizationId ?? organizations[0]?.id ?? ""}
                            label={spanish ? "Cliente de destino" : "Target client"}
                            name="targetOrganizationId"
                            options={organizations.map((organization) => [organization.id, organization.name])}
                          />
                          <button
                            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            type="submit"
                          >
                            {spanish ? "Vincular al cliente" : "Link to client"}
                          </button>
                        </form>
                      </details>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]" id="follow-up-dates">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
            {spanish ? "Fechas de seguimiento" : "Follow-up Dates"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            {spanish ? "La fortuna está en el seguimiento." : "The fortune is in the follow-up."}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {spanish
              ? "Hoy y mañana permanecen al principio de la cola, con el estado caliente, tibio y frío visible para que el próximo movimiento sea claro."
              : "Today and tomorrow stay on top of the queue, with hot, warm, and cold state visible so the next move is obvious."}
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <QueueColumn
              items={todayQueue}
              label={spanish ? "Hoy" : "Today"}
              language={language}
              tone="bg-[#eef3ff]"
              emptyText={spanish ? "No hay seguimientos programados para hoy." : "No follow-ups are due today."}
            />
            <QueueColumn
              items={tomorrowQueue}
              label={spanish ? "Mañana" : "Tomorrow"}
              language={language}
              tone="bg-emerald-50"
              emptyText={spanish ? "No hay seguimientos en cola para mañana." : "No follow-ups are queued for tomorrow."}
            />
          </div>
        </section>

        {!qtimePreviewActive ? (
          <section id="calendar">
            <ClientCalendar contextOptions={contextOptions} followUpItems={calendarItems} />
          </section>
        ) : null}

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]" id="approvals">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                {spanish ? "Aprobaciones" : "Approvals"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                {spanish ? "Cola de revisión y estado de contacto" : "Review queue and outreach state"}
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {approvalsQueue.length} {spanish ? "elementos" : "items"}
            </span>
          </div>

          {approvalsQueue.length === 0 ? (
            <StatusBanner
              body={spanish ? "Nada necesita aprobación en este momento." : "Nothing needs approval right now."}
              title={spanish ? "Cola de aprobación despejada" : "Approval queue clear"}
              tone="emerald"
            />
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {approvalsQueue.map((prospect) => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={prospect.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                        {humanize(prospect.status, spanish)}
                      </p>
                      <h4 className="mt-2 text-base font-semibold text-slate-950">
                        {prospect.businessName}
                      </h4>
                    </div>
                    <Link
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                      href={`/lions-den/sales/${prospect.id}`}
                    >
                      {spanish ? "Abrir" : "Open"}
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {prospect.outreachApprovedAt
                      ? `${spanish ? "Aprobado" : "Approved at"} ${formatDateTime(prospect.outreachApprovedAt)}`
                      : spanish ? "En espera de aprobación" : "Waiting for approval"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {prospect.approvedChannels.length > 0
                      ? prospect.approvedChannels.join(", ")
                      : spanish ? "Todavía no hay canales aprobados" : "No approved channels yet"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedPanel === "activity" ? (
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]" id="activity">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5672f0]">
                  {spanish ? "Actividad" : "Activity"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {spanish ? "Actividad activa del CRM" : "Live CRM activity"}
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                {visibleActivity.length} {spanish ? "visibles" : "visible"}
              </span>
            </div>

            {visibleActivity.length === 0 ? (
              <StatusBanner
                body={spanish ? "La actividad aparecerá aquí a medida que se actualicen los registros." : "Activity will appear here as records are updated."}
                title={spanish ? "Todavía no hay actividad" : "No activity yet"}
                tone="amber"
              />
            ) : (
              <div className="mt-5 space-y-3">
                {visibleActivity.map((event) => {
                  const prospect = prospects.find((item) => item.id === event.prospectId) ?? null;
                  return (
                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={event.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                            {humanize(event.eventType, spanish)}
                          </p>
                          <h4 className="mt-2 text-sm font-semibold text-slate-950">
                            {event.summary}
                          </h4>
                        </div>
                        <time className="text-xs font-medium text-slate-500">
                          {formatDateTime(event.occurredAt)}
                        </time>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {event.body ?? (spanish ? "Sin nota adicional." : "No additional note.")}
                      </p>
                      {prospect ? (
                        <Link
                          className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                          href={`/lions-den/sales/${prospect.id}`}
                        >
                          {prospect.businessName}
                        </Link>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function QueueColumn({
  items,
  label,
  tone,
  emptyText,
  language,
}: {
  items: Array<{ prospect: SalesProspect; date: Date }>;
  label: string;
  tone: string;
  emptyText: string;
  language: SiteLanguage;
}) {
  const spanish = language === "es";
  return (
    <article className={`rounded-[1.4rem] border border-slate-200 p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
          {label}
        </h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <StatusBanner body={emptyText} title={spanish ? "Cola despejada" : "Queue clear"} tone="emerald" />
        ) : (
          items.map((item) => {
            const health = getHealthBand(item.prospect);
            return (
              <article className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]" key={item.prospect.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                      {{ hot: spanish ? "caliente" : "hot", warm: spanish ? "tibio" : "warm", cold: spanish ? "frío" : "cold" }[health]}
                    </p>
                    <h4 className="mt-2 text-sm font-semibold text-slate-950">
                      {item.prospect.businessName}
                    </h4>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    {formatClock(item.prospect.nextActionAt!, language)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.prospect.nextAction ?? (spanish ? "Se necesita el próximo paso de seguimiento" : "Next follow-up step needed")}
                </p>
                <Link
                  className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  href={`/lions-den/sales/${item.prospect.id}`}
                >
                  {spanish ? "Abrir registro" : "Open record"}
                </Link>
              </article>
            );
          })
        )}
      </div>
    </article>
  );
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
