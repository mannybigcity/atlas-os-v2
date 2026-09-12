/**
 * Owner-only text alerts. Pure: no I/O.
 *
 * Atlas texts the business owner, never the prospect. The only trigger today
 * is a new inbound lead on their /go page, where minutes matter.
 */

export const OWNER_SMS_MAX_LENGTH = 320;

export type TwilioEnv = Record<string, string | undefined>;

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  sender: { messagingServiceSid: string } | { from: string };
};

/** Reads Twilio settings from env. Null when anything required is missing, so callers skip cleanly. */
export function readTwilioConfig(env: TwilioEnv): TwilioConfig | null {
  const accountSid = String(env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = String(env.TWILIO_AUTH_TOKEN ?? "").trim();
  const messagingServiceSid = String(env.TWILIO_MESSAGING_SERVICE_SID ?? "").trim();
  const from = normalizeUsPhone(env.TWILIO_FROM_NUMBER);
  if (!/^AC[0-9a-f]{32}$/i.test(accountSid) || !authToken) return null;
  if (messagingServiceSid) return { accountSid, authToken, sender: { messagingServiceSid } };
  if (from) return { accountSid, authToken, sender: { from } };
  return null;
}

/** Which env vars are still missing, in plain words for the founder. */
export function missingTwilioEnv(env: TwilioEnv) {
  const missing: string[] = [];
  if (!String(env.TWILIO_ACCOUNT_SID ?? "").trim()) missing.push("TWILIO_ACCOUNT_SID");
  if (!String(env.TWILIO_AUTH_TOKEN ?? "").trim()) missing.push("TWILIO_AUTH_TOKEN");
  if (!String(env.TWILIO_MESSAGING_SERVICE_SID ?? "").trim() && !normalizeUsPhone(env.TWILIO_FROM_NUMBER)) {
    missing.push("TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER");
  }
  return missing;
}

/** US/Canada numbers to E.164 (+1XXXXXXXXXX). Anything else returns null; we do not text abroad. */
export function normalizeUsPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0" && digits[0] !== "1") return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1") && digits[1] !== "0" && digits[1] !== "1") return `+${digits}`;
  return null;
}

export type InboundLeadSmsInput = {
  businessName: string;
  leadName: string;
  leadPhone?: string | null;
  problem?: string | null;
  prospectUrl: string;
};

/** The text the owner gets when a lead lands. Short enough for two segments; the link opens the prospect. */
export function inboundLeadOwnerSms(input: InboundLeadSmsInput) {
  const name = input.leadName.trim() || "Someone";
  const phone = String(input.leadPhone ?? "").trim();
  const problem = String(input.problem ?? "").replace(/\s+/g, " ").trim();
  const lines = [
    `Atlas · New lead for ${input.businessName.trim()}: ${name}${phone ? ` (${phone})` : ""}.`,
    problem ? `"${problem.slice(0, 120)}${problem.length > 120 ? "…" : ""}"` : "",
    `Call them back, then log it: ${input.prospectUrl}`,
  ].filter(Boolean);
  return lines.join("\n").slice(0, OWNER_SMS_MAX_LENGTH);
}
