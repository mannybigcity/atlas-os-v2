"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { deskDateLabel } from "@/lib/desk-time";
import {
  holdOnSlot,
  idlePartySlotResult,
  monthGrid,
  partyDayShade,
  partySlotLabel,
  shiftMonthKey,
  type PartyHold,
  type PartySlot,
} from "@/lib/sis/party-availability";
import { bookSisPartySlot, cancelSisPartySlot } from "@/server/sis-workspace/actions";

export type SisPartyCalendarParty = {
  id: string;
  hostName: string;
  stage: string;
  preferredDate: string | null;
  partySlot: PartySlot | null;
  calendarStatus: string;
};

type SisPartyAvailabilityCalendarProps = {
  holds: PartyHold[];
  parties: SisPartyCalendarParty[];
  today: string;
  initialDate: string;
  spanish: boolean;
};

const WEEKDAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
} as const;

export function SisPartyAvailabilityCalendar({
  holds,
  parties,
  today,
  initialDate,
  spanish,
}: SisPartyAvailabilityCalendarProps) {
  const selectedStart = /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : today;
  const [cursor, setCursor] = useState(selectedStart.slice(0, 7));
  const [selected, setSelected] = useState(selectedStart);
  const [bookState, bookAction, bookPending] = useActionState(bookSisPartySlot, idlePartySlotResult);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelSisPartySlot, idlePartySlotResult);
  const pending = bookPending || cancelPending;
  const notice = cancelState.code !== "idle" ? cancelState : bookState;
  const days = monthGrid(cursor);
  const monthLabel = deskDateLabel(`${cursor}-01`, spanish, { month: "long", year: "numeric" });

  function pick(date: string) {
    setSelected(date);
    setCursor(date.slice(0, 7));
  }

  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
        {spanish ? "Disponibilidad de fiestas" : "Party availability"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
        {spanish ? "Dos fiestas por día" : "Two parties a day"}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#33415c]">
        {spanish
          ? "AM es 9:00–1:00 y PM es 2:00–6:00, hora del Centro. Hay una hora entre bloques para recoger. Morado brillante: queda al menos un bloque. Morado claro: AM y PM están apartados. Los seguimientos no cambian estos colores."
          : "AM is 9:00–1:00 and PM is 2:00–6:00 Central. An hour between blocks is for teardown. Bright purple still has an open block. Light purple means both blocks are held. Follow-ups do not change these colors."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#071b42]">
        <Legend swatch="bg-[#7C3AED]" label={spanish ? "Queda un bloque" : "Block open"} />
        <Legend swatch="bg-[#E9D5FF]" label={spanish ? "Día completo" : "Day full"} />
        <span className="text-[#8a6a12]">{spanish ? "Hoy va en letras doradas. No es una reserva." : "Today is gold type. It is not a booking."}</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button className="rounded-full border border-[#d5d0c4] px-3 py-1 text-sm font-semibold text-[#071b42]" onClick={() => setCursor(shiftMonthKey(cursor, -1))} type="button">
          {spanish ? "Mes anterior" : "Previous month"}
        </button>
        <h3 className="text-lg font-semibold capitalize text-[#071b42]">{monthLabel}</h3>
        <button className="rounded-full border border-[#d5d0c4] px-3 py-1 text-sm font-semibold text-[#071b42]" onClick={() => setCursor(shiftMonthKey(cursor, 1))} type="button">
          {spanish ? "Mes siguiente" : "Next month"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {(spanish ? WEEKDAYS.es : WEEKDAYS.en).map((label) => (
          <div className="px-1 py-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578] sm:text-[11px]" key={label}>
            {label}
          </div>
        ))}
        {days.map(({ date, inMonth }) => {
          const shade = partyDayShade(holds, date);
          const held = holds.filter((hold) => hold.preferredDate === date).length;
          const active = date === selected;
          const isToday = date === today;
          const openLabel = held === 0 ? (spanish ? "Libre" : "Open") : spanish ? "1 libre" : "1 open";
          const shadeLabel = shade === "light" ? (spanish ? "Completo" : "Full") : openLabel;
          return (
            <button
              aria-current={isToday ? "date" : undefined}
              aria-pressed={active}
              aria-label={`${deskDateLabel(date, spanish)} ${shadeLabel}`}
              className={`min-h-16 rounded-xl border p-1 text-left transition sm:min-h-[4.75rem] sm:p-2 ${
                inMonth
                  ? shade === "light"
                    ? "border-[#d8b4fe] bg-[#E9D5FF] text-[#4C1D95]"
                    : "border-[#6D28D9] bg-[#7C3AED] text-white"
                  : "border-transparent bg-transparent text-[#c5c1b6]"
              } ${active ? "ring-2 ring-[#f5b932] ring-offset-1" : ""}`}
              data-shade={inMonth ? shade : "outside"}
              data-testid="sis-party-day"
              key={date}
              onClick={() => pick(date)}
              type="button"
            >
              <span className={`block text-sm font-semibold ${isToday ? "text-[#f5b932]" : ""}`}>{Number(date.slice(8))}</span>
              {inMonth ? (
                <span className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.08em] sm:text-[10px] ${shade === "bright" ? "text-white/90" : "text-[#4C1D95]"}`}>
                  {shadeLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-4">
        {notice.message ? (
          <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
            {notice.message}
          </p>
        ) : null}
        {notice.suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {notice.suggestions.map((suggestion) => (
              <button
                className="rounded-full border border-[#6D28D9] bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#4C1D95]"
                key={`${suggestion.date}-${suggestion.slot}`}
                onClick={() => pick(suggestion.date)}
                type="button"
              >
                {deskDateLabel(suggestion.date, spanish)} · {partySlotLabel(suggestion.slot)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-semibold text-[#071b42]">{deskDateLabel(selected, spanish, { weekday: "long", month: "long", day: "numeric" })}</h3>
        <p className="mt-1 text-sm text-[#5c6578]">
          {spanish ? "Cada bloque dura 4 horas. La fiesta cabe en unas 2–2.5 horas." : "Each block is 4 hours. The party itself runs about 2–2.5 hours."}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["am", "pm"] as const).map((slot) => (
            <SlotCard
              hold={holdOnSlot(holds, selected, slot)}
              key={slot}
              onBook={bookAction}
              onCancel={cancelAction}
              parties={parties}
              pending={pending}
              selected={selected}
              slot={slot}
              spanish={spanish}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SlotCard({
  hold,
  onBook,
  onCancel,
  parties,
  pending,
  selected,
  slot,
  spanish,
}: {
  hold: PartyHold | null;
  onBook: (formData: FormData) => void;
  onCancel: (formData: FormData) => void;
  parties: SisPartyCalendarParty[];
  pending: boolean;
  selected: string;
  slot: PartySlot;
  spanish: boolean;
}) {
  const open = !hold;
  return (
    <article className={`rounded-2xl border p-4 ${open ? "border-[#6D28D9] bg-[#F5F3FF]" : "border-[#d8b4fe] bg-[#E9D5FF]"}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#4C1D95]">{partySlotLabel(slot)}</p>
      <p className="mt-2 text-sm font-semibold text-[#071b42]">
        {hold
          ? `${hold.hostName} · ${hold.calendarStatus === "confirmed" ? (spanish ? "confirmada" : "confirmed") : spanish ? "tentativa" : "tentative"}`
          : spanish
            ? "Bloque libre"
            : "Open block"}
      </p>
      {hold ? (
        <Link className="mt-2 inline-block text-xs font-semibold text-[#4C1D95] underline" href={`/client/sis/party/${hold.id}`}>
          {spanish ? "Abrir fiesta" : "Open party"}
        </Link>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[#5c6578]">
          {spanish ? "Máximo una fiesta en este bloque." : "One party in this block."}
        </p>
      )}
      {hold ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {hold.calendarStatus === "tentative" ? (
            <form action={onBook}>
              <SlotFields date={selected} slot={slot} spanish={spanish} />
              <input name="partyEventId" type="hidden" value={hold.id} />
              <button className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} name="calendarStatus" type="submit" value="confirmed">
                {spanish ? "Confirmar reserva" : "Confirm booking"}
              </button>
            </form>
          ) : null}
          <form action={onCancel}>
            <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
            <input name="partyEventId" type="hidden" value={hold.id} />
            <button className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 disabled:opacity-60" disabled={pending} type="submit">
              {spanish ? "Cancelar reserva" : "Cancel hold"}
            </button>
          </form>
        </div>
      ) : (
        <form action={onBook} className="mt-4 grid gap-2">
          <SlotFields date={selected} slot={slot} spanish={spanish} />
          {parties.length === 0 ? (
            <p className="text-xs leading-5 text-[#5c6578]">
              {spanish ? "Primero agrega la consulta en Resumen." : "Add the inquiry on Summary first."}
            </p>
          ) : (
            <select aria-label={spanish ? "Fiesta" : "Party"} className="rounded-xl border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42]" name="partyEventId" required>
              <option value="">{spanish ? "Elegir fiesta" : "Choose a party"}</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {partyOptionLabel(party, spanish)}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-[#6D28D9] bg-white px-4 py-2 text-sm font-semibold text-[#4C1D95] disabled:opacity-60" disabled={pending || parties.length === 0} name="calendarStatus" type="submit" value="tentative">
              {spanish ? "Apartar tentativo" : "Hold tentative"}
            </button>
            <button className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending || parties.length === 0} name="calendarStatus" type="submit" value="confirmed">
              {spanish ? "Confirmar reserva" : "Confirm booking"}
            </button>
          </div>
          <p className="text-[11px] leading-5 text-[#5c6578]">
            {spanish ? "Si la fiesta ya tiene otro bloque, se mueve aquí." : "A party that already holds another block moves here."}
          </p>
        </form>
      )}
    </article>
  );
}

function SlotFields({ date, slot, spanish }: { date: string; slot: PartySlot; spanish: boolean }) {
  return (
    <>
      <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
      <input name="preferredDate" type="hidden" value={date} />
      <input name="partySlot" type="hidden" value={slot} />
    </>
  );
}

function partyOptionLabel(party: SisPartyCalendarParty, spanish: boolean) {
  if (!party.preferredDate || !party.partySlot) return party.hostName;
  if (party.calendarStatus !== "tentative" && party.calendarStatus !== "confirmed") return party.hostName;
  return `${party.hostName} · ${deskDateLabel(party.preferredDate, spanish)} ${party.partySlot.toUpperCase()}`;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}
