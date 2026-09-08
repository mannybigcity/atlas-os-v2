import Link from "next/link";
import type { Metadata } from "next";
import { CrmContactActions } from "@/components/crm-contact-actions";
import { SurfaceShell } from "@/components/surface-shell";
import { TrialLifecycleActions } from "@/components/trial-lifecycle-actions";
import { formatDateTime } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/guards";
import { getTrialRoster, type TrialRosterEntry, type TrialStage } from "@/server/trials/admin-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "7-Day Trials | Atlas CRM",
  robots: { index: false, follow: false },
};

type TrialsPageProps = {
  searchParams?: Promise<{ stage?: string; q?: string; trial?: string; crm?: string }>;
};

const RETURN_TO = "/lions-den/trials";

const stageMeta: Record<TrialStage, { label: string; badge: string; hint: string }> = {
  pending_confirmation: {
    label: "Awaiting confirmation",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    hint: "Signed up, has not clicked the confirmation email yet.",
  },
  active: {
    label: "Active",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hint: "Trial is live. Book the welcome call.",
  },
  expiring: {
    label: "Expiring",
    badge: "bg-orange-50 text-orange-800 border-orange-200",
    hint: "Two days or less. Decide: convert, extend, or close.",
  },
  expired: {
    label: "Expired",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    hint: "Trial ended. Extend to reopen access or mark not a fit.",
  },
  converted: {
    label: "Client",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    hint: "Converted into a client workspace.",
  },
};

const notices: Record<string, { tone: "success" | "error"; text: string }> = {
  extended: { tone: "success", text: "Trial extended by 7 days. The extension is on the CRM timeline." },
  converted: { tone: "success", text: "Trial converted. The client workspace exists, the owner is attached, and the CRM record is marked Won." },
  already_converted: { tone: "error", text: "This trial already converted to a client." },
  extend_failed: { tone: "error", text: "The trial could not be extended. Apply the trial funnel migration and try again." },
  convert_failed: { tone: "error", text: "The trial could not be converted. Check the server logs for the database error." },
  sync_failed: { tone: "error", text: "The trial could not be added to the CRM." },
  invalid_extension: { tone: "error", text: "Choose an extension between 1 and 30 days." },
  invalid_request: { tone: "error", text: "That request was not valid." },
  stage_updated: { tone: "success", text: "Pipeline stage updated." },
  update_failed: { tone: "error", text: "The pipeline stage could not be updated." },
  invalid_stage: { tone: "error", text: "Choose a valid pipeline stage." },
  approval_requires_gate: { tone: "error", text: "Use the approval gate on the record to approve outreach." },
};

const filters: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "needs_action", label: "Needs action" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring" },
  { key: "pending_confirmation", label: "Awaiting confirmation" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Clients" },
];

export default async function TrialsPage({ searchParams }: TrialsPageProps) {
  await requireSuperAdmin(RETURN_TO);
  const params = await searchParams;
  const roster = await getTrialRoster();
  const notice = params?.trial ? notices[params.trial] : params?.crm ? notices[params.crm] : null;
  const query = params?.q?.trim().toLowerCase() ?? "";
  const filter = filters.some((item) => item.key === params?.stage) ? (params?.stage as string) : "all";

  const counts = {
    total: roster.data.length,
    active: roster.data.filter((trial) => trial.stage === "active").length,
    expiring: roster.data.filter((trial) => trial.stage === "expiring").length,
    pending: roster.data.filter((trial) => trial.stage === "pending_confirmation").length,
    expired: roster.data.filter((trial) => trial.stage === "expired").length,
    converted: roster.data.filter((trial) => trial.stage === "converted").length,
    uncontacted: roster.data.filter((trial) => trial.stage !== "converted" && !trial.prospectLastContactedAt).length,
  };

  const visible = roster.data.filter((trial) => {
    const matchesQuery =
      !query ||
      [trial.businessName, trial.fullName, trial.email, trial.phone, trial.businessType]
        .some((value) => value.toLowerCase().includes(query));
    const needsAction =
      trial.stage !== "converted" &&
      (!trial.prospectLastContactedAt || trial.stage === "expiring" || trial.stage === "expired");
    const matchesFilter =
      filter === "all" || (filter === "needs_action" ? needsAction : trial.stage === filter);
    return matchesQuery && matchesFilter;
  });

  return (
    <SurfaceShell
      wide
      className="bg-slate-100 px-0 py-0 sm:px-0 lg:px-0"
      contentClassName="mt-0"
      description="Every 7-day trial is a live CRM prospect. Call, email, follow up, extend, or convert from here."
      eyebrow="Atlas CRM · Trial desk"
      title="7-Day Trials"
    >
      <div className="-mx-5 -mb-5 grid min-h-[calc(100vh-14rem)] border-t border-slate-200 bg-slate-100 sm:-mx-8 sm:-mb-8 xl:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="border-r border-slate-200 bg-white p-4" aria-label="CRM navigation">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <div className="mt-3 grid gap-1 text-sm font-semibold">
            <NavLink href="/lions-den/sales">Today&apos;s Work</NavLink>
            <NavLink href="/lions-den/sales#pipeline">Pipeline</NavLink>
            <NavLink href="/lions-den/sales#tasks">Tasks &amp; Follow-ups</NavLink>
            <NavLink href="/lions-den/sales#prospects">Contacts</NavLink>
            <NavLink active href="/lions-den/trials">
              7-Day Trials{counts.total ? <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">{counts.total}</span> : null}
            </NavLink>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-4">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin</p>
            <Link className="mt-3 block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/lions-den">Lion&apos;s Den</Link>
            <Link className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/start-trial" target="_blank">Public trial form ↗</Link>
          </div>
        </nav>

        <main className="min-w-0 space-y-5 p-5 sm:p-7">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Human review</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                {counts.uncontacted ? `${counts.uncontacted} trial${counts.uncontacted === 1 ? "" : "s"} waiting for a first touch.` : "Every trial has been contacted."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                New trial workspaces land here automatically and in Sales Command as Qualified prospects owned by DAVID. Atlas does not email, call, or text anyone on its own.
              </p>
            </div>
            <form className="flex gap-2" method="get">
              {filter !== "all" ? <input name="stage" type="hidden" value={filter} /> : null}
              <input className="h-9 min-w-56 rounded-lg border border-slate-300 px-3 text-sm" defaultValue={params?.q ?? ""} name="q" placeholder="Search name, business, email, phone" />
              <button className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white" type="submit">Search</button>
            </form>
          </div>

          {notice ? (
            <div className={`rounded-xl border p-3 text-sm ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
              {notice.text}
            </div>
          ) : null}

          {roster.setupRequired ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-bold">Trial funnel migration required.</p>
              <p className="mt-1">
                Apply <code className="rounded bg-white px-1.5 py-0.5 text-xs">supabase/migrations/20260908120000_atlas_trial_funnel_crm.sql</code> to your Supabase project.
                It links every trial to a CRM prospect, backfills existing trials, and exposes the roster, extend, and convert actions used on this page.
              </p>
              <p className="mt-2 text-xs text-amber-800">Database said: {roster.error}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Stat label="In trial" value={String(counts.active + counts.expiring + counts.pending)} />
            <Stat label="Not contacted" tone={counts.uncontacted ? "amber" : "slate"} value={String(counts.uncontacted)} />
            <Stat label="Expiring ≤ 2 days" tone={counts.expiring ? "amber" : "slate"} value={String(counts.expiring)} />
            <Stat label="Awaiting email" value={String(counts.pending)} />
            <Stat label="Expired" value={String(counts.expired)} />
            <Stat label="Converted" tone="blue" value={String(counts.converted)} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {filters.map((item) => (
                  <Link
                    className={filter === item.key ? "rounded-full bg-slate-900 px-3 py-1.5 text-white" : "rounded-full border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"}
                    href={item.key === "all" ? RETURN_TO : `${RETURN_TO}?stage=${item.key}`}
                    key={item.key}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <span className="text-xs text-slate-500">{visible.length} shown · {counts.total} total</span>
            </div>

            {!roster.setupRequired && visible.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold text-slate-900">{counts.total === 0 ? "No trials yet." : "No trials match this view."}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {counts.total === 0
                    ? "When someone completes the public trial form and confirms their email, they appear here and in Sales Command."
                    : "Clear the filter or search to see every trial."}
                </p>
              </div>
            ) : null}

            <div className="divide-y divide-slate-100">
              {visible.map((trial) => <TrialCard key={trial.userId} trial={trial} />)}
            </div>
          </section>
        </main>
      </div>
    </SurfaceShell>
  );
}

function TrialCard({ trial }: { trial: TrialRosterEntry }) {
  const meta = stageMeta[trial.stage];
  const signedIn = Boolean(trial.lastSignInAt);
  const contacted = Boolean(trial.prospectLastContactedAt);

  return (
    <article className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {trial.prospectId ? (
            <Link className="text-lg font-bold text-slate-950 hover:text-blue-700 hover:underline" href={`/lions-den/sales/${trial.prospectId}`}>
              {trial.businessName}
            </Link>
          ) : (
            <p className="text-lg font-bold text-slate-950">{trial.businessName}</p>
          )}
          <Badge className={meta.badge}>{meta.label}</Badge>
          {trial.stage !== "converted" && trial.stage !== "expired" ? (
            <Badge className="bg-slate-50 text-slate-700 border-slate-200">{trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left</Badge>
          ) : null}
          {trial.extensionCount ? <Badge className="bg-violet-50 text-violet-800 border-violet-200">Extended ×{trial.extensionCount}</Badge> : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-800">{trial.fullName} · {trial.businessType}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <a className="hover:text-blue-700 hover:underline" href={`mailto:${trial.email}`}>{trial.email}</a>
          <a className="hover:text-blue-700 hover:underline" href={`tel:${trial.phone.replace(/[^0-9+]/g, "")}`}>{trial.phone}</a>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-800">Goal:</span> {trial.primaryGrowthGoal}
        </p>
        <div className="mt-3">
          <CrmContactActions businessName={trial.businessName} email={trial.email} phone={trial.phone} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 lg:grid-cols-1">
        <Meta label="Started" value={formatDateTime(trial.trialStartedAt)} />
        <Meta label={trial.stage === "converted" ? "Converted" : "Ends"} value={formatDateTime(trial.stage === "converted" ? trial.convertedAt : trial.trialEndsAt)} />
        <Meta label="Account" value={trial.emailConfirmedAt ? (signedIn ? `Signed in ${formatDateTime(trial.lastSignInAt)}` : "Email confirmed · never signed in") : "Email not confirmed"} />
        <Meta label="CRM" value={trial.prospectId ? `${humanize(trial.prospectStatus ?? "qualified")} · ${contacted ? `contacted ${formatDateTime(trial.prospectLastContactedAt)}` : "not contacted yet"}` : "Not in CRM"} tone={trial.prospectId ? (contacted ? "slate" : "amber") : "rose"} />
        {trial.prospectNextAction ? <Meta label="Next" value={`${trial.prospectNextAction}${trial.prospectNextActionAt ? ` · ${formatDateTime(trial.prospectNextActionAt)}` : ""}`} /> : null}
      </dl>

      <div className="lg:max-w-xs">
        <TrialLifecycleActions returnTo={RETURN_TO} trial={trial} />
        <p className="mt-2 text-[11px] leading-5 text-slate-500">{meta.hint}</p>
      </div>
    </article>
  );
}

function NavLink({ active, children, href }: { active?: boolean; children: React.ReactNode; href: string }) {
  return (
    <Link className={active ? "flex items-center rounded-lg bg-blue-50 px-3 py-2 text-blue-800" : "block rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"} href={href}>
      {children}
    </Link>
  );
}

function Stat({ label, tone = "slate", value }: { label: string; tone?: "slate" | "blue" | "amber"; value: string }) {
  const classes = { slate: "bg-white border-slate-200", blue: "bg-blue-50 border-blue-200", amber: "bg-amber-50 border-amber-200" };
  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${className}`}>{children}</span>;
}

function Meta({ label, tone = "slate", value }: { label: string; tone?: "slate" | "amber" | "rose"; value: string }) {
  const color = { slate: "text-slate-800", amber: "text-amber-800", rose: "text-rose-700" }[tone];
  return (
    <div>
      <dt className="font-bold uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className={`mt-0.5 font-medium ${color}`}>{value}</dd>
    </div>
  );
}

function humanize(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
