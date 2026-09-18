"use client";

import { useState } from "react";
import type { NextMessageResult } from "@/lib/lions-den/next-message-engine";
import { micahFlyerButtonLabel } from "@/lib/lions-den/micah-flyer-request";
import { sendDeskFollowUpEmail } from "@/server/opportunities/desk-email-actions";
import {
  requestAmandaFirstTouchDraft,
  requestMicahFlyerDraft,
} from "@/server/outreach/desk-compose-actions";
import { LD_CHIP_XS } from "@/lib/lions-den/desk-chips";

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
const chipClass = LD_CHIP_XS;
const goldChipClass =
  "cursor-pointer rounded-full border border-[#f5b932] bg-[#fff8e6] px-2 py-0.5 text-[11px] font-semibold text-[#071b42]";

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
  const [liveEngine, setLiveEngine] = useState(engine);
  const fallbackBody = spanish
    ? `Hola,\n\nTe escribo para dar seguimiento con ${prospectName}. ¿Tienes un momento esta semana?\n\nGracias.`
    : `Hi,\n\nI am following up with ${prospectName}. Do you have a few minutes this week?\n\nThank you.`;
  const seededBody = initialBody?.trim() ? initialBody : liveEngine?.body || engine?.body || fallbackBody;
  const [body, setBody] = useState(seededBody);
  const [subject, setSubject] = useState(
    initialSubject ?? liveEngine?.subject ?? engine?.subject ?? (spanish ? `Seguimiento: ${prospectName}` : `Follow-up: ${prospectName}`),
  );
  const [moreIndex, setMoreIndex] = useState(0);
  const [busy, setBusy] = useState<"amanda" | "micah" | null>(null);
  const [deskNote, setDeskNote] = useState<string | null>(null);
  const label = spanish ? "Correo" : "Email";
  const activeEngine = liveEngine ?? engine;

  function applyChip(chip: "shorter" | "softer" | "askYes" | "more") {
    if (!activeEngine) return;
    if (chip === "more") {
      setBody(activeEngine.variants.extra[moreIndex % 2] ?? activeEngine.body);
      setMoreIndex((value) => value + 1);
      return;
    }
    setBody(activeEngine.variants[chip]);
  }

  function composeFacts() {
    const profile = activeEngine?.profile;
    return {
      organizationId,
      spanish,
      ownerFirstName: profile?.ownerFirstName ?? "",
      businessName: profile?.businessName ?? "",
      ownerPhone: profile?.ownerPhone ?? null,
      contactLines: profile?.contactLines ?? null,
      trade: profile?.trade || null,
      city: profile?.city || null,
      prospectName,
      prospectCompany: profile?.prospectCompany || null,
      prospectType: profile?.prospectType || null,
      notesText: profile?.notesThin ? "" : "note",
      previewOrgSlug,
      workspaceSlug,
    };
  }

  async function onAskAmanda() {
    if (!activeEngine || busy) return;
    if (!activeEngine.aiEligible) {
      setBody(activeEngine.body);
      setSubject(activeEngine.subject);
      return;
    }
    setBusy("amanda");
    setDeskNote(spanish ? "Amanda está redactando…" : "Amanda is drafting…");
    try {
      const result = await requestAmandaFirstTouchDraft(composeFacts());
      setLiveEngine(result.engine);
      setBody(result.engine.body);
      setSubject(result.engine.subject);
      setDeskNote(result.message);
    } catch {
      setDeskNote(
        spanish
          ? "Amanda usó el primer saludo fijo. Léelo y envíalo tú."
          : "Amanda kept the first-hello draft. Read it and send it yourself.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function onAskMicah() {
    if (busy) return;
    setBusy("micah");
    setDeskNote(spanish ? "Micah está armando el pedido de galería…" : "Micah is queuing the gallery request…");
    try {
      const result = await requestMicahFlyerDraft(composeFacts());
      setDeskNote(result.message);
    } catch {
      setDeskNote(
        spanish
          ? "Micah tiene el pedido de flyer. Abre MICAH para el borrador de galería. No se publicó nada."
          : "Micah has the flyer request. Open MICAH for the gallery draft. Nothing was posted.",
      );
    } finally {
      setBusy(null);
    }
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
        {activeEngine ? (
          <div
            className="mt-3 flex w-full max-w-xl flex-wrap items-center gap-1.5 rounded-lg border border-[#ece7d8] bg-[#fbfaf4] px-2.5 py-1.5"
            data-next-message-engine
          >
            <button
              className={goldChipClass}
              data-ask-amanda
              disabled={busy !== null}
              onClick={() => void onAskAmanda()}
              type="button"
            >
              {spanish ? "Pregúntale a Amanda" : "Ask Amanda"}
            </button>
            <span className="mr-1 text-[11px] font-medium text-[#8a6a12]" data-engine-label>
              {activeEngine.jobLabel}
            </span>
            <button
              className={chipClass}
              data-engine-chip="shorter"
              disabled={busy !== null}
              onClick={() => applyChip("shorter")}
              type="button"
            >
              {spanish ? "Más corto" : "Shorter"}
            </button>
            <button
              className={chipClass}
              data-engine-chip="softer"
              disabled={busy !== null}
              onClick={() => applyChip("softer")}
              type="button"
            >
              {spanish ? "Más suave" : "Softer"}
            </button>
            <button
              className={chipClass}
              data-engine-chip="askYes"
              disabled={busy !== null}
              onClick={() => applyChip("askYes")}
              type="button"
            >
              {spanish ? "Pedir el sí" : "Ask for the yes"}
            </button>
            <button
              className={chipClass}
              data-engine-chip="more"
              disabled={busy !== null}
              onClick={() => applyChip("more")}
              type="button"
            >
              {spanish ? "2 más" : "2 more"}
            </button>
            <button
              className={chipClass}
              data-ask-micah-flyer
              disabled={busy !== null}
              onClick={() => void onAskMicah()}
              type="button"
            >
              {micahFlyerButtonLabel(spanish)}
            </button>
            {deskNote ? (
              <p className="basis-full text-[11px] font-medium text-[#5c4a12]" data-desk-compose-note>
                {deskNote}
              </p>
            ) : null}
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
                name="subject"
                onChange={(event) => setSubject(event.target.value)}
                required
                type="text"
                value={subject}
              />
            </label>
            <label className="block text-xs font-semibold text-[#5c6578]">
              {spanish ? "Mensaje" : "Message"}
              <textarea
                className={fieldClass}
                name="body"
                onChange={(event) => setBody(event.target.value)}
                required
                rows={initialBody || activeEngine ? 12 : 6}
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
