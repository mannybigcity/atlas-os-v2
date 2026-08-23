"use client";

import { useActionState } from "react";
import { submitClientAiRequest } from "@/server/client-ai/actions";
import { initialClientAiActionState } from "@/server/client-ai/types";
import type { ClientAiDailyUsage } from "@/server/client-ai/queries";
import { useSiteLanguage } from "@/components/language-switcher";

type QTimeAskAtlasCardProps = {
  organizationId: string;
  workspaceName: string;
  enabled: boolean;
  dailyUsage: ClientAiDailyUsage;
};

export function QTimeAskAtlasCard({
  organizationId,
  workspaceName,
  enabled,
  dailyUsage,
}: QTimeAskAtlasCardProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );

  const disabled = !enabled || pending;
  const currentUsage = state.dailyUsage ?? dailyUsage;
  const usageLabel = currentUsage.limit === null
    ? spanish
      ? `${currentUsage.used} consultas hoy · Sin límite`
      : `${currentUsage.used} asked today · Unlimited`
    : spanish
      ? `${currentUsage.used} de ${currentUsage.limit} hoy`
      : `${currentUsage.used} of ${currentUsage.limit} today`;

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5672f0]">
            {spanish ? "Pregunta a Atlas" : "Ask Atlas"}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
            {spanish ? "Comando de Q Time" : "Q Time command"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {spanish ? `Solo ${workspaceName}.` : `${workspaceName} only.`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {enabled ? (spanish ? "Activo" : "Live") : spanish ? "Configuración requerida" : "Setup required"}
        </span>
      </div>

      <p className="mt-3 w-fit rounded-full border border-[#5672f0] bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#071b42]">
        {usageLabel}
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="role" type="hidden" value="atlas" />
        <input name="scopeMode" type="hidden" value="business_only" />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {spanish ? "Pregunta" : "Question"}
          </span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff] disabled:cursor-not-allowed disabled:bg-slate-100"
            name="prompt"
            placeholder={spanish ? "Pregunta por próximos pasos, prioridades o el estado del espacio de trabajo." : "Ask for next steps, priorities, or workspace status."}
            required
            disabled={disabled}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            className="inline-flex items-center justify-center rounded-full bg-[#5672f0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#465fd1] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            type="submit"
          >
            {pending ? (spanish ? "Pensando..." : "Thinking...") : spanish ? "Pregunta a Atlas" : "Ask Atlas"}
          </button>
          <p className="text-xs leading-5 text-slate-500">
            {enabled
              ? currentUsage.limit === null
                ? spanish ? "Consultas ilimitadas hoy." : "Unlimited questions today."
                : spanish
                  ? `${currentUsage.remaining} ${currentUsage.remaining === 1 ? "pregunta disponible" : "preguntas disponibles"} hoy.`
                  : `${currentUsage.remaining} question${currentUsage.remaining === 1 ? "" : "s"} remaining today.`
              : spanish ? "Se requiere configurar OpenAI." : "OpenAI setup required."}
          </p>
        </div>
      </form>

      {state.status !== "idle" ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {state.error ? (
            <p className={`text-sm leading-6 ${state.answer ? "text-amber-700" : "text-rose-700"}`}>
              {state.error}
            </p>
          ) : null}
          {state.answer ? (
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
              <p>{state.answer}</p>
              {state.nextStep ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-3">{state.nextStep}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
