import Link from "next/link";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { noteRecordValue, type NoteRecordRef } from "@/lib/lions-den/note-links";
import { createOrganizationNote } from "@/server/notes/actions";
import { getOrganizationNotes } from "@/server/notes/queries";

type LinkedNotesPanelProps = {
  organizationId: string;
  record: NoteRecordRef;
  recordName: string;
  /** Path of the page this panel sits on; the note form returns here. */
  returnPath: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
  canCreate?: boolean;
};

/**
 * The notes about one prospect or client, on their own record page. Same rows
 * as the Notes board, filtered. Writing one here pins it to this record.
 */
export async function LinkedNotesPanel({
  organizationId,
  record,
  recordName,
  returnPath,
  previewOrgSlug,
  workspaceSlug,
  spanish,
  canCreate = true,
}: LinkedNotesPanelProps) {
  const result = await getOrganizationNotes(organizationId, { recordId: record.id, limit: 20 });
  const notes = result.setupRequired ? [] : result.data;
  const scope = new URLSearchParams();
  if (previewOrgSlug) scope.set("previewOrg", previewOrgSlug);
  if (workspaceSlug) scope.set("workspace", workspaceSlug);
  const returnTo = scope.toString() ? `${returnPath}?${scope.toString()}` : returnPath;
  const notesHref = lionsDenHref("/client/notes", previewOrgSlug, workspaceSlug);
  const allHref = `${notesHref}${notesHref.includes("?") ? "&" : "?"}record=${noteRecordValue(record)}`;
  const fieldClass = "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42]";

  return (
    <section className="mt-4 rounded-2xl border border-[#ece7d8] bg-white p-4" data-linked-notes>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
          {spanish ? "Notas sobre " : "Notes about "}
          {recordName}
        </p>
        <Link className="text-xs font-semibold text-[#071b42] underline" href={allHref}>
          {spanish ? "Ver en Notas" : "See on Notes"}
        </Link>
      </div>

      {notes.length === 0 ? (
        <p className="mt-2 text-sm text-[#5c6578]">
          {spanish ? "Aún no hay notas sobre esta ficha." : "No notes about this record yet."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((note) => (
            <li className="rounded-xl border border-[#ece7d8] p-3" key={note.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#071b42]">{note.title}</p>
                <span className="text-[11px] text-[#5c6578]">{note.createdAt.slice(0, 10)}</span>
                {note.dueDate ? (
                  <span className="text-[11px] font-semibold text-[#1246a0]">
                    {spanish ? "Para el " : "Due "}
                    {note.dueDate}
                  </span>
                ) : null}
              </div>
              {note.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-[#33415c]">{note.body}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {canCreate ? (
        <form action={createOrganizationNote} className="mt-4 grid gap-2 sm:grid-cols-2" data-linked-note-form>
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="record" type="hidden" value={noteRecordValue(record)} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <input name="attention" type="hidden" value="desk" />
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Tipo" : "Type"}
            <select className={fieldClass} defaultValue="general" name="noteType">
              <option value="general">General</option>
              <option value="follow-up">{spanish ? "Seguimiento" : "Follow-up"}</option>
              <option value="call">{spanish ? "Llamada" : "Call"}</option>
              <option value="meeting">{spanish ? "Reunión" : "Meeting"}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Fecha (solo seguimiento)" : "Due date (follow-up only)"}
            <input className={fieldClass} name="dueDate" type="date" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
            {spanish ? "Título" : "Title"}
            <input className={fieldClass} name="title" placeholder={spanish ? "Qué hay que recordar" : "What to remember"} required />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
            {spanish ? "Nota" : "Note"}
            <textarea
              className={fieldClass}
              name="body"
              placeholder={spanish ? "Escribe la nota. No se envía a nadie." : "Write the note. Nobody is contacted."}
              required
              rows={3}
            />
          </label>
          <button
            className="w-fit rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold !text-white"
            type="submit"
          >
            {spanish ? "Guardar nota aquí" : "Save note here"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
