/**
 * Amanda's daily send run. Reads only sequences the owner approved
 * (status approved/sending) whose next step is due, sends that one step
 * through Resend, records it, and schedules the next. Never creates a
 * sequence, never edits the approved text, never touches consumers.
 * Schedule: 15:00 UTC = 10:00 AM CDT, business hours for B2B mail.
 */

export const STEP_DELAY_DAYS = [0, 3, 7];
export const SENDABLE_STAGES = new Set([
  "researching",
  "qualified",
  "needs_client_input",
  "ready_for_follow_up",
  "follow_up_queued",
  "contacted",
]);
const PRE_CONTACT_STAGES = new Set(["researching", "qualified", "needs_client_input", "ready_for_follow_up", "follow_up_queued"]);
const MAX_PER_RUN = 50;

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

export function replyAddress(token, domain) {
  const host = String(domain ?? "").trim().toLowerCase().replace(/^@/, "");
  const clean = String(token ?? "").replace(/[^a-z0-9]/gi, "");
  if (!host || !clean) return null;
  return `amanda+${clean}@${host}`;
}

/** "Atlas <noreply@x.com>" -> "Amanda for Cypress Plumbing <noreply@x.com>" */
export function amandaFrom(configuredFrom, businessName) {
  const raw = String(configuredFrom ?? "").trim().replace(/^["']|["']$/g, "");
  const match = /<([^>]+)>/.exec(raw);
  const address = (match ? match[1] : raw).trim();
  if (!address || !address.includes("@")) return null;
  const label = businessName ? `Amanda for ${businessName}` : "Amanda";
  return `${label.replaceAll('"', "")} <${address}>`;
}

export function nextSendAt(approvedAt, nextStep) {
  const base = Date.parse(approvedAt) || Date.now();
  const delay = STEP_DELAY_DAYS[nextStep] ?? STEP_DELAY_DAYS[STEP_DELAY_DAYS.length - 1];
  return new Date(base + delay * 86_400_000).toISOString();
}

function textToHtml(text) {
  const escaped = String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#081f49;white-space:pre-wrap">${escaped}</div>`;
}

async function pauseSequence(sequence, reason) {
  await rest(`organization_outreach_sequences?id=eq.${sequence.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paused", stopped_reason: reason, next_send_at: null, updated_at: new Date().toISOString() }),
  });
}

async function sendStep({ sequence, step, organization, opportunity }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = amandaFrom(process.env.ATLAS_NOTIFICATION_FROM, organization?.name);
  if (!apiKey || !from) return { skipped: "resend_not_configured" };

  const inbound = replyAddress(sequence.reply_token, process.env.AMANDA_REPLY_DOMAIN);
  const replyTo = inbound || sequence.owner_email || undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `amanda-${sequence.id}-${step.step}`,
    },
    body: JSON.stringify({
      from,
      to: [sequence.to_email],
      subject: step.subject,
      text: step.body,
      html: textToHtml(step.body),
      ...(replyTo ? { reply_to: replyTo } : {}),
      headers: { "List-Unsubscribe": `<mailto:${replyTo || sequence.to_email}?subject=STOP>` },
      tags: [
        { name: "amanda_sequence", value: sequence.id },
        { name: "amanda_step", value: String(step.step) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return { failed: res.status, detail };
  }
  const payload = await res.json().catch(() => ({}));
  return { sent: true, resendId: payload?.id ?? null, from, replyTo: replyTo ?? null, opportunityName: opportunity?.name };
}

export async function runAmandaSendPass(now = new Date()) {
  const iso = now.toISOString();
  const due =
    (await rest(
      `organization_outreach_sequences?status=in.(approved,sending)&next_send_at=lte.${encodeURIComponent(iso)}&select=*&order=next_send_at.asc&limit=${MAX_PER_RUN}`,
    )) || [];
  if (!due.length) return { due: 0, sent: 0, paused: 0, done: 0, skipped: 0 };

  const opportunityIds = [...new Set(due.map((row) => row.opportunity_id))];
  const organizationIds = [...new Set(due.map((row) => row.organization_id))];
  const opportunities =
    (await rest(`organization_opportunities?id=in.(${opportunityIds.join(",")})&select=id,name,stage,contact_name`)) || [];
  const organizations = (await rest(`organizations?id=in.(${organizationIds.join(",")})&select=id,name`)) || [];
  const oppById = new Map(opportunities.map((row) => [row.id, row]));
  const orgById = new Map(organizations.map((row) => [row.id, row]));

  const summary = { due: due.length, sent: 0, paused: 0, done: 0, skipped: 0 };

  for (const sequence of due) {
    const opportunity = oppById.get(sequence.opportunity_id);
    if (!opportunity || !SENDABLE_STAGES.has(opportunity.stage)) {
      await pauseSequence(sequence, "stage");
      summary.paused += 1;
      continue;
    }
    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    const step = steps[sequence.current_step];
    if (!step) {
      await rest(`organization_outreach_sequences?id=eq.${sequence.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done", next_send_at: null, updated_at: iso }),
      });
      summary.done += 1;
      continue;
    }

    const result = await sendStep({ sequence, step, organization: orgById.get(sequence.organization_id), opportunity });
    if (result.skipped) {
      summary.skipped += 1;
      continue;
    }
    if (result.failed) {
      if (result.failed >= 400 && result.failed < 500) {
        await pauseSequence(sequence, "bounced");
        summary.paused += 1;
      }
      console.error("Amanda send failed", sequence.id, result.failed, result.detail);
      continue;
    }

    await rest("organization_outreach_messages", {
      method: "POST",
      body: JSON.stringify({
        sequence_id: sequence.id,
        organization_id: sequence.organization_id,
        opportunity_id: sequence.opportunity_id,
        step: step.step,
        direction: "outbound",
        to_email: sequence.to_email,
        from_email: result.from,
        subject: step.subject,
        body: step.body,
        resend_id: result.resendId,
        sent_at: iso,
      }),
    });

    const nextStep = sequence.current_step + 1;
    const finished = nextStep >= steps.length;
    await rest(`organization_outreach_sequences?id=eq.${sequence.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        current_step: nextStep,
        status: finished ? "done" : "sending",
        next_send_at: finished ? null : nextSendAt(sequence.approved_at, nextStep),
        updated_at: iso,
      }),
    });

    if (PRE_CONTACT_STAGES.has(opportunity.stage)) {
      await rest(`organization_opportunities?id=eq.${opportunity.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: "contacted" }),
      });
    }
    await rest("organization_opportunity_events", {
      method: "POST",
      body: JSON.stringify({
        opportunity_id: sequence.opportunity_id,
        organization_id: sequence.organization_id,
        event_type: step.step === 0 ? "contacted" : "note_added",
        actor_role: "atlas",
        summary: `Amanda sent email ${step.step + 1} of ${steps.length} to ${sequence.to_email} (approved by the owner). Replies go to ${result.replyTo || "the owner"}.`,
        body: step.body,
      }),
    });

    summary.sent += 1;
    if (finished) summary.done += 1;
  }
  return summary;
}

const handler = async () => {
  try {
    const summary = await runAmandaSendPass();
    console.log("amanda-outreach", JSON.stringify(summary));
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("amanda-outreach failed", error);
    return new Response(String(error), { status: 500 });
  }
};

export default handler;
export const config = { schedule: "0 15 * * *" };
