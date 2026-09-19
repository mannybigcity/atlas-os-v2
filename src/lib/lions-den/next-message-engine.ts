/**
 * Next Message Engine: one recommended email plus rewrite chips.
 * Pure — zero Next or Supabase imports. Nothing here sends.
 */

import { outreachDeskLane, type OutreachDeskLane } from "../client-portal/identity.ts";
import { AFE_MANNY_PHONE_DISPLAY } from "../afe-public-contact.ts";
import {
  DELEANA_PHONE_DISPLAY,
  SIS_OUTREACH_EMAIL,
  contactAnswerLines,
  type FounderContactLine,
} from "./founder-contact-kit.ts";

export type NextMessageJob =
  | "first_touch"
  | "quiet_reopen"
  | "quote_follow"
  | "book_or_close"
  | "review_referral"
  | "client_follow"
  | "deposit_ask"
  | "need_one_fact";

export type NextMessageInput = {
  spanish: boolean;
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  contactLines?: FounderContactLine[] | null;
  /** Owner's trade in plain words: "plumbing", "party setups". Never invented. */
  trade?: string | null;
  city?: string | null;
  prospectName: string;
  prospectCompany: string | null;
  /** What the prospect is, e.g. "property management company". Never a personal story. */
  prospectType?: string | null;
  /** Workspace slug so SIS/AFE walls hold when the display name is thin. */
  organizationSlug?: string | null;
  stage: string;
  opportunityType: string | null;
  lastTouchAt: string | null;
  nowIso: string;
  notesText: string; // concatenated linked notes, oldest last, cap 800 chars
  quoteAmount: string | null; // only if a real quote exists on the record
};

export type NextMessageProfile = {
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  contactLines?: FounderContactLine[] | null;
  trade: string;
  city: string;
  prospectCompany: string;
  prospectType: string;
  notesThin: boolean;
};

export type NextMessageResult = {
  job: NextMessageJob;
  jobLabel: string; // one line, EN or ES
  subject: string;
  body: string;
  variants: {
    shorter: string;
    softer: string;
    askYes: string;
    extra: [string, string];
  };
  /** Thin/empty notes + enough business profile to try the cost-controlled desk AI path. */
  aiEligible: boolean;
  profile: NextMessageProfile;
};

const NOTES_CAP = 800;
const QUIET_AFTER_DAYS = 3;

const INTEREST_PATTERN =
  /\b(yes|sí|interested|interesad[oa]s?|ready|list[oa]s?|book|agend|schedule|quote|cotiz|price|precio|when can|cu[aá]ndo|call me|ll[aá]mame|wants? to|quiere[ns]?|go ahead|adelante|let'?s do it|h[aá]ganlo)\b/i;

const DEPOSIT_PATTERN = /\b(deposit|anticipo|down payment|seña|senia)\b/i;

export type NextMessageOwner = {
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  contactLines?: FounderContactLine[] | null;
  trade?: string | null;
  city?: string | null;
};

const PLACEHOLDER_BUSINESS =
  /^(our company|the business|el negocio|your company|la empresa)$/i;
const GENERIC_TRADE = /^(local business|servicio|service|negocio local)$/i;
const THIN_NOTES_CHARS = 12;

export type DeskLinkedNote = {
  recordId?: string | null;
  createdAt: string;
  title: string;
  body: string | null;
};

export function isCustomerRecord(opportunityType: string | null | undefined) {
  return String(opportunityType ?? "").trim() === "customer";
}

export function prospectTypeFromRecord(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.primary_type;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replaceAll("_", " ").trim();
  return cleaned || null;
}

export function concatNotesText(
  notes: Array<{ createdAt: string; text: string }>,
  cap = NOTES_CAP,
): string {
  const joined = [...notes]
    .filter((note) => note.text.trim())
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((note) => note.text.replace(/\s+/g, " ").trim())
    .join("\n");
  if (joined.length <= cap) return joined;
  return joined.slice(-cap);
}

export function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) continue;
    if (ms >= bestMs) {
      best = raw;
      bestMs = ms;
    }
  }
  return best;
}

export function quietDaysSince(lastTouchAt: string | null | undefined, nowIso: string): number | null {
  const last = Date.parse(String(lastTouchAt ?? "").trim());
  const now = Date.parse(nowIso);
  if (Number.isNaN(last) || Number.isNaN(now) || now < last) return null;
  return Math.floor((now - last) / 86_400_000);
}

function firstName(value: string | null | undefined) {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] ?? "";
}

function cleanContactLines(lines: FounderContactLine[] | null | undefined) {
  const contacts = (lines ?? []).filter((line) => String(line.phone ?? "").trim());
  return contacts.length ? contacts : undefined;
}

export function nextMessageOwnerFromBusiness(business: {
  ownerName?: string | null;
  businessName: string;
  ownerPhone?: string | null;
  contactLines?: FounderContactLine[] | null;
  trade?: string | null;
  city?: string | null;
}): NextMessageOwner {
  const contactLines = cleanContactLines(business.contactLines);
  return {
    ownerFirstName: firstName(business.ownerName),
    businessName: business.businessName,
    ownerPhone: String(business.ownerPhone ?? "").trim() || null,
    ...(contactLines ? { contactLines } : {}),
    trade: String(business.trade ?? "").trim() || null,
    city: String(business.city ?? "").trim() || null,
  };
}

export function usableTrade(value: string | null | undefined) {
  const trade = String(value ?? "").trim();
  if (!trade || GENERIC_TRADE.test(trade)) return "";
  return trade;
}

export function notesAreThin(notesText: string | null | undefined) {
  return String(notesText ?? "").trim().length < THIN_NOTES_CHARS;
}

const SIGN_PARTY_VERTICAL =
  /\b(childcare|child care|daycare|day care|preschool|pre-?k|church|hoa|homeowners association|school|kids club|after.?school|faith)\b/i;

export function messageDeskLane(
  input: Pick<NextMessageInput, "businessName" | "organizationSlug">,
): OutreachDeskLane {
  return outreachDeskLane({ name: input.businessName, slug: input.organizationSlug });
}

function hasProspectHandle(input: Pick<NextMessageInput, "prospectName" | "prospectCompany" | "prospectType">) {
  return Boolean(
    String(input.prospectCompany ?? "").trim() ||
      String(input.prospectName ?? "").trim() ||
      SIGN_PARTY_VERTICAL.test(String(input.prospectType ?? "")),
  );
}

/** Enough of the owner's business to write a first hello without inventing facts. */
export function hasSafeBusinessProfile(
  input: Pick<
    NextMessageInput,
    "businessName" | "trade" | "city" | "ownerFirstName" | "organizationSlug" | "prospectName" | "prospectCompany" | "prospectType"
  >,
) {
  if (messageDeskLane(input) === "sis" && hasProspectHandle(input)) return true;
  const name = String(input.businessName ?? "").trim();
  if (name && !PLACEHOLDER_BUSINESS.test(name)) return true;
  return Boolean(usableTrade(input.trade) && firstName(input.ownerFirstName));
}

function who(input: NextMessageInput) {
  const person = firstName(input.prospectName);
  if (person) return person;
  return String(input.prospectCompany ?? "").trim();
}

function centerName(input: NextMessageInput) {
  return (
    String(input.prospectCompany ?? "").trim() ||
    String(input.prospectName ?? "").trim() ||
    (input.spanish ? "su programa" : "your program")
  );
}

/** First line is them (center / trade / city). Never "Hi there". */
export function themLine(input: NextMessageInput) {
  const company =
    String(input.prospectCompany ?? "").trim() || String(input.prospectName ?? "").trim();
  const city = String(input.city ?? "").trim();
  const kind = prospectWhat(input);
  if (company && city && !company.toLowerCase().includes(city.toLowerCase())) {
    return input.spanish ? `${company} en ${city}` : `${company} in ${city}`;
  }
  if (company) return company;
  if (kind && city) return input.spanish ? `${kind} en ${city}` : `${kind} in ${city}`;
  if (kind) return kind;
  if (city) return city;
  return "";
}

function ownerName(input: NextMessageInput, spanish: boolean) {
  return firstName(input.ownerFirstName) || (spanish ? "El dueño" : "The owner");
}

function business(input: NextMessageInput) {
  return input.businessName.trim() || (input.spanish ? "el negocio" : "the business");
}

function shopPhrase(input: NextMessageInput) {
  const shop = business(input);
  const trade = usableTrade(input.trade);
  const city = String(input.city ?? "").trim();
  if (input.spanish) {
    if (trade && city) return `${shop}, una empresa de ${trade} en ${city}`;
    if (trade) return `${shop}, una empresa de ${trade}`;
    if (city) return `${shop} en ${city}`;
    return shop;
  }
  if (trade && city) return `${shop}, a ${trade} company in ${city}`;
  if (trade) return `${shop}, a ${trade} company`;
  if (city) return `${shop} in ${city}`;
  return shop;
}

function prospectWhat(input: NextMessageInput) {
  return String(input.prospectType ?? "").replaceAll("_", " ").trim();
}

/** Outbound close. Omit the phone sentence when no phone was passed in. */
export function amandaClose(
  input: Pick<NextMessageInput, "spanish" | "ownerFirstName" | "businessName" | "ownerPhone" | "contactLines">,
) {
  const company = input.businessName.trim() || (input.spanish ? "el negocio" : "the business");
  const answers = contactAnswerLines({
    spanish: input.spanish,
    ownerName: input.ownerFirstName,
    ownerPhone: input.ownerPhone,
    contactLines: input.contactLines,
  });
  const head = input.spanish ? `Amanda, de parte de ${company}.` : `Amanda, on behalf of ${company}.`;
  return answers.length ? `${head} ${answers.join(". ")}.` : head;
}

export function sisFirstTouchClose() {
  return `Deleana & Manny · SIS Custom Creations · Manny ${AFE_MANNY_PHONE_DISPLAY} · Deleana ${DELEANA_PHONE_DISPLAY} · ${SIS_OUTREACH_EMAIL}`;
}

/** SIS Sign Party first-touch uses the locked owner sign-off. Other jobs keep Amanda. */
export function firstTouchClose(input: NextMessageInput) {
  if (messageDeskLane(input) === "sis") return sisFirstTouchClose();
  return amandaClose(input);
}

function withClose(body: string, input: NextMessageInput, job: NextMessageJob) {
  const close = job === "first_touch" ? firstTouchClose(input) : amandaClose(input);
  const trimmed = body.trim();
  return trimmed.includes(close) ? trimmed : `${trimmed}\n\n${close}`.trim();
}

function notesBlank(notesText: string) {
  return !String(notesText ?? "").trim();
}

function hasQuote(quoteAmount: string | null | undefined) {
  return Boolean(String(quoteAmount ?? "").trim());
}

function noteImpliesInterest(notesText: string) {
  return INTEREST_PATTERN.test(String(notesText ?? ""));
}

function noteImpliesDeposit(notesText: string) {
  return DEPOSIT_PATTERN.test(String(notesText ?? ""));
}

function recordNoun(input: NextMessageInput) {
  if (isCustomerRecord(input.opportunityType)) {
    return input.spanish ? "este cliente" : "this client";
  }
  return input.spanish ? "este prospecto" : "this prospect";
}

function pickJob(input: NextMessageInput): NextMessageJob {
  const stage = String(input.stage ?? "").trim();
  const quietDays = quietDaysSince(input.lastTouchAt, input.nowIso);
  const noTouch = quietDays == null;
  const coldEmpty = notesBlank(input.notesText) && noTouch && !hasQuote(input.quoteAmount);
  if (coldEmpty && !hasSafeBusinessProfile(input)) {
    return "need_one_fact";
  }
  if (stage === "won") return "review_referral";
  if (hasQuote(input.quoteAmount) && stage !== "won" && stage !== "lost") return "quote_follow";
  if ((stage === "contacted" || stage === "responded") && noteImpliesInterest(input.notesText)) {
    return "book_or_close";
  }
  if (quietDays != null && quietDays > QUIET_AFTER_DAYS) return "quiet_reopen";
  if (isCustomerRecord(input.opportunityType) && noteImpliesDeposit(input.notesText)) {
    return "deposit_ask";
  }
  if (isCustomerRecord(input.opportunityType)) return "client_follow";
  return "first_touch";
}

function jobLabelFor(job: NextMessageJob, input: NextMessageInput): string {
  const es = input.spanish;
  const quietDays = quietDaysSince(input.lastTouchAt, input.nowIso);
  switch (job) {
    case "need_one_fact":
      return es ? "Falta un dato antes de escribir" : "Need one fact before I write";
    case "quote_follow":
      return es ? "Seguimiento de cotización" : "Quote follow-up";
    case "review_referral":
      return es ? "Reseña y referencia" : "Review and referral";
    case "book_or_close":
      return es ? "Pedir que agenden" : "Ask to book";
    case "deposit_ask":
      return es ? "Pedir el depósito" : "Ask for the deposit";
    case "client_follow":
      return es ? "Seguimiento con el cliente" : "Client follow-up";
    case "quiet_reopen":
      return es
        ? `Retomar después de ${quietDays ?? 0} días en silencio`
        : `Re-engage after ${quietDays ?? 0} quiet days`;
    default:
      return es ? "Primer saludo" : "First hello";
  }
}

function subjectFor(job: NextMessageJob, input: NextMessageInput): string {
  const company = String(input.prospectCompany ?? "").trim() || input.prospectName.trim() || "you";
  const es = input.spanish;
  const shop = business(input);
  switch (job) {
    case "need_one_fact":
      return es ? "Falta un dato" : "Need one fact";
    case "quote_follow":
      return es
        ? `Cotización${input.quoteAmount ? ` · ${input.quoteAmount}` : ""} · ${company}`.trim()
        : `Quote${input.quoteAmount ? ` · ${input.quoteAmount}` : ""} · ${company}`.trim();
    case "review_referral":
      return es ? `Gracias de ${shop}` : `Thank you from ${shop}`;
    case "book_or_close":
      return es ? `¿Agendamos? · ${company}` : `Can we book it? · ${company}`;
    case "deposit_ask":
      return es ? `Depósito · ${company}` : `Deposit · ${company}`;
    case "client_follow":
      return es ? `Siguiendo el hilo · ${company}` : `Checking in · ${company}`;
    case "quiet_reopen":
      return es ? `Siguiendo el hilo · ${company}` : `Checking back in · ${company}`;
    default:
      return firstTouchSubject(input);
  }
}

function firstTouchSubject(input: NextMessageInput) {
  const lane = messageDeskLane(input);
  const center = centerName(input);
  if (lane === "sis") {
    return input.spanish ? `Fiesta de letreros para los niños de ${center}` : `Sign party for ${center} kids`;
  }
  if (lane === "afe") {
    const whoThem = String(input.prospectCompany ?? "").trim() || input.prospectName.trim() || "your shop";
    return input.spanish ? `Seguimiento en el escritorio · ${whoThem}` : `Follow-up on your desk for ${whoThem}`;
  }
  const shop = business(input);
  return input.spanish ? `Hola de ${shop}` : `Hello from ${shop}`;
}

type DraftSet = { body: string; shorter: string; softer: string; askYes: string; extra: [string, string] };

function draftsFor(job: NextMessageJob, input: NextMessageInput): DraftSet {
  const es = input.spanish;
  const name = who(input);
  const shop = business(input);
  const owner = ownerName(input, es);
  const amount = String(input.quoteAmount ?? "").trim();
  const quietDays = quietDaysSince(input.lastTouchAt, input.nowIso);
  const days = quietDays ?? 0;
  const hello = name ? (es ? `Hola ${name},` : `Hi ${name},`) : es ? "Hola," : "Hello,";

  if (job === "need_one_fact") {
    const whoRecord = recordNoun(input);
    return es
      ? {
          body: [
            "Falta un dato antes de escribir.",
            "",
            `Agrega una nota en ${whoRecord}: qué pidieron, una fecha o un precio.`,
            "No voy a inventar un trabajo, un nombre ni un teléfono.",
          ].join("\n"),
          shorter: "Agrega una nota (trabajo, fecha o precio) y escribo el mensaje. No invento datos.",
          softer: "Con una sola nota alcanza. No adivino el trabajo ni el teléfono.",
          askYes: `¿Tienes un dato para anotar en ${whoRecord} y poder escribir?`,
          extra: [
            `Sin nota, fecha de contacto o cotización no escribo a ${whoRecord}. Anota un hecho.`,
            "Escribe qué pidieron. Yo no pongo nombres de hijos, precios ni teléfonos inventados.",
          ],
        }
      : {
          body: [
            "Need one fact before I write.",
            "",
            `Add a note on ${whoRecord} — what they asked for, a date, or a price.`,
            "I will not invent a job, a name, or a phone.",
          ].join("\n"),
          shorter: "Add one note (job, date, or price) and I will write the message. I will not invent facts.",
          softer: "A single note is enough. I will not guess the job or a phone number.",
          askYes: `Do you have one fact to pin on ${whoRecord} so I can write?`,
          extra: [
            `Without a note, a last touch, or a quote I will not write to ${whoRecord}. Pin one fact.`,
            "Write what they asked for. I will not add kids' names, prices, or phones that are not on the record.",
          ],
        };
  }

  if (job === "quote_follow") {
    const price = amount || (es ? "la cotización" : "the quote");
    return es
      ? {
          body: [
            hello,
            "",
            `Te escribo por la cotización de ${price}.`,
            "¿Quieres que la dejemos firmada esta semana?",
          ].join("\n"),
          shorter: `${hello}\n\n¿Seguimos con la cotización de ${price}?`,
          softer: `${hello}\n\nAhí sigue la cotización de ${price}. Cuando te acomode la revisamos.`,
          askYes: `${hello}\n\n¿Aceptas la cotización de ${price}, sí o no?`,
          extra: [
            `${hello}\n\nLa cotización de ${price} sigue abierta. Dime si ajustamos algo.`,
            `${hello}\n\nSi ${price} te funciona, ${owner} agenda el trabajo esta semana.`,
          ],
        }
      : {
          body: [
            hello,
            "",
            `Following up on the quote for ${price}.`,
            "Want us to lock it in this week?",
          ].join("\n"),
          shorter: `${hello}\n\nStill good on the quote for ${price}?`,
          softer: `${hello}\n\nThe quote for ${price} is still there when you want to look it over.`,
          askYes: `${hello}\n\nCan we go ahead on the ${price} quote — yes or no?`,
          extra: [
            `${hello}\n\nThe ${price} quote is still open. Tell me if you want anything changed.`,
            `${hello}\n\nIf ${price} works, ${owner} can book the job this week.`,
          ],
        };
  }

  if (job === "review_referral") {
    return es
      ? {
          body: [
            hello,
            "",
            `Gracias por confiar en ${shop}. Fue un gusto hacer el trabajo.`,
            `Si quedaron contentos, una reseña rápida en Google nos ayuda muchísimo. Y si conocen a alguien que necesite lo mismo, ${owner} con gusto los atiende.`,
          ].join("\n"),
          shorter: `${hello}\n\nGracias por elegir ${shop}. Si puedes, déjanos una reseña en Google y una referencia.`,
          softer: `${hello}\n\nFue un gusto trabajar con ustedes. Si les acomoda, una reseña o una referencia a ${shop} se agradece.`,
          askYes: `${hello}\n\n¿Nos dejan una reseña en Google y nos recomiendan con alguien, sí o no?`,
          extra: [
            `${hello}\n\nSi el trabajo quedó bien, una reseña de ${shop} en Google nos abre la siguiente puerta.`,
            `${hello}\n\n¿Conocen a un vecino que necesite el mismo trabajo? ${owner} los atiende.`,
          ],
        }
      : {
          body: [
            hello,
            "",
            `Thank you for choosing ${shop}. It was a pleasure doing the work.`,
            `If you are happy with it, a quick Google review helps more than you know. And if you know someone who needs the same work, ${owner} would be glad to take care of them.`,
          ].join("\n"),
          shorter: `${hello}\n\nThank you for choosing ${shop}. A Google review and a referral would help a lot.`,
          softer: `${hello}\n\nIt was good working with you. A review or a referral for ${shop} is appreciated when you have a minute.`,
          askYes: `${hello}\n\nCan you leave us a Google review and point us to someone who needs the same work — yes or no?`,
          extra: [
            `${hello}\n\nIf the job was solid, a Google review for ${shop} opens the next door.`,
            `${hello}\n\nKnow a neighbor who needs the same work? ${owner} will take care of them.`,
          ],
        };
  }

  if (job === "book_or_close") {
    return es
      ? {
          body: [
            hello,
            "",
            `Por lo que anotamos, parece que quieren seguir.`,
            `¿Agendamos el trabajo con ${owner} esta semana?`,
          ].join("\n"),
          shorter: `${hello}\n\n¿Cerramos fecha esta semana?`,
          softer: `${hello}\n\nCuando quieras damos el siguiente paso. ${owner} tiene hueco esta semana.`,
          askYes: `${hello}\n\n¿Agendamos, sí o no?`,
          extra: [
            `${hello}\n\nDime un día que te sirva y ${owner} llega.`,
            `${hello}\n\nSi ahora no es buen momento, respóndeme “más tarde” y no insisto esta semana.`,
          ],
        }
      : {
          body: [
            hello,
            "",
            "From the note on file, it looks like you want to move forward.",
            `Can we book the job with ${owner} this week?`,
          ].join("\n"),
          shorter: `${hello}\n\nCan we lock a day this week?`,
          softer: `${hello}\n\nWhenever you are ready we can take the next step. ${owner} has time this week.`,
          askYes: `${hello}\n\nAre we booking this — yes or no?`,
          extra: [
            `${hello}\n\nName a day that works and ${owner} will be there.`,
            `${hello}\n\nIf now is a bad time, reply “later” and I will not push this week.`,
          ],
        };
  }

  if (job === "deposit_ask") {
    return es
      ? {
          body: [
            hello,
            "",
            "Te escribo por el depósito para reservar la fecha.",
            `¿Lo enviamos esta semana para que ${owner} deje el día apartado?`,
          ].join("\n"),
          shorter: `${hello}\n\n¿Mandamos el depósito esta semana para apartar la fecha?`,
          softer: `${hello}\n\nCuando puedas, el depósito reserva el día. ${owner} lo confirma al recibirlo.`,
          askYes: `${hello}\n\n¿Enviamos el depósito esta semana, sí o no?`,
          extra: [
            `${hello}\n\nSin depósito no puedo apartar la fecha. Dime cómo lo mandas y ${owner} lo anota.`,
            `${hello}\n\nSi ya lo enviaste, respóndeme y lo marco. Si no, ¿lo hacemos esta semana?`,
          ],
        }
      : {
          body: [
            hello,
            "",
            "I am writing about the deposit we need to hold the date.",
            `Can we get that deposit in this week so ${owner} can lock it in?`,
          ].join("\n"),
          shorter: `${hello}\n\nCan we get the deposit in this week to hold the date?`,
          softer: `${hello}\n\nWhenever you are ready, the deposit holds the day. ${owner} will confirm it when it lands.`,
          askYes: `${hello}\n\nCan we get the deposit in this week — yes or no?`,
          extra: [
            `${hello}\n\nI cannot hold the date without the deposit. Tell me how you will send it and ${owner} will mark it.`,
            `${hello}\n\nIf you already sent it, reply and I will mark it. If not, can we do it this week?`,
          ],
        };
  }

  if (job === "client_follow") {
    return es
      ? {
          body: [
            hello,
            "",
            `Te escribo de ${shop} para seguir el hilo.`,
            `¿Agendamos la próxima fecha con ${owner} esta semana?`,
          ].join("\n"),
          shorter: `${hello}\n\n¿Cerramos la próxima fecha esta semana?`,
          softer: `${hello}\n\nSolo quería saludarte. Cuando quieras, ${owner} agenda el siguiente paso.`,
          askYes: `${hello}\n\n¿Agendamos la próxima fecha, sí o no?`,
          extra: [
            `${hello}\n\nDime un día que te sirva y ${owner} lo aparta.`,
            `${hello}\n\nSi ahora no es buen momento, respóndeme “más tarde” y no insisto esta semana.`,
          ],
        }
      : {
          body: [
            hello,
            "",
            `Writing from ${shop} to check in.`,
            `Want to book the next date with ${owner} this week?`,
          ].join("\n"),
          shorter: `${hello}\n\nCan we lock the next date this week?`,
          softer: `${hello}\n\nJust checking in. Whenever you are ready, ${owner} can book the next step.`,
          askYes: `${hello}\n\nAre we booking the next date — yes or no?`,
          extra: [
            `${hello}\n\nName a day that works and ${owner} will hold it.`,
            `${hello}\n\nIf now is a bad time, reply “later” and I will not push this week.`,
          ],
        };
  }

  if (job === "quiet_reopen") {
    return es
      ? {
          body: [
            hello,
            "",
            `Han pasado ${days} días desde el último contacto.`,
            `¿Tienes un momento esta semana para una llamada corta con ${owner}?`,
          ].join("\n"),
          shorter: `${hello}\n\nRetomo el hilo después de ${days} días. ¿Hablamos esta semana?`,
          softer: `${hello}\n\nSolo quería retomar. Cuando te acomode, ${owner} te llama.`,
          askYes: `${hello}\n\n¿Hablamos esta semana, sí o no?`,
          extra: [
            `${hello}\n\nSigo disponible. Dime un horario y ${owner} te marca.`,
            `${hello}\n\nSi ya no aplica, respóndeme y lo dejo aquí.`,
          ],
        }
      : {
          body: [
            hello,
            "",
            `It has been ${days} quiet days since the last touch.`,
            `Do you have a few minutes this week for a short call with ${owner}?`,
          ].join("\n"),
          shorter: `${hello}\n\nChecking back after ${days} quiet days. Can we talk this week?`,
          softer: `${hello}\n\nJust reopening the thread. ${owner} can call whenever it is easy for you.`,
          askYes: `${hello}\n\nCan we talk this week — yes or no?`,
          extra: [
            `${hello}\n\nI am still here. Name a time and ${owner} will call.`,
            `${hello}\n\nIf this is no longer a fit, reply and I will leave it there.`,
          ],
        };
  }

  const lane = messageDeskLane(input);
  if (lane === "sis") return sisSignPartyDrafts(input);
  if (lane === "afe") return afeAtlasDrafts(input);
  return tenantFirstTouchDrafts(input, { hello, shop, owner });
}

function openLine(input: NextMessageInput) {
  const them = themLine(input);
  if (them) return `${them},`;
  return input.spanish ? "Hola," : "Hello,";
}

function sisSignPartyDrafts(input: NextMessageInput): DraftSet {
  const es = input.spanish;
  const open = openLine(input);
  if (es) {
    return {
      body: [
        open,
        "",
        "Llevamos los materiales al sitio. Los niños pintan. Cada uno se lleva el proyecto a casa.",
        "Si les sirve un sábado por la mañana o una tarde entre semana, respondan con edades, número de niños y una ventana de fecha.",
      ].join("\n"),
      shorter: `${open}\n\nFiesta de letreros en su sitio: llevamos materiales, los niños pintan y se lo llevan. Respondan con edades, número y sábado por la mañana o tarde entre semana.`,
      softer: `${open}\n\nSIS Custom Creations puede armar una fiesta de letreros en su centro. Llevamos los materiales. Los niños pintan un proyecto para casa.\n\nCuando tengan edades, número de niños y un sábado por la mañana o una tarde entre semana, respondan y fijamos la fecha.`,
      askYes: `${open}\n\n¿Ponemos una fiesta de letreros en el calendario? Respondan con edades, número de niños y sábado por la mañana o tarde entre semana, sí o no.`,
      extra: [
        `${open}\n\nVamos a ustedes con la pintura y las tablas. Los niños hacen un letrero y se lo llevan.\n\nEnvíen edades, número de niños y una ventana de fecha si quieren una fecha reservada.`,
        `${open}\n\nUna fiesta de letreros es un taller corto en su sitio. Llevamos los materiales. Los niños salen con un proyecto.\n\nRespondan con edades, número y sábado por la mañana o tarde entre semana y confirmamos.`,
      ],
    };
  }
  return {
    body: [
      open,
      "",
      "We bring the supplies on-site for a kids sign party at your center. Kids paint. Each one takes a project home.",
      "If Saturday morning or a weekday afternoon works, reply with ages, headcount, and a date window.",
    ].join("\n"),
    shorter: `${open}\n\nOn-site sign party: we bring supplies, kids paint, they take it home. Reply with ages, headcount, and Saturday morning or weekday afternoon.`,
    softer: `${open}\n\nSIS Custom Creations can host a sign party at your center. We bring the supplies. Kids paint a take-home project.\n\nWhen you have ages, a headcount, and a Saturday morning or weekday afternoon window, reply and we will lock a date.`,
    askYes: `${open}\n\nCan we put a kids sign party on your calendar? Reply with ages, headcount, and Saturday morning or weekday afternoon, yes or no.`,
    extra: [
      `${open}\n\nWe come to you with the paint and boards. Kids make a sign and take it home.\n\nSend ages, headcount, and a date window if you want one on the books.`,
      `${open}\n\nA sign party is a short on-site workshop. We bring supplies. Kids leave with a project.\n\nReply with ages, headcount, and Saturday morning vs weekday afternoon and we will confirm.`,
    ],
  };
}

function afeAtlasDrafts(input: NextMessageInput): DraftSet {
  const es = input.spanish;
  const open = openLine(input);
  if (es) {
    return {
      body: [
        open,
        "",
        "Los leads se mueren entre la primera llamada y el seguimiento. Atlas los deja en su escritorio, redacta el siguiente mensaje y usted Aprueba antes de que salga. Usted se queda con el cliente.",
        "¿Martes o miércoles 15 minutos, o le mando un seguimiento de muestra?",
      ].join("\n"),
      shorter: `${open}\n\nLos leads se pierden entre la primera llamada y el seguimiento. Atlas redacta; usted Aprueba. ¿Martes o miércoles, 15 minutos?`,
      softer: `${open}\n\nCuando el seguimiento se atrasa, el lead se va. Atlas deja el lead en su escritorio y redacta la nota. Usted sigue Aprobando.\n\n¿Quiere un seguimiento de muestra o 15 minutos el martes o el miércoles?`,
      askYes: `${open}\n\n¿Hacemos martes o miércoles 15 minutos, o le mando un seguimiento de muestra, sí o no?`,
      extra: [
        `${open}\n\nAtlas pone los leads en el escritorio y deja el seguimiento listo. Usted Aprueba. El cliente es suyo.\n\nResponda martes, miércoles o “mándeme la muestra”.`,
        `${open}\n\nEl hueco es el seguimiento, no la primera llamada. Atlas redacta esa nota. Usted decide si sale.\n\n¿15 minutos el martes o el miércoles?`,
      ],
    };
  }
  return {
    body: [
      open,
      "",
      "Leads die between the first call and the follow-up. Atlas puts those leads on your desk, drafts the next message, and you Approve before anything goes out. You keep the customer.",
      "Tuesday or Wednesday for 15 minutes, or I can send a sample follow-up. Which is easier?",
    ].join("\n"),
    shorter: `${open}\n\nLeads die between first call and follow-up. Atlas drafts the follow-up; you Approve. Tuesday or Wednesday, 15 minutes?`,
    softer: `${open}\n\nWhen follow-up slips, the lead is gone. Atlas keeps the lead on your desk and drafts the next note. You still Approve.\n\nWant a sample follow-up, or a Tuesday or Wednesday 15-minute look?`,
    askYes: `${open}\n\nCan we do Tuesday or Wednesday for 15 minutes, or should I send a sample follow-up, yes or no?`,
    extra: [
      `${open}\n\nAtlas puts the leads on the desk and leaves the follow-up drafted. You Approve. The customer stays yours.\n\nReply Tuesday, Wednesday, or "send the sample".`,
      `${open}\n\nThe gap is the follow-up, not the first call. Atlas drafts that note. You decide if it goes out.\n\n15 minutes Tuesday or Wednesday?`,
    ],
  };
}

function tenantFirstTouchDrafts(
  input: NextMessageInput,
  bits: { hello: string; shop: string; owner: string },
): DraftSet {
  const es = input.spanish;
  const { hello, shop, owner } = bits;
  const shopLine = shopPhrase(input);
  const kind = prospectWhat(input);
  const company = String(input.prospectCompany ?? "").trim();
  const trade = usableTrade(input.trade);
  const need = trade
    ? es
      ? `${trade} con poco aviso`
      : `${trade} on short notice`
    : es
      ? "ayuda con poco aviso"
      : "help on short notice";
  const help = es
    ? kind && company
      ? `Ayudamos a ${kind} como ${company} cuando necesitan ${need} y un proveedor que sí contesta.`
      : company
        ? `Ayudamos a equipos como ${company} cuando necesitan ${need} y un proveedor que sí contesta.`
        : kind
          ? `Ayudamos a ${kind} cuando necesitan ${need} y un proveedor que sí contesta.`
          : `Queremos presentarnos.`
    : kind && company
      ? `We help ${kind} teams like ${company} when they need ${need} and a vendor who actually picks up.`
      : company
        ? `We help teams like ${company} when they need ${need} and a vendor who actually picks up.`
        : kind
          ? `We help ${kind} teams when they need ${need} and a vendor who actually picks up.`
          : `We would like to introduce the work we do.`;

  return es
    ? {
        body: [
          hello,
          "",
          `Soy Amanda y escribo de parte de ${shopLine}.`,
          help,
          `¿Hay un hueco esta semana para una llamada corta con ${owner}?`,
        ].join("\n"),
        shorter: `${hello}\n\n${owner} de ${shop} quiere saludarte. ¿Hablamos esta semana?`,
        softer: `${hello}\n\nTe escribimos de ${shopLine}. Cuando te acomode, ${owner} te explica el trabajo.`,
        askYes: `${hello}\n\n¿Agendamos 10 minutos esta semana, sí o no?`,
        extra: [
          `${hello}\n\nResponde con un horario y ${owner} te llama.`,
          `${hello}\n\nSi prefieres, dinos qué necesitan y armamos el siguiente paso.`,
        ],
      }
    : {
        body: [
          hello,
          "",
          `I'm Amanda, writing for ${shopLine}.`,
          help,
          `Is there a good time this week for a short call with ${owner}?`,
        ].join("\n"),
        shorter: `${hello}\n\n${owner} at ${shop} wanted to say hello. Can we talk this week?`,
        softer: `${hello}\n\nWriting from ${shopLine}. ${owner} can walk you through the work whenever it is easy.`,
        askYes: `${hello}\n\nCan we book 10 minutes this week — yes or no?`,
        extra: [
          `${hello}\n\nReply with a time and ${owner} will call.`,
          `${hello}\n\nIf you prefer, tell us what you need and we will set the next step.`,
        ],
      };
}

export function nextMessage(input: NextMessageInput): NextMessageResult {
  const job = pickJob(input);
  const drafts = draftsFor(job, input);
  const wrap = (text: string) => (job === "need_one_fact" ? text.trim() : withClose(text, input, job));
  const sendableCold =
    (job === "first_touch" || job === "client_follow") && hasSafeBusinessProfile(input);
  const notesThin = notesAreThin(input.notesText);
  const contactLines = cleanContactLines(input.contactLines);
  return {
    job,
    jobLabel: jobLabelFor(job, input),
    subject: subjectFor(job, input).slice(0, 140),
    body: wrap(drafts.body),
    variants: {
      shorter: wrap(drafts.shorter),
      softer: wrap(drafts.softer),
      askYes: wrap(drafts.askYes),
      extra: [wrap(drafts.extra[0]), wrap(drafts.extra[1])],
    },
    aiEligible: sendableCold && notesThin,
    profile: {
      ownerFirstName: firstName(input.ownerFirstName),
      businessName: input.businessName.trim(),
      ownerPhone: String(input.ownerPhone ?? "").trim() || null,
      ...(contactLines ? { contactLines } : {}),
      trade: usableTrade(input.trade),
      city: String(input.city ?? "").trim(),
      prospectCompany: String(input.prospectCompany ?? "").trim(),
      prospectType: String(input.prospectType ?? "").replaceAll("_", " ").trim(),
      notesThin,
    },
  };
}

export function deskNotesText(input: {
  linkedNotes?: DeskLinkedNote[];
  ownerNotes?: string | null;
  ownerNotesAt?: string | null;
  recordNotes?: string | null;
  recordNotesAt?: string | null;
  events?: Array<{ eventType?: string; createdAt: string; body?: string | null; summary?: string | null }>;
}): string {
  const pieces: Array<{ createdAt: string; text: string }> = [];
  for (const note of input.linkedNotes ?? []) {
    const text = [note.title, note.body].filter((part) => String(part ?? "").trim()).join(" — ");
    if (text.trim()) pieces.push({ createdAt: note.createdAt, text });
  }
  const ownerNotes = String(input.ownerNotes ?? "").trim();
  if (ownerNotes) {
    pieces.push({ createdAt: input.ownerNotesAt ?? "1970-01-01T00:00:00.000Z", text: ownerNotes });
  }
  const recordNotes = String(input.recordNotes ?? "").trim();
  if (recordNotes) {
    pieces.push({ createdAt: input.recordNotesAt ?? "1970-01-01T00:00:00.000Z", text: recordNotes });
  }
  for (const event of input.events ?? []) {
    if (event.eventType && event.eventType !== "note_added") continue;
    const text = String(event.body || event.summary || "").trim();
    if (text) pieces.push({ createdAt: event.createdAt, text });
  }
  return concatNotesText(pieces);
}

export function deskLastTouchAt(input: {
  lastContactAt?: string | null;
  ownerContactedAt?: string | null;
  events?: Array<{ eventType?: string; createdAt: string }>;
}): string | null {
  return latestTimestamp([
    input.lastContactAt,
    input.ownerContactedAt,
    ...(input.events ?? [])
      .filter((event) => event.eventType === "contacted" || event.eventType === "reply_received")
      .map((event) => event.createdAt),
  ]);
}

export function buildDeskNextMessage(input: {
  spanish: boolean;
  owner: NextMessageOwner;
  nowIso?: string;
  prospectName: string;
  prospectCompany?: string | null;
  prospectType?: string | null;
  organizationSlug?: string | null;
  stage: string;
  opportunityType?: string | null;
  lastTouchAt?: string | null;
  notesText: string;
  quoteAmount?: string | null;
}): NextMessageResult {
  return nextMessage({
    spanish: input.spanish,
    ownerFirstName: input.owner.ownerFirstName,
    businessName: input.owner.businessName,
    ownerPhone: input.owner.ownerPhone,
    contactLines: input.owner.contactLines,
    trade: input.owner.trade ?? null,
    city: input.owner.city ?? null,
    prospectName: input.prospectName,
    prospectCompany: input.prospectCompany ?? null,
    prospectType: input.prospectType ?? null,
    organizationSlug: input.organizationSlug ?? null,
    stage: input.stage,
    opportunityType: input.opportunityType ?? null,
    lastTouchAt: input.lastTouchAt ?? null,
    nowIso: input.nowIso ?? new Date().toISOString(),
    notesText: input.notesText,
    quoteAmount: input.quoteAmount ?? null,
  });
}
