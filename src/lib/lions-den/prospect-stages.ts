import type { OpportunityStage } from "@/server/opportunities/queries";
import { prospectTelHref, prospectWhatsAppHref, publishedPlacePhone } from "./prospect-places.ts";

/**
 * The stages an owner may move a prospect into from the desk. Internal stages
 * (researching, qualified, follow_up_queued, archived) stay agent-only.
 */
export const OWNER_PROSPECT_STAGES = [
  "ready_for_follow_up",
  "contacted",
  "responded",
  "won",
  "lost",
] as const;

export type OwnerProspectStage = (typeof OWNER_PROSPECT_STAGES)[number];

export function isOwnerProspectStage(value: unknown): value is OwnerProspectStage {
  return (OWNER_PROSPECT_STAGES as readonly string[]).includes(String(value ?? ""));
}

export function prospectStageLabel(stage: OpportunityStage | string, spanish: boolean) {
  const labels: Record<string, [string, string]> = {
    researching: ["Researching", "Investigando"],
    qualified: ["Qualified", "Calificado"],
    needs_client_input: ["Needs phone", "Falta teléfono"],
    ready_for_follow_up: ["To call", "Por llamar"],
    follow_up_queued: ["Follow-up drafted", "Seguimiento listo"],
    contacted: ["Contacted", "Contactado"],
    responded: ["Replied", "Respondió"],
    won: ["Won · Client", "Ganado · Cliente"],
    lost: ["Lost", "Perdido"],
    archived: ["Archived", "Archivado"],
  };
  const pair = labels[String(stage)];
  if (!pair) return String(stage).replaceAll("_", " ");
  return spanish ? pair[1] : pair[0];
}

/**
 * Buttons offered on a prospect for its current stage. Won and lost always
 * offer a way back to the call list so a mis-click is not permanent.
 */
export function prospectStageActions(stage: OpportunityStage | string, spanish: boolean) {
  const action = (next: OwnerProspectStage, en: string, es: string) => ({
    stage: next,
    label: spanish ? es : en,
  });
  const contacted = action("contacted", "I called or messaged them", "Ya llamé o escribí");
  const responded = action("responded", "They replied", "Me respondieron");
  const won = action("won", "Won · make them a client", "Ganado · convertir en cliente");
  const lost = action("lost", "Lost · not now", "Perdido · ahora no");
  const backToCall = action("ready_for_follow_up", "Back to the call list", "Volver a la lista de llamadas");

  switch (String(stage)) {
    case "contacted":
      return [responded, won, lost, backToCall];
    case "responded":
      return [won, lost, backToCall];
    case "won":
      return [backToCall];
    case "lost":
      return [backToCall];
    default:
      return [contacted, responded, won, lost];
  }
}

export const JOB_VALUE_METADATA_KEY = "job_value_usd";

/** Accepts "1,200", "$1200.50", "1200"; rejects negatives, junk, and absurd totals. */
export function parseJobValue(raw: unknown): number | null {
  const text = String(raw ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  if (!text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
  return Math.round(value * 100) / 100;
}

export function readJobValue(metadata: Record<string, unknown> | null | undefined): number | null {
  const value = metadata?.[JOB_VALUE_METADATA_KEY];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") return parseJobValue(value);
  return null;
}

export function sumJobValues(items: Array<{ jobValue?: number | null }>) {
  return items.reduce((total, item) => total + (item.jobValue ?? 0), 0);
}

export function prospectSmsHref(phone: string | null | undefined) {
  return prospectWhatsAppHref(phone);
}

export function prospectMailtoHref(email: string | null | undefined) {
  const raw = String(email ?? "").trim();
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return `mailto:${raw}`;
}

/** Call / Text / Email links for one prospect. Atlas never dials or sends; these open the owner's own apps. */
export function prospectContactLinks(input: {
  contactPhone?: string | null;
  contactEmail?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const phone = publishedPlacePhone(
    input.contactPhone ||
      (typeof input.metadata?.national_phone_number === "string" ? input.metadata.national_phone_number : null) ||
      (typeof input.metadata?.international_phone_number === "string" ? input.metadata.international_phone_number : null),
  );
  return {
    phone,
    tel: prospectTelHref(phone),
    sms: prospectSmsHref(phone),
    whatsapp: prospectWhatsAppHref(phone),
    mailto: prospectMailtoHref(input.contactEmail),
  };
}

export type ProspectEditorValues = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  notes: string;
};

export type ProspectEditorErrors = Partial<Record<keyof ProspectEditorValues, string>>;

export function normalizeWebsite(raw: string) {
  const text = raw.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

/** Mirrors the database check constraints so a bad form never becomes a 500. */
export function validateProspectEditor(values: ProspectEditorValues, spanish: boolean) {
  const errors: ProspectEditorErrors = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 220) {
    errors.name = spanish ? "Escribe el nombre del negocio (2 a 220 letras)." : "Enter the business name (2 to 220 characters).";
  }
  const contactName = values.contactName.trim();
  if (contactName && (contactName.length < 2 || contactName.length > 180)) {
    errors.contactName = spanish ? "El nombre del contacto debe tener 2 a 180 letras." : "Contact name must be 2 to 180 characters.";
  }
  const phone = values.phone.trim();
  if (phone && (phone.replace(/\D/g, "").length < 7 || phone.length > 80)) {
    errors.phone = spanish ? "Escribe un teléfono completo, por ejemplo (713) 555-0100." : "Enter a full phone number, for example (713) 555-0100.";
  }
  const email = values.email.trim();
  if (email && !prospectMailtoHref(email)) {
    errors.email = spanish ? "Ese correo no se ve completo." : "That email does not look complete.";
  }
  const website = normalizeWebsite(values.website);
  if (website && (website.length < 8 || website.length > 2000)) {
    errors.website = spanish ? "Ese sitio web no se ve completo." : "That website does not look complete.";
  }
  if (values.address.trim().length > 500) {
    errors.address = spanish ? "La dirección es demasiado larga." : "Address is too long.";
  }
  if (values.notes.trim().length > 2500) {
    errors.notes = spanish ? "Las notas son demasiado largas (máximo 2500 letras)." : "Notes are too long (2,500 characters max).";
  }
  return errors;
}

export type DeskContactChannel = "call" | "whatsapp" | "email";

export type DeskContactStamp = {
  channel: DeskContactChannel;
  at: string;
  by?: string;
};

export function deskContactStamp(channel: DeskContactChannel, by?: string | null): DeskContactStamp {
  const actor = String(by ?? "").trim().slice(0, 320);
  return {
    channel,
    at: new Date().toISOString(),
    ...(actor ? { by: actor } : {}),
  };
}

export function readLastDeskContact(metadata: Record<string, unknown> | null | undefined): DeskContactStamp | null {
  const raw = metadata?.last_desk_contact;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { channel?: string; at?: string; by?: string };
  if (row.channel !== "call" && row.channel !== "whatsapp" && row.channel !== "email") return null;
  if (!row.at || Number.isNaN(new Date(row.at).getTime())) return null;
  const by = typeof row.by === "string" && row.by.trim() ? row.by.trim().slice(0, 320) : undefined;
  return { channel: row.channel, at: row.at, ...(by ? { by } : {}) };
}

export function lastDeskContactLabel(contact: DeskContactStamp, spanish: boolean) {
  const when = new Date(contact.at);
  const date = new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(when);
  const channel =
    contact.channel === "call"
      ? spanish
        ? "Llamada"
        : "Call"
      : contact.channel === "whatsapp"
        ? "WhatsApp"
        : spanish
          ? "Correo"
          : "Email";
  return contact.by ? `${channel} · ${date} · ${contact.by}` : `${channel} · ${date}`;
}

export function deskContactSummary(
  channel: Exclude<DeskContactChannel, "email">,
  phone: string,
  by?: string | null,
) {
  const actor = String(by ?? "").trim() || "Owner";
  if (channel === "call") {
    return `${actor} started a call to ${phone}. Atlas did not place the call.`;
  }
  return `${actor} opened WhatsApp to ${phone}. Atlas did not send the message.`;
}

/** SIS customer notes stamped when Call / WhatsApp / Email is used on that record. */
export function sisDeskActivityLines(notes: string | null | undefined) {
  return String(notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => / · (called|WhatsApp|emailed) /.test(line));
}

export function prospectNoticeCopy(status: string | undefined, spanish: boolean) {
  switch (status) {
    case "created":
      return spanish
        ? "Prospecto agregado. Atlas no llamó ni escribió a nadie; la llamada es tuya."
        : "Prospect added. Atlas did not call or message anyone; the call is yours.";
    case "updated":
      return spanish ? "Cambios guardados." : "Changes saved.";
    case "deleted":
      return spanish ? "Prospecto eliminado." : "Prospect deleted.";
    case "won":
      return spanish
        ? "Ganado. Ahora aparece en Clientes."
        : "Marked won. They now show under Clients.";
    case "lost":
      return spanish ? "Marcado como perdido. Puedes regresarlo a la lista cuando quieras." : "Marked lost. You can bring them back to the call list any time.";
    case "staged":
      return spanish ? "Etapa actualizada." : "Stage updated.";
    case "invalid":
      return spanish ? "Revisa los campos marcados e inténtalo de nuevo." : "Check the highlighted fields and try again.";
    case "failed":
      return spanish ? "No se pudo guardar. Inténtalo de nuevo." : "That did not save. Try again.";
    case "missing":
      return spanish ? "Ese prospecto ya no existe." : "That prospect no longer exists.";
    case "email_found":
      return spanish
        ? "HUNTER encontró un correo en el sitio web. Revísalo antes de escribir."
        : "HUNTER found an email on the website. Review it before you write.";
    case "email_not_found":
      return spanish
        ? "HUNTER no encontró un correo en ese sitio. Agrégalo en Editar."
        : "HUNTER did not find an email on that site. Add one under Edit.";
    case "email_sent":
      return spanish
        ? "Correo enviado. Las respuestas llegan a tu correo de acceso. El seguimiento quedó guardado."
        : "Email sent. Replies come back to your login email. The follow-up is saved.";
    case "email_queued":
      return spanish
        ? "Borrador guardado en el seguimiento. No pudimos confirmar el envío; ábrelo en tu correo si hace falta."
        : "Draft saved on the follow-up. We could not confirm delivery; open it in your mail app if needed.";
    case "contact_logged":
      return spanish
        ? "Quedó en el historial. Atlas no hizo la llamada ni envió el WhatsApp; eso fue tuyo."
        : "Saved on the history. Atlas did not place the call or send the WhatsApp; that was you.";
    case "quote_ready":
      return spanish
        ? "Cotización lista abajo. Revísala y envíala por correo o WhatsApp. Atlas no la envía ni cobra."
        : "Quote written below. Review it, then send it by email or WhatsApp. Atlas does not send it or collect the money.";
    case "quote_invalid":
      return spanish
        ? "Revisa la cotización: descripción, precio y días de validez."
        : "Check the quote: description, price, and valid days.";
    case "quote_sent":
      return spanish
        ? "Cotización marcada como enviada. El recordatorio ya está en Seguimiento."
        : "Quote marked sent. The check-in is on the Follow-up desk.";
    case "quote_accepted":
      return spanish
        ? "Aceptaron. Ahora es cliente y el valor del trabajo quedó guardado."
        : "They accepted. They are a client now and the job value is saved.";
    case "quote_declined":
      return spanish
        ? "Anotado. Sigue abierto; pregunta qué precio les funciona."
        : "Noted. Still open; ask what number works for them.";
    case "pay_link_saved":
      return spanish ? "Forma de pago guardada. Va en cada cotización." : "Pay link saved. It goes in every quote.";
    default:
      return null;
  }
}
