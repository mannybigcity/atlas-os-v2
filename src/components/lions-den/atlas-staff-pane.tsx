"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSiteLanguage } from "@/components/language-switcher";
import { ATLAS_LION_SRC } from "@/lib/lions-den/atlas-brand";
import { ATLAS_STAFF_PROMPT_LIMIT, composeAtlasStaffPrompt } from "@/lib/lions-den/atlas-staff-prompt";
import { atlasStaffCanSend } from "@/lib/lions-den/atlas-staff-send";
import { atlasDeskNextHref } from "@/lib/lions-den/atlas-desk-route";
import {
  atlasAskUsageFromCounts,
  atlasAskUsageLabel,
  isAtlasAskCapped,
  type AtlasAskPlan,
} from "@/lib/lions-den/atlas-quota";
import { staffHandoffLine } from "@/lib/lions-den/atlas-staff-handoff";
import { submitClientAiRequest } from "@/server/client-ai/actions";
import { initialClientAiActionState } from "@/server/client-ai/types";
import type { ClientAiDailyUsage, ClientAiRequest } from "@/server/client-ai/queries";

type AtlasStaffPaneProps = {
  organizationId: string;
  organizationName: string;
  requests: ClientAiRequest[];
  dailyUsage?: ClientAiDailyUsage | null;
  compact?: boolean;
  sampleDesk?: boolean;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const SpeechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return SpeechWindow.SpeechRecognition ?? SpeechWindow.webkitSpeechRecognition ?? null;
}

function draftStorageKey(organizationId: string) {
  return `lions-den-atlas-draft:${organizationId || "desk"}`;
}

export function AtlasStaffPane({
  organizationId,
  requests,
  dailyUsage,
  sampleDesk = false,
}: AtlasStaffPaneProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [usage, setUsage] = useState<ClientAiDailyUsage>(
    dailyUsage ?? atlasAskUsageFromCounts(0, "basic"),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastPromptRef = useRef("");
  const lastNavKeyRef = useRef("");
  const plan = usage.plan as AtlasAskPlan;
  const capped = isAtlasAskCapped(usage.used, plan);
  const hasWorkspace = Boolean(organizationId);
  const composerLocked = pending || capped;
  const canSend = atlasStaffCanSend({ organizationId, pending, capped });
  const thread = [...requests].slice(0, 8).reverse();
  const usageLabel = atlasAskUsageLabel(usage.used, plan);

  useEffect(() => {
    setSpeechSupported(Boolean(speechRecognitionCtor()));
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (dailyUsage) setUsage(dailyUsage);
  }, [dailyUsage]);

  useEffect(() => {
    if (state.dailyUsage) setUsage(state.dailyUsage);
  }, [state.dailyUsage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(draftStorageKey(organizationId));
    if (stored) setDraft(stored.slice(0, ATLAS_STAFF_PROMPT_LIMIT));
  }, [organizationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(draftStorageKey(organizationId), draft);
  }, [draft, organizationId]);

  useEffect(() => {
    if (state.status === "success") {
      setDraft("");
      setAttachment(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(draftStorageKey(organizationId));
      }
    }
  }, [state.status, state.requestId, organizationId]);

  useEffect(() => {
    if (state.status === "idle") return;
    const navKey = `${state.requestId ?? ""}:${state.status}:${state.routedTo ?? ""}:${state.answer ?? ""}`;
    if (lastNavKeyRef.current === navKey) return;
    const href = atlasDeskNextHref({
      prompt: lastPromptRef.current,
      routedTo: state.routedTo,
      status: state.status,
      scopeStatus: state.scopeStatus,
    });
    if (!href) return;
    lastNavKeyRef.current = navKey;
    router.push(href);
  }, [router, state.answer, state.requestId, state.routedTo, state.scopeStatus, state.status]);

  function toggleMic() {
    if (capped) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = spanish ? "es-US" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const spoken = String(last?.[0]?.transcript ?? "").trim();
      if (spoken) {
        setDraft((current) => (current ? `${current.trim()} ${spoken}` : spoken).slice(0, ATLAS_STAFF_PROMPT_LIMIT));
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!canSend) return;
    const prompt = await composeAtlasStaffPrompt(draft, attachment);
    if (prompt.length < 2) return;
    lastPromptRef.current = prompt;
    const formData = new FormData(form);
    formData.set("prompt", prompt);
    formAction(formData);
  }

  return (
    <section
      aria-label="Talk to Atlas"
      className="flex h-full min-h-0 flex-col bg-[#fbfaf4]"
    >
      <div className="flex shrink-0 flex-col items-center px-3 pt-3">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#f5b932] bg-black shadow-[0_8px_18px_rgba(7,27,66,0.18)]">
          <Image
            alt="Atlas"
            className="h-full w-full object-contain"
            height={320}
            src={ATLAS_LION_SRC}
            width={320}
          />
        </div>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[#071b42]">
          Atlas
        </h2>
        <p className="mt-0.5 text-[11px] font-black tracking-[0.12em] text-[#8a6a12]">
          {usageLabel}
          {plan === "unlimited" ? (
            <span className="ml-1 font-semibold tracking-normal text-[#5c6578]">
              {spanish ? "hoy" : "today"}
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto px-3">
        {thread.length === 0 && state.status === "idle" ? (
          <p className="rounded-2xl bg-white px-2.5 py-1.5 text-xs leading-5 text-[#5c6578] ring-1 ring-[#ece7d8]">
            {spanish
              ? sampleDesk
                ? "Pregunta por el seguimiento, ABC Plumbing, 123 Catering, XYZ Electric o lo que toca hoy en este escritorio."
                : "Pregunta por el seguimiento o lo que toca hoy en este escritorio."
              : sampleDesk
                ? "Ask about follow-up, ABC Plumbing, 123 Catering, XYZ Electric, or what is due today."
                : "Ask about follow-up or what is due today."}
          </p>
        ) : null}
        {thread.map((item) => (
          <article className="space-y-1.5" key={item.id}>
            <p className="ml-6 rounded-2xl rounded-br-sm bg-white px-2.5 py-1.5 text-xs leading-5 text-[#071b42] ring-1 ring-[#ece7d8]">
              {item.prompt}
            </p>
            <p className="mr-4 rounded-2xl rounded-bl-sm bg-[#071b42] px-2.5 py-1.5 text-xs leading-5 text-white">
              <ThreadAnswer routedTo={item.routedTo} text={item.response} />
            </p>
          </article>
        ))}
        {state.status !== "idle" ? (
          <article className="space-y-1.5">
            {state.error ? (
              <p className="rounded-2xl bg-[#fff1f1] px-2.5 py-1.5 text-xs leading-5 text-[#8a1f1f]" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.answer ? (
              <p className="mr-4 rounded-2xl rounded-bl-sm bg-[#071b42] px-2.5 py-1.5 text-xs leading-5 text-white">
                <ThreadAnswer routedTo={state.routedTo} text={state.answer} />
              </p>
            ) : null}
          </article>
        ) : null}
        {!hasWorkspace ? (
          <p className="rounded-2xl bg-[#fff1f1] px-2.5 py-1.5 text-xs leading-5 text-[#8a1f1f]" role="alert">
            {spanish
              ? "Selecciona un espacio de trabajo para hablar con Atlas."
              : "Select a workspace to talk to Atlas."}
          </p>
        ) : null}
      </div>

      {capped ? (
        <div className="shrink-0 border-t border-[#ece7d8] bg-white px-3 py-2 text-[11px] leading-4 text-[#071b42]">
          <p className="font-semibold">
            {usage.planLabel} {usageLabel} {spanish ? "hoy." : "today."}
          </p>
          <p className="mt-1 text-[#33415c]">
            {spanish
              ? "GROW son 10 al día. UNLIMITED no tiene tope."
              : "GROW is 10/day. UNLIMITED is uncapped."}
          </p>
          <Link className="mt-1 inline-block font-semibold text-[#071b42] underline" href="/pricing">
            {spanish ? "Subir de plan" : "Upgrade"}
          </Link>
        </div>
      ) : (
        <form className="shrink-0 border-t border-[#ece7d8] bg-white p-2" onSubmit={onSubmit}>
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="role" type="hidden" value="atlas" />
          <input name="scopeMode" type="hidden" value="business_only" />
          <input
            accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx"
            className="hidden"
            onChange={(event) => {
              setAttachment(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            ref={fileRef}
            type="file"
          />
          {attachment ? (
            <p className="mb-1 truncate px-1 text-[11px] text-[#5c6578]">
              {attachment.name}
              <button
                className="ml-1 font-semibold text-[#071b42]"
                onClick={() => setAttachment(null)}
                type="button"
              >
                ×
              </button>
            </p>
          ) : null}
          <label className="sr-only" htmlFor="atlas-staff-prompt">
            {spanish ? "Mensaje para Atlas" : "Message Atlas"}
          </label>
          <textarea
            className="min-h-16 w-full resize-none rounded-xl border border-[#d5d0c4] bg-[#fbfaf4] px-2.5 py-2 text-sm leading-5 text-[#071b42] outline-none placeholder:text-[#8a93a3] focus:border-[#f5b932] focus:ring-2 focus:ring-[#f5b932]/30 disabled:opacity-50"
            disabled={!hasWorkspace || composerLocked}
            id="atlas-staff-prompt"
            maxLength={ATLAS_STAFF_PROMPT_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={spanish ? "Habla con Atlas" : "Talk to Atlas"}
            value={draft}
          />
          <div className="mt-1.5 flex items-center gap-1">
            <button
              aria-label={spanish ? "Adjuntar archivo" : "Attach a file"}
              className="grid h-8 w-8 place-items-center rounded-full text-[#071b42] hover:bg-[#fff8e6] disabled:opacity-40"
              disabled={!hasWorkspace || composerLocked}
              onClick={() => fileRef.current?.click()}
              title={spanish ? "Adjuntar" : "Attach"}
              type="button"
            >
              <PaperclipIcon />
            </button>
            <button
              aria-label={spanish ? "Hablar" : "Speak"}
              aria-pressed={listening}
              className={`grid h-8 w-8 place-items-center rounded-full hover:bg-[#fff8e6] disabled:opacity-40 ${listening ? "bg-[#071b42] text-[#f5b932]" : "text-[#071b42]"}`}
              disabled={!speechSupported || !hasWorkspace || composerLocked}
              onClick={toggleMic}
              title={speechSupported ? (spanish ? "Hablar" : "Speak") : (spanish ? "Voz no disponible" : "Speech not available")}
              type="button"
            >
              <MicIcon />
            </button>
            <button
              aria-label={spanish ? "Respuestas habladas, más adelante" : "Spoken replies later"}
              className="grid h-8 w-8 place-items-center rounded-full text-[#c5c1b6]"
              disabled
              title={spanish ? "Más adelante" : "Later"}
              type="button"
            >
              <SpeakerIcon />
            </button>
            <button
              className="ml-auto h-8 rounded-full bg-[#071b42] px-3 text-xs font-semibold text-white disabled:opacity-40"
              disabled={!canSend || (draft.trim().length < 2 && !attachment)}
              type="submit"
            >
              {pending ? "…" : spanish ? "Enviar" : "Send"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ThreadAnswer({
  text,
  routedTo,
}: {
  text: string;
  routedTo: "atlas" | "hunter" | "micah" | "david" | null;
}) {
  const line = staffHandoffLine(routedTo);
  const body = line && text.startsWith(line) ? text.slice(line.length).trim() : text;
  return (
    <>
      {line ? (
        <span className="mb-1 block text-[10px] font-black tracking-[0.14em] text-[#f5b932]">
          {line}
        </span>
      ) : null}
      {body}
    </>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M21.4 11.6 12 21a5.5 5.5 0 1 1-7.8-7.8l9.9-9.9a3.5 3.5 0 0 1 5 5l-9.9 9.8a1.5 1.5 0 1 1-2.1-2.1l8.5-8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <rect height="10" rx="3" stroke="currentColor" strokeWidth="1.8" width="6" x="9" y="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M4 10v4h4l5 4V6L8 10H4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
