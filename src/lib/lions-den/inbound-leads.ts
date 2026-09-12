/**
 * Inbound leads: a customer of the client's business (a homeowner with a leak,
 * a manager with a pest problem) asking for help through the client's public
 * lead page. These are the hottest records in the desk. Atlas never sends
 * marketing to them; the one email that goes out is a reply to their request.
 */

export const INBOUND_LEAD_SOURCE_LABEL = "Inbound · lead page";
export const INBOUND_NEXT_ACTION_EN = "They asked for help. Call them now, before they call the next company.";
export const INBOUND_NEXT_ACTION_ES = "Pidieron ayuda. Llámalos ahora, antes de que llamen a la siguiente empresa.";

export type InboundLeadValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  problem: string;
};

export type InboundLeadErrors = Partial<Record<keyof InboundLeadValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function leadPagePath(slug: string) {
  return `/go/${encodeURIComponent(slug)}`;
}

export function leadPageUrl(siteUrl: string, slug: string) {
  return `${siteUrl.replace(/\/$/, "")}${leadPagePath(slug)}`;
}

export function readInboundLeadValues(formData: FormData): InboundLeadValues {
  const read = (key: string, max: number) => String(formData.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return {
    name: read("name", 180),
    phone: read("phone", 80),
    email: read("email", 320).toLowerCase(),
    address: read("address", 500),
    problem: String(formData.get("problem") ?? "").trim().slice(0, 2000),
  };
}

/** Mirrors the opportunity table constraints so a bad form never becomes a 500. */
export function validateInboundLead(values: InboundLeadValues, spanish: boolean): InboundLeadErrors {
  const errors: InboundLeadErrors = {};
  if (values.name.length < 2) {
    errors.name = spanish ? "Escribe tu nombre." : "Enter your name.";
  }
  if (values.phone.replace(/\D/g, "").length < 7 || values.phone.length > 80) {
    errors.phone = spanish ? "Escribe un teléfono completo para que te llamen." : "Enter a full phone number so they can call you back.";
  }
  if (values.email && !EMAIL_PATTERN.test(values.email)) {
    errors.email = spanish ? "Ese correo no se ve completo." : "That email does not look complete.";
  }
  if (values.problem.length < 10) {
    errors.problem = spanish ? "Cuéntanos un poco más de lo que necesitas (10 letras mínimo)." : "Tell them a little more about what you need (10 characters minimum).";
  }
  return errors;
}

/** The row HUNTER would have written if it could find homeowners. Stage "responded" because they reached out first. */
export function inboundLeadOpportunityRow(input: {
  organizationId: string;
  slug: string;
  values: InboundLeadValues;
  spanish: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { values } = input;
  const summaryLines = [
    `Inbound request from the lead page.`,
    `Problem: ${values.problem}`,
    values.address ? `Address: ${values.address}` : null,
  ].filter(Boolean);
  return {
    organization_id: input.organizationId,
    name: values.name,
    opportunity_type: "customer" as const,
    stage: "responded" as const,
    fit_score: 95,
    owner_role: "client" as const,
    source_label: INBOUND_LEAD_SOURCE_LABEL,
    source_url: null,
    contact_name: values.name,
    contact_email: values.email || null,
    contact_phone: values.phone,
    research_summary: summaryLines.join("\n").slice(0, 3000),
    fit_reason: "They contacted you. No research needed; the job is theirs to lose.",
    next_action: input.spanish ? INBOUND_NEXT_ACTION_ES : INBOUND_NEXT_ACTION_EN,
    next_action_due: dueDate,
    metadata: {
      inbound: true,
      inbound_at: now.toISOString(),
      lead_page: input.slug,
      address: values.address || null,
      problem: values.problem,
      no_outreach_sent: true,
    },
  };
}

export function isInboundOpportunity(item: { metadata?: Record<string, unknown> | null; sourceLabel?: string | null }) {
  return item.metadata?.inbound === true || item.sourceLabel === INBOUND_LEAD_SOURCE_LABEL;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Goes to the business owner the moment a lead lands. Short enough to read on a phone in a truck. */
export function inboundLeadOwnerEmail(input: {
  businessName: string;
  values: InboundLeadValues;
  prospectUrl: string;
}) {
  const { values } = input;
  const subject = `New lead: ${values.name} needs ${input.businessName}`;
  const text = [
    `${values.name} just asked ${input.businessName} for help.`,
    "",
    `Phone: ${values.phone}`,
    values.email ? `Email: ${values.email}` : null,
    values.address ? `Address: ${values.address}` : null,
    "",
    `What they need: ${values.problem}`,
    "",
    "Call them now. The first company to answer usually gets the job.",
    `Open in your desk: ${input.prospectUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#081f49;max-width:600px;margin:auto">
      <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a57600">New lead</p>
      <h1 style="font-size:24px;margin:0 0 14px">${escapeHtml(values.name)} needs ${escapeHtml(input.businessName)}</h1>
      <p style="font-size:20px;margin:0 0 6px"><a href="tel:${escapeHtml(values.phone.replace(/[^\d+]/g, ""))}" style="color:#1455ad">${escapeHtml(values.phone)}</a></p>
      ${values.email ? `<p style="margin:0 0 6px"><a href="mailto:${escapeHtml(values.email)}">${escapeHtml(values.email)}</a></p>` : ""}
      ${values.address ? `<p style="margin:0 0 6px">${escapeHtml(values.address)}</p>` : ""}
      <p style="margin:18px 0 6px;font-weight:bold">What they need</p>
      <p style="margin:0">${escapeHtml(values.problem)}</p>
      <p style="margin-top:22px">Call them now. The first company to answer usually gets the job.</p>
      <p><a href="${escapeHtml(input.prospectUrl)}" style="display:inline-block;background:#071b42;color:white;text-decoration:none;padding:12px 18px;border-radius:24px">Open in your desk</a></p>
    </div>
  `;
  return { subject, text, html };
}

/**
 * The reply the lead gets within a minute, signed by Amanda on behalf of the
 * business. This is a response to their request, not marketing.
 */
export function inboundLeadAutoReply(input: {
  businessName: string;
  ownerPhone?: string | null;
  values: InboundLeadValues;
  spanish: boolean;
}) {
  const first = input.values.name.split(" ")[0] || input.values.name;
  const phoneLine = input.ownerPhone
    ? input.spanish
      ? `Si es urgente, llama directo al ${input.ownerPhone}.`
      : `If it is urgent, call us directly at ${input.ownerPhone}.`
    : null;
  const subject = input.spanish
    ? `Recibimos tu mensaje — ${input.businessName}`
    : `We got your request — ${input.businessName}`;
  const lines = input.spanish
    ? [
        `Hola ${first},`,
        "",
        `Gracias por escribir a ${input.businessName}. Ya tenemos tu solicitud y alguien del equipo te llamará al ${input.values.phone} en breve.`,
        "",
        `Lo que nos contaste: "${input.values.problem}"`,
        phoneLine,
        "",
        "Amanda",
        `Atención a clientes para ${input.businessName}`,
      ]
    : [
        `Hi ${first},`,
        "",
        `Thanks for reaching out to ${input.businessName}. We have your request and someone from the team will call you at ${input.values.phone} shortly.`,
        "",
        `What you told us: "${input.values.problem}"`,
        phoneLine,
        "",
        "Amanda",
        `Customer outreach for ${input.businessName}`,
      ];
  const text = lines.filter((line) => line !== null).join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#081f49;max-width:600px;margin:auto">${text
    .split("\n")
    .map((line) => (line ? `<p style="margin:0 0 10px">${escapeHtml(line)}</p>` : '<p style="margin:0 0 10px">&nbsp;</p>'))
    .join("")}</div>`;
  return { subject, text, html };
}

export function inboundLeadStatusCopy(status: string | undefined, spanish: boolean) {
  switch (status) {
    case "sent":
      return spanish
        ? "Listo. Ya tienen tu solicitud y te llamarán pronto."
        : "Done. They have your request and will call you shortly.";
    case "invalid":
      return spanish ? "Revisa los campos marcados." : "Check the highlighted fields.";
    case "failed":
      return spanish ? "No se pudo enviar. Llama directamente." : "That did not go through. Please call directly.";
    default:
      return null;
  }
}
