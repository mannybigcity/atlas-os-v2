import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientPortalShell } from "@/components/client-portal-shell";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getSisPartyEventDetail } from "@/server/sis-workspace/queries";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not scheduled";
}

export default async function SisPartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getClientWorkspaceContext(`/client/sis/party/${id}`);
  if (workspace.primaryOrganization?.slug !== "sis-custom-creations") notFound();
  const result = await getSisPartyEventDetail(workspace.primaryOrganization.id, id);
  if (result.setupRequired) throw new Error(result.error);
  if (!result.data) notFound();
  const party = result.data;
  const balance = Math.max(0, Number(party.totalDue ?? 0) - Number(party.amountPaid));

  return <ClientPortalShell organizationName="SIS Custom Creations" eyebrow="SIS party operations" description="Private event record, timeline, tasks, and payment readiness." fullWidth>
    <div className="mx-auto max-w-7xl space-y-5">
      <Link className="text-sm font-semibold text-[#5672f0] hover:underline" href="/client">← SIS party pipeline</Link>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">{party.stage.replaceAll("_", " ")}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-slate-950">{party.hostName}</h2><p className="mt-2 text-sm text-slate-600">{party.partyType ?? "Door-hanger paint party"} · {party.guestCount ?? "Guest count TBD"} guests</p></div><div className="rounded-2xl bg-slate-950 px-5 py-4 text-white"><p className="text-xs text-slate-300">Deposit</p><p className="mt-1 text-lg font-semibold capitalize">{party.depositStatus}</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Data label="Party date" value={formatDate(party.partyStartsAt)} /><Data label="Location" value={[party.venueType, party.address, party.city].filter(Boolean).join(", ") || "To confirm"} /><Data label="Calendar" value={party.calendarStatus.replaceAll("_", " ")} /><Data label="Customer confirmation" value={party.customerConfirmationStatus.replaceAll("_", " ")} /></div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_.8fr]"><article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Action plan</p><h3 className="mt-2 text-xl font-semibold text-slate-950">{party.nextAction ?? "Next action required"}</h3><p className="mt-2 text-sm text-slate-600">Due {formatDate(party.nextActionDue)}</p><div className="mt-5 divide-y divide-slate-100">{party.tasks.map((task) => <div className="py-3" key={task.id}><p className="text-sm font-semibold text-slate-950">{task.title}</p><p className="mt-1 text-xs text-slate-500">{formatDate(task.dueAt)}</p></div>)}</div></article><article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Payment & prep</p><div className="mt-4 space-y-4"><Data label="Quote / total due" value={party.totalDue === null ? "Not set" : `$${Number(party.totalDue).toFixed(2)}`} /><Data label="Amount paid" value={`$${Number(party.amountPaid).toFixed(2)}`} /><Data label="Balance due" value={`$${balance.toFixed(2)}`} /><Data label="Theme / style" value={party.doorHangerTheme ?? "To confirm"} /></div></article></section>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">Activity timeline</p><div className="mt-4 divide-y divide-slate-100">{party.activities.length ? party.activities.map((activity) => <div className="py-3" key={activity.id}><p className="text-sm font-medium text-slate-950">{activity.summary}</p><p className="mt-1 text-xs text-slate-500">{activity.eventType.replaceAll("_", " ")} · {formatDate(activity.createdAt)}</p></div>) : <p className="py-4 text-sm text-slate-500">No activity has been logged for this party yet.</p>}</div></section>
    </div>
  </ClientPortalShell>;
}

function Data({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{value}</p></div>; }
