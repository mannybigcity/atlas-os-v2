"use client";

import { useState } from "react";
import type { NextMessageResult } from "@/lib/lions-den/next-message-engine";
import { sendDeskFollowUpEmail } from "@/server/opportunities/desk-email-actions";

type DeskEmailComposeProps = {
  spanish: boolean;
  compact?: boolean;
  toEmail?: string | null;
  fromEmail: string;
  prospectName: string;
  organizationId: string;
  opportunityId?: string;
  customerId?: string;
  website?: string | null;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  returnTo?: string;
  detailHref?: string;
  initialOpen?: boolean;
  /** Prefilled by a quote; the owner still reads and sends it himself. */
  initialSubject?: string;
  initialBody?: string;
  quoteId?: string;
  engine?: NextMessageResult | null;
};

const actionClass =
  "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white";
const compactActionClass =
  "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-3 py-1 text-xs font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white";
const fieldClass =
  "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42] placeholder:text-[#8a93a3]";

export function DeskEmailCompose({
  spanish,
  compact = false,
  toEmail,
  fromEmail,
  prospectName,
  organizationId,
  opportunityId,
  customerId,
  website,
  previewOrgSlug,
  workspaceSlug,
  returnTo,
  detailHref,
  initialOpen = false,
  initialSubject,
  initialBody,
  quoteId,
  engine = null,
}: DeskEmailComposeProps) {
  const [open, setOpen] = useState(() => {
    if (initialOpen) return true;
    if (typeof window === "undefined") return false;
    return window.location.hash === "#desk-email";
  });
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fallbackBody = spanish
    ? `Hola,\n\nTe escribo para dar seguimiento con ${prospectName}. ¿Tienes un momento esta semana?\n\nGracias.`
    : `Hi,\n\nI am following up with ${prospectName}. Do you have a few minutes this week?\n\nThank you.`;
  const seededBody = initialBody?.trim() ? initialBody : engine?.body || fallbackBody;
  const [body, setBody] = useState(seededBody);
  const [moreIndex, setMoreIndex] = useState(0);
  const label = spanish ? "Correo" : "Email";
  const defaultSubject = initialSubject ?? engine?.subject ?? (spanish ? `Seguimiento: ${prospectName}` : `Follow-up: ${prospectName}`);

  function applyChip(chip: "shorter" | "softer" | "askYes" | "more") {
    if (!engine) return;
    if (chip === "more") {
      setBody(engine.variants.extra[moreIndex % 2] ?? engine.body);
      setMoreIndex((value) => value + 1);
      return;
    }
    setBody(engine.variants[chip]);
  }

  if (compact) {
    return (
      <a className={compactActionClass} href={detailHref ? `${detailHref}#desk-email` : "#desk-email"}>
        {label}
      </a>
    );
  }

  return (
    <div className="min-w-0" data-desk-email-compose>
      <button className={actionClass} onClick={() => setOpen((value) => !value)} type="button">
        {label}
      </button>
      {open ? (
        <>
        {engine ? (
          <div
            className="mt-3 flex w-full max-w-xl flex-wrap items-center gap-1.5 rounded-lg border border-[#ece7d8] bg-[#fbfaf4] px-2.5 py-1.5"
            data-next-message-engine
          >
            <p className="mr-1 text-[11px] font-semibold text-[#5c4a12]">{engine.jobLabel}</p>
            <button
              className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#071b42]"
              data-engine-chip="shorter"
              onClick={() => applyChip("shorter")}
              type="button"
            >
              {spanish ? "Más corto" : "Shorter"}
            </button>
            <button
              className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#071b42]"
              data-engine-chip="softer"
              onClick={() => applyChip("softer")}
              type="button"
            >
              {spanish ? "Más suave" : "Softer"}
            </button>
            <button
              className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#071b42]"
              data-engine-chip="askYes"
              onClick={() => applyChip("askYes")}
              type="button"
            >
              {spanish ? "Pedir el sí" : "Ask for the yes"}
            </button>
            <button
              className="rounded-full border border-[#d5d0c4] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#071b42]"
              data-engine-chip="more"
              onClick={() => applyChip("more")}
              type="button"
            >
              {spanish ? "2 más" : "2 more"}
            </button>
          </div>
        ) : null}
        <div className="mt-3 w-full max-w-xl rounded-2xl border border-[#d5d0c4] bg-white p-4 text-[#071b42]" id="desk-email">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1246a0]">
            {spanish ? "Escribir en Atlas" : "Write in Atlas"}
          </p>
          <p className="mt-1 text-xs text-[#5c6578]">
            {spanish ? "Tu correo de acceso: " : "Your login email: "}
            <span className="font-semibold text-[#071b42]">{fromEmail || "—"}</span>
          </p>
          <form action={sendDeskFollowUpEmail} className="mt-3 grid gap-2" encType="multipart/form-data">
            <input name="organizationId" type="hidden" value={organizationId} />
            {opportunityId ? <input name="opportunityId" type="hidden" value={opportunityId} /> : null}
            {customerId ? <input name="customerId" type="hidden" value={customerId} /> : null}
            {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
            {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
            {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
            <input name="fromEmail" type="hidden" value={fromEmail} />
            <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Para" : "To"}
              <input
                className={fieldClass}
                defaultValue={toEmail ?? ""}
                name="to"
                placeholder="name@business.com"
                required
                type="email"
              />
            </label>
            {!toEmail && website ? (
              <p className="text-xs text-[#5c6578]">
                {spanish
                  ? "HUNTER no encontró un correo en el sitio. Escríbelo aquí."
                  : "HUNTER did not find an email on the website. Type it here."}
              </p>
            ) : null}
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Asunto" : "Subject"}
              <input
                className={fieldClass}
                defaultValue={defaultSubject}
                name="subject"
                required
                type="text"
              />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Mensaje" : "Message"}
              <textarea
                className={fieldClass}
                name="body"
                onChange={(event) => setBody(event.target.value)}
                required
                rows={initialBody || engine ? 12 : 6}
                value={body}
              />
            </label>
            {quoteId ? <input name="quoteId" type="hidden" value={quoteId} /> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button className={actionClass} type="submit">
                {spanish ? "Enviar y guardar seguimiento" : "Send and save follow-up"}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1246a0]">
                <PaperclipIcon />
                <span>{spanish ? "Adjuntar" : "Attach"}</span>
                <input
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
                  className="sr-only"
                  multiple
                  name="attachments"
                  onChange={(event) => {
                    const names = [...(event.target.files ?? [])].map((file) => file.name);
                    setFileNames(names);
                  }}
                  type="file"
                />
              </label>
            </div>
            {fileNames.length > 0 ? (
              <p className="text-xs text-[#5c6578]" data-desk-email-attachments>
                {fileNames.join(" · ")}
              </p>
            ) : null}
            <p className="text-xs text-[#5c6578]">
              {spanish
                ? "Las respuestas vuelven a tu correo de acceso. Atlas guarda el envío para el seguimiento."
                : "Replies come back to your login email. Atlas keeps the send for follow-up."}
            </p>
          </form>
        </div>
        </>
      ) : null}
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.49-8.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
