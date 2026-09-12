import "server-only";

const DEFAULT_FROM = "Atlas <noreply@atlasforentrepreneurs.com>";

/**
 * Minimal Resend sender for lead-page mail. Mirrors `sendEmail` in
 * notifications/resend.ts (same env, same idempotency header) but takes an
 * explicit recipient list, since these emails go to owners and their
 * customers rather than to the founder mailbox.
 */
export async function sendLeadEmail(input: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  idempotencyKey: string;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ATLAS_NOTIFICATION_FROM?.trim().replace(/^["']|["']$/g, "") || DEFAULT_FROM;
  const to = input.to.map((address) => address.trim().toLowerCase()).filter((address) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address));

  if (!apiKey || to.length === 0) {
    console.info("Atlas lead email skipped", { hasApiKey: Boolean(apiKey), toCount: to.length, key: input.idempotencyKey });
    return { sent: false as const };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(input.attachments?.length ? 20_000 : 8_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((file) => ({
                filename: file.filename,
                content: file.content,
                ...(file.contentType ? { content_type: file.contentType } : {}),
              })),
            }
          : {}),
      }),
    });
    if (!response.ok) {
      console.error("Atlas lead email failed", { status: response.status, key: input.idempotencyKey });
      return { sent: false as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("Atlas lead email failed", { message: error instanceof Error ? error.message : "unknown" });
    return { sent: false as const };
  }
}
