"use client";

import { useActionState, useState } from "react";
import { formatDateTime } from "@/lib/format";
import {
  submitClientAiRequest,
} from "@/server/client-ai/actions";
import {
  clientAiRoleSpecs,
  getClientAiRoleSpec,
  type ClientAiRole,
} from "@/server/client-ai/guardrails";
import type { ClientAiRequest } from "@/server/client-ai/queries";
import {
  initialClientAiActionState,
  type ClientAiActionState,
} from "@/server/client-ai/types";

type ClientAiConsoleProps = {
  organizationId: string;
  previewMode: boolean;
  requests: ClientAiRequest[];
};

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function statusClass(status: ClientAiActionState["status"]) {
  if (status === "success") return "bg-emerald-100 text-emerald-800";
  if (status === "blocked") return "bg-amber-100 text-amber-800";
  if (status === "failed") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export function ClientAiConsole({
  organizationId,
  previewMode,
  requests,
}: ClientAiConsoleProps) {
  const [activeRole, setActiveRole] = useState<ClientAiRole>("atlas");
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );

  const activeRoleSpec = getClientAiRoleSpec(activeRole);
  const requestCounts = requests.reduce(
    (counts, request) => {
      counts.total += 1;

      if (request.status === "succeeded") {
        counts.succeeded += 1;
      } else if (request.status === "blocked") {
        counts.blocked += 1;
      } else {
        counts.failed += 1;
      }

      if (request.scopeStatus === "rerouted") {
        counts.rerouted += 1;
      }

      return counts;
    },
    {
      total: 0,
      succeeded: 0,
      blocked: 0,
      failed: 0,
      rerouted: 0,
    },
  );

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5672f0]">
            Client AI
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Ask a scoped role, keep the boundary visible.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose one approved tool, ask one concrete question, and the
            workspace will either answer from your data or reroute the question
            to the coordinator if it falls outside that lane.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 lg:w-[31rem]">
          <UsageChip label="Recent" value={requestCounts.total} />
          <UsageChip label="Done" value={requestCounts.succeeded} tone="emerald" />
          <UsageChip label="Rerouted" value={requestCounts.rerouted} tone="amber" />
          <UsageChip label="Blocked" value={requestCounts.blocked} tone="rose" />
        </div>
      </div>

      {previewMode ? (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          Viewer mode is read-only here. The role selector still explains the
          scope, but the request form is disabled.
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-3">
          {clientAiRoleSpecs.map((spec) => {
            const checked = spec.role === activeRole;

            return (
              <label
                className={`block cursor-pointer rounded-2xl border p-4 transition ${
                  checked
                    ? "border-[#5672f0] bg-[#eef3ff] shadow-[0_8px_24px_rgba(86,114,240,0.12)]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
                key={spec.role}
              >
                <input
                  checked={checked}
                  className="sr-only"
                  disabled={previewMode}
                  name="client-ai-role"
                  onChange={() => setActiveRole(spec.role)}
                  type="radio"
                  value={spec.role}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
                      {spec.label}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {spec.title}
                    </h4>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                    {checked ? "Selected" : "Switch"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {spec.summary}
                </p>
                <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                  {spec.promptHint}
                </p>
              </label>
            );
          })}
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
                {activeRoleSpec.label}
              </p>
              <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {activeRoleSpec.title} request
              </h4>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {humanize(activeRole)}
            </span>
          </div>

          <form action={formAction} className="mt-5 space-y-4">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="role" type="hidden" value={activeRole} />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Your question
              </span>
              <textarea
                className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                disabled={previewMode}
                name="prompt"
                placeholder={activeRoleSpec.promptHint}
                required
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#465fd1] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={previewMode || pending}
                type="submit"
              >
                {pending ? "Thinking..." : "Ask this role"}
              </button>
              <p className="text-xs leading-5 text-slate-500">
                Nothing here can browse, publish, contact, or spend.
              </p>
            </div>
          </form>

          {state.status !== "idle" ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClass(state.status)}`}
                >
                  {state.status}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {getClientAiRoleSpec(state.routedTo ?? state.role).title}
                </span>
              </div>

              {state.error ? (
                <p className="mt-4 text-sm leading-6 text-rose-700">
                  {state.error}
                </p>
              ) : null}

              {state.answer ? (
                <div className="mt-4 space-y-3">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {state.answer}
                  </p>
                  {state.nextStep ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Next step
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {state.nextStep}
                      </p>
                    </div>
                  ) : null}
                  {state.missingInputs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {state.missingInputs.map((item) => (
                        <span
                          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                          key={item}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {state.createdAt ? (
                    <p className="text-xs font-medium text-slate-500">
                      Logged {formatDateTime(state.createdAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Recent usage
              </p>
              <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                Logged AI requests
              </h4>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
              {requests.length} shown
            </span>
          </div>

          {requests.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
              No tool requests have been logged yet. Ask the coordinator to create the first
              workspace response.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => (
                <article
                  className="rounded-2xl border border-white bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                  key={request.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
                        {getClientAiRoleSpec(request.role).label}
                      </p>
                      <h5 className="mt-2 text-sm font-semibold text-slate-950">
                        {request.prompt}
                      </h5>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {request.response}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {request.scopeStatus}
                    </span>
                    {request.routedTo ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        routed to {request.routedTo}
                      </span>
                    ) : null}
                    <span>{formatDateTime(request.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Safety
          </p>
          <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            What this console will never do
          </h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>It will not browse the web or scrape new sources.</li>
            <li>It will not send emails, texts, calls, or posts.</li>
            <li>It will not spend money or change credentials.</li>
            <li>It will not invent metrics, results, or completed work.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function UsageChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
    </div>
  );
}
