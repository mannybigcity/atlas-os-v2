import "server-only";

import { normalizeUsPhone, readTwilioConfig } from "@/lib/notifications/owner-sms";

/**
 * Sends one text to a business owner through Twilio's REST API. No SDK; one
 * fetch, mirroring sendLeadEmail. Skips (and says so in the logs) when Twilio
 * is not configured or the number is not a US/Canada line. Never throws.
 */
export async function sendOwnerSms(input: { to: string | null | undefined; body: string; idempotencyKey: string }) {
  const config = readTwilioConfig(process.env);
  const to = normalizeUsPhone(input.to);
  if (!config || !to) {
    console.info("Atlas owner SMS skipped", { configured: Boolean(config), hasNumber: Boolean(to), key: input.idempotencyKey });
    return { sent: false as const, reason: !config ? ("not_configured" as const) : ("bad_number" as const) };
  }

  const params = new URLSearchParams({ To: to, Body: input.body.slice(0, 1600) });
  if ("messagingServiceSid" in config.sender) params.set("MessagingServiceSid", config.sender.messagingServiceSid);
  else params.set("From", config.sender.from);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: params.toString(),
      },
    );
    if (!response.ok) {
      console.error("Atlas owner SMS failed", { status: response.status, key: input.idempotencyKey });
      return { sent: false as const, reason: "provider_error" as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("Atlas owner SMS threw", { key: input.idempotencyKey, message: error instanceof Error ? error.message : String(error) });
    return { sent: false as const, reason: "provider_error" as const };
  }
}
