import { createOrganizationNote } from "@/server/notes/actions";
import type { OrganizationNote } from "@/server/notes/queries";

type LionsDenNotesBoardProps = {
  organizationId: string;
  notes: OrganizationNote[];
  canCreate: boolean;
  spanish: boolean;
  compact?: boolean;
  returnTo?: string;
};

export function LionsDenNotesBoard({
  organizationId,
  notes,
  canCreate,
  spanish,
  compact = false,
  returnTo,
}: LionsDenNotesBoardProps) {
  const visibleNotes = compact ? notes.slice(0, 6) : notes;

  if (compact) {
    return (
      <section className="ld-notes ld-panel">
        <div className="ld-panel-head">
          <p>{spanish ? "Notas" : "Notes"}</p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5c6578]">
            {notes.length}
          </span>
        </div>
        <div className="ld-panel-body">
          {visibleNotes.length === 0 ? (
            <p className="ld-empty">
              {spanish ? "Todavía no hay notas en el escritorio." : "No notes on the desk yet."}
            </p>
          ) : (
            visibleNotes.map((note) => (
              <article className="border-b border-[#ece7d8] py-1.5 last:border-b-0" key={note.id}>
                <h3 className="truncate text-sm font-semibold text-[#071b42]">{note.title}</h3>
                {note.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#33415c]">{note.body}</p>
                ) : null}
              </article>
            ))
          )}
          {canCreate ? (
            <form action={createOrganizationNote} className="mt-2 space-y-1.5 border-t border-[#ece7d8] pt-2">
              <input name="organizationId" type="hidden" value={organizationId} />
              {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
              <input
                aria-label={spanish ? "Título" : "Title"}
                className="w-full rounded-md border border-[#d5d0c4] px-2 py-1 text-xs text-[#071b42]"
                name="title"
                placeholder={spanish ? "Título" : "Title"}
                required
              />
              <textarea
                aria-label={spanish ? "Nota" : "Note"}
                className="min-h-12 w-full rounded-md border border-[#d5d0c4] px-2 py-1 text-xs leading-4 text-[#071b42]"
                name="body"
                placeholder={spanish ? "Escribe la nota. No se envía a nadie." : "Write the note. Nobody is contacted."}
                required
              />
              <button className="rounded-md bg-[#071b42] px-2.5 py-1 text-xs font-semibold text-white" type="submit">
                {spanish ? "Guardar" : "Save"}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    );
  }

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
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#071b42]">{spanish ? "Tipo" : "Type"}</span>
              <select
                className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
                defaultValue="general"
                name="noteType"
              >
                <option value="general">{spanish ? "General" : "General"}</option>
                <option value="follow-up">{spanish ? "Seguimiento" : "Follow-up"}</option>
                <option value="call">{spanish ? "Llamada" : "Call"}</option>
                <option value="meeting">{spanish ? "Reunión" : "Meeting"}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#071b42]">{spanish ? "Atención" : "Attention"}</span>
              <select
                className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
                defaultValue="desk"
                name="attention"
              >
                <option value="desk">{spanish ? "Queda en el escritorio" : "Stay on the desk"}</option>
                <option value="atlas">{spanish ? "Pedir a Atlas (@Atlas)" : "Ask Atlas (@Atlas)"}</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block">
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

      {visibleNotes.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          <p className="font-semibold">{spanish ? "Todavía no hay notas en el escritorio." : "No notes on the desk yet."}</p>
          <p className="mt-2">
            {spanish ? "Escribe la primera cuando necesites un recordatorio." : "Write the first one when you need a reminder."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotes.map((note) => (
            <article className="rounded-[1.4rem] border border-[#d8c27a] bg-white p-4" key={note.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#071b42]">{note.title}</h3>
                {note.attentionRequested ? (
                  <span className="rounded-full bg-[#fff8e6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6a12]">
                    {spanish ? "Atención" : "Attention"}
                  </span>
                ) : null}
              </div>
              {note.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#33415c]">{note.body}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
