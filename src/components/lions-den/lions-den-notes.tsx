import { createOrganizationNote } from "@/server/notes/actions";
import type { OrganizationNote } from "@/server/notes/queries";

type LionsDenNotesBoardProps = {
  organizationId: string;
  notes: OrganizationNote[];
  canCreate: boolean;
  spanish: boolean;
};

export function LionsDenNotesBoard({
  organizationId,
  notes,
  canCreate,
  spanish,
}: LionsDenNotesBoardProps) {
  return (
    <section className="space-y-5">
      <article className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
          {spanish ? "Notas" : "Notes"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
          {spanish ? "Notas internas del espacio" : "Internal workspace notes"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Estas notas se quedan en The Lion’s Den. Menciona @Atlas si el personal debe verlas."
            : "These notes stay in The Lion’s Den. Mention @Atlas if staff should see them."}
        </p>
      </article>

      {canCreate ? (
        <form action={createOrganizationNote} className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label className="block">
            <span className="text-sm font-medium text-[#071b42]">{spanish ? "Título" : "Title"}</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#d5d0c4] px-4 py-3 text-sm text-[#071b42]"
              name="title"
              placeholder={spanish ? "Qué hay que recordar" : "What to remember"}
              required
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-[#071b42]">{spanish ? "Nota" : "Note"}</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-[#d5d0c4] px-4 py-3 text-sm leading-6 text-[#071b42]"
              name="body"
              placeholder={spanish ? "Escribe la nota. No se envía a nadie." : "Write the note. Nobody is contacted."}
              required
            />
          </label>
          <button className="mt-4 rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white" type="submit">
            {spanish ? "Guardar nota" : "Save note"}
          </button>
        </form>
      ) : null}

      {notes.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "Todavía no hay notas en el escritorio." : "No notes on the desk yet."}</p>
          <p className="mt-2">
            {spanish ? "Escribe la primera cuando necesites un recordatorio." : "Write the first one when you need a reminder."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article className="rounded-[1.4rem] border border-[#d8c27a] bg-white p-4" key={note.id}>
              <h3 className="font-semibold text-[#071b42]">{note.title}</h3>
              {note.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#33415c]">{note.body}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
