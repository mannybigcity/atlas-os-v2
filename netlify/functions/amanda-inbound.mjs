/**
 * Resend webhook for Amanda. Two events matter:
 *   email.received  — a referral partner replied to amanda+{token}@{AMANDA_REPLY_DOMAIN}.
 *                     Pause the sequence, move the prospect to Responded, tell the owner.
 *   email.bounced   — one of Amanda's emails bounced. Pause the sequence.
 * Endpoint: POST /.netlify/functions/amanda-inbound  (set this URL in Resend > Webhooks)
 * Requires RESEND_WEBHOOK_SECRET; unsigned requests are rejected.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const CLOSED_STAGES = new Set(["won", "lost", "archived"]);

function supabaseHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials missing");
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
}

async function rest(path, init = {}) {
  const { url, headers } = supabaseHeaders();
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  const raw = await res.text();
  return raw ? JSON.parse(raw) : null;
}

/** Svix-style signature Resend puts on every webhook. */
export function verifyResendSignature({ secret, payload, id, timestamp, signature, now = Date.now() }) {
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();
  return String(signature)
    .split(/\s+/)
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((candidate) => {
      const given = Buffer.from(candidate, "base64");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

export function parseReplyToken(addresses) {
  for (const address of addresses || []) {
    const match = /amanda\+([a-z0-9]{8,64})@/i.exec(String(address ?? ""));
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/** Mirrors isAmandaStopRequest in src/lib/lions-den/amanda-outreach.ts. */
export function isStopRequest(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(">"));
  const first = lines[0] ?? "";
  if (/^\W*(stop|alto|unsubscribe)\W*$/i.test(first)) return true;
  const head = lines.slice(0, 3).join(" ").toLowerCase();
  if (head.length > 240) return false;
  return /\b(unsubscribe|remove me|take me off|opt out|not interested|no thanks|no gracias|no me interesa)\b/.test(head);
}

export function replyExcerpt(text, html) {
  const source = String(text ?? "").trim() || String(html ?? "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  return source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, 2000);
}

async function fetchReceivedEmail(emailId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function emailOwner({ to, subject, text, prospectUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_NOTIFICATION_FROM;
  if (!apiKey || !from || !to) return false;
  const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#081f49;white-space:pre-wrap">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}\n\n<a href="${prospectUrl}">Open in your desk</a></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: `${text}\n\nOpen in your desk: ${prospectUrl}`, html }),
  });
  return res.ok;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://atlasforentrepreneurs.com").replace(/\/$/, "");
}

export async function handleReceived(data) {
  const token = parseReplyToken([...(data.to || []), ...(data.received_for || [])]);
  if (!token) return { ignored: "no_token" };

  const [sequence] = (await rest(`organization_outreach_sequences?reply_token=eq.${token}&select=*&limit=1`)) || [];
  if (!sequence) return { ignored: "unknown_token" };

  const existing = await rest(`organization_outreach_messages?resend_id=eq.${encodeURIComponent(data.email_id)}&select=id&limit=1`);
  if (existing?.length) return { ignored: "duplicate" };

  const email = await fetchReceivedEmail(data.email_id);
  const excerpt = replyExcerpt(email?.text, email?.html) || `(reply from ${data.from}; open Resend to read it)`;
  const stop = isStopRequest(excerpt);
  const now = new Date().toISOString();

  await rest("organization_outreach_messages", {
    method: "POST",
    body: JSON.stringify({
      sequence_id: sequence.id,
      organization_id: sequence.organization_id,
      opportunity_id: sequence.opportunity_id,
      step: sequence.current_step,
      direction: "inbound",
      to_email: (data.to || [])[0] ?? null,
      from_email: data.from ?? null,
      subject: data.subject ?? email?.subject ?? null,
      body: excerpt,
      resend_id: data.email_id,
      replied_at: now,
    }),
  });

  await rest(`organization_outreach_sequences?id=eq.${sequence.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "paused",
      stopped_reason: stop ? "stop_request" : "replied",
      next_send_at: null,
      updated_at: now,
    }),
  });

  const [opportunity] =
    (await rest(`organization_opportunities?id=eq.${sequence.opportunity_id}&select=id,name,stage,contact_name`)) || [];
  const who = opportunity?.contact_name || opportunity?.name || data.from;
  const today = now.slice(0, 10);

  if (opportunity && !CLOSED_STAGES.has(opportunity.stage)) {
    await rest(`organization_opportunities?id=eq.${opportunity.id}`, {
      method: "PATCH",
      body: JSON.stringify(
        stop
          ? { next_action: `They asked us to stop emailing. Do not contact ${who} again unless they reach out.`, next_action_due: today }
          : { stage: "responded", next_action: `${who} replied to Amanda. Call them back today.`, next_action_due: today },
      ),
    });
  }

  await rest("organization_opportunity_events", {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: sequence.opportunity_id,
      organization_id: sequence.organization_id,
      event_type: stop ? "note_added" : "reply_received",
      actor_role: "atlas",
      summary: stop
        ? `${who} asked us to stop. Amanda stopped the sequence for good.`
        : `${who} replied to Amanda's email ${Math.max(sequence.current_step, 1)}. Amanda stopped; the owner takes it from here.`,
      body: excerpt,
    }),
  });

  const prospectUrl = `${siteUrl()}/client/prospects/${sequence.opportunity_id}`;
  const emailed = await emailOwner({
    to: sequence.owner_email,
    subject: stop ? `${who} asked us to stop` : `${who} replied — call them today`,
    text: stop
      ? `${who} replied STOP to Amanda. The sequence is closed and Atlas will not email them again.\n\nTheir reply:\n${excerpt}`
      : `${who} replied to Amanda. Amanda stopped writing; this one is yours.\n\nFrom: ${data.from}\n\nTheir reply:\n${excerpt}\n\nCall or email them back today.`,
    prospectUrl,
  });

  return { handled: stop ? "stop" : "reply", sequenceId: sequence.id, emailedOwner: emailed };
}

export async function handleBounced(data) {
  const emailId = data?.email_id;
  if (!emailId) return { ignored: "no_email_id" };
  const [message] =
    (await rest(`organization_outreach_messages?resend_id=eq.${encodeURIComponent(emailId)}&direction=eq.outbound&select=id,sequence_id,organization_id,opportunity_id,to_email&limit=1`)) || [];
  if (!message) return { ignored: "unknown_message" };
  const now = new Date().toISOString();
  await rest(`organization_outreach_sequences?id=eq.${message.sequence_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paused", stopped_reason: "bounced", next_send_at: null, updated_at: now }),
  });
  await rest("organization_opportunity_events", {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: message.opportunity_id,
      organization_id: message.organization_id,
      event_type: "note_added",
      actor_role: "atlas",
      summary: `Amanda's email to ${message.to_email} bounced. Sequence paused. Check the address or call instead.`,
    }),
  });
  return { handled: "bounce", sequenceId: message.sequence_id };
}

const handler = async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("RESEND_WEBHOOK_SECRET not configured", { status: 503 });

  const payload = await request.text();
  const ok = verifyResendSignature({
    secret,
    payload,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  });
  if (!ok) return new Response("Invalid signature", { status: 401 });

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    let result = { ignored: event?.type ?? "unknown" };
    if (event?.type === "email.received") result = await handleReceived(event.data || {});
    else if (event?.type === "email.bounced") result = await handleBounced(event.data || {});
    console.log("amanda-inbound", JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("amanda-inbound failed", error);
    return new Response(String(error), { status: 500 });
  }
};

export default handler;
