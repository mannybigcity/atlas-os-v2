/**
 * Night engine against public.atlas_sales_prospects (founder sales CRM).
 * Writes drafts + brief. Emails owner. Never sends outreach.
 * Schedule: 04:00 UTC = 11:00 PM CDT / 10:00 PM CST.
 */

const CLOSED = new Set(["won", "lost", "disqualified", "duplicate"]);

function supabaseHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase engine credentials missing");
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
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  const raw = await res.text();
  return raw ? JSON.parse(raw) : null;
}

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

const STATUS_WEIGHT = {
  new: 20,
  researching: 18,
  review_ready: 22,
  approved_for_outreach: 28,
  contacted: 36,
  replied: 42,
  qualified: 48,
  proposal_sent: 55,
};

function scoreRows(rows, suppressedIds) {
  const out = [];
  for (const row of rows || []) {
    if (CLOSED.has(row.status)) continue;
    if (suppressedIds.has(row.id)) continue;
    const reasons = [];
    let score = STATUS_WEIGHT[row.status] ?? 12;
    const silent = daysSince(row.last_contacted_at);
    if (silent === null) {
      score += 25;
      reasons.push("No last contact");
    } else if (silent >= 14) {
      score += 30;
      reasons.push(`Silent ${silent} days`);
    } else if (silent >= 7) {
      score += 20;
      reasons.push(`Silent ${silent} days`);
    }
    if (!row.next_action) {
      score += 20;
      reasons.push("Missing next action");
    } else if (row.next_action_at && daysSince(row.next_action_at) > 0) {
      score += 15;
      reasons.push("Next action overdue");
    }
    if (!row.approved_channels || row.approved_channels.length === 0) {
      score += 8;
      reasons.push("No approved channel");
    }
    if (typeof row.fit_score === "number" && row.fit_score >= 70) {
      score += 10;
      reasons.push(`Fit ${row.fit_score}`);
    }
    if (reasons.length === 0) continue;
    out.push({
      ...row,
      score,
      reasons,
      suggestedKind: !row.next_action ? "next_action" : "follow_up",
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 7);
}

async function loadSuppressions() {
  try {
    const rows = await rest(
      "atlas_contact_suppressions?lifted_at=is.null&select=prospect_id&prospect_id=not.is.null",
    );
    return new Set((rows || []).map((r) => r.prospect_id).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function emailBrief({ subject, html, text, day }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_NOTIFICATION_FROM;
  const to =
    process.env.ATLAS_NOTIFICATION_EMAIL ||
    process.env.ATLAS_NOTIFICATION_EMAILS?.split(",")[0]?.trim() ||
    process.env.ATLAS_SUPER_ADMIN_EMAILS?.split(",")[0]?.trim();
  if (!apiKey || !from || !to) {
    console.log("Engine brief email skipped: Resend not configured");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `afe-engine-brief-${day}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend engine brief failed (${res.status})`);
  return true;
}

const handler = async () => {
  const day = new Date().toISOString().slice(0, 10);
  let runId = null;
  try {
    const started = await rest("engine_runs", {
      method: "POST",
      body: JSON.stringify({ source: "atlas_sales", status: "running" }),
    });
    runId = started?.[0]?.id;

    const prospects = await rest(
      "atlas_sales_prospects?select=id,business_name,status,next_action,next_action_at,last_contacted_at,fit_score,approved_channels,contact_name,contact_email&order=updated_at.desc&limit=200",
    );
    const suppressed = await loadSuppressions();
    const scored = scoreRows(prospects, suppressed);

    const drafts = scored.map((item) => {
      const channel = (item.approved_channels && item.approved_channels[0]) || "email";
      const who = item.contact_name || item.business_name;
      return {
        engine_run_id: runId,
        prospect_id: item.id,
        kind: item.suggestedKind === "next_action" ? "next_action" : "follow_up",
        title: `${item.suggestedKind === "next_action" ? "Set next action" : "Follow up"}: ${item.business_name}`,
        body: [
          "ATLAS DRAFT. Do not send until approved.",
          "",
          `Business: ${item.business_name}`,
          `Contact: ${who}${item.contact_email ? ` <${item.contact_email}>` : ""}`,
          `Status: ${item.status}`,
          `Why: ${item.reasons.join("; ")}`,
          "",
          "Suggested message:",
          `Hi ${who.split(" ")[0] || "there"},`,
          "",
          "Checking in from Atlas for Entrepreneurs. If the timing still works, I can make the next step simple. If not, reply hold and I will close the loop.",
          "",
          "— Manny",
        ].join("\n"),
        channel: channel === "phone" ? "phone" : channel,
        status: "needs_approval",
        reason: item.reasons.join("; "),
      };
    });

    if (drafts.length) {
      await rest("engine_drafts", { method: "POST", body: JSON.stringify(drafts) });
    }

    const lines = scored
      .map((s, i) => `${i + 1}. ${s.business_name} (${s.status}, ${s.score}) — ${s.reasons.join("; ")}`)
      .join("\n");
    const subject = `AFE morning brief — ${day}`;
    const body_md = [
      "# While you slept",
      "",
      `Atlas sales pipeline · ${day}`,
      "",
      `Prospects scanned: ${prospects?.length || 0}`,
      `Stale / ready: ${scored.length}`,
      `Drafts queued: ${drafts.length}`,
      "Nothing was sent.",
      "",
      "## Queue",
      lines || "Pipeline quiet. Add three researched prospects today.",
      "",
      "Approve, edit, or kill in Lion's Den. Then you send.",
    ].join("\n");

    const html = `<pre style="font-family:Georgia,serif;white-space:pre-wrap;line-height:1.5;color:#081f49">${body_md
      .replaceAll("&", "&")
      .replaceAll("<", "<")
      .replaceAll(">", ">")}</pre>`;

    const brief = await rest("morning_briefs", {
      method: "POST",
      body: JSON.stringify({
        engine_run_id: runId,
        brief_date: day,
        subject,
        body_md,
        body_html: html,
      }),
    });

    const emailed = await emailBrief({ subject, html, text: body_md, day });
    if (emailed && brief?.[0]?.id) {
      await rest(`morning_briefs?id=eq.${brief[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ emailed_at: new Date().toISOString() }),
      });
    }

    if (runId) {
      await rest(`engine_runs?id=eq.${runId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "succeeded",
          finished_at: new Date().toISOString(),
          stale_count: scored.length,
          draft_count: drafts.length,
          notes: `prospects_seen=${prospects?.length || 0}`,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        source: "atlas_sales",
        scanned: prospects?.length || 0,
        stale: scored.length,
        drafts: drafts.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("overnight-engine failed", error);
    if (runId) {
      try {
        await rest(`engine_runs?id=eq.${runId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "failed",
            finished_at: new Date().toISOString(),
            error: String(error).slice(0, 500),
          }),
        });
      } catch {
        // ignore
      }
    }
    return new Response(String(error), { status: 500 });
  }
};

export default handler;
export const config = { schedule: "0 4 * * *" };
