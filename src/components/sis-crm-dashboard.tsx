import Link from "next/link";
import type { SisDashboardData } from "@/server/sis-workspace/queries";
import { createSisPartyEvent } from "@/server/sis-workspace/actions";

type SisCrmDashboardProps = {
  dashboard: SisDashboardData;
};

const statusLabels: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

const partyStages = [
  ["new_inquiry", "New inquiry"], ["contact_within_24_hours", "Contact in 24h"],
  ["qualified", "Qualified"], ["quote_sent", "Quote sent"],
  ["deposit_pending", "Deposit pending"], ["booked", "Booked"],
  ["prep_in_progress", "Prep"], ["party_complete", "Complete"],
  ["diy_subscription_offered", "DIY offered"], ["won_follow_up", "Won / follow-up"],
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export function SisCrmDashboard({ dashboard }: SisCrmDashboardProps) {
  const { counts, recentLeads, partyEvents, inboxTasks } = dashboard;

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.18),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5b932]">SIS company workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl">SIS Custom Creations CRM</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Private SIS operations for services, leads, quotes, orders, payment readiness, and fulfillment.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Private workspace foundation</p>
            <p className="mt-1 text-xs text-emerald-800">Organization-scoped through Atlas Auth and RLS; pending migration and account verification.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Leads" value={counts.leads} detail="All SIS leads" />
          <Metric label="Open" value={counts.openLeads} detail="New intake queue" />
          <Metric label="Quotes" value={counts.quotes} detail="Quote records" />
          <Metric label="Orders" value={counts.orders} detail="Order records" />
          <Metric label="Paid" value={counts.paidOrders} detail="Verified payment" />
          <Metric label="Production" value={counts.fulfillment} detail="Ready for review" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Adult door-hanger paint parties</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Pipeline</h3>
          </div>
          <p className="text-xs text-slate-500">Booked is locked until the deposit is verified paid.</p>
        </div>
        <div className="mt-5 grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: "repeat(10, minmax(190px, 1fr))" }}>
          {partyStages.map(([stage, label]) => {
            const events = partyEvents.filter((event) => event.stage === stage);
            return <div className="min-h-44 rounded-2xl border border-slate-200 bg-slate-50 p-3" key={stage}>
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-700">{label}</p><span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{events.length}</span></div>
              <div className="mt-3 space-y-2">{events.map((event) => <Link className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#5672f0] hover:shadow" href={`/client/sis/party/${event.id}`} key={event.id}>
                <p className="text-sm font-semibold text-slate-950">{event.hostName}</p>
                <p className="mt-1 text-xs text-slate-500">{event.partyStartsAt ? formatDate(event.partyStartsAt) : "Date to confirm"}</p>
                <p className="mt-2 text-xs font-medium text-slate-700">{event.nextAction ?? "Next action required"}</p>
                {stage === "deposit_pending" ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Deposit: {event.depositStatus}</p> : null}
              </Link>)}</div>
            </div>;
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">New party inquiry</p>
        <form action={createSisPartyEvent} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input aria-label="Host name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="hostName" placeholder="Host name" required />
          <input aria-label="Phone" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="phone" placeholder="Phone" />
          <input aria-label="Email" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="email" placeholder="Email" type="email" />
          <input aria-label="Guest count" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" min="1" name="guestCount" placeholder="Guest count" type="number" />
          <input aria-label="Next action" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" name="nextAction" placeholder="Required next action" required />
          <input aria-label="Next action due date" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="nextActionDue" required type="date" />
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">Add party inquiry</button>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5b932]">Lead queue</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Recent SIS leads</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{recentLeads.length} shown</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {recentLeads.length === 0 ? (
              <div className="bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No tenant leads have arrived yet. The next backend slice will route the public SIS intake into this queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {recentLeads.map((lead) => (
                  <div className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={lead.id}>
                    <div>
                      <p className="font-semibold text-slate-950">{lead.offer}</p>
                      <p className="mt-1 text-xs text-slate-500">{lead.sourceLabel ?? "SIS website"} · {formatDate(lead.createdAt)}</p>
                    </div>
                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{statusLabels[lead.status] ?? lead.status}</span>
                    <span className="text-xs text-slate-500">{lead.dueDate ? `Due ${formatDate(lead.dueDate)}` : "No due date"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Current build boundary</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">One canonical path</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The protected SIS workspace is locally implemented. Public website intake, migrations, and provider paths remain separate until verified.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Auth and company membership</div>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Tenant schema and RLS</div>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-amber-400" /> SIS website intake connection</div>
          </div>
          <Link className="mt-6 inline-flex rounded-full border border-slate-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10" href="/">Return to Atlas</Link>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Today / inbox</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Follow-up work</h3>
          <div className="mt-5 divide-y divide-slate-100">
            {inboxTasks.length ? inboxTasks.map((task) => <div className="py-3" key={task.id}><p className="text-sm font-semibold text-slate-950">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.party?.hostName ?? "Party record"} · {task.dueAt ? formatDate(task.dueAt) : "No due time"}</p></div>) : <p className="py-5 text-sm text-slate-500">No open party tasks yet.</p>}
          </div>
        </article>
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Operating rule</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">No lead gets lost</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">Open party records require an assigned owner and a dated next action. The database enforces the rule; the inbox makes the work visible.</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">Provider notifications, calendar writes, and payment verification stay off until their live integrations are reviewed and approved.</p>
        </article>
      </section>
    </div>
  );
}
