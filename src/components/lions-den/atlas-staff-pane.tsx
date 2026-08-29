"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import { submitClientAiRequest } from "@/server/client-ai/actions";
import { initialClientAiActionState } from "@/server/client-ai/types";
import type { ClientAiDailyUsage, ClientAiRequest } from "@/server/client-ai/queries";

type AtlasStaffPaneProps = {
  organizationId: string;
  organizationName: string;
  previewMode: boolean;
  requests: ClientAiRequest[];
  dailyUsage?: ClientAiDailyUsage | null;
};

export function AtlasStaffPane({
  organizationId,
  organizationName,
  previewMode,
  requests,
  dailyUsage,
}: AtlasStaffPaneProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const [state, formAction, pending] = useActionState(
    submitClientAiRequest,
    initialClientAiActionState,
  );
  const latest = requests[0] ?? null;
  const usageLabel = dailyUsage
    ? dailyUsage.limit === null
      ? spanish
        ? `${dailyUsage.used} hoy`
        : `${dailyUsage.used} today`
      : spanish
        ? `${dailyUsage.used} de ${dailyUsage.limit} hoy`
        : `${dailyUsage.used} of ${dailyUsage.limit} today`
    : null;

  return (
    <section className="flex h-full flex-col p-4 sm:p-5" aria-label={spanish ? "Personal de ATLAS" : "ATLAS staff"}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f5b932]">
        {spanish ? "Personal de ATLAS" : "ATLAS staff"}
      </p>
      <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-[-0.04em] text-[#071b42]">
        <Image
          alt=""
          className="h-7 w-7 shrink-0 object-contain"
          height={56}
          src="/brand/atlas-logo.png"
          width={56}
        />
        {spanish ? "Pregunta a Atlas" : "Ask Atlas"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#33415c]">
        {spanish
          ? `ATLAS es personal interno para ${organizationName || "este espacio"}, no un closer. No actúa hacia afuera sin tu aprobación.`
          : `ATLAS is staff, not a closer, for ${organizationName || "this workspace"}. No external action without your approval.`}
      </p>
      {usageLabel ? (
        <p className="mt-3 w-fit rounded-full border border-[#d8c27a] bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {usageLabel}
        </p>
      ) : null}

      {previewMode ? (
        <p className="mt-4 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-4 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "Vista previa: el chat de personal no envía solicitudes en este modo."
            : "Preview: staff chat does not send requests in this mode."}
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="role" type="hidden" value="atlas" />
          <input name="scopeMode" type="hidden" value="business_only" />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]/70">
              {spanish ? "Nota para el personal" : "Note to staff"}
            </span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-[#d5d0c4] bg-white px-3 py-3 text-sm leading-6 text-[#071b42] outline-none transition placeholder:text-[#8a93a3] focus:border-[#f5b932] focus:ring-4 focus:ring-[#f5b932]/20"
              name="prompt"
              placeholder={spanish
                ? "Pide al personal el próximo paso interno. No pedirá llamadas, correos ni publicaciones."
                : "Ask staff for the next internal step. It will not call, email, or post."}
              required
            />
          </label>
          <button
            className="w-full rounded-full bg-[#071b42] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0c2b63] disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending
              ? spanish ? "Pensando…" : "Thinking…"
              : spanish ? "Preguntar a ATLAS" : "Ask ATLAS"}
          </button>
        </form>
      )}

      {!previewMode && state.status !== "idle" ? (
        <div className="mt-4 rounded-2xl border border-[#d5d0c4] bg-[#fbfaf4] p-4 text-sm leading-6 text-[#071b42]">
          {state.error ? <p className="text-rose-800">{state.error}</p> : null}
          {state.answer ? <p className="whitespace-pre-wrap">{state.answer}</p> : null}
          {state.nextStep ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#071b42]/70">
              {spanish ? "Próximo paso" : "Next step"}: {state.nextStep}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-[#d5d0c4] pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#071b42]/60">
          {spanish ? "Aprobación humana" : "Human approval"}
        </p>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-[#33415c]">
          <li>{spanish ? "Sin llamadas, correos ni SMS." : "No calls, email, or SMS."}</li>
          <li>{spanish ? "Sin publicar en redes." : "No social posting."}</li>
          <li>{spanish ? "Tú apruebas cualquier acción externa." : "You approve any external action."}</li>
        </ul>
      </div>

      {latest ? (
        <article className="mt-4 rounded-2xl border border-[#d5d0c4] bg-white p-3 text-sm leading-6 text-[#33415c]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#071b42]/60">
            {spanish ? "Última nota" : "Latest note"}
          </p>
          <p className="mt-2 font-semibold text-[#071b42]">{latest.prompt}</p>
          <p className="mt-1 line-clamp-4">{latest.response}</p>
        </article>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-[#d5d0c4] p-3 text-sm leading-6 text-[#5c6578]">
          {spanish
            ? "Todavía no hay notas de personal. Escribe la primera cuando quieras."
            : "No staff notes yet. Write the first one when you need it."}
        </p>
      )}
    </section>
  );
}
