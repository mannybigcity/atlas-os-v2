/**
 * Next Message Engine: one recommended email plus rewrite chips.
 * Pure — zero Next or Supabase imports. Nothing here sends.
 */

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
  /** Owner's trade in plain words: "plumbing", "party setups". Never invented. */
  trade?: string | null;
  city?: string | null;
  prospectName: string;
  prospectCompany: string | null;
  /** What the prospect is, e.g. "property management company". Never a personal story. */
  prospectType?: string | null;
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

export function nextMessageOwnerFromBusiness(business: {
  ownerName?: string | null;
  businessName: string;
  ownerPhone?: string | null;
  trade?: string | null;
  city?: string | null;
}): NextMessageOwner {
  return {
    ownerFirstName: firstName(business.ownerName),
    businessName: business.businessName,
    ownerPhone: String(business.ownerPhone ?? "").trim() || null,
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

/** Enough of the owner's business to write a first hello without inventing facts. */
export function hasSafeBusinessProfile(
  input: Pick<NextMessageInput, "businessName" | "trade" | "city" | "ownerFirstName">,
) {
  const name = String(input.businessName ?? "").trim();
  if (name && !PLACEHOLDER_BUSINESS.test(name)) return true;
  return Boolean(usableTrade(input.trade) && firstName(input.ownerFirstName));
}

function who(input: NextMessageInput) {
  const person = firstName(input.prospectName);
  if (person) return person;
  const company = String(input.prospectCompany ?? "").trim();
  return company || (input.spanish ? "equipo" : "there");
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
export function amandaClose(input: Pick<NextMessageInput, "spanish" | "ownerFirstName" | "businessName" | "ownerPhone">) {
  const company = input.businessName.trim() || (input.spanish ? "el negocio" : "the business");
  const phone = String(input.ownerPhone ?? "").trim();
  const owner = firstName(input.ownerFirstName) || (input.spanish ? "El dueño" : "The owner");
  if (input.spanish) {
    const head = `Amanda, de parte de ${company}.`;
    return phone ? `${head} ${owner} contesta al ${phone}.` : head;
  }
  const head = `Amanda, on behalf of ${company}.`;
  return phone ? `${head} ${owner} answers at ${phone}.` : head;
}

function withClose(body: string, input: NextMessageInput) {
  return `${body.trim()}\n\n${amandaClose(input)}`.trim();
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
      return es ? `Hola de ${shop}` : `Hello from ${shop}`;
  }
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
  const hello = es ? `Hola ${name},` : `Hi ${name},`;

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
  const wrap = (text: string) => (job === "need_one_fact" ? text.trim() : withClose(text, input));
  const sendableCold =
    (job === "first_touch" || job === "client_follow") && hasSafeBusinessProfile(input);
  const notesThin = notesAreThin(input.notesText);
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
    trade: input.owner.trade ?? null,
    city: input.owner.city ?? null,
    prospectName: input.prospectName,
    prospectCompany: input.prospectCompany ?? null,
    prospectType: input.prospectType ?? null,
    stage: input.stage,
    opportunityType: input.opportunityType ?? null,
    lastTouchAt: input.lastTouchAt ?? null,
    nowIso: input.nowIso ?? new Date().toISOString(),
    notesText: input.notesText,
    quoteAmount: input.quoteAmount ?? null,
  });
}
