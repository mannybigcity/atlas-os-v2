// Device-native contact links. These open the owner's own phone, SMS, or mail
// app. Atlas never places the call or sends the message itself.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhoneForHref(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  const kept = raw.replace(/[^\d+]/g, "");
  const digits = kept.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // Assume US when the owner typed a bare 10-digit number.
  if (!kept.startsWith("+") && digits.length === 10) return `+1${digits}`;
  if (!kept.startsWith("+") && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return kept.startsWith("+") ? `+${digits}` : digits;
}

export function telHref(phone: string | null | undefined) {
  const normalized = normalizePhoneForHref(phone);
  return normalized ? `tel:${normalized}` : null;
}

export function smsHref(phone: string | null | undefined, body?: string | null) {
  const normalized = normalizePhoneForHref(phone);
  if (!normalized) return null;
  const text = String(body ?? "").trim();
  return text ? `sms:${normalized}?&body=${encodeURIComponent(text.slice(0, 500))}` : `sms:${normalized}`;
}

export function mailtoHref(
  email: string | null | undefined,
  options?: { subject?: string | null; body?: string | null },
) {
  const value = String(email ?? "").trim();
  if (!EMAIL_PATTERN.test(value)) return null;
  const params = new URLSearchParams();
  const subject = String(options?.subject ?? "").trim();
  const body = String(options?.body ?? "").trim();
  if (subject) params.set("subject", subject.slice(0, 140));
  if (body) params.set("body", body.slice(0, 1800));
  const query = params.toString().replaceAll("+", "%20");
  return query ? `mailto:${value}?${query}` : `mailto:${value}`;
}

export type ContactLinks = {
  phone: string | null;
  email: string | null;
  tel: string | null;
  sms: string | null;
  mailto: string | null;
};

export function contactLinks(input: {
  phone?: string | null;
  email?: string | null;
  smsBody?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
}): ContactLinks {
  const phone = String(input.phone ?? "").trim() || null;
  const email = String(input.email ?? "").trim().toLowerCase() || null;
  return {
    phone,
    email,
    tel: telHref(phone),
    sms: smsHref(phone, input.smsBody),
    mailto: mailtoHref(email, { subject: input.emailSubject, body: input.emailBody }),
  };
}
