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
  | "need_one_fact";

export type NextMessageInput = {
  spanish: boolean;
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  prospectName: string;
  prospectCompany: string | null;
  stage: string;
  opportunityType: string | null;
  lastTouchAt: string | null;
  nowIso: string;
  notesText: string; // concatenated linked notes, oldest last, cap 800 chars
  quoteAmount: string | null; // only if a real quote exists on the record
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
};

const NOTES_CAP = 800;
const QUIET_AFTER_DAYS = 3;

const INTEREST_PATTERN =
  /\b(yes|sí|interested|interesad[oa]s?|ready|list[oa]s?|book|agend|schedule|quote|cotiz|price|precio|when can|cu[aá]ndo|call me|ll[aá]mame|wants? to|quiere[ns]?|go ahead|adelante|let'?s do it|h[aá]ganlo)\b/i;

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

function pickJob(input: NextMessageInput): NextMessageJob {
  const stage = String(input.stage ?? "").trim();
  const quietDays = quietDaysSince(input.lastTouchAt, input.nowIso);
  const noTouch = quietDays == null;
  if (notesBlank(input.notesText) && noTouch && !hasQuote(input.quoteAmount)) {
    return "need_one_fact";
  }
  if (stage === "won") return "review_referral";
  if (hasQuote(input.quoteAmount) && stage !== "won" && stage !== "lost") return "quote_follow";
  if ((stage === "contacted" || stage === "responded") && noteImpliesInterest(input.notesText)) {
    return "book_or_close";
  }
  if (quietDays != null && quietDays > QUIET_AFTER_DAYS) return "quiet_reopen";
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
    return es
      ? {
          body: [
            "Falta un dato antes de escribir.",
            "",
            "Agrega una nota en este prospecto: qué pidieron, una fecha o un precio.",
            "No voy a inventar un trabajo, un nombre ni un teléfono.",
          ].join("\n"),
          shorter: "Agrega una nota (trabajo, fecha o precio) y escribo el mensaje. No invento datos.",
          softer: "Con una sola nota alcanza. No adivino el trabajo ni el teléfono.",
          askYes: "¿Tienes un dato para anotar en este prospecto y poder escribir?",
          extra: [
            "Sin nota, fecha de contacto o cotización no escribo al prospecto. Anota un hecho.",
            "Escribe qué pidieron. Yo no pongo nombres de hijos, precios ni teléfonos inventados.",
          ],
        }
      : {
          body: [
            "Need one fact before I write.",
            "",
            "Add a note on this prospect — what they asked for, a date, or a price.",
            "I will not invent a job, a name, or a phone.",
          ].join("\n"),
          shorter: "Add one note (job, date, or price) and I will write the message. I will not invent facts.",
          softer: "A single note is enough. I will not guess the job or a phone number.",
          askYes: "Do you have one fact to pin on this prospect so I can write?",
          extra: [
            "Without a note, a last touch, or a quote I will not write to the prospect. Pin one fact.",
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

  return es
    ? {
        body: [
          hello,
          "",
          `${owner} de ${shop} me pidió escribirte. Queremos presentarnos.`,
          "¿Hay un hueco esta semana para una llamada corta?",
        ].join("\n"),
        shorter: `${hello}\n\n${owner} de ${shop} quiere saludarte. ¿Hablamos esta semana?`,
        softer: `${hello}\n\nTe escribimos de ${shop}. Cuando te acomode, ${owner} te explica el trabajo.`,
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
          `${owner} at ${shop} asked me to reach out. We would like to introduce the work we do.`,
          "Is there a good time this week for a short call?",
        ].join("\n"),
        shorter: `${hello}\n\n${owner} at ${shop} wanted to say hello. Can we talk this week?`,
        softer: `${hello}\n\nWriting from ${shop}. ${owner} can walk you through the work whenever it is easy.`,
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
  };
}
