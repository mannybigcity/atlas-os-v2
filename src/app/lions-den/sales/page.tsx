import Link from "next/link";
import type { Metadata } from "next";
import { SalesAssistantPanel } from "@/components/sales-assistant-panel";
import { CrmWorkstreams, type CrmWorkspace } from "@/components/crm-workstreams";
import { SurfaceShell } from "@/components/surface-shell";
import { HunterSearch } from "@/components/hunter-search";
import { formatDateTime } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/guards";
import { createSalesProspect } from "@/server/sales/actions";
import { getRecentSalesActivity, getSalesProspects, getSalesTasks, type SalesActivityItem, type SalesProspect, type SalesProspectStatus, type SalesTask } from "@/server/sales/queries";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas CRM | Atlas For Entrepreneurs", robots: { index: false, follow: false } };

type SalesPageProps = { searchParams?: Promise<{ q?: string; status?: string; crm?: string }> };

const stages: Array<{ status: SalesProspectStatus; label: string }> = [
  { status: "new", label: "New" }, { status: "researching", label: "Researching" },
  { status: "review_ready", label: "Review ready" }, { status: "approved_for_outreach", label: "Approved" },
  { status: "contacted", label: "Contacted" }, { status: "replied", label: "Replied" },
  { status: "qualified", label: "Qualified" }, { status: "proposal_sent", label: "Proposal" },
];
const openStatuses = new Set<SalesProspectStatus>(stages.map((stage) => stage.status));
const errors: Record<string, string> = {
  business_name_required: "Enter the prospect's business name.", invalid_website: "Enter a valid business website.",
  invalid_source: "Enter a valid public source URL.", invalid_email: "Enter a valid business email or leave it blank.",
  invalid_contact_basis: "Choose a valid contact basis.", create_failed: "The prospect could not be created.",
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireSuperAdmin("/lions-den/sales");
  const params = await searchParams;
  const result = await getSalesProspects();
  const tasksResult = await getSalesTasks();
  const activityResult = await getRecentSalesActivity(result.data);
  const organizations = await getOrganizationsForSuperAdmin();
  const workspaces: CrmWorkspace[] = await Promise.all(organizations.data.map(async (organization) => ({
    organization,
    studio: await getContentStudio(organization.id),
    pipeline: await getOpportunityPipeline(organization.id),
  })));
  const query = params?.q?.trim().toLowerCase() ?? "";
  const selectedStatus = stages.some((stage) => stage.status === params?.status) ? params?.status as SalesProspectStatus : "all";
  const allProspects = result.data;
  const filtered = allProspects.filter((prospect) => {
    const searchable = [prospect.businessName, prospect.industry, prospect.city, prospect.region].filter((value): value is string => Boolean(value));
    return (!query || searchable.some((value) => value.toLowerCase().includes(query))) && (selectedStatus === "all" || prospect.status === selectedStatus);
  });
  const now = await getCurrentTimestamp();
  const actions = allProspects.filter((prospect) => prospect.nextActionAt && openStatuses.has(prospect.status)).sort((a, b) => new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime());
  const overdue = actions.filter((prospect) => new Date(prospect.nextActionAt!).getTime() < now);
  const dueToday = actions.filter((prospect) => new Date(prospect.nextActionAt!).toDateString() === new Date(now).toDateString());
  const error = params?.crm ? errors[params.crm] : null;

  return (
    <SurfaceShell wide className="bg-slate-100 px-0 py-0 sm:px-0 lg:px-0" contentClassName="mt-0" description="Your full-screen workspace for today’s work, pipeline, follow-ups, and decisions." eyebrow="Atlas CRM" title="Sales Command">
      <div className="-mx-5 -mb-5 grid min-h-[calc(100vh-14rem)] border-t border-slate-200 bg-slate-100 sm:-mx-8 sm:-mb-8 xl:grid-cols-[190px_minmax(0,1fr)_330px]">
        <nav className="border-r border-slate-200 bg-white p-4" aria-label="CRM navigation">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <div className="mt-3 grid gap-1 text-sm font-semibold">
            <NavItem href="#today" active>Today&apos;s Work</NavItem><NavItem href="#pipeline">Pipeline</NavItem><NavItem href="#calendar">Calendar</NavItem><NavItem href="#tasks">Tasks &amp; Follow-ups</NavItem><NavItem href="#prospects">Contacts</NavItem><NavItem href="#notes">Notes &amp; Activity</NavItem><NavItem href="#workstreams">MICAH + HUNTER</NavItem><NavItem href="#hunter-finder">Run lead finder</NavItem>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-4"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin</p><Link className="mt-3 block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/lions-den">Lion&apos;s Den</Link></div>
        </nav>

        <main className="min-w-0 space-y-5 p-5 sm:p-7" id="today">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Today&apos;s Work</p><h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Good morning. Here&apos;s what needs attention.</h2></div><div className="flex gap-2"><Link className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" href="#tasks">View tasks</Link><Link className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white" href="#intake">Add prospect</Link></div></div>
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div> : null}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Open pipeline" value={String(allProspects.filter((p) => openStatuses.has(p.status)).length)} /><Stat label="Overdue" value={String(overdue.length)} tone={overdue.length ? "amber" : "slate"} /><Stat label="Due today" value={String(dueToday.length)} tone="blue" /><Stat label="New prospects" value={String(allProspects.filter((p) => p.status === "new").length)} tone="blue" /></div>

          <section className="rounded-xl border border-slate-200 bg-white" id="tasks"><SectionHeader eyebrow="Tasks & follow-ups" title="The next action is always visible." count={tasksResult.setupRequired ? `${actions.length} legacy follow-ups` : `${tasksResult.data.filter((task) => task.status === "open").length} open tasks`} />{tasksResult.data.filter((task) => task.status === "open").length ? <div className="divide-y divide-slate-100">{tasksResult.data.filter((task) => task.status === "open").slice(0, 8).map((task) => <TaskCard key={task.id} task={task} prospects={allProspects} now={now} />)}</div> : actions.length ? <div className="divide-y divide-slate-100">{actions.slice(0, 6).map((prospect) => <TaskRow key={prospect.id} prospect={prospect} overdue={new Date(prospect.nextActionAt!).getTime() < now} />)}</div> : <p className="p-5 text-sm text-slate-500">No follow-up tasks are scheduled yet. Open a prospect to create the next action.</p>}</section>

          <section className="rounded-xl border border-slate-200 bg-white" id="calendar"><SectionHeader eyebrow="Calendar" title="Upcoming CRM agenda" count="Agenda view" /><div className="grid gap-3 p-4 sm:grid-cols-3">{calendarDays(actions).map((day) => <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={day.label}><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{day.label}</p><p className="mt-2 text-lg font-bold text-slate-950">{day.items.length}</p><p className="text-xs text-slate-500">scheduled action{day.items.length === 1 ? "" : "s"}</p>{day.items.slice(0, 2).map((item) => <Link className="mt-3 block truncate text-sm font-semibold text-blue-700 hover:underline" href={"/lions-den/sales/" + item.id} key={item.id}>{item.businessName}</Link>)}</div>)}</div></section>

          <section className="rounded-xl border border-slate-200 bg-white" id="pipeline"><SectionHeader eyebrow="Pipeline" title="Move prospects through the deal flow." count={String(filtered.length) + " shown"} /><div className="border-b border-slate-200 p-4"><form className="flex flex-wrap gap-2" method="get"><input className="h-9 min-w-48 flex-1 rounded-lg border border-slate-300 px-3 text-sm" defaultValue={params?.q ?? ""} name="q" placeholder="Search contacts or businesses" /><select className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm" defaultValue={selectedStatus} name="status"><option value="all">All stages</option>{stages.map((stage) => <option key={stage.status} value={stage.status}>{stage.label}</option>)}</select><button className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white" type="submit">Filter</button></form></div><div className="overflow-x-auto"><div className="grid min-w-[1120px] grid-cols-8 gap-px bg-slate-200">{stages.map((stage) => <div className="min-h-40 bg-slate-50 p-3" key={stage.status}><div className="flex justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{stage.label}</p><span className="text-xs font-bold text-slate-500">{filtered.filter((p) => p.status === stage.status).length}</span></div><div className="mt-3 space-y-2">{filtered.filter((p) => p.status === stage.status).map((prospect) => <Link className="block rounded-lg border border-slate-200 bg-white p-3 text-xs hover:border-blue-400" href={"/lions-den/sales/" + prospect.id} key={prospect.id}><p className="font-bold text-slate-950">{prospect.businessName}</p><p className="mt-1 line-clamp-2 text-slate-500">{prospect.nextAction ?? "Choose next action"}</p></Link>)}{!filtered.some((p) => p.status === stage.status) ? <p className="border border-dashed border-slate-300 p-2 text-xs text-slate-400">Empty</p> : null}</div></div>)}</div></div></section>

          <section className="rounded-xl border border-slate-200 bg-white" id="prospects"><SectionHeader eyebrow="Contacts" title="All prospects" count={String(filtered.length) + " records"} /><div className="divide-y divide-slate-100">{filtered.map((prospect) => <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 md:grid-cols-[1.3fr_1fr_1.4fr_1fr] md:items-center" href={"/lions-den/sales/" + prospect.id} key={prospect.id}><div><p className="font-semibold text-slate-950">{prospect.businessName}</p><p className="text-xs text-slate-500">{prospect.contactName ?? prospect.industry ?? "No contact details"}</p></div><Badge status={prospect.status} /><p className="truncate text-sm text-slate-600">{prospect.nextAction ?? "Choose next action"}</p><p className="text-sm text-slate-500">{prospect.nextActionAt ? formatDateTime(prospect.nextActionAt) : "No date"}</p></Link>)}</div></section>

          <section className="rounded-xl border border-slate-200 bg-white" id="notes"><SectionHeader eyebrow="Notes & activity" title="The latest CRM history, at a glance." count={activityResult.data.length ? `${activityResult.data.length} recent events` : "No events yet"} />{activityResult.data.length ? <div className="divide-y divide-slate-100">{activityResult.data.slice(0, 6).map((event) => <ActivityRow event={event} key={event.id} />)}</div> : <p className="p-5 text-sm leading-6 text-slate-600">Notes, approvals, research, and follow-up history will appear here as the team works records.</p>}</section>

          <CrmWorkstreams workspaces={workspaces} />

          <details className="rounded-xl border border-slate-200 bg-white" id="hunter-finder"><summary className="cursor-pointer list-none p-4 font-bold text-slate-950">＋ Run HUNTER lead finder <span className="ml-2 text-xs font-normal text-slate-500">Real search with safety cap and approval boundary</span></summary><div className="border-t border-slate-200 p-4"><HunterSearch /></div></details>

          <details className="rounded-xl border border-slate-200 bg-white" id="intake"><summary className="cursor-pointer list-none p-4 font-bold text-slate-950">＋ Add a researched prospect <span className="ml-2 text-xs font-normal text-slate-500">HUNTER intake · no auto-send</span></summary><div className="border-t border-slate-200 p-4"><form action={createSalesProspect} className="grid gap-4 sm:grid-cols-2"><Field label="Business name" name="businessName" required /><Field label="Business category" name="industry" /><Field label="City" name="city" /><Field label="State / region" name="region" /><Field label="Business website" name="website" /><Field label="Public source URL" name="sourceUrl" type="url" /><Field label="Contact name" name="contactName" /><Field label="Business email" name="contactEmail" type="email" /><Field label="Business phone" name="contactPhone" type="tel" /><Field label="Social profile" name="socialMedia" /><label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Contact basis</span><select className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" defaultValue="public_business_contact" name="contactBasis"><option value="public_business_contact">Public business contact</option><option value="referral">Referral</option><option value="prior_relationship">Prior relationship</option><option value="inbound_consent">Inbound consent</option><option value="customer">Current customer</option><option value="unknown">Not verified yet</option></select></label><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2" type="submit">Add to research queue</button></form></div></details>
        </main>

        <SalesAssistantPanel />
      </div>
    </SurfaceShell>
  );
}

function NavItem({ active, children, href }: { active?: boolean; children: React.ReactNode; href: string }) { return <a className={active ? "block rounded-lg bg-blue-50 px-3 py-2 text-blue-800" : "block rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"} href={href}>{children}</a>; }
function SectionHeader({ count, eyebrow, title }: { count: string; eyebrow: string; title: string }) { return <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2></div><span className="text-xs text-slate-500">{count}</span></div>; }
function Stat({ label, tone = "slate", value }: { label: string; tone?: "slate" | "blue" | "amber"; value: string }) { const classes = { slate: "bg-white border-slate-200", blue: "bg-blue-50 border-blue-200", amber: "bg-amber-50 border-amber-200" }; return <div className={"rounded-xl border p-4 " + classes[tone]}><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p></div>; }
function TaskRow({ overdue, prospect }: { overdue: boolean; prospect: SalesProspect }) { return <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1.2fr_2fr_1fr_auto] sm:items-center" href={"/lions-den/sales/" + prospect.id}><p className="font-semibold text-slate-950">{prospect.businessName}</p><p className="truncate text-sm text-slate-600">{prospect.nextAction ?? "Choose next action"}</p><p className={overdue ? "text-sm font-semibold text-amber-700" : "text-sm text-slate-500"}>{formatDateTime(prospect.nextActionAt)}</p><Badge status={prospect.status} /></Link>; }
function TaskCard({ now, prospects, task }: { now: number; prospects: SalesProspect[]; task: SalesTask }) { const prospect = prospects.find((item) => item.id === task.prospectId); if (!prospect) return null; const overdue = task.dueAt ? new Date(task.dueAt).getTime() < now : false; return <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1.2fr_2fr_1fr_auto] sm:items-center" href={"/lions-den/sales/" + prospect.id}><div><p className="font-semibold text-slate-950">{prospect.businessName}</p><p className="text-xs uppercase tracking-[0.1em] text-blue-700">{task.taskType.replaceAll("_", " ")}</p></div><p className="truncate text-sm text-slate-600">{task.title}</p><p className={overdue ? "text-sm font-semibold text-amber-700" : "text-sm text-slate-500"}>{task.dueAt ? formatDateTime(task.dueAt) : "No due date"}</p><Badge status={prospect.status} /></Link>; }
function ActivityRow({ event }: { event: SalesActivityItem }) { return <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1.1fr_1.6fr_1fr_auto] sm:items-center" href={"/lions-den/sales/" + event.prospectId}><div><p className="font-semibold text-slate-950">{event.businessName}</p><p className="text-xs uppercase tracking-[0.1em] text-blue-700">{event.actorRole} · {event.eventType.replaceAll(".", " ")}</p></div><p className="truncate text-sm text-slate-700">{event.summary}</p><p className="truncate text-sm text-slate-500">{event.body ?? "No additional detail"}</p><time className="text-xs text-slate-500">{formatDateTime(event.occurredAt)}</time></Link>; }
function calendarDays(actions: SalesProspect[]) { const today = new Date(); return [0, 1, 2].map((offset) => { const date = new Date(today); date.setDate(today.getDate() + offset); return { label: offset === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), items: actions.filter((item) => new Date(item.nextActionAt!).toDateString() === date.toDateString()) }; }); }
function Badge({ status }: { status: SalesProspectStatus }) { return <span className="inline-flex w-fit rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-800">{status.replaceAll("_", " ")}</span>; }
function Field({ label, name, required, type = "text" }: { label: string; name: string; required?: boolean; type?: string }) { return <label><span className="text-sm font-medium text-slate-700">{label}</span><input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" name={name} required={required} type={type} /></label>; }
async function getCurrentTimestamp() { return Date.now(); }
