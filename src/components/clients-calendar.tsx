"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import type { SiteLanguage } from "@/lib/site-language";

type CalendarContextOption = {
  id: string;
  label: string;
  href: string;
};

type CalendarSeedItem = {
  id: string;
  title: string;
  notes: string;
  dateTime: string;
  reminderOffsetMinutes: number;
  kind: "event" | "task";
  contextId: string | null;
  contextLabel: string | null;
  contextHref: string | null;
  source: "follow-up" | "local";
};

type CalendarDraft = {
  id: string | null;
  title: string;
  notes: string;
  date: string;
  time: string;
  reminderOffsetMinutes: string;
  kind: "event" | "task";
  contextId: string;
};

type ClientsCalendarProps = {
  contextOptions: CalendarContextOption[];
  followUpItems: CalendarSeedItem[];
  storageKey?: string;
  tone?: "crm" | "desk";
};

const defaultDraft: CalendarDraft = {
  id: null,
  title: "",
  notes: "",
  date: "",
  time: "09:00",
  reminderOffsetMinutes: "120",
  kind: "task",
  contextId: "",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}
function toLocalDateValue(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalTimeValue(value: string) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(startOfDay(date), -day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function parseStoredItems(raw: string | null): CalendarSeedItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean).map((item) => ({
      id: String(item.id ?? crypto.randomUUID()),
      title: String(item.title ?? "").slice(0, 200),
      notes: String(item.notes ?? "").slice(0, 2000),
      dateTime: String(item.dateTime ?? ""),
      reminderOffsetMinutes: Number(item.reminderOffsetMinutes ?? 120),
      kind: item.kind === "event" ? "event" : "task",
      contextId: item.contextId ? String(item.contextId) : null,
      contextLabel: item.contextLabel ? String(item.contextLabel) : null,
      contextHref: item.contextHref ? String(item.contextHref) : null,
      source: "local",
    }));
  } catch {
    return [];
  }
}

function localeFor(language: SiteLanguage) {
  return language === "es" ? "es-US" : "en-US";
}

function formatMonthLabel(date: Date, language: SiteLanguage) {
  return new Intl.DateTimeFormat(localeFor(language), {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date, language: SiteLanguage) {
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function calendarTone(tone: "crm" | "desk") {
  const desk = tone === "desk";
  return {
    section: desk
      ? "rounded-[1.2rem] border border-[#d5d0c4] bg-white p-5"
      : "rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]",
    kicker: desk ? "text-[#071b42]" : "text-[#5672f0]",
    title: desk ? "text-[#071b42]" : "text-slate-950",
    body: desk ? "text-[#33415c]" : "text-slate-600",
    activeBtn: desk ? "bg-[#071b42] text-[#f5b932]" : "bg-[#5672f0] text-white",
    idleBtn: desk
      ? "border border-[#d5d0c4] bg-white text-[#071b42] hover:border-[#071b42]"
      : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
    panel: desk ? "rounded-[1.1rem] border border-[#ece7d8] bg-[#fbfaf4] p-4" : "rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4",
    activeCell: desk ? "border-[#071b42] bg-white shadow-sm" : "border-[#5672f0] bg-white shadow-sm",
    idleCell: desk
      ? "border-[#ece7d8] bg-white hover:border-[#d8c27a] hover:bg-white"
      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
    badge: desk
      ? "rounded-full bg-[#fff8e6] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#071b42]"
      : "rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#5672f0]",
    chip: desk
      ? "rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]"
      : "rounded-full bg-[#eef3ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5672f0]",
    submit: desk
      ? "rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c2b63]"
      : "rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#465fd1]",
    focus: desk
      ? "focus:border-[#f5b932] focus:ring-4 focus:ring-[#f5b932]/20"
      : "focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]",
    muted: desk ? "text-[#5c6578]" : "text-slate-500",
    field: desk
      ? "border-[#d5d0c4] text-[#071b42]"
      : "border-slate-300 text-slate-950",
  };
}

export function ClientsCalendar({
  contextOptions,
  followUpItems,
  storageKey = "atlas-clients-calendar-v1",
  tone = "crm",
}: ClientsCalendarProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const skin = calendarTone(tone);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"month" | "week" | "day" | "year">("month");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [draft, setDraft] = useState<CalendarDraft>(defaultDraft);
  const [localItems, setLocalItems] = useState<CalendarSeedItem[]>([]);

  useEffect(() => {
    try {
      setLocalItems(parseStoredItems(window.localStorage.getItem(storageKey)));
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(localItems));
  }, [hydrated, localItems, storageKey]);

  const allItems = useMemo(
    () =>
      [...followUpItems, ...localItems]
        .filter((item) => Boolean(item.dateTime))
        .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime()),
    [followUpItems, localItems],
  );

  const selectedKey = toDateKeyFromDate(selectedDate);
  const selectedItems = allItems.filter((item) => toDateKey(item.dateTime) === selectedKey);
  const weekStart = startOfWeek(selectedDate);
  const monthStart = startOfMonth(selectedDate);
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthStart, -monthStart.getDay() + index));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const yearMonths = Array.from({ length: 12 }, (_, index) => ({
    date: new Date(selectedDate.getFullYear(), index, 1),
    monthIndex: index,
  }));

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.date || !draft.time) {
      return;
    }

    const context = contextOptions.find((item) => item.id === draft.contextId) ?? null;
    const localRecord: CalendarSeedItem = {
      id: draft.id ?? crypto.randomUUID(),
      title: draft.title.trim().slice(0, 200),
      notes: draft.notes.trim().slice(0, 2000),
      dateTime: new Date(`${draft.date}T${draft.time}:00`).toISOString(),
      reminderOffsetMinutes: Number(draft.reminderOffsetMinutes || "120"),
      kind: draft.kind,
      contextId: context?.id ?? null,
      contextLabel: context?.label ?? null,
      contextHref: context?.href ?? null,
      source: "local",
    };

    setLocalItems((current) => {
      const next = current.filter((item) => item.id !== localRecord.id);
      next.push(localRecord);
      return next.sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());
    });
    setDraft(defaultDraft);
  }

  function editItem(item: CalendarSeedItem) {
    setDraft({
      id: item.id,
      title: item.title,
      notes: item.notes,
      date: toLocalDateValue(item.dateTime),
      time: toLocalTimeValue(item.dateTime),
      reminderOffsetMinutes: String(item.reminderOffsetMinutes),
      kind: item.kind,
      contextId: item.contextId ?? "",
    });
    setSelectedDate(new Date(item.dateTime));
    setView("day");
  }

  function removeItem(id: string) {
    setLocalItems((current) => current.filter((item) => item.id !== id));
    if (draft.id === id) {
      setDraft(defaultDraft);
    }
  }

  function toggleCompleted(id: string) {
    setLocalItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              notes: item.notes
                ? `${item.notes}\n\n${spanish ? "Marcado como completado localmente." : "Marked complete locally."}`
                : spanish ? "Marcado como completado localmente." : "Marked complete locally.",
            }
          : item,
      ),
    );
  }

  const viewLabel = useMemo(() => {
    if (view === "month") return formatMonthLabel(selectedDate, language);
    if (view === "year") return String(selectedDate.getFullYear());
    if (view === "week") return `${formatShortDate(weekStart, language)} - ${formatShortDate(addDays(weekStart, 6), language)}`;
    return formatShortDate(selectedDate, language);
  }, [language, selectedDate, view, weekStart]);

  const yearViewItems = useMemo(
    () =>
      yearMonths.map((month) => ({
        label: formatMonthLabel(month.date, language),
        monthIndex: month.monthIndex,
        count: allItems.filter(
          (item) =>
            new Date(item.dateTime).getFullYear() === month.date.getFullYear() &&
            new Date(item.dateTime).getMonth() === month.date.getMonth(),
        ).length,
      })),
    [allItems, language, yearMonths],
  );

  const gridViewItems = useMemo(() => {
    const dates = view === "week" ? weekDays : view === "month" ? monthDays : [selectedDate];
    return dates.map((date) => ({
      date,
      items: allItems.filter((item) => sameDay(new Date(item.dateTime), date)),
    }));
  }, [allItems, monthDays, selectedDate, view, weekDays]);

  return (
    <section className={skin.section}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${skin.kicker}`}>
            {spanish ? "Calendario" : "Calendar"}
          </p>
          <h3 className={`mt-2 text-2xl font-semibold tracking-[-0.05em] ${skin.title}`}>
            {spanish ? "Mes, Semana, Día, Año" : "Month, Week, Day, Year"}
          </h3>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${skin.body}`}>
            {spanish
              ? "Solo recordatorios locales del dispositivo. Los seguimientos del CRM aparecen aquí, y puedes agregar o editar tus propios recordatorios sin afirmar que están sincronizados con correo electrónico o SMS."
              : "Device-local reminders only. Follow-up items from the CRM appear here, and you can add or edit your own reminder state without pretending it is synced to email or SMS."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["month", "week", "day", "year"] as const).map((item) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === item ? skin.activeBtn : skin.idleBtn
              }`}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
            {{ month: spanish ? "Mes" : "Month", week: spanish ? "Semana" : "Week", day: spanish ? "Día" : "Day", year: spanish ? "Año" : "Year" }[item]}
          </button>
        ))}
      </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={skin.panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className={`text-lg font-semibold tracking-[-0.03em] ${skin.title}`}>
              {viewLabel}
            </h4>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
              {allItems.length} {spanish ? "elementos" : "items"}
            </span>
          </div>

          {view === "year" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {yearViewItems.map((month) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${skin.idleCell}`}
                  key={month.label}
                  onClick={() =>
                    setSelectedDate(
                      new Date(selectedDate.getFullYear(), month.monthIndex, 1),
                    )
                  }
                  type="button"
                >
                  <p className={`text-xs font-black uppercase tracking-[0.18em] ${skin.kicker}`}>
                    {spanish ? "Mes" : "Month"}
                  </p>
                  <p className={`mt-2 text-lg font-semibold ${skin.title}`}>{month.label}</p>
                  <p className="mt-2 text-sm text-slate-600">{month.count} {spanish ? "elementos" : "items"}</p>
                </button>
              ))}
            </div>
          ) : view === "month" ? (
            <div className="mt-4 grid grid-cols-7 gap-2">
              {(spanish ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((label) => (
                <div className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" key={label}>
                  {label}
                </div>
              ))}
              {gridViewItems.map(({ date, items }) => {
                const active = sameDay(date, selectedDate);
                return (
                  <button
                    className={`${tone === "desk" ? "min-h-16" : "min-h-28"} rounded-2xl border p-2 text-left transition ${
                      active ? skin.activeCell : skin.idleCell
                    }`}
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {date.getDate()}
                      </span>
                      {items.length ? (
                        <span className={skin.badge}>
                          {items.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 2).map((item) => (
                        <p className="truncate rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-700" key={item.id}>
                          {item.title}
                        </p>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              {gridViewItems.map(({ date, items }) => (
                <button
                  className={`rounded-2xl border p-3 text-left transition ${
                    sameDay(date, selectedDate) ? skin.activeCell : skin.idleCell
                  }`}
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  type="button"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {formatShortDate(date, language)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{items.length} {spanish ? "elementos" : "items"}</p>
                </button>
              ))}
            </div>
          )}

          {view !== "year" ? (
            <div className="mt-4 space-y-3">
              {selectedItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
                  {spanish ? "Todavía no hay elementos en esta fecha." : "No items on this date yet."}
                </div>
              ) : (
                selectedItems.map((item) => (
                  <article className="rounded-2xl border border-slate-200 bg-white p-4" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${skin.kicker}`}>
                          {item.kind === "event" ? (spanish ? "evento" : "event") : spanish ? "tarea" : "task"}
                        </p>
                        <h5 className="mt-2 text-sm font-semibold text-slate-950">{item.title}</h5>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {formatTime(item.dateTime, language)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={skin.chip}>
                        {spanish ? `Recordatorio ${item.reminderOffsetMinutes} min antes` : `Reminder ${item.reminderOffsetMinutes}m before`}
                      </span>
                      {item.contextHref ? (
                        <Link
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                          href={item.contextHref}
                        >
                          {spanish ? "Abrir contexto" : "Open context"}
                        </Link>
                      ) : null}
                      {item.source === "local" ? (
                        <>
                          <button
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                            onClick={() => editItem(item)}
                            type="button"
                          >
                            {spanish ? "Editar" : "Edit"}
                          </button>
                          <button
                            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800 transition hover:bg-emerald-100"
                            onClick={() => toggleCompleted(item.id)}
                            type="button"
                          >
                            {spanish ? "Marcar completado" : "Mark done"}
                          </button>
                          <button
                            className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-800 transition hover:bg-rose-100"
                            onClick={() => removeItem(item.id)}
                            type="button"
                          >
                            {spanish ? "Eliminar" : "Remove"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <form className={`rounded-[1.4rem] border bg-white p-4 ${tone === "desk" ? "border-[#d5d0c4]" : "border-slate-200"}`} onSubmit={submitDraft}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${skin.kicker}`}>
                  {spanish ? "Recordatorio local del dispositivo" : "Device-local reminder"}
                </p>
                <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                  {draft.id
                    ? spanish ? "Editar elemento del calendario" : "Edit calendar item"
                    : spanish ? "Crear elemento del calendario" : "Create calendar item"}
                </h4>
              </div>
              {draft.id ? (
                <button
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => setDraft(defaultDraft)}
                  type="button"
                >
                  {spanish ? "Limpiar" : "Clear"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <Field
                focusClassName={skin.focus}
                label={spanish ? "Título" : "Title"}
                name="title"
                onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
                value={draft.title}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  focusClassName={skin.focus}
                  label={spanish ? "Fecha" : "Date"}
                  name="date"
                  onChange={(value) => setDraft((current) => ({ ...current, date: value }))}
                  type="date"
                  value={draft.date}
                />
                <Field
                  focusClassName={skin.focus}
                  label={spanish ? "Hora" : "Time"}
                  name="time"
                  onChange={(value) => setDraft((current) => ({ ...current, time: value }))}
                  type="time"
                  value={draft.time}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  focusClassName={skin.focus}
                  label={spanish ? "Tipo" : "Kind"}
                  onChange={(value) => setDraft((current) => ({ ...current, kind: value === "event" ? "event" : "task" }))}
                  options={[
                    { label: spanish ? "Tarea" : "Task", value: "task" },
                    { label: spanish ? "Evento" : "Event", value: "event" },
                  ]}
                  value={draft.kind}
                />
                <Field
                  focusClassName={skin.focus}
                  label={spanish ? "Minutos de anticipación" : "Reminder offset minutes"}
                  name="reminderOffsetMinutes"
                  onChange={(value) => setDraft((current) => ({ ...current, reminderOffsetMinutes: value }))}
                  type="number"
                  value={draft.reminderOffsetMinutes}
                />
              </div>
              <Select
                focusClassName={skin.focus}
                label={spanish ? "Contexto" : "Context"}
                onChange={(value) => setDraft((current) => ({ ...current, contextId: value }))}
                options={[{ label: spanish ? "Sin contexto" : "No context", value: "" }, ...contextOptions.map((item) => ({ label: item.label, value: item.id }))]}
                value={draft.contextId}
              />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{spanish ? "Notas" : "Notes"}</span>
                <textarea
                  className={`mt-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition ${skin.focus}`}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  value={draft.notes}
                />
              </label>
              <button
                className={skin.submit}
                type="submit"
              >
                {draft.id
                  ? spanish ? "Actualizar recordatorio local" : "Update local reminder"
                  : spanish ? "Guardar recordatorio local" : "Save local reminder"}
              </button>
            </div>
          </form>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              {spanish ? "Qué se guarda localmente" : "What is stored locally"}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>{spanish ? "Los recordatorios del calendario se guardan solo en este dispositivo." : "Calendar reminders are saved only on this device."}</li>
              <li>{spanish ? "Las fechas de seguimiento del CRM se leen del espacio de trabajo activo." : "Follow-up dates from the CRM are read from the live workspace."}</li>
              <li>{spanish ? "Aquí no se activa ninguna integración de correo electrónico, SMS o proveedor." : "No email, SMS, or provider integration is triggered here."}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export const ClientCalendar = ClientsCalendar;

function Field({
  focusClassName = "focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]",
  label,
  name,
  onChange,
  type = "text",
  value,
}: {
  focusClassName?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition ${focusClassName}`}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function Select({
  focusClassName = "focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]",
  label,
  options,
  onChange,
  value,
}: {
  focusClassName?: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className={`mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition ${focusClassName}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
