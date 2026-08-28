import { ClientCalendar } from "@/components/clients-calendar";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { SisPartyEventSummary } from "@/server/sis-workspace/queries";

type LionsDenCalendarBoardProps = {
  organizationId: string;
  prospects: OrganizationOpportunity[];
  partyEvents: SisPartyEventSummary[];
  spanish: boolean;
};

export function LionsDenCalendarBoard({
  organizationId,
  prospects,
  partyEvents,
  spanish,
}: LionsDenCalendarBoardProps) {
  const contextOptions = [
    ...prospects.map((item) => ({
      id: item.id,
      label: item.name,
      href: "/client/prospects",
    })),
    ...partyEvents.map((item) => ({
      id: item.id,
      label: item.hostName,
      href: `/client/sis/party/${item.id}`,
    })),
  ];
  const followUpItems = [
    ...prospects
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `prospect-${item.id}`,
        title: item.name,
        notes: item.nextAction ?? "",
        dateTime: `${item.nextActionDue}T17:00:00`,
        reminderOffsetMinutes: 120,
        kind: "task" as const,
        contextId: item.id,
        contextLabel: item.name,
        contextHref: "/client/prospects",
        source: "follow-up" as const,
      })),
    ...partyEvents
      .filter((item) => item.nextActionDue)
      .map((item) => ({
        id: `party-${item.id}`,
        title: item.hostName,
        notes: item.nextAction ?? "",
        dateTime: `${item.nextActionDue}T17:00:00`,
        reminderOffsetMinutes: 120,
        kind: "event" as const,
        contextId: item.id,
        contextLabel: item.hostName,
        contextHref: `/client/sis/party/${item.id}`,
        source: "follow-up" as const,
      })),
  ];

  return (
    <section className="space-y-5">
      <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
          {spanish ? "Calendario" : "Calendar"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
          {spanish ? "Fechas de trabajo" : "Working dates"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Solo fechas que ya existen en el espacio. Si está vacío, aún no hay nada que mostrar."
            : "Only dates already in the workspace. If it is empty, there is nothing to show yet."}
        </p>
      </article>
      <ClientCalendar
        contextOptions={contextOptions}
        followUpItems={followUpItems}
        storageKey={`lions-den-calendar:${organizationId}`}
      />
    </section>
  );
}
