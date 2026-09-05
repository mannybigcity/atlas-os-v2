"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  askMicahTalk,
  composeMicahDayBoardPrompt,
  firstIncompleteMicahOnboardingIndex,
  MICAH_GOLD,
  MICAH_NAVY,
  MICAH_STARTER_DAYS,
  micahOnboardingSteps,
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
  const steps = useMemo(() => micahOnboardingSteps(demoDesk), [demoDesk]);
  const [step, setStep] = useState(() => firstIncompleteMicahOnboardingIndex(brand, demoDesk));
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [selectedAngle, setSelectedAngle] = useState("");
  const [dayAsk, setDayAsk] = useState("");
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
  const onboardingDone = step >= steps.length;
  const selected = MICAH_STARTER_DAYS.find((item) => item.day === openDay) ?? null;
  const dayBrief = [selectedAngle, dayAsk].filter(Boolean).join(" — ");

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
            const active = openDay === item.day;
            return (
              <li key={item.day}>
                <button
                  aria-expanded={active}
                  aria-pressed={active}
                  className={`min-w-[7.6rem] rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                    filled
                      ? "border-[#071b42] bg-[#071b42] text-white"
                      : "border-dashed border-[#d8c27a] bg-[#fff8e6] text-[#071b42]"
                  } ${active ? "ring-2 ring-[#f5b932] ring-offset-2" : ""}`}
                  onClick={() => {
                    setOpenDay((current) => (current === item.day ? null : item.day));
                    setSelectedAngle("");
                    setDayAsk("");
                  }}
                  type="button"
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${filled ? "text-[#f5b932]" : "text-[#8a6a12]"}`}>
                    {item.weekday.slice(0, 3)}
                    {filled ? (
                      <span className="ml-1 rounded-full bg-[#f5b932] px-1.5 py-0.5 text-[9px] font-black text-[#071b42]">
                        1
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-4">{item.theme}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {selected ? (
        <section
          aria-label={`${selected.theme} day board`}
          className="rounded-2xl border border-[#071b42] bg-white p-4"
          id="micah-day-board"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
                {selected.weekday} board
              </p>
              <h3 className="mt-1 text-xl font-semibold text-[#071b42]">{selected.theme}</h3>
              <p className="mt-1 text-sm leading-6 text-[#33415c]">{selected.ask}</p>
            </div>
            <button
              className="rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-xs font-semibold text-[#071b42]"
              onClick={() => setOpenDay(null)}
              type="button"
            >
              Close
            </button>
          </div>

          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
            Starter hooks
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {selected.angles.map((angle) => {
              const picked = selectedAngle === angle;
              return (
                <button
                  className={`rounded-2xl border px-3 py-2 text-left text-sm leading-6 ${
                    picked
                      ? "border-[#071b42] bg-[#071b42] text-white"
                      : "border-[#d8c27a] bg-[#fffdf6] text-[#071b42] hover:border-[#071b42]"
                  }`}
                  key={angle}
                  onClick={() => setSelectedAngle(angle)}
                  type="button"
                >
                  {angle}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-sm font-semibold leading-6 text-[#071b42]">
            {selected.ask}
            <textarea
              className={`${fieldClass()} min-h-24`}
              disabled={!canEdit || pending}
              name={`day-${selected.day}-message`}
              onChange={(event) => setDayAsk(event.target.value)}
              placeholder="Optional: name the offer, the photo, the street, or the CTA."
              value={dayAsk}
            />
          </label>
          {selected.prompts
            .filter((prompt) => prompt.key !== "message")
            .map((prompt) => (
              <label
                className="mt-3 block text-sm font-semibold leading-6 text-[#071b42]"
                key={prompt.key}
              >
                {prompt.label}
                <input
                  className={fieldClass()}
                  disabled={!canEdit || pending}
                  name={`day-${selected.day}-${prompt.key}`}
                />
              </label>
            ))}
          {selectedAngle ? (
            <input name={`day-${selected.day}-vibe`} type="hidden" value={selectedAngle} />
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canEdit || pending}
              name="focusDay"
              onClick={() => {
                askMicahTalk(
                  composeMicahDayBoardPrompt({
                    day: selected.day,
                    theme: selected.theme,
                    angle: selectedAngle,
                    ask: dayAsk || dayBrief,
                  }),
                  { submit: true },
                );
              }}
              type={brand.demeanor ? "submit" : "button"}
              value={selected.day}
            >
              Generate this day-card
            </button>
            <p className="self-center text-xs leading-5 text-[#5c6578]">
              Sends the brief to Talk to Atlas. MICAH drops the graphic and caption in the gallery.
              Copy/Download only. Never auto-post.
            </p>
          </div>
        </section>
      ) : null}

      <p className="text-sm leading-6 text-[#33415c]">
        Copy/Download only. Never auto-post. Appointments stay on{" "}
        <Link className="font-semibold text-[#071b42] underline" href={calendarHref}>
          {spanish ? "Calendario" : "Calendar"}
        </Link>
        .
      </p>

      <section className="rounded-2xl border border-[#d8c27a] bg-[#fffdf6] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
              Brand setup
            </p>
            <p className="mt-1 text-sm leading-6 text-[#33415c]">
              {onboardingDone
                ? `${steps.length} of ${steps.length}`
                : `${step + 1} of ${steps.length}`}
              {brand.businessName || brand.city
                ? " · Workspace fields filled in. Only missing brand kit questions stay."
                : null}
            </p>
          </div>
          {onboardingDone ? (
            <button
              className="rounded-full border border-[#071b42] bg-white px-3 py-1.5 text-xs font-semibold text-[#071b42]"
              onClick={() => setStep(0)}
              type="button"
            >
              Edit brand
            </button>
          ) : null}
        </div>

        {steps.map((item, index) => (
          <div className={index === step ? "mt-4 space-y-4" : "hidden"} key={item.id}>
            <h3 className="text-lg font-semibold leading-7 text-[#071b42]">{item.question}</h3>
            <OnboardingFields
              brand={brand}
              canEdit={canEdit}
              demoDesk={demoDesk}
              pending={pending}
              questionId={item.id}
              voices={voices}
            />
          </div>
        ))}

        <div className="mt-4 flex flex-wrap gap-2">
          {step > 0 && step < steps.length ? (
            <button
              className="rounded-full border border-[#071b42] bg-white px-4 py-2 text-sm font-semibold text-[#071b42]"
              onClick={() => setStep((currentStep) => currentStep - 1)}
              type="button"
            >
              Back
            </button>
          ) : null}
          {!onboardingDone ? (
            <button
              className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setStep((currentStep) => currentStep + 1)}
              type="button"
            >
              {step === steps.length - 1 ? "Show the week" : "Next"}
            </button>
          ) : null}
        </div>
      </section>

      {onboardingDone || !empty ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-full bg-[#071b42] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canEdit || pending}
            type="submit"
          >
            {pending ? "Working…" : empty ? "Build my 7-day week" : "Rebuild this week's cards"}
          </button>
          <button
            className="rounded-full border border-[#071b42] bg-white px-5 py-3 text-sm font-semibold text-[#071b42] disabled:opacity-50"
            disabled={!canEdit || pending}
            formAction={saveAction}
            type="submit"
          >
            Save brand
          </button>
        </div>
      ) : null}

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
      ) : null}

      <input name="organizationId" type="hidden" value={organizationId} />
    </form>
  );
}

function OnboardingFields({
  brand,
  canEdit,
  demoDesk,
  pending,
  questionId,
  voices,
}: {
  brand: MicahBrandKit;
  canEdit: boolean;
  demoDesk: boolean;
  pending: boolean;
  questionId: string;
  voices: ReturnType<typeof visibleMicahVoices>;
}) {
  const disabled = !canEdit || pending;

  if (questionId === "name_city") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#071b42]">
          Business name
          <input
            className={fieldClass()}
            defaultValue={brand.businessName}
            disabled={disabled}
            name="businessName"
          />
          {brand.businessName ? (
            <span className="mt-1 block text-xs font-normal text-[#5c6578]">
              From this workspace. Change it if the public name is different.
            </span>
          ) : null}
        </label>
        <label className="text-sm font-semibold text-[#071b42]">
          City
          <input
            className={fieldClass()}
            defaultValue={brand.city}
            disabled={disabled}
            name="city"
          />
          {brand.city ? (
            <span className="mt-1 block text-xs font-normal text-[#5c6578]">
              From this workspace.
            </span>
          ) : null}
        </label>
      </div>
    );
  }

  if (questionId === "audience") {
    return (
      <textarea
        className={`${fieldClass()} min-h-28`}
        defaultValue={brand.audience}
        disabled={disabled}
        name="audience"
      />
    );
  }

  if (questionId === "voice") {
    return (
      <div className="flex flex-wrap gap-2">
        {voices.map((voice) => (
          <label
            className="inline-flex items-center gap-2 rounded-full border border-[#d8c27a] bg-white px-3 py-1.5 text-sm text-[#071b42]"
            key={voice.id}
          >
            <input
              defaultChecked={brand.demeanor === voice.id}
              disabled={disabled}
              name="demeanor"
              type="radio"
              value={voice.id}
            />
            {voice.label}
          </label>
        ))}
      </div>
    );
  }

  if (questionId === "faith") {
    return (
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#d8c27a] bg-white px-3 py-1.5 text-sm text-[#071b42]">
          <input
            defaultChecked={brand.faithLanguage}
            disabled={disabled || demoDesk}
            name="faithLanguage"
            type="radio"
            value="yes"
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-[#d8c27a] bg-white px-3 py-1.5 text-sm text-[#071b42]">
          <input
            defaultChecked={!brand.faithLanguage}
            disabled={disabled || demoDesk}
            name="faithLanguage"
            type="radio"
            value="no"
          />
          No
        </label>
      </div>
    );
  }

  if (questionId === "colors") {
    return (
      <div className="space-y-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#071b42]">
          <input
            defaultChecked={brand.navyGoldOk}
            disabled={disabled}
            name="navyGoldOk"
            type="checkbox"
            value="yes"
          />
          navy/gold OK
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#071b42]">
            Hex
            <input
              className={fieldClass()}
              defaultValue={brand.primaryColor || MICAH_NAVY}
              disabled={disabled}
              name="primaryColor"
              type="color"
            />
          </label>
          <label className="text-sm font-semibold text-[#071b42]">
            Hex
            <input
              className={fieldClass()}
              defaultValue={brand.secondaryColor || MICAH_GOLD}
              disabled={disabled}
              name="secondaryColor"
              type="color"
            />
          </label>
        </div>
        <label className="block text-sm font-semibold text-[#071b42]">
          Photo of your brand
          <input
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="mt-1 block w-full text-sm"
            disabled={disabled}
            name="brandPhoto"
            type="file"
          />
        </label>
      </div>
    );
  }

  if (questionId === "logo") {
    return (
      <label className="block text-sm font-semibold text-[#071b42]">
        Upload logo
        <input
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="mt-1 block w-full text-sm"
          disabled={disabled}
          name="logo"
          type="file"
        />
        <span className="mt-1 block text-xs font-normal text-[#5c6578]">
          {brand.logoDataUri ? "Logo on file. Upload another to replace it." : "Paste as-is; never redraw."}
        </span>
      </label>
    );
  }

  if (questionId === "accounts") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <SocialField defaultValue={brand.facebook} disabled={disabled} label="Facebook" name="facebook" />
        <SocialField defaultValue={brand.instagram} disabled={disabled} label="Instagram" name="instagram" />
        <SocialField defaultValue={brand.linkedin} disabled={disabled} label="LinkedIn" name="linkedin" />
        <SocialField defaultValue={brand.tiktok} disabled={disabled} label="TikTok" name="tiktok" />
      </div>
    );
  }

  return (
    <input
      className={fieldClass()}
      defaultValue={brand.weeklyOffer}
      disabled={disabled}
      name="weeklyOffer"
    />
  );
}

function SocialField({
  defaultValue,
  disabled,
  label,
  name,
}: {
  defaultValue: string;
  disabled: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="text-sm font-semibold text-[#071b42]">
      {label}
      <input
        className={fieldClass()}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder="URL or @handle"
      />
    </label>
  );
}
