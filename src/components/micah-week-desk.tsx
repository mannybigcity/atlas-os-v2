"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  askMicahTalk,
  composeMicahTalkPrompt,
  MICAH_GOLD,
  MICAH_NAVY,
  MICAH_STARTER_DAYS,
  visibleMicahVoices,
  type MicahBrandKit,
} from "@/lib/lions-den/micah-starter-week";
import {
  buildMicahWeekFromDesk,
  initialMicahDeskActionState,
  saveMicahBrandSetup,
} from "@/server/content-studio/actions";

export type MicahWeekStripCard = {
  day: number;
  weekday: string;
  theme?: string;
  dayLabel: string;
};

type MicahWeekDeskProps = {
  organizationId: string;
  canEdit: boolean;
  demoDesk: boolean;
  spanish: boolean;
  brand: MicahBrandKit;
  cards: MicahWeekStripCard[];
  calendarHref: string;
};

function fieldClass() {
  return "mt-1 w-full rounded-xl border border-[#d8c27a] bg-white px-3 py-2 text-sm text-[#071b42] outline-none placeholder:text-[#8a93a3] focus:border-[#071b42] focus:ring-2 focus:ring-[#f5b932]/40 disabled:opacity-60";
}

export function MicahWeekDesk({
  organizationId,
  canEdit,
  demoDesk,
  spanish,
  brand,
  cards,
  calendarHref,
}: MicahWeekDeskProps) {
  const empty = cards.length === 0;
  const [brandOpen, setBrandOpen] = useState(empty || !brand.demeanor);
  const [buildState, buildAction, building] = useActionState(
    buildMicahWeekFromDesk,
    initialMicahDeskActionState,
  );
  const [saveState, saveAction, saving] = useActionState(
    saveMicahBrandSetup,
    initialMicahDeskActionState,
  );
  const pending = building || saving;
  const voices = visibleMicahVoices(demoDesk);
  const state = buildState.status !== "idle" ? buildState : saveState;
  const filledDays = new Set(cards.map((card) => card.day));

  return (
    <form
      action={buildAction}
      className="mt-5 space-y-5"
      encType="multipart/form-data"
      id="micah-week-desk"
    >
      <div className="overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {MICAH_STARTER_DAYS.map((item) => {
            const filled = filledDays.has(item.day);
            return (
              <li
                className={`min-w-[7.4rem] rounded-2xl border px-3 py-2 ${
                  filled
                    ? "border-[#071b42] bg-[#071b42] text-white"
                    : "border-dashed border-[#d8c27a] bg-[#fff8e6] text-[#071b42]"
                }`}
                key={item.day}
              >
                <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${filled ? "text-[#f5b932]" : "text-[#8a6a12]"}`}>
                  {item.weekday.slice(0, 3)}
                </p>
                <p className="mt-1 text-xs font-semibold leading-4">
                  {spanish ? item.themeEs : item.theme}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="text-sm leading-6 text-[#33415c]">
        {spanish
          ? "Borradores para copiar y descargar. MICAH no publica. Las citas quedan en "
          : "Drafts to copy and download. MICAH does not post. Appointments stay on "}
        <Link className="font-semibold text-[#071b42] underline" href={calendarHref}>
          {spanish ? "Calendario" : "Calendar"}
        </Link>
        .
      </p>

      <section className="rounded-2xl border border-[#d8c27a] bg-[#fffdf6] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
              {spanish ? "Marca" : "Brand setup"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#071b42]">
              {spanish ? "Voz, colores y cuentas" : "Voice, colors, and accounts"}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#33415c]">
              {spanish
                ? "Una vez por negocio. Se puede editar. Solo se guarda. MICAH no entra ni publica."
                : "Once per shop. Editable later. Stored only. MICAH does not log in or post."}
            </p>
          </div>
          <button
            className="rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-xs font-semibold text-[#071b42]"
            onClick={() => setBrandOpen((open) => !open)}
            type="button"
          >
            {brandOpen
              ? spanish
                ? "Ocultar"
                : "Hide"
              : spanish
                ? "Editar marca"
                : "Edit brand"}
          </button>
        </div>

        <div className={brandOpen ? "mt-4 space-y-4" : "hidden"}>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                {spanish ? "Voz" : "Voice"}
              </legend>
              <div className="flex flex-wrap gap-2">
                {voices.map((voice) => (
                  <label
                    className="inline-flex items-center gap-2 rounded-full border border-[#d8c27a] bg-white px-3 py-1.5 text-sm text-[#071b42]"
                    key={voice.id}
                  >
                    <input
                      defaultChecked={
                        brand.demeanor === voice.id ||
                        (!brand.demeanor && voice.id === "friendly_local")
                      }
                      disabled={!canEdit || pending}
                      name="demeanor"
                      required={empty}
                      type="radio"
                      value={voice.id}
                    />
                    {spanish ? voice.labelEs : voice.label}
                    {voice.optIn ? (
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a12]">
                        {spanish ? "opcional" : "opt-in"}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
              {demoDesk ? (
                <p className="text-xs leading-5 text-[#5c6578]">
                  {spanish
                    ? "En este escritorio DEMO no se ofrece Fe."
                    : "Faith is not offered on this DEMO desk."}
                </p>
              ) : (
                <p className="text-xs leading-5 text-[#5c6578]">
                  {spanish
                    ? "Fe solo si la pides. Nunca va por defecto."
                    : "Faith only if you ask. Never the default."}
                </p>
              )}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#071b42]">
                {spanish ? "Color principal" : "Primary color"}
                <input
                  className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-[#d8c27a] bg-white"
                  defaultValue={brand.primaryColor || MICAH_NAVY}
                  disabled={!canEdit || pending}
                  name="primaryColor"
                  type="color"
                />
              </label>
              <label className="text-sm font-semibold text-[#071b42]">
                {spanish ? "Color secundario" : "Secondary color"}
                <input
                  className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-[#d8c27a] bg-white"
                  defaultValue={brand.secondaryColor || MICAH_GOLD}
                  disabled={!canEdit || pending}
                  name="secondaryColor"
                  type="color"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-[#071b42]">
              {spanish ? "Subir logo" : "Upload logo"}
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="mt-1 block w-full text-sm text-[#33415c] file:mr-3 file:rounded-full file:border-0 file:bg-[#071b42] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                disabled={!canEdit || pending}
                name="logo"
                type="file"
              />
              <span className="mt-1 block text-xs font-normal text-[#5c6578]">
                {brand.logoDataUri
                  ? spanish
                    ? "Logo guardado. Sube otro para reemplazarlo."
                    : "Logo on file. Upload another to replace it."
                  : spanish
                    ? "Sube el logo del negocio. MICAH no inventa logos."
                    : "Upload the shop logo. MICAH will not invent one."}
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <SocialField
                defaultValue={brand.facebook}
                disabled={!canEdit || pending}
                label="Facebook"
                name="facebook"
                spanish={spanish}
              />
              <SocialField
                defaultValue={brand.instagram}
                disabled={!canEdit || pending}
                label="Instagram"
                name="instagram"
                spanish={spanish}
              />
              <SocialField
                defaultValue={brand.linkedin}
                disabled={!canEdit || pending}
                label="LinkedIn"
                name="linkedin"
                spanish={spanish}
              />
              <SocialField
                defaultValue={brand.tiktok}
                disabled={!canEdit || pending}
                label="TikTok"
                name="tiktok"
                spanish={spanish}
              />
            </div>
        </div>
      </section>

      {empty ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MICAH_STARTER_DAYS.map((item) => (
            <article
              className="rounded-2xl border border-[#d8c27a] bg-white p-4"
              key={item.day}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f5b932]">
                {item.weekday}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[#071b42]">
                {spanish ? item.themeEs : item.theme}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#5c6578]">
                {spanish ? item.hintEs : item.hint}
              </p>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                {spanish ? "¿Qué diseñamos hoy?" : "What are we designing today?"}
                <input
                  className={fieldClass()}
                  disabled={!canEdit || pending}
                  name={`day-${item.day}-design`}
                  placeholder={spanish ? item.themeEs : item.theme}
                />
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                {spanish ? "¿Cuál es el mensaje?" : "What's the message?"}
                <input
                  className={fieldClass()}
                  disabled={!canEdit || pending}
                  name={`day-${item.day}-message`}
                  placeholder={spanish ? item.hintEs : item.hint}
                />
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]">
                {spanish ? "¿Cuál es la vibra?" : "What's the vibe?"}
                <input
                  className={fieldClass()}
                  disabled={!canEdit || pending}
                  name={`day-${item.day}-vibe`}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-xs font-semibold text-[#071b42] disabled:opacity-50"
                      disabled={!canEdit || pending}
                      name="focusDay"
                  type="submit"
                  value={item.day}
                >
                  {spanish ? "Generar" : "Generate"}
                </button>
                <button
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#071b42] underline"
                  onClick={() => {
                    const form = document.getElementById("micah-week-desk") as HTMLFormElement | null;
                    const design = String(
                      new FormData(form ?? undefined).get(`day-${item.day}-design`) ?? "",
                    );
                    const message = String(
                      new FormData(form ?? undefined).get(`day-${item.day}-message`) ?? "",
                    );
                    const vibe = String(
                      new FormData(form ?? undefined).get(`day-${item.day}-vibe`) ?? "",
                    );
                    askMicahTalk(
                      composeMicahTalkPrompt({
                        theme: item.theme,
                        design,
                        message,
                        vibe,
                      }),
                    );
                  }}
                  type="button"
                >
                  {spanish ? "Hablar con Atlas" : "Talk to Atlas"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canEdit || pending}
          type="submit"
        >
          {pending
            ? spanish
              ? "Trabajando…"
              : "Working…"
            : empty
              ? spanish
                ? "Armar mi semana de 7 días"
                : "Build my 7-day week"
              : spanish
                ? "Rehacer las tarjetas de la semana"
                : "Rebuild this week's cards"}
        </button>
        <button
          className="rounded-full border border-[#071b42] bg-white px-5 py-3 text-sm font-semibold text-[#071b42] disabled:opacity-50"
          disabled={!canEdit || pending}
          formAction={saveAction}
          type="submit"
        >
          {spanish ? "Guardar marca" : "Save brand"}
        </button>
      </div>

      {state.status !== "idle" ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "bg-[#fff1f1] text-[#8a1f1f]"
              : "bg-[#edf8ef] text-[#14532d]"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.error || state.message}
        </p>
      ) : empty ? (
        <p className="text-sm leading-6 text-[#33415c]">
          {spanish
            ? "Guarda la marca y arma la semana. Atlas puede afinar un día si lo pides."
            : "Save the brand, then build the week. Use Talk to Atlas if you want to tune one day."}
        </p>
      ) : null}

      <input name="organizationId" type="hidden" value={organizationId} />
    </form>
  );
}

function SocialField({
  defaultValue,
  disabled,
  label,
  name,
  spanish,
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
  spanish: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-[#071b42]">
      {label}
      <input
        className={fieldClass()}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={spanish ? "URL o @usuario" : "URL or @handle"}
      />
    </label>
  );
}
