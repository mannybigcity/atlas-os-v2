"use client";

import { useState } from "react";
import { findProspectWebsiteEmail, sendDeskFollowUpEmail } from "@/server/opportunities/desk-email-actions";

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
};

const actionClass =
  "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white";
const compactActionClass =
  "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-3 py-1 text-xs font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white";

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
}: DeskEmailComposeProps) {
  const [open, setOpen] = useState(() => {
    if (initialOpen) return true;
    if (typeof window === "undefined") return false;
    return window.location.hash === "#desk-email";
  });
  const label = spanish ? "Correo" : "Email";

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
        <div
          className="mt-3 w-full max-w-xl rounded-2xl border border-[#1246a0] bg-[#071b42] p-4 text-white"
          id="desk-email"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ffd068]">
            {spanish ? "Escribir en Atlas" : "Write in Atlas"}
          </p>
          <p className="mt-1 text-xs text-blue-100/80">
            {spanish ? "Tu correo de acceso: " : "Your login email: "}
            <span className="font-semibold text-white">{fromEmail || "—"}</span>
          </p>
          {!toEmail && website ? (
            <form action={findProspectWebsiteEmail} className="mt-3">
              <input name="organizationId" type="hidden" value={organizationId} />
              {opportunityId ? <input name="opportunityId" type="hidden" value={opportunityId} /> : null}
              {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
              {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
              {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
              <button className={compactActionClass} type="submit">
                {spanish ? "HUNTER: buscar correo en el sitio" : "HUNTER: find email on the website"}
              </button>
            </form>
          ) : null}
          <form action={sendDeskFollowUpEmail} className="mt-3 grid gap-2">
            <input name="organizationId" type="hidden" value={organizationId} />
            {opportunityId ? <input name="opportunityId" type="hidden" value={opportunityId} /> : null}
            {customerId ? <input name="customerId" type="hidden" value={customerId} /> : null}
            {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
            {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
            {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
            <input name="fromEmail" type="hidden" value={fromEmail} />
            <label className="block text-xs font-semibold text-blue-100">
              {spanish ? "Para" : "To"}
              <input
                className="mt-1 block w-full rounded-md border border-white/20 bg-[#0a2a5c] px-3 py-2 text-sm !text-white placeholder:text-blue-100/50"
                defaultValue={toEmail ?? ""}
                name="to"
                placeholder="name@business.com"
                required
                type="email"
              />
            </label>
            <label className="block text-xs font-semibold text-blue-100">
              {spanish ? "Asunto" : "Subject"}
              <input
                className="mt-1 block w-full rounded-md border border-white/20 bg-[#0a2a5c] px-3 py-2 text-sm !text-white"
                defaultValue={
                  spanish ? `Seguimiento: ${prospectName}` : `Follow-up: ${prospectName}`
                }
                name="subject"
                required
                type="text"
              />
            </label>
            <label className="block text-xs font-semibold text-blue-100">
              {spanish ? "Mensaje" : "Message"}
              <textarea
                className="mt-1 block w-full rounded-md border border-white/20 bg-[#0a2a5c] px-3 py-2 text-sm !text-white"
                defaultValue={
                  spanish
                    ? `Hola,\n\nTe escribo para dar seguimiento con ${prospectName}. ¿Tienes un momento esta semana?\n\nGracias.`
                    : `Hi,\n\nI am following up with ${prospectName}. Do you have a few minutes this week?\n\nThank you.`
                }
                name="body"
                required
                rows={6}
              />
            </label>
            <button className={actionClass} type="submit">
              {spanish ? "Enviar y guardar seguimiento" : "Send and save follow-up"}
            </button>
            <p className="text-xs text-blue-100/75">
              {spanish
                ? "Las respuestas vuelven a tu correo de acceso. Atlas guarda el envío para el seguimiento."
                : "Replies come back to your login email. Atlas keeps the send for follow-up."}
            </p>
          </form>
        </div>
      ) : null}
    </div>
  );
}
