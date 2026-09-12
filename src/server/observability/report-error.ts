import "server-only";

import { sendLeadEmail } from "@/server/leads/email";

/**
 * When something breaks for an owner, the founder hears about it. Logs always;
 * emails FOUNDER_MAILBOX_EMAIL when RESEND_API_KEY is set. One email per
 * distinct error per hour (Resend idempotency key), so a bad deploy is one
 * message, not a storm.
 */
const recentlyReported = new Map<string, number>();
const QUIET_MS = 60 * 60 * 1000;

export function errorSignature(where: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown");
  const stackTop = error instanceof Error ? (error.stack ?? "").split("\n")[1]?.trim() ?? "" : "";
  return `${where}|${message.slice(0, 160)}|${stackTop.slice(0, 120)}`.replace(/\s+/g, " ");
}

function hourBucket(now: Date) {
  return now.toISOString().slice(0, 13);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function reportDeskError(
  where: string,
  error: unknown,
  extra: Record<string, unknown> = {},
  now: Date = new Date(),
) {
  console.error(`[atlas] ${where}`, error, extra);
  const founder = process.env.FOUNDER_MAILBOX_EMAIL?.trim();
  if (!founder || !process.env.RESEND_API_KEY?.trim()) return { sent: false as const, reason: "no_mailbox" as const };

  const signature = errorSignature(where, error);
  const last = recentlyReported.get(signature);
  if (last && now.getTime() - last < QUIET_MS) return { sent: false as const, reason: "quiet" as const };
  recentlyReported.set(signature, now.getTime());
  if (recentlyReported.size > 500) recentlyReported.clear();

  const message = error instanceof Error ? error.message : String(error ?? "unknown");
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const details = Object.entries(extra)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
  const text = [`Where: ${where}`, `When: ${now.toISOString()}`, `Error: ${message}`, details, "", stack].filter(Boolean).join("\n");
  try {
    const result = await sendLeadEmail({
      to: [founder],
      subject: `Atlas error · ${where} · ${message.slice(0, 80)}`,
      text,
      html: `<pre style="font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      idempotencyKey: `atlas-error:${hourBucket(now)}:${signature}`.slice(0, 256),
    });
    return result.sent ? { sent: true as const } : { sent: false as const, reason: "send_failed" as const };
  } catch (sendError) {
    console.error("[atlas] error report email failed", sendError);
    return { sent: false as const, reason: "send_failed" as const };
  }
}
