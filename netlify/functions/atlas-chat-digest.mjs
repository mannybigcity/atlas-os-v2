const DAY_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shorten(value, max = 300) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

async function getChatTurns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase digest credentials are not configured");
  }

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const query = new URLSearchParams({
    select: "session_id,prompt,status,model,input_tokens,output_tokens,estimated_cost_microusd,created_at",
    created_at: `gte.${since}`,
    order: "created_at.desc",
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/atlas_public_chat_turns?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase chat digest query failed (${response.status})`);
  }

  return response.json();
}

async function sendDigest(turns) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ATLAS_NOTIFICATION_FROM;
  const to = process.env.ATLAS_NOTIFICATION_EMAIL
    || process.env.ATLAS_SUPER_ADMIN_EMAILS?.split(",")[0]?.trim();

  if (!apiKey || !from || !to) {
    throw new Error("Resend digest credentials are not configured");
  }

  const sessions = new Set(turns.map((turn) => turn.session_id)).size;
  const succeeded = turns.filter((turn) => turn.status === "succeeded").length;
  const failed = turns.filter((turn) => turn.status !== "succeeded").length;
  const inputTokens = turns.reduce((sum, turn) => sum + Number(turn.input_tokens || 0), 0);
  const outputTokens = turns.reduce((sum, turn) => sum + Number(turn.output_tokens || 0), 0);
  const cost = turns.reduce((sum, turn) => sum + Number(turn.estimated_cost_microusd || 0), 0) / 1_000_000;
  const rows = turns.slice(0, 25).map((turn) => `
    <tr>
      <td style="padding:10px;border-top:1px solid #d9e1ec;vertical-align:top">${escapeHtml(new Date(turn.created_at).toLocaleString("en-US", { timeZone: "America/Chicago" }))}</td>
      <td style="padding:10px;border-top:1px solid #d9e1ec;vertical-align:top">${escapeHtml(shorten(turn.prompt))}</td>
      <td style="padding:10px;border-top:1px solid #d9e1ec;vertical-align:top">${escapeHtml(turn.status)}</td>
    </tr>
  `).join("");
  const day = new Date().toISOString().slice(0, 10);
  const subject = `Atlas chat activity: ${turns.length} questions from ${sessions} visitors`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#081f49;max-width:760px;margin:auto">
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a57600">Daily Atlas activity</p>
      <h1 style="font-size:28px;margin:0 0 18px">What prospects asked in the last 24 hours</h1>
      <p><strong>${sessions}</strong> browser sessions | <strong>${turns.length}</strong> questions | <strong>${succeeded}</strong> replies | <strong>${failed}</strong> blocked/failed</p>
      <p style="color:#607085">${inputTokens + outputTokens} recorded tokens | estimated API cost $${cost.toFixed(4)}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px">
        <thead><tr><th style="padding:10px;text-align:left">Time (Central)</th><th style="padding:10px;text-align:left">Question</th><th style="padding:10px;text-align:left">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${turns.length > 25 ? `<p style="color:#607085">Showing the newest 25 of ${turns.length} questions.</p>` : ""}
    </div>
  `;
  const text = [
    subject,
    `${succeeded} replies; ${failed} blocked or failed.`,
    `${inputTokens + outputTokens} recorded tokens; estimated API cost $${cost.toFixed(4)}.`,
    "",
    ...turns.slice(0, 25).map((turn) => `- ${new Date(turn.created_at).toISOString()}: ${shorten(turn.prompt)} [${turn.status}]`),
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `atlas-chat-digest-${day}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!response.ok) {
    throw new Error(`Resend chat digest failed (${response.status})`);
  }
}

const handler = async () => {
  try {
    const turns = await getChatTurns();

    if (turns.length === 0) {
      console.log("Atlas chat digest skipped: no chat activity in the last 24 hours");
      return new Response(null, { status: 204 });
    }

    await sendDigest(turns);
    console.log(`Atlas chat digest sent for ${turns.length} chat turns`);
    return new Response("Atlas chat digest sent", { status: 200 });
  } catch (error) {
    console.error("Atlas chat digest failed", error);
    return new Response("Atlas chat digest failed", { status: 500 });
  }
};

export default handler;

// 8:00 AM Central Standard Time / 9:00 AM Central Daylight Time.
export const config = { schedule: "0 14 * * *" };
