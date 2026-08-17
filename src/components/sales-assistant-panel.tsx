"use client";

import { useActionState } from "react";
import { askSalesAssistant, initialSalesAiState } from "@/server/sales/ai-actions";

export function SalesAssistantPanel() {
  const [state, action, pending] = useActionState(askSalesAssistant, initialSalesAiState);

  return (
    <aside className="flex min-h-[560px] flex-col rounded-2xl border border-slate-800 bg-slate-950 text-white xl:sticky xl:top-5">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Atlas assistant</p>
        <h2 className="mt-1 text-lg font-bold">Ask ChatGPT about your CRM</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">Read-only context from your current sales records. External actions still require approval.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="rounded-xl bg-white/10 p-4 text-sm leading-6 text-slate-200">
          Try: “Which prospects need a next action?” or “Summarize today’s pipeline.”
        </div>
        {state.answer ? <div className="rounded-xl bg-blue-500/15 p-4 text-sm leading-6 text-blue-50">{state.answer}</div> : null}
        {state.error ? <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">{state.error}</div> : null}
      </div>
      <form action={action} className="border-t border-white/10 p-4">
        <label className="sr-only" htmlFor="sales-assistant-prompt">Ask the CRM assistant</label>
        <textarea className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" id="sales-assistant-prompt" name="prompt" placeholder="Ask about your pipeline..." />
        <button className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Thinking…" : "Ask ChatGPT"}</button>
      </form>
    </aside>
  );
}
