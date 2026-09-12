import Link from "next/link";
import {
  noteRecordHref,
  noteRecordKindLabel,
  noteRecordValue,
  notesForRecord,
  type NoteRecordRef,
  type noteRecordOptions,
} from "@/lib/lions-den/note-links";
import { createOrganizationNote } from "@/server/notes/actions";
import type { OrganizationNote } from "@/server/notes/queries";

type LionsDenNotesBoardProps = {
  organizationId: string;
  notes: OrganizationNote[];
  canCreate: boolean;
  spanish: boolean;
  compact?: boolean;
  returnTo?: string;
  /** Prospects and clients the owner can pin a note to. */
  records?: ReturnType<typeof noteRecordOptions>;
  /** When set, the board shows only notes about this record. */
  filterRecord?: NoteRecordRef | null;
  allNotesHref?: string;
};

/** Chip that takes the owner from a note to the prospect or client it is about. */
export function NoteRecordChip({ note, spanish }: { note: OrganizationNote; spanish: boolean }) {
  if (!note.recordKind || !note.recordId) return null;
  return (
    <Link
      className="rounded-full border border-[#d8c27a] bg-[#fff8e6] px-2 py-0.5 text-[11px] font-semibold text-[#071b42] hover:border-[#071b42]"
      data-note-record
      href={noteRecordHref({ kind: note.recordKind, id: note.recordId })}
    >
      {note.recordName ?? noteRecordKindLabel(note.recordKind, spanish)} · {noteRecordKindLabel(note.recordKind, spanish)}
    </Link>
  );
}

export function LionsDenNotesBoard({
  organizationId,
  notes,
  canCreate,
  spanish,
  compact = false,
  returnTo,
  records,
  filterRecord = null,
  allNotesHref,
}: LionsDenNotesBoardProps) {
  const scoped = notesForRecord(notes, filterRecord);
  const visibleNotes = compact ? scoped.slice(0, 6) : scoped;
  const filterName = filterRecord ? scoped[0]?.recordName ?? null : null;

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
            ? "Cada nota puede ir sobre un prospecto o cliente; aparece también en su ficha. Un seguimiento con fecha se vuelve su próximo paso en Seguimiento y Calendario. Menciona @Atlas si el personal debe verla."
            : "Pin a note to a prospect or client and it shows on their record too. A follow-up with a date becomes their next step on Follow-up and Calendar. Mention @Atlas if staff should see it."}
        </p>
        {filterRecord ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#071b42]" data-notes-filter>
            <span className="font-semibold">
              {spanish ? "Notas sobre " : "Notes about "}
              {filterName ?? noteRecordKindLabel(filterRecord.kind, spanish)}
            </span>
            <Link className="underline" href={noteRecordHref(filterRecord)}>
              {spanish ? "Abrir ficha" : "Open record"}
            </Link>
            {allNotesHref ? (
              <Link className="underline" href={allNotesHref}>
                {spanish ? "Ver todas" : "Show all"}
              </Link>
            ) : null}
          </p>
        ) : null}
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
            <label className="block">
              <span className="text-sm font-medium text-[#071b42]">{spanish ? "Sobre quién" : "About"}</span>
              <select
                className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
                data-note-record-select
                defaultValue={noteRecordValue(filterRecord)}
                name="record"
              >
                <option value="">{spanish ? "Solo el escritorio" : "Just the desk"}</option>
                {records && records.prospects.length > 0 ? (
                  <optgroup label={records.prospectsLabel}>
                    {records.prospects.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {records && records.clients.length > 0 ? (
                  <optgroup label={records.clientsLabel}>
                    {records.clients.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#071b42]">
                {spanish ? "Fecha (solo para seguimiento)" : "Due date (follow-up only)"}
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[#d5d0c4] bg-white px-4 py-3 text-sm text-[#071b42]"
                name="dueDate"
                type="date"
              />
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
                <NoteRecordChip note={note} spanish={spanish} />
                {note.dueDate ? (
                  <span className="text-[11px] font-semibold text-[#1246a0]">
                    {spanish ? "Para el " : "Due "}
                    {note.dueDate}
                  </span>
                ) : null}
                <span className="text-[11px] text-[#5c6578]">{note.createdAt.slice(0, 10)}</span>
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
