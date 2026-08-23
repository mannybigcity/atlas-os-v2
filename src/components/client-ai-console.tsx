"use client";

import { useActionState, useState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
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
  previewContext?: {
    organizationName: string;
    approvalQueueCount: number;
    followUpCount: number;
    openPipelineCount: number;
    recentActivityCount: number;
    noteSummary: string;
    topFollowUp: string | null;
  };
  businessOnly?: boolean;
  defaultRole?: ClientAiRole;
  fixedRole?: ClientAiRole;
  title?: string;
  description?: string;
  dailyUsage?: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
};

type PreviewResponse = {
  answer: string;
  nextStep: string;
  missingInputs: string[];
};

const spanishRoleCopy: Record<ClientAiRole, { label: string; title: string; summary: string; promptHint: string }> = {
  atlas: {
    label: "Relaciones con Clientes",
    title: "Relaciones con Clientes",
    summary: "Administra el CRM, identifica el próximo movimiento y mantiene explícitas las aprobaciones.",
    promptHint: "Pide a Relaciones con Clientes que organice el espacio de trabajo o identifique el próximo movimiento.",
  },
  hunter: {
    label: "Investigación de Prospectos",
    title: "Investigación de Prospectos",
    summary: "Investiga prospectos y oportunidades del espacio de trabajo e identifica los datos faltantes.",
    promptHint: "Pide a Investigación de Prospectos que revise prospectos, afinidad o investigación de leads.",
  },
  micah: {
    label: "Gestor de Contenido",
    title: "Gestor de Contenido",
    summary: "Prepara textos, calendarios de contenido y dirección creativa para revisión humana.",
    promptHint: "Pide al Gestor de Contenido borradores o planificación de contenido.",
  },
  david: {
    label: "Centro de Seguimiento",
    title: "Centro de Seguimiento",
    summary: "Informa sobre seguimiento, estado de revisión y la próxima acción que debe ver el cliente.",
    promptHint: "Pregunta al Centro de Seguimiento por el estado del CRM, seguimientos o colas de revisión.",
  },
};

function roleCopy(role: ClientAiRole, spanish: boolean) {
  return spanish ? spanishRoleCopy[role] : getClientAiRoleSpec(role);
}

function statusLabel(value: string, spanish: boolean) {
  if (!spanish) return humanize(value);
  const labels: Record<string, string> = {
    blocked: "bloqueado",
    declined: "rechazado",
    failed: "falló",
    in_scope: "dentro del alcance",
    needs_input: "requiere información",
    rerouted: "redirigido",
    succeeded: "completado",
    success: "completado",
  };
  return labels[value] ?? humanize(value);
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function statusClass(status: ClientAiActionState["status"]) {
  if (status === "success") return "bg-emerald-100 text-emerald-800";
  if (status === "blocked") return "bg-amber-100 text-amber-800";
  if (status === "failed") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function buildPreviewResponse(
  prompt: string,
  activeRole: ClientAiRole,
  context: NonNullable<ClientAiConsoleProps["previewContext"]>,
  spanish: boolean,
): PreviewResponse {
  const cleanPrompt = prompt.trim();

  if (cleanPrompt.length < 3) {
    return {
      answer: spanish ? "Haz una pregunta específica sobre el espacio de trabajo de Q Time." : "Ask a specific question about the Q Time workspace.",
      nextStep: spanish
        ? "Escribe una pregunta interna sobre aprobaciones, pipeline, seguimiento, notas o trabajo del calendario."
        : "Type one internal question about approvals, pipeline, follow-up, notes, or calendar work.",
      missingInputs: [spanish ? "Una pregunta específica" : "A specific question"],
    };
  }

  const lower = cleanPrompt.toLowerCase();
  const blockedTerms = [
    "publish",
    "send",
    "browse",
    "call",
    "email",
    "text",
    "buy",
    "spend",
    "contact",
    "publicar",
    "enviar",
    "llamar",
    "comprar",
    "gastar",
    "contactar",
  ];

  if (blockedTerms.some((term) => lower.includes(term))) {
    return {
      answer: spanish
        ? "Protección de Q Time: esta área solo resume el contexto del espacio y no realiza acciones externas."
        : "Q Time guardrail: this area only summarizes workspace context and does not perform external actions.",
      nextStep: spanish
        ? "Reescribe la pregunta como una solicitud interna de planificación o revisión."
        : "Rewrite the question as an internal planning or review request.",
      missingInputs: [spanish ? "Una pregunta solo para uso interno" : "An internal-only question"],
    };
  }

  const noteSnippet = context.noteSummary.slice(0, 120);

  return {
    answer: spanish
      ? `Respuesta local para ${context.organizationName}. El espacio muestra ${context.approvalQueueCount} elementos de revisión, ${context.followUpCount} seguimientos listos, ${context.openPipelineCount} oportunidades abiertas y ${context.recentActivityCount} eventos de actividad visibles. ${noteSnippet ? `Contexto de la nota más reciente: ${noteSnippet}.` : ""}`.trim()
      : `Local response for ${context.organizationName}. The workspace currently shows ${context.approvalQueueCount} review items, ${context.followUpCount} ready follow-ups, ${context.openPipelineCount} open opportunities, and ${context.recentActivityCount} visible activity events. ${noteSnippet ? `Most recent note context: ${noteSnippet}.` : ""}`.trim(),
    nextStep: context.topFollowUp
      ? spanish
        ? `Comienza con ${context.topFollowUp} y registra el resultado en el centro de seguimiento.`
        : `Start with ${context.topFollowUp} and record the outcome in the follow-up desk.`
      : spanish
        ? `Usa la vista de ${activeRole} para identificar la próxima pregunta interna.`
        : `Use the ${activeRole} workspace view to identify the next internal question.`,
    missingInputs: [],
  };
}

export function ClientAiConsole({
  organizationId,
  previewMode,
  requests,
  previewContext,
  businessOnly = false,
  defaultRole,
  fixedRole,
  title,
  description,
}: ClientAiConsoleProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [activeRole, setActiveRole] = useState<ClientAiRole>(fixedRole ?? defaultRole ?? "atlas");
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewResponse, setPreviewResponse] = useState<PreviewResponse | null>(null);
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );

  const activeRoleText = roleCopy(activeRole, spanish);
  const usageLabel = spanish ? "Disponible" : "Available";
  const visibleRoleSpecs = businessOnly
    ? clientAiRoleSpecs.filter((spec) => spec.role !== "atlas")
    : clientAiRoleSpecs;
  const resolvedPreviewContext =
    previewContext ??
    ({
      organizationName: "Workspace",
      approvalQueueCount: 0,
      followUpCount: 0,
      openPipelineCount: 0,
      recentActivityCount: 0,
      noteSummary: "",
      topFollowUp: null,
    } satisfies NonNullable<ClientAiConsoleProps["previewContext"]>);
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
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
            {spanish ? "Pregunta a Atlas" : "Ask Atlas"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            {title ?? (spanish ? "Pide a Atlas tu próximo movimiento." : "Ask Atlas for your command.")}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {description ?? (spanish
              ? "Solo contexto del espacio de Q Time. Sin otros clientes ni acciones externas."
              : "Q Time workspace context only. No other clients or external actions.")}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 lg:w-[31rem]">
          <UsageChip label={spanish ? "Pregunta a Atlas hoy" : "Ask Atlas today"} value={usageLabel} tone="blue" />
          <UsageChip label={spanish ? "Recientes" : "Recent"} value={requestCounts.total} />
          <UsageChip label={spanish ? "Completadas" : "Done"} value={requestCounts.succeeded} tone="emerald" />
          <UsageChip label={spanish ? "Redirigidas" : "Rerouted"} value={requestCounts.rerouted} tone="amber" />
          <UsageChip label={spanish ? "Bloqueadas" : "Blocked"} value={requestCounts.blocked} tone="rose" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 md:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {spanish ? "Protecciones" : "Guardrails"}
          </p>
          <ul className="mt-3 space-y-2">
            <li>{spanish ? "Solo contexto del espacio de Q Time Productions." : "Q Time Productions workspace context only."}</li>
            <li>{spanish ? "Sin otros clientes ni datos de cuentas compartidas." : "No other clients or shared account data."}</li>
            <li>{spanish ? "Sin navegación, publicación o contacto externo." : "No external browsing, publishing, or contact."}</li>
            <li>{spanish ? "Sin compromisos no aprobados." : "No unapproved commitments."}</li>
          </ul>
        </div>
        {previewContext ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {spanish ? "Resumen del contexto" : "Context snapshot"}
            </p>
            <p className="mt-3">{previewContext.organizationName}.</p>
            <p className="mt-2">{previewContext.approvalQueueCount} {spanish ? "elementos en la cola de aprobación." : "items in the approval queue."}</p>
            <p className="mt-2">{previewContext.followUpCount} {spanish ? "seguimientos listos." : "follow-ups ready."}</p>
            <p className="mt-2">{previewContext.openPipelineCount} {spanish ? "oportunidades abiertas visibles." : "open opportunities visible."}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 md:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {spanish ? "Resumen del contexto" : "Context snapshot"}
            </p>
            <p className="mt-3">{spanish ? "No se proporcionó el contexto del espacio." : "Workspace context not supplied."}</p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-3">
          {visibleRoleSpecs.map((spec) => {
            const checked = spec.role === activeRole;
            const translatedSpec = roleCopy(spec.role, spanish);

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
                  disabled={previewMode || Boolean(fixedRole)}
                  name="client-ai-role"
                  onChange={() => setActiveRole(spec.role)}
                  type="radio"
                  value={spec.role}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
                      {translatedSpec.label}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {translatedSpec.title}
                    </h4>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 ring-1 ring-slate-200">
                    {checked
                      ? fixedRole
                        ? spanish ? "Fijo" : "Fixed"
                        : spanish ? "Seleccionado" : "Selected"
                      : spanish ? "Cambiar" : "Switch"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {translatedSpec.summary}
                </p>
                <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                  {translatedSpec.promptHint}
                </p>
              </label>
            );
          })}
          </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5672f0]">
                {activeRoleText.label}
              </p>
              <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {activeRoleText.title} {spanish ? "solicitud" : "request"}
              </h4>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {humanize(activeRole)}
            </span>
          </div>

          {previewMode ? (
            <form
              className="mt-5 space-y-4"
                onSubmit={(event) => {
                event.preventDefault();
                setPreviewResponse(
                  buildPreviewResponse(previewPrompt, activeRole, resolvedPreviewContext, spanish),
                );
              }}
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {spanish ? "Tu pregunta" : "Your question"}
                </span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                  name="prompt"
                  onChange={(event) => setPreviewPrompt(event.target.value)}
                  placeholder={activeRoleText.promptHint}
                  value={previewPrompt}
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#465fd1]"
                type="submit"
              >
                  {spanish ? "Mostrar respuesta" : "Show response"}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  {spanish
                    ? "Solo respuesta local. Esta ruta no realiza ninguna acción externa."
                    : "Local response only. No external action is taken from this route."}
                </p>
              </div>
            </form>
          ) : (
            <form action={formAction} className="mt-5 space-y-4">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="role" type="hidden" value={activeRole} />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {spanish ? "Tu pregunta" : "Your question"}
                </span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5672f0] focus:ring-4 focus:ring-[#dfe7ff]"
                  name="prompt"
                  placeholder={activeRoleText.promptHint}
                  required
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[#5672f0] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#465fd1] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={pending}
                  type="submit"
                >
                  {pending
                    ? spanish ? "Pensando..." : "Thinking..."
                    : spanish ? "Preguntar a este rol" : "Ask this role"}
                </button>
                <p className="text-xs leading-5 text-slate-500">
                  {spanish
                    ? "Los límites de uso se administran mediante el plan de tu espacio."
                    : "Usage limits are managed by your workspace plan."}
                </p>
              </div>
            </form>
          )}

          {previewMode && previewResponse ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-800">
                  {spanish ? "respuesta local" : "local response"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {roleCopy(activeRole, spanish).title}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {previewResponse.answer}
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    {spanish ? "Próximo paso" : "Next step"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {previewResponse.nextStep}
                  </p>
                </div>
                {previewResponse.missingInputs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {previewResponse.missingInputs.map((item) => (
                      <span
                        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!previewMode && state.status !== "idle" ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClass(state.status)}`}
                >
                  {statusLabel(state.status, spanish)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {roleCopy(state.routedTo ?? state.role, spanish).title}
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
                        {spanish ? "Próximo paso" : "Next step"}
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
                      {spanish ? "Registrado" : "Logged"} {formatDateTime(state.createdAt)}
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
                {spanish ? "Uso reciente" : "Recent usage"}
              </p>
              <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                {spanish ? "Solicitudes de IA registradas" : "Logged AI requests"}
              </h4>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
              {requests.length} {spanish ? "mostradas" : "shown"}
            </span>
          </div>

          {requests.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
              {spanish
                ? "Todavía no se han registrado solicitudes de herramientas. Pide al coordinador que cree la primera respuesta del espacio."
                : "No tool requests have been logged yet. Ask the coordinator to create the first workspace response."}
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
                        {roleCopy(request.role, spanish).label}
                      </p>
                      <h5 className="mt-2 text-sm font-semibold text-slate-950">
                        {request.prompt}
                      </h5>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                      {statusLabel(request.status, spanish)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {request.response}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {statusLabel(request.scopeStatus, spanish)}
                    </span>
                    {request.routedTo ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {spanish ? "redirigido a" : "routed to"} {request.routedTo}
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
            {spanish ? "Seguridad" : "Safety"}
          </p>
          <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            {spanish ? "Lo que esta consola nunca hará" : "What this console will never do"}
          </h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>{spanish ? "No navegará por la web ni extraerá fuentes nuevas." : "It will not browse the web or scrape new sources."}</li>
            <li>{spanish ? "No enviará correos, mensajes, llamadas ni publicaciones." : "It will not send emails, texts, calls, or posts."}</li>
            <li>{spanish ? "No gastará dinero ni cambiará credenciales." : "It will not spend money or change credentials."}</li>
            <li>{spanish ? "No inventará métricas, resultados ni trabajo completado." : "It will not invent metrics, results, or completed work."}</li>
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
  value: number | string;
  tone?: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>
    </div>
  );
}
