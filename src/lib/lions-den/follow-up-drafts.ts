import { isSisOrganization } from "../client-portal/identity.ts";
import { isSampleLabeledSeedText } from "./live-desk.ts";

export const FOLLOW_UP_OWNER_SEND_HINT_EN =
  "Edit the draft, then Send opens your email. Atlas never emails, texts, or calls.";
export const FOLLOW_UP_OWNER_SEND_HINT_ES =
  "Edita el borrador y Send abre tu correo. Atlas nunca envía correos, mensajes ni llamadas.";

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

export function followUpDraftMailto(input: {
  email?: string | null;
  prospectName: string;
  contactName?: string | null;
  body: string;
}) {
  const email = String(input.email ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return null;

  const subject = `Follow-up: ${input.prospectName}`.slice(0, 140);
  const greeting = input.contactName?.trim() ? `Hi ${input.contactName.trim()},\n\n` : "";
  const body = `${greeting}${String(input.body ?? "").trim()}`.slice(0, 1800);
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isOwnerGatedFollowUpMailto(href: string | null | undefined) {
  const value = String(href ?? "").trim();
  return value.startsWith("mailto:") && !/resend|sendgrid|postmark|smtp/i.test(value);
}
