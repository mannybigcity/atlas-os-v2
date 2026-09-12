/**
 * Amanda is the owner's outreach agent. She writes a short three-email
 * sequence to a referral partner (a property manager, realtor, GC) and sends
 * it only after the owner approves. Every email carries a plain opt-out.
 * Pure functions; the scheduled sender and the desk both read from here.
 */

export const AMANDA_SEQUENCE_STATUSES = ["draft", "approved", "sending", "paused", "done"] as const;
export type AmandaSequenceStatus = (typeof AMANDA_SEQUENCE_STATUSES)[number];

/** Days after approval each step goes out: intro now, value in 3 days, last note a week in. */
export const AMANDA_STEP_DELAY_DAYS = [0, 3, 7] as const;

export const AMANDA_OPT_OUT_EN = "If this is not relevant, reply STOP and I will not write again.";
export const AMANDA_OPT_OUT_ES = "Si no es relevante, responde STOP y no volveré a escribir.";

export type AmandaBusiness = {
  businessName: string;
  /** The owner's trade in plain words: "pest control", "plumbing", "lawn care". */
  trade: string;
  city?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
};

export type AmandaProspect = {
  prospectName: string;
  contactName?: string | null;
  /** What kind of business this is, e.g. "property management company". */
  prospectType?: string | null;
};

export type AmandaStep = {
  step: number;
  delayDays: number;
  subject: string;
  body: string;
};

/** What the Follow-up desk needs to show Amanda's card for one prospect. */
export type AmandaDeskInfo = {
  toEmail: string;
  /** What Amanda would send if approved. Once a sequence exists its stored steps are shown instead. */
  proposedSteps: AmandaStep[];
  sequence: AmandaSequenceRecord | null;
};

export type AmandaSequenceRecord = {
  id: string;
  opportunityId: string;
  status: AmandaSequenceStatus;
  currentStep: number;
  nextSendAt: string | null;
  stoppedReason: string | null;
  steps: AmandaStep[];
  toEmail: string;
};

function firstName(name: string | null | undefined) {
  const clean = String(name ?? "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] ?? "";
}

function greeting(prospect: AmandaProspect, spanish: boolean) {
  const first = firstName(prospect.contactName);
  if (first) return spanish ? `Hola ${first},` : `Hi ${first},`;
  return spanish ? `Hola equipo de ${prospect.prospectName},` : `Hi ${prospect.prospectName} team,`;
}

export function amandaSignature(business: AmandaBusiness, spanish: boolean) {
  const lines = [
    "Amanda",
    spanish ? `en nombre de ${business.businessName}` : `on behalf of ${business.businessName}`,
  ];
  if (business.ownerPhone?.trim()) {
    lines.push(
      spanish
        ? `${business.ownerName?.trim() || "El dueño"} contesta al ${business.ownerPhone.trim()}`
        : `${business.ownerName?.trim() || "The owner"} answers at ${business.ownerPhone.trim()}`,
    );
  }
  return lines.join("\n");
}

function where(business: AmandaBusiness, spanish: boolean) {
  const city = business.city?.trim();
  if (!city) return "";
  return spanish ? ` en ${city}` : ` in ${city}`;
}

/**
 * Three emails, each short enough to read on a phone. The owner sees all
 * three before approving; the sender never changes the text after that.
 */
export function amandaSequenceSteps(input: {
  business: AmandaBusiness;
  prospect: AmandaProspect;
  spanish: boolean;
}): AmandaStep[] {
  const { business, prospect, spanish } = input;
  const trade = business.trade.trim() || (spanish ? "servicio" : "service");
  const owner = business.ownerName?.trim() || (spanish ? "el dueño" : "the owner");
  const type = prospect.prospectType?.trim();
  const hello = greeting(prospect, spanish);
  const sign = amandaSignature(business, spanish);
  const optOut = spanish ? AMANDA_OPT_OUT_ES : AMANDA_OPT_OUT_EN;

  const intro = spanish
    ? [
        hello,
        "",
        `Soy Amanda y manejo la comunicación de ${business.businessName}, una empresa de ${trade}${where(business, true)}.`,
        `${type ? `Negocios como ${type}` : "Negocios como el suyo"} suelen necesitar ${trade} con poco aviso y un proveedor que sí contesta el teléfono.`,
        "",
        `¿Tendría sentido tener a ${business.businessName} en su lista de proveedores? Responda a este correo y coordino una llamada de 10 minutos con ${owner}.`,
        "",
        optOut,
        "",
        sign,
      ]
    : [
        hello,
        "",
        `I'm Amanda. I handle outreach for ${business.businessName}, a ${trade} company${where(business, false)}.`,
        `${type ? `${capitalize(pluralize(type))}` : "Businesses like yours"} usually need ${trade} on short notice and a vendor who actually picks up the phone.`,
        "",
        `Would it make sense to have ${business.businessName} on your vendor list? Reply to this email and I will set up a 10-minute call with ${owner}.`,
        "",
        optOut,
        "",
        sign,
      ];

  const value = spanish
    ? [
        hello,
        "",
        `Un seguimiento breve de parte de ${business.businessName}.`,
        `Lo que más valoran los clientes de ${owner}: llega cuando dice, deja el trabajo documentado y cobra lo acordado.`,
        "",
        "Si le sirve, le envío una hoja de tarifas de una página y dos referencias. Solo responda “sí”.",
        "",
        optOut,
        "",
        sign,
      ]
    : [
        hello,
        "",
        `Quick follow-up from ${business.businessName}.`,
        `What ${owner}'s customers mention most: shows up when promised, leaves the work documented, and bills what was quoted.`,
        "",
        "If useful, I can send a one-page rate sheet and two references. Just reply “yes”.",
        "",
        optOut,
        "",
        sign,
      ];

  const last = spanish
    ? [
        hello,
        "",
        "Última nota de mi parte.",
        `Si el momento no es el indicado, responda STOP y cierro el tema. Si hay una mejor persona para hablar de proveedores de ${trade}, indíqueme quién y le escribo directamente.`,
        "",
        `Gracias por su tiempo. ${business.businessName} queda a un correo de distancia cuando lo necesite.`,
        "",
        sign,
      ]
    : [
        hello,
        "",
        "Last note from me.",
        `If the timing is wrong, reply STOP and I will close the loop. If there is a better person to talk to about ${trade} vendors, point me to them and I will write them directly.`,
        "",
        `Thanks for your time. ${business.businessName} is one email away when you need it.`,
        "",
        sign,
      ];

  const subjects = spanish
    ? [
        `${capitalize(trade)} para ${prospect.prospectName}`,
        `Re: ${capitalize(trade)} para ${prospect.prospectName}`,
        `Re: ${capitalize(trade)} para ${prospect.prospectName} — ¿cierro el tema?`,
      ]
    : [
        `${capitalize(trade)} for ${prospect.prospectName}`,
        `Re: ${capitalize(trade)} for ${prospect.prospectName}`,
        `Re: ${capitalize(trade)} for ${prospect.prospectName} — should I stop?`,
      ];

  return [intro, value, last].map((lines, index) => ({
    step: index,
    delayDays: AMANDA_STEP_DELAY_DAYS[index] ?? 7,
    subject: subjects[index]!.slice(0, 140),
    body: lines.join("\n").slice(0, 3000),
  }));
}

function capitalize(text: string) {
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

function pluralize(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/(company|agency)$/i.test(trimmed)) return trimmed.replace(/y$/i, "ies");
  if (/(s|x|ch|sh)$/i.test(trimmed)) return `${trimmed}es`;
  return `${trimmed}s`;
}

/** When a given step goes out, counted from the approval time. */
export function amandaStepSendAt(approvedAt: Date, step: number) {
  const delay = AMANDA_STEP_DELAY_DAYS[step] ?? AMANDA_STEP_DELAY_DAYS[AMANDA_STEP_DELAY_DAYS.length - 1]!;
  return new Date(approvedAt.getTime() + delay * 86_400_000);
}

/** Reply-To address that carries the sequence token back through Resend inbound. */
export function amandaReplyAddress(token: string, domain: string | null | undefined) {
  const host = String(domain ?? "").trim().toLowerCase().replace(/^@/, "");
  const clean = String(token ?? "").replace(/[^a-z0-9]/gi, "");
  if (!host || !clean) return null;
  return `amanda+${clean}@${host}`;
}

/** Pulls the token back out of any address in a received email's To list. */
export function parseAmandaReplyToken(addresses: Array<string | null | undefined>) {
  for (const address of addresses) {
    const match = /amanda\+([a-z0-9]{8,64})@/i.exec(String(address ?? ""));
    if (match) return match[1]!.toLowerCase();
  }
  return null;
}

/** "STOP", "unsubscribe", "remove me", "no gracias" — any of these ends the sequence for good. */
export function isAmandaStopRequest(text: string | null | undefined) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(">"));
  const first = lines[0] ?? "";
  // A bare "STOP" (or "Alto") on the first line is the opt-out we asked for.
  if (/^\W*(stop|alto|unsubscribe)\W*$/i.test(first)) return true;
  const head = lines.slice(0, 3).join(" ").toLowerCase();
  if (head.length > 240) return false;
  return /\b(unsubscribe|remove me|take me off|opt out|not interested|no thanks|no gracias|no me interesa)\b/.test(head);
}

/** Only these stages still want outreach; anything further along means the owner or the prospect already moved. */
export const AMANDA_SENDABLE_STAGES = new Set([
  "researching",
  "qualified",
  "needs_client_input",
  "ready_for_follow_up",
  "follow_up_queued",
  "contacted",
]);

/** Amanda writes to businesses, not to homeowners who asked for help. */
export function canOfferAmandaSequence(input: {
  opportunityType: string;
  contactEmail: string | null | undefined;
  metadata?: Record<string, unknown> | null;
  stage: string;
}) {
  const email = String(input.contactEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (/\.(invalid|test|example)$|@example\.(com|org|net)$/.test(email)) return false;
  if (input.opportunityType === "customer") return false;
  if (input.metadata?.inbound === true) return false;
  if (input.metadata?.trial_seed) return false;
  return AMANDA_SENDABLE_STAGES.has(input.stage);
}

function shortDate(value: string | null | undefined, spanish: boolean) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(spanish ? "es" : "en", { month: "short", day: "numeric" }).format(date);
}

/** One line the owner reads on the desk to know where Amanda is. */
export function amandaSequenceStatusCopy(
  sequence: Pick<AmandaSequenceRecord, "status" | "currentStep" | "nextSendAt" | "stoppedReason"> & { steps: { length: number } },
  spanish: boolean,
) {
  const total = sequence.steps.length || 3;
  const sent = Math.min(sequence.currentStep, total);
  const next = shortDate(sequence.nextSendAt, spanish);
  switch (sequence.status) {
    case "approved":
      return spanish
        ? `Aprobado. Amanda envía el correo 1 de ${total} ${next ? `el ${next}` : "hoy"}.`
        : `Approved. Amanda sends email 1 of ${total} ${next ? `on ${next}` : "today"}.`;
    case "sending":
      return spanish
        ? `Amanda envió ${sent} de ${total}.${next ? ` El siguiente sale el ${next}.` : ""}`
        : `Amanda sent ${sent} of ${total}.${next ? ` Next goes out ${next}.` : ""}`;
    case "paused":
      if (sequence.stoppedReason === "replied") {
        return spanish ? "Respondieron. Amanda se detuvo; te toca llamar." : "They replied. Amanda stopped; your turn to call.";
      }
      if (sequence.stoppedReason === "stop_request") {
        return spanish ? "Pidieron no recibir más correos. Amanda se detuvo." : "They asked us to stop. Amanda stopped for good.";
      }
      if (sequence.stoppedReason === "stage") {
        return spanish ? "El prospecto avanzó de etapa. Amanda se detuvo." : "The prospect moved stages. Amanda stopped.";
      }
      return spanish ? `Detenido por ti después de ${sent} de ${total}.` : `Stopped by you after ${sent} of ${total}.`;
    case "done":
      return spanish ? `Amanda envió los ${total} correos. Sin respuesta aún.` : `Amanda sent all ${total} emails. No reply yet.`;
    default:
      return spanish ? "Borrador. Nada se envía hasta que apruebes." : "Draft. Nothing sends until you approve.";
  }
}
