import Link from "next/link";
import type { Metadata } from "next";
import { HunterSearch } from "@/components/hunter-search";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/guards";
import { createSalesProspect } from "@/server/sales/actions";
import { getSalesProspects, type SalesProspectStatus } from "@/server/sales/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Command | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type SalesPageProps = { searchParams?: Promise<{ crm?: string; q?: string; status?: string }> };

const errorMessages: Record<string, string> = {
  business_name_required: "Enter the prospect's business name.",
  invalid_website: "Enter a valid business website, such as example.com.",
  invalid_source: "Enter a valid public source URL beginning with a real domain.",
  invalid_email: "Enter a valid business contact email or leave it blank.",
  invalid_contact_basis: "Choose a valid contact basis.",
  create_failed: "The prospect could not be created. Apply the Atlas Sales CRM migration first.",
};

const openStatuses = new Set<SalesProspectStatus>([
  "new", "researching", "review_ready", "approved_for_outreach",
  "contacted", "replied", "qualified", "proposal_sent",
]);

const pipelineStages: Array<{ status: SalesProspectStatus; label: string }> = [
  { status: "new", label: "New" },
  { status: "researching", label: "Researching" },
  { status: "review_ready", label: "Review ready" },
  { status: "approved_for_outreach", label: "Approved" },
  { status: "contacted", label: "Contacted" },
  { status: "replied", label: "Replied" },
  { status: "qualified", label: "Qualified" },
  { status: "proposal_sent", label: "Proposal" },
];

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireSuperAdmin("/lions-den/sales");
  const params = await searchParams;
  const allProspects = await getSalesProspects();
  const query = params?.q?.trim().toLowerCase() ?? "";
  const requestedStatus = params?.status;
  const statusFilter = pipelineStages.some((stage) => stage.status === requestedStatus)
    ? requestedStatus as SalesProspectStatus
    : "all";
  const prospects = allProspects.data.filter((prospect) => {
    const matchesQuery = !query || [prospect.businessName, prospect.industry, prospect.city, prospect.region]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (statusFilter === "all" || prospect.status === statusFilter);
  });
  const error = params?.crm ? errorMessages[params.crm] : null;
  const now = await getCurrentTimestamp();
  const followUpQueue = prospects
    .filter((prospect) => prospect.nextActionAt && openStatuses.has(prospect.status))
    .sort((left, right) => new Date(left.nextActionAt!).getTime() - new Date(right.nextActionAt!).getTime());
  const overdueCount = followUpQueue.filter((prospect) => new Date(prospect.nextActionAt!).getTime() < now).length;
  const approvedCount = prospects.filter((prospect) => prospect.outreachApprovedAt).length;

  return (
    <SurfaceShell
      className="bg-[#eef3f8]"
      contentClassName="mt-6"
      description="A private, approval-first workspace for managing researched prospects and the next action that matters."
      eyebrow="Atlas Revenue Operations"
      title="Sales Command"
    >
      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl bg-slate-950 p-4 text-white xl:sticky xl:top-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">CRM workspace</p>
          <p className="mt-2 text-lg font-bold">Sales Command</p>
          <nav className="mt-5 grid gap-1 text-sm">
            <NavLink href="#pipeline">Pipeline</NavLink>
            <NavLink href="#follow-ups">Follow-ups</NavLink>
            <NavLink href="#prospects">All prospects</NavLink>
            <NavLink href="#intake">Add prospect</NavLink>
            <NavLink href="#research">Research preview</NavLink>
          </nav>
          <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">
            <p className="font-semibold text-white">Approval-first</p>
            <p className="mt-1">No email, text, social message, or call is sent from this workspace.</p>
          </div>
          <Link className="mt-5 block text-xs font-semibold text-blue-300 hover:text-white" href="/lions-den">← Lion&apos;s Den overview</Link>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Today&apos;s work</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Move the right prospect forward.</h2>
            </div>
            <p className="text-sm text-slate-500">{allProspects.data.length} records · {approvedCount} approved</p>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Open" value={allProspects.data.filter((p) => openStatuses.has(p.status)).length} />
            <Metric label="Due dates" value={followUpQueue.length} tone="blue" />
            <Metric label="Overdue" value={overdueCount} tone={overdueCount ? "amber" : "slate"} />
            <Metric label="Approved" value={approvedCount} tone="blue" />
          </div>

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div> : null}
          {allProspects.setupRequired ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Apply migration <code>20260715100000_atlas_sales_crm.sql</code> in Supabase before using Sales Command.</div> : null}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" id="pipeline">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Pipeline</p><h2 className="mt-1 text-xl font-bold text-slate-950">See the whole deal flow.</h2></div>
              <form className="flex flex-wrap gap-2" method="get">
                <input className="h-9 w-44 rounded-lg border border-slate-300 px-3 text-sm" defaultValue={params?.q ?? ""} name="q" placeholder="Search prospects" />
                <select className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm" defaultValue={statusFilter} name="status">
                  <option value="all">All stages</option>{pipelineStages.map((stage) => <option key={stage.status} value={stage.status}>{stage.label}</option>)}
                </select>
                <button className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white" type="submit">Filter</button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[1180px] grid-cols-8 gap-px bg-slate-200">
                {pipelineStages.map((stage) => {
                  const stageProspects = prospects.filter((prospect) => prospect.status === stage.status);
                  return <div className="min-h-44 bg-slate-50 p-3" key={stage.status}>
                    <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">{stage.label}</p><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700">{stageProspects.length}</span></div>
                    <div className="mt-3 space-y-2">{stageProspects.length ? stageProspects.map((prospect) => <Link className="block rounded-lg border border-slate-200 bg-white p-3 text-xs hover:border-blue-400" href={`/lions-den/sales/${prospect.id}`} key={prospect.id}><p className="font-bold text-slate-950">{prospect.businessName}</p><p className="mt-1 line-clamp-2 text-slate-600">{prospect.nextAction ?? "Choose next action"}</p><p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">{prospect.assignedRole}</p></Link>) : <p className="border border-dashed border-slate-300 px-2 py-3 text-xs text-slate-400">Empty</p>}</div>
                  </div>;
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white" id="follow-ups">
            <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Follow-ups</p><h2 className="mt-1 text-xl font-bold text-slate-950">Next actions, in order.</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${overdueCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{overdueCount ? `${overdueCount} overdue` : "Queue current"}</span></div>
            {followUpQueue.length ? <div className="divide-y divide-slate-100">{followUpQueue.slice(0, 8).map((prospect) => { const overdue = new Date(prospect.nextActionAt!).getTime() < now; return <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:grid-cols-[1.2fr_2fr_1fr_auto] sm:items-center" href={`/lions-den/sales/${prospect.id}`} key={prospect.id}><p className="font-semibold text-slate-950">{prospect.businessName}</p><p className="truncate text-sm text-slate-600">{prospect.nextAction ?? "Choose next action"}</p><p className={`text-sm ${overdue ? "font-semibold text-amber-700" : "text-slate-500"}`}>{formatDateTime(prospect.nextActionAt)}</p><StageBadge status={prospect.status} /></Link>; })}</div> : <p className="p-4 text-sm text-slate-500">No follow-up dates are scheduled yet.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white" id="prospects">
            <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">All prospects</p><h2 className="mt-1 text-xl font-bold text-slate-950">A compact working list.</h2></div><span className="text-sm text-slate-500">{prospects.length} shown</span></div>
            <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_1.5fr_1fr_0.5fr] gap-3 border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 md:grid"><span>Business</span><span>Stage</span><span>Owner</span><span>Next action</span><span>Due</span><span>Fit</span></div>
            <div className="divide-y divide-slate-100">{prospects.map((prospect) => <Link className="grid gap-2 px-4 py-3 hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_0.7fr_1.5fr_1fr_0.5fr] md:items-center md:gap-3" href={`/lions-den/sales/${prospect.id}`} key={prospect.id}><div><p className="font-semibold text-slate-950">{prospect.businessName}</p><p className="text-xs text-slate-500">{prospect.industry ?? "Industry not set"}{prospect.city ? ` · ${prospect.city}` : ""}</p></div><StageBadge status={prospect.status} /><p className="text-xs font-semibold uppercase text-slate-500">{prospect.assignedRole}</p><p className="truncate text-sm text-slate-600">{prospect.nextAction ?? "Choose next action"}</p><p className="text-sm text-slate-500">{prospect.nextActionAt ? formatDateTime(prospect.nextActionAt) : "No due date"}</p><p className="text-sm text-slate-500">{prospect.fitScore ?? "—"}/100</p></Link>)}</div>
            {!prospects.length ? <p className="p-4 text-sm text-slate-500">No prospects match this view.</p> : null}
          </section>

          <details className="rounded-2xl border border-slate-200 bg-white" id="intake"><summary className="cursor-pointer list-none p-4 font-bold text-slate-950">＋ Add a researched prospect <span className="ml-2 text-xs font-normal text-slate-500">HUNTER intake · no auto-send</span></summary><div className="border-t border-slate-200 p-4"><p className="mb-4 text-sm leading-6 text-slate-600">Save a verified business and its public source. This only creates a CRM record; it does not contact anyone.</p><form action={createSalesProspect} className="grid gap-4 sm:grid-cols-2"><Field label="Business name" name="businessName" required /><Field label="Business category" name="industry" placeholder="Home services, fitness..." /><Field label="City" name="city" /><Field label="State / region" name="region" placeholder="TX" /><Field label="Business website" name="website" placeholder="example.com" /><Field label="Public source URL" name="sourceUrl" placeholder="https://example.com/contact" type="url" /><Field label="Contact name (if public)" name="contactName" /><Field label="Business email (if public)" name="contactEmail" type="email" /><Field label="Business phone (if public)" name="contactPhone" type="tel" /><Field label="Social profile or handle" name="socialMedia" /><label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Contact basis</span><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" defaultValue="public_business_contact" name="contactBasis"><option value="public_business_contact">Public business contact</option><option value="referral">Referral</option><option value="prior_relationship">Prior relationship</option><option value="inbound_consent">Inbound consent</option><option value="customer">Current customer</option><option value="unknown">Not verified yet</option></select></label><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2" type="submit">Add to research queue</button></form></div></details>
          <details className="rounded-2xl border border-slate-200 bg-white" id="research"><summary className="cursor-pointer list-none p-4 font-bold text-slate-950">＋ Research preview <span className="ml-2 text-xs font-normal text-slate-500">HUNTER tools</span></summary><div className="border-t border-slate-200 p-4"><HunterSearch /></div></details>
        </div>
      </div>
    </SurfaceShell>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) { return <a className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white" href={href}>{children}</a>; }
function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "blue" | "amber" }) { const tones = { slate: "border-slate-200 bg-white", blue: "border-blue-200 bg-blue-50", amber: "border-amber-200 bg-amber-50" }; return <div className={`rounded-xl border p-4 ${tones[tone]}`}><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p></div>; }
function Field({ label, name, placeholder, required, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) { return <label><span className="text-sm font-medium text-slate-700">{label}</span><input className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" name={name} placeholder={placeholder} required={required} type={type} /></label>; }
function StageBadge({ status }: { status: SalesProspectStatus }) { const warm = ["new", "researching", "review_ready"].includes(status); return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${warm ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{humanize(status)}</span>; }
function humanize(value: string) { const words = value.replaceAll("_", " "); return words.charAt(0).toUpperCase() + words.slice(1); }
async function getCurrentTimestamp() { return Date.now(); }
