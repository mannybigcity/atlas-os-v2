import Link from "next/link";
import { notFound } from "next/navigation";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
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

  return (
    <LionsDenBoardScreen board="overview" workspace={workspace}>
      <div className="space-y-5">
        <Link className="text-sm font-semibold text-[#071b42] underline" href="/client">← SIS party pipeline</Link>
        <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">{party.stage.replaceAll("_", " ")}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#071b42]">{party.hostName}</h2>
              <p className="mt-2 text-sm text-[#33415c]">{party.partyType ?? "Door-hanger paint party"} · {party.guestCount ?? "Guest count TBD"} guests</p>
            </div>
            <div className="rounded-2xl bg-[#071b42] px-5 py-4 text-white">
              <p className="text-xs text-white/70">Deposit</p>
              <p className="mt-1 text-lg font-semibold capitalize">{party.depositStatus}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Data label="Party date" value={formatDate(party.partyStartsAt)} />
            <Data label="Location" value={[party.venueType, party.address, party.city].filter(Boolean).join(", ") || "To confirm"} />
            <Data label="Calendar" value={party.calendarStatus.replaceAll("_", " ")} />
            <Data label="Customer confirmation" value={party.customerConfirmationStatus.replaceAll("_", " ")} />
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">Action plan</p>
            <h3 className="mt-2 text-xl font-semibold text-[#071b42]">{party.nextAction ?? "Next action required"}</h3>
            <p className="mt-2 text-sm text-[#33415c]">Due {formatDate(party.nextActionDue)}</p>
            <div className="mt-5 divide-y divide-[#ece7d8]">
              {party.tasks.map((task) => (
                <div className="py-3" key={task.id}>
                  <p className="text-sm font-semibold text-[#071b42]">{task.title}</p>
                  <p className="mt-1 text-xs text-[#5c6578]">{formatDate(task.dueAt)}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">Payment & prep</p>
            <div className="mt-4 space-y-4">
              <Data label="Quote / total due" value={party.totalDue === null ? "Not set" : `$${Number(party.totalDue).toFixed(2)}`} />
              <Data label="Amount paid" value={`$${Number(party.amountPaid).toFixed(2)}`} />
              <Data label="Balance due" value={`$${balance.toFixed(2)}`} />
              <Data label="Theme / style" value={party.doorHangerTheme ?? "To confirm"} />
            </div>
          </article>
        </section>
        <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">Activity timeline</p>
          <div className="mt-4 divide-y divide-[#ece7d8]">
            {party.activities.length ? party.activities.map((activity) => (
              <div className="py-3" key={activity.id}>
                <p className="text-sm font-medium text-[#071b42]">{activity.summary}</p>
                <p className="mt-1 text-xs text-[#5c6578]">{activity.eventType.replaceAll("_", " ")} · {formatDate(activity.createdAt)}</p>
              </div>
            )) : <p className="py-4 text-sm text-[#5c6578]">No activity has been logged for this party yet.</p>}
          </div>
        </section>
      </div>
    </LionsDenBoardScreen>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fbfaf4] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-[#071b42]">{value}</p>
    </div>
  );
}
