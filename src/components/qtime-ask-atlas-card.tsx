"use client";

import { useActionState } from "react";
import { submitClientAiRequest } from "@/server/client-ai/actions";
import { initialClientAiActionState } from "@/server/client-ai/types";

type QTimeAskAtlasCardProps = {
  organizationId: string;
  workspaceName: string;
  enabled: boolean;
};

export function QTimeAskAtlasCard({
  organizationId,
  workspaceName,
  enabled,
}: QTimeAskAtlasCardProps) {
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );

  const disabled = !enabled || pending;

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5672f0]">
            Ask Atlas
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
            Q Time command
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {workspaceName} only.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
            enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {enabled ? "Live" : "Setup required"}
        </span>
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="role" type="hidden" value="atlas" />
        <input name="scopeMode" type="hidden" value="business_only" />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Question
          </span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff] disabled:cursor-not-allowed disabled:bg-slate-100"
            name="prompt"
            placeholder="Ask for next steps, priorities, or workspace status."
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
            {pending ? "Thinking..." : "Ask Atlas"}
          </button>
          <p className="text-xs leading-5 text-slate-500">
            {enabled ? "Workspace response enabled." : "OpenAI setup required."}
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
