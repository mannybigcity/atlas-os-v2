import { isSisOrganization } from "../client-portal/identity.ts";
import { isSampleLabeledSeedText } from "./live-desk.ts";
import { prospectWhatsAppHref } from "./prospect-places.ts";
import { deskDateInDays, deskWeekday } from "../desk-time.ts";

export const FOLLOW_UP_OWNER_SEND_HINT_EN =
  "Edit the draft, then Email or WhatsApp opens your own app with it filled in. Copy works for anything else. Atlas never emails, texts, or calls. When it is out the door, tap “I sent this”.";
export const FOLLOW_UP_OWNER_SEND_HINT_ES =
  "Edita el borrador; Correo o WhatsApp abre tu propia app con el texto listo. Copiar sirve para lo demás. Atlas nunca envía correos, mensajes ni llamadas. Cuando lo mandes, toca “Ya lo envié”.";

/** Days after the owner sends before the queue asks them to check back in. */
export const FOLLOW_UP_CHECK_IN_DAYS = 3;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function canShowFollowUpDraftControls(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization) return false;
  return !isSisOrganization(organization);
}

export function followUpDraftHasVisibleSampleLabel(
  ...values: Array<string | null | undefined>
) {
  return values.some((value) => isSampleLabeledSeedText(value) || /\bDEMO\b/.test(String(value ?? "")));
}

/** The exact text the owner will send: greeting plus the draft. Shared by Email, Text, and Copy. */
export function followUpDraftText(input: { contactName?: string | null; body: string }) {
  const greeting = input.contactName?.trim() ? `Hi ${input.contactName.trim()},\n\n` : "";
  return `${greeting}${String(input.body ?? "").trim()}`.slice(0, 1800);
}

export function followUpDraftMailto(input: {
  email?: string | null;
  prospectName: string;
  contactName?: string | null;
  body: string;
}) {
  const email = String(input.email ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return null;

  const subject = `Follow-up: ${input.prospectName}`.slice(0, 140);
  const body = followUpDraftText(input);
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Opens WhatsApp on this device with the draft filled in. Atlas does not send it.
 */
export function followUpDraftWhatsApp(input: { phone?: string | null; body: string }) {
  const body = String(input.body ?? "").trim().slice(0, 600);
  return prospectWhatsAppHref(input.phone, body);
}

export function followUpDraftSms(input: { phone?: string | null; body: string }) {
  return followUpDraftWhatsApp(input);
}

/**
 * What the queue holds after the owner taps "I sent this": a sendable check-in
 * draft due a few days out, so the follow-up loop keeps going.
 */
export function followUpSentCheckIn(input: {
  contactName?: string | null;
  spanish: boolean;
  sentAt?: Date;
}) {
  const sentAt = input.sentAt ?? new Date();
  // The owner's calendar, not the server's: 8pm Friday in Texas is still Friday.
  const sentLabel = deskWeekday(sentAt, input.spanish);
  const nextAction = input.spanish
    ? `Solo doy seguimiento a mi mensaje del ${sentLabel}. ¿Tienes un momento esta semana para una llamada rápida?`
    : `Just following up on my message from ${sentLabel}. Do you have a minute this week for a quick call?`;
  return { nextAction, nextActionDue: deskDateInDays(FOLLOW_UP_CHECK_IN_DAYS, { from: sentAt }) };
}

export function isOwnerGatedFollowUpMailto(href: string | null | undefined) {
  const value = String(href ?? "").trim();
  return value.startsWith("mailto:") && !/resend|sendgrid|postmark|smtp/i.test(value);
}
