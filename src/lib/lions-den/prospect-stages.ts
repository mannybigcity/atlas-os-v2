import type { OpportunityStage } from "@/server/opportunities/queries";
import { FOLLOW_UP_CHECK_IN_DAYS } from "./follow-up-drafts.ts";
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

/** What the owner says happened after a call. Messages get no outcome; the check-in covers them. */
export const DESK_CONTACT_OUTCOMES = ["no_answer", "voicemail", "talked", "wants_quote", "wrong_number"] as const;

export type DeskContactOutcome = (typeof DESK_CONTACT_OUTCOMES)[number];

export function isDeskContactOutcome(value: unknown): value is DeskContactOutcome {
  return (DESK_CONTACT_OUTCOMES as readonly string[]).includes(String(value ?? ""));
}

export type DeskContactStamp = {
  channel: DeskContactChannel;
  at: string;
  by?: string;
  outcome?: DeskContactOutcome;
  outcomeAt?: string;
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
  const row = raw as { channel?: string; at?: string; by?: string; outcome?: string; outcomeAt?: string };
  if (row.channel !== "call" && row.channel !== "whatsapp" && row.channel !== "email") return null;
  if (!row.at || Number.isNaN(new Date(row.at).getTime())) return null;
  const by = typeof row.by === "string" && row.by.trim() ? row.by.trim().slice(0, 320) : undefined;
  const outcome = isDeskContactOutcome(row.outcome) ? row.outcome : undefined;
  const outcomeAt =
    outcome && typeof row.outcomeAt === "string" && !Number.isNaN(new Date(row.outcomeAt).getTime())
      ? row.outcomeAt
      : undefined;
  return {
    channel: row.channel,
    at: row.at,
    ...(by ? { by } : {}),
    ...(outcome ? { outcome } : {}),
    ...(outcomeAt ? { outcomeAt } : {}),
  };
}

/** How long the record keeps asking "how did the call go?" after an un-logged call. */
export const DESK_CONTACT_OUTCOME_WINDOW_HOURS = 48;

/** True when the last touch was a call the owner has not told us the result of yet. */
export function needsDeskContactOutcome(
  contact: DeskContactStamp | null | undefined,
  now: Date = new Date(),
) {
  if (!contact || contact.channel !== "call" || contact.outcome) return false;
  const age = now.getTime() - new Date(contact.at).getTime();
  return age >= 0 && age <= DESK_CONTACT_OUTCOME_WINDOW_HOURS * 60 * 60 * 1000;
}

function localDateOnly(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function weekdayLabel(date: Date, spanish: boolean) {
  return new Intl.DateTimeFormat(spanish ? "es" : "en", { weekday: "long" }).format(date);
}

function dueInDays(from: Date, days: number) {
  return localDateOnly(new Date(from.getFullYear(), from.getMonth(), from.getDate() + days));
}

/**
 * What lands on the Follow-up desk the moment the owner taps Call, WhatsApp, or
 * Email: a sendable check-in draft a few days out, so the prospect does not fall
 * off the queue right after the owner reached out. Atlas does not send it.
 */
export function deskContactCheckIn(
  channel: DeskContactChannel,
  input: { spanish: boolean; at?: Date },
) {
  const at = input.at ?? new Date();
  const day = weekdayLabel(at, input.spanish);
  const noun =
    channel === "call"
      ? input.spanish
        ? "mi llamada"
        : "my call"
      : channel === "whatsapp"
        ? input.spanish
          ? "mi WhatsApp"
          : "my WhatsApp"
        : input.spanish
          ? "mi correo"
          : "my email";
  const nextAction = input.spanish
    ? `Solo doy seguimiento a ${noun} del ${day}. ¿Tienes un momento esta semana para una llamada rápida?`
    : `Just following up on ${noun} from ${day}. Do you have a minute this week for a quick call?`;
  return { nextAction, nextActionDue: dueInDays(at, FOLLOW_UP_CHECK_IN_DAYS) };
}

export function deskContactOutcomeOptions(spanish: boolean): Array<{ outcome: DeskContactOutcome; label: string }> {
  return [
    { outcome: "no_answer", label: spanish ? "No contestaron" : "No answer" },
    { outcome: "voicemail", label: spanish ? "Dejé buzón" : "Left voicemail" },
    { outcome: "talked", label: spanish ? "Hablamos" : "We talked" },
    { outcome: "wants_quote", label: spanish ? "Quieren cotización" : "They want a quote" },
    { outcome: "wrong_number", label: spanish ? "Número equivocado" : "Wrong number" },
  ];
}

export function deskContactOutcomeLabel(outcome: DeskContactOutcome, spanish: boolean) {
  return deskContactOutcomeOptions(spanish).find((item) => item.outcome === outcome)?.label ?? outcome;
}

export type DeskContactOutcomePlan = {
  /** Event row type; talked / wants_quote count as a reply. */
  eventType: "note_added" | "reply_received";
  /** English summary for the Activity timeline. */
  summary: string;
  /** Stage to move to, or null to leave the stage alone. */
  stage: "responded" | "needs_client_input" | null;
  nextAction: string;
  nextActionDue: string | null;
};

/**
 * Turns "how did the call go?" into the next thing on the desk. Each outcome
 * either queues a sendable check-in with a date or, for a wrong number, sends
 * the record back to "Needs phone". Nothing here contacts anyone.
 */
export function deskContactOutcomePlan(
  outcome: DeskContactOutcome,
  input: { spanish: boolean; by?: string | null; note?: string | null; at?: Date },
): DeskContactOutcomePlan {
  const at = input.at ?? new Date();
  const actor = String(input.by ?? "").trim() || "Owner";
  const note = String(input.note ?? "").trim();
  const noteTail = note ? ` Note: ${note}` : "";
  const day = weekdayLabel(at, input.spanish);
  const es = input.spanish;

  switch (outcome) {
    case "no_answer":
      return {
        eventType: "note_added",
        summary: `${actor} called; no answer. Atlas did not place the call.${noteTail}`.slice(0, 500),
        stage: null,
        nextAction: es
          ? `Te marqué el ${day} y no te alcancé. ¿Cuándo es buen momento para hablar?`
          : `Tried you on ${day} and missed you. When is a good time to talk?`,
        nextActionDue: dueInDays(at, 1),
      };
    case "voicemail":
      return {
        eventType: "note_added",
        summary: `${actor} called and left a voicemail. Atlas did not place the call.${noteTail}`.slice(0, 500),
        stage: null,
        nextAction: es
          ? `Te dejé un mensaje de voz el ${day}. Con gusto hablamos cuando te acomode.`
          : `Left you a voicemail on ${day}. Happy to talk whenever works for you.`,
        nextActionDue: dueInDays(at, 2),
      };
    case "talked":
      return {
        eventType: "reply_received",
        summary: `${actor} called and they talked. Atlas did not place the call.${noteTail}`.slice(0, 500),
        stage: "responded",
        nextAction: es
          ? `Gusto en hablar contigo el ${day}. Avísame cuando quieras dar el siguiente paso.`
          : `Good talking with you on ${day}. Let me know when you want to take the next step.`,
        nextActionDue: dueInDays(at, FOLLOW_UP_CHECK_IN_DAYS),
      };
    case "wants_quote":
      return {
        eventType: "reply_received",
        summary: `${actor} called; they want a quote. Atlas did not place the call.${noteTail}`.slice(0, 500),
        stage: "responded",
        nextAction: es
          ? `Como platicamos el ${day}, aquí va la cotización. Llámame con cualquier duda.`
          : `As promised on ${day}, here is the quote. Call me with any questions.`,
        nextActionDue: dueInDays(at, 1),
      };
    case "wrong_number":
      return {
        eventType: "note_added",
        summary: `${actor} called; wrong number. Atlas did not place the call.${noteTail}`.slice(0, 500),
        stage: "needs_client_input",
        nextAction: es
          ? "Número equivocado. Busca el teléfono correcto (sitio web, Maps) y actualiza el registro. Atlas no los ha contactado."
          : "Wrong number. Find the right phone (website, Maps) and update the record. Atlas has not contacted them.",
        nextActionDue: null,
      };
  }
}

/** A quick note the owner types on the timeline; the note itself is the summary so it reads in the list. */
export function prospectNoteEvent(note: string) {
  const text = note.replace(/\s+/g, " ").trim();
  if (text.length < 2) return null;
  // The events table wants 5 to 500 characters in the summary.
  const summary = text.length < 5 ? `Note: ${text}` : text.length > 500 ? `${text.slice(0, 497)}...` : text;
  return { summary, body: note.trim().slice(0, 3000) };
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
  const outcome = contact.outcome ? ` · ${deskContactOutcomeLabel(contact.outcome, spanish)}` : "";
  return contact.by ? `${channel} · ${date} · ${contact.by}${outcome}` : `${channel} · ${date}${outcome}`;
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
    case "outcome_saved":
      return spanish
        ? "Resultado guardado. El siguiente paso ya está en Seguimiento con fecha. Atlas no contactó a nadie."
        : "Outcome saved. The next step is on the Follow-up desk with a date. Atlas did not contact anyone.";
    case "outcome_wrong_number":
      return spanish
        ? "Anotado. El prospecto volvió a “Falta teléfono”. Busca el número correcto en Editar."
        : "Noted. The prospect is back under “Needs phone”. Find the right number under Edit.";
    case "note_saved":
      return spanish ? "Nota guardada en la actividad." : "Note saved on the activity.";
    default:
      return null;
  }
}
