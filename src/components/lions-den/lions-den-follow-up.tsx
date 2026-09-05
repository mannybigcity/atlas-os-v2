import Link from "next/link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { SisInboxTask, SisPartyEventSummary } from "@/server/sis-workspace/queries";
import { bucketFollowUpQueues, type DeskFollowUpItem } from "@/lib/lions-den/desk-queue";
import { prospectDetailPath } from "@/lib/lions-den/prospect-places";

type LionsDenFollowUpBoardProps = {
  prospects: OrganizationOpportunity[];
  inboxTasks: SisInboxTask[];
  partyEvents?: SisPartyEventSummary[];
  spanish: boolean;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function LionsDenFollowUpBoard({
  prospects,
  inboxTasks,
  partyEvents = [],
  spanish,
}: LionsDenFollowUpBoardProps) {
  const items: DeskFollowUpItem[] = [
    ...prospects
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `prospect-${item.id}`,
        title: item.name,
        detail: item.nextAction,
        dueAt: item.nextActionDue!,
        href: prospectDetailPath(item.id),
      })),
    ...partyEvents
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `party-${item.id}`,
        title: item.hostName,
        detail: item.nextAction,
        dueAt: item.nextActionDue!,
        href: `/client/sis/party/${item.id}`,
      })),
    ...inboxTasks
      .filter((item) => item.dueAt)
      .map((item) => ({
        id: `task-${item.id}`,
        title: item.title,
        detail: item.party?.hostName ?? (spanish ? "Fiesta" : "Party"),
        dueAt: item.dueAt!,
      })),
  ];
  const queues = bucketFollowUpQueues(items);
  const empty =
    queues.overdue.length === 0 &&
    queues.today.length === 0 &&
    queues.tomorrow.length === 0 &&
    queues.later.length === 0;

  return (
    <section className="space-y-5">
      <article className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
          {spanish ? "Seguimiento" : "Follow-up"}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-ui)] text-3xl font-extrabold uppercase tracking-[0.04em] text-[#071b42]">
          {spanish ? "LA FORTUNA ESTÁ EN EL SEGUIMIENTO" : "THE FORTUNE IS IN THE FOLLOW-UP"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Esta cola no envía mensajes. El vendedor llama o escribe cuando tú lo decidas."
            : "This queue does not send messages. The salesman calls or writes when you decide."}
        </p>
      </article>

      {empty ? (
        <div className="rounded-[1.2rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "Cola despejada." : "Queue clear."}</p>
          <p className="mt-2">
            {spanish
              ? "Acepta un prospecto o agrega una consulta de fiesta y la próxima acción aparecerá aquí."
              : "Accept a prospect or add a party inquiry and the next action will show here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <QueueCard
            items={[...queues.overdue, ...queues.today]}
            label={spanish ? "Hoy" : "Today"}
            overdueIds={new Set(queues.overdue.map((item) => item.id))}
            spanish={spanish}
          />
          <QueueCard items={queues.tomorrow} label={spanish ? "Mañana" : "Tomorrow"} spanish={spanish} />
        </div>
      )}

      {queues.later.length > 0 ? (
        <article className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
          <h3 className="text-lg font-semibold text-[#071b42]">
            {spanish ? "Más adelante" : "Later"}
          </h3>
          <div className="mt-4 divide-y divide-[#ece7d8]">
            {queues.later.map((item) => (
              <FollowUpRow item={item} key={item.id} />
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function QueueCard({
  items,
  label,
  overdueIds,
  spanish,
}: {
  items: DeskFollowUpItem[];
  label: string;
  overdueIds?: Set<string>;
  spanish: boolean;
}) {
  return (
    <article className="rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#071b42]">{label}</h3>
        <span className="rounded-full bg-[#fbfaf4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c6578]">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#5c6578]">
          {spanish ? "Cola despejada." : "Queue clear."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[#ece7d8]">
          {items.map((item) => (
            <FollowUpRow
              item={item}
              key={item.id}
              overdue={overdueIds?.has(item.id)}
              overdueLabel={spanish ? "Atrasado" : "Overdue"}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function FollowUpRow({
  item,
  overdue,
  overdueLabel,
}: {
  item: DeskFollowUpItem;
  overdue?: boolean;
  overdueLabel?: string;
}) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[#071b42]">{item.title}</p>
        {overdue ? (
          <span className="rounded-full bg-[#fff1f1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a1f1f]">
            {overdueLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? <p className="mt-1 text-sm text-[#33415c]">{item.detail}</p> : null}
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#5c6578]">{formatDate(item.dueAt)}</p>
    </>
  );

  if (item.href) {
    return (
      <Link className="block py-3" href={item.href}>
        {body}
      </Link>
    );
  }

  return <div className="py-3">{body}</div>;
}
