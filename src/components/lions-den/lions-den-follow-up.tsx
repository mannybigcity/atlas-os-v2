import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import type { SisInboxTask } from "@/server/sis-workspace/queries";

type LionsDenFollowUpBoardProps = {
  prospects: OrganizationOpportunity[];
  inboxTasks: SisInboxTask[];
  spanish: boolean;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function LionsDenFollowUpBoard({
  prospects,
  inboxTasks,
  spanish,
}: LionsDenFollowUpBoardProps) {
  const dueProspects = prospects.filter((item) => item.nextAction);
  const empty = dueProspects.length === 0 && inboxTasks.length === 0;

  return (
    <section className="space-y-5">
      <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
          {spanish ? "Seguimiento" : "Follow-up"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
          {spanish ? "La próxima acción visible" : "The next action, kept visible"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Esta cola no envía mensajes. El vendedor llama o escribe cuando tú lo decidas."
            : "This queue does not send messages. The salesman calls or writes when you decide."}
        </p>
      </article>

      {empty ? (
        <div className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "Todavía no hay seguimientos." : "Nothing in it yet."}</p>
          <p className="mt-2">
            {spanish
              ? "Acepta un prospecto o agrega una consulta de fiesta y la próxima acción aparecerá aquí."
              : "Accept a prospect or add a party inquiry and the next action will show here."}
          </p>
        </div>
      ) : null}

      {dueProspects.length > 0 ? (
        <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5">
          <h3 className="text-lg font-semibold text-[#071b42]">
            {spanish ? "Prospectos" : "Prospects"}
          </h3>
          <div className="mt-4 divide-y divide-[#ece7d8]">
            {dueProspects.map((item) => (
              <div className="py-3" key={item.id}>
                <p className="font-semibold text-[#071b42]">{item.name}</p>
                <p className="mt-1 text-sm text-[#33415c]">{item.nextAction}</p>
                {item.nextActionDue ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#5c6578]">
                    {formatDate(item.nextActionDue)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {inboxTasks.length > 0 ? (
        <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5">
          <h3 className="text-lg font-semibold text-[#071b42]">
            {spanish ? "Tareas de fiesta" : "Party tasks"}
          </h3>
          <div className="mt-4 divide-y divide-[#ece7d8]">
            {inboxTasks.map((task) => (
              <div className="py-3" key={task.id}>
                <p className="font-semibold text-[#071b42]">{task.title}</p>
                <p className="mt-1 text-xs text-[#5c6578]">
                  {task.party?.hostName ?? (spanish ? "Fiesta" : "Party")}
                  {task.dueAt ? ` · ${formatDate(task.dueAt)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
