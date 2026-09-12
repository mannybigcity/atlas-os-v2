import { parseJobValue } from "./prospect-stages.ts";

/**
 * A quote lives on the prospect record (metadata.quotes). Atlas writes the
 * words; the owner sends them and collects the money on his own pay link.
 * No money moves through Atlas.
 */
export const QUOTES_METADATA_KEY = "quotes";
export const DESK_QUOTE_STATUSES = ["drafted", "sent", "accepted", "declined"] as const;
export type DeskQuoteStatus = (typeof DESK_QUOTE_STATUSES)[number];

export type DeskQuote = {
  id: string;
  description: string;
  amountUsd: number;
  /** YYYY-MM-DD, the last day the price holds. */
  validUntil: string;
  createdAt: string;
  status: DeskQuoteStatus;
  statusAt?: string;
  by?: string;
};

export function isDeskQuoteStatus(value: unknown): value is DeskQuoteStatus {
  return (DESK_QUOTE_STATUSES as readonly string[]).includes(String(value ?? ""));
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function localDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type DeskQuoteInput = { description: string; amount: string; validDays: string };
export type DeskQuoteErrors = Partial<Record<keyof DeskQuoteInput, string>>;

/** Mirrors what the record can hold; a bad form becomes a notice, never a 500. */
export function validateDeskQuote(input: DeskQuoteInput, spanish: boolean) {
  const errors: DeskQuoteErrors = {};
  const description = input.description.trim();
  if (description.length < 3 || description.length > 600) {
    errors.description = spanish ? "Describe el trabajo (3 a 600 letras)." : "Describe the job (3 to 600 characters).";
  }
  const amountUsd = parseJobValue(input.amount);
  if (amountUsd == null) {
    errors.amount = spanish ? "Escribe un precio, por ejemplo 1,200." : "Enter a price, for example 1,200.";
  }
  const validDays = Number(String(input.validDays ?? "").trim() || "14");
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 180) {
    errors.validDays = spanish ? "Los días de validez van de 1 a 180." : "Valid days must be 1 to 180.";
  }
  return { errors, description, amountUsd, validDays };
}

export function newDeskQuote(input: {
  id: string;
  description: string;
  amountUsd: number;
  validDays: number;
  by?: string | null;
  now?: Date;
}): DeskQuote {
  const now = input.now ?? new Date();
  const validUntil = localDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() + input.validDays));
  const by = String(input.by ?? "").trim().slice(0, 320);
  return {
    id: input.id,
    description: input.description.trim().slice(0, 600),
    amountUsd: input.amountUsd,
    validUntil,
    createdAt: now.toISOString(),
    status: "drafted",
    ...(by ? { by } : {}),
  };
}

export function readDeskQuotes(metadata: Record<string, unknown> | null | undefined): DeskQuote[] {
  const raw = metadata?.[QUOTES_METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  const quotes: DeskQuote[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const amountUsd = typeof row.amountUsd === "number" ? row.amountUsd : parseJobValue(row.amountUsd);
    if (
      typeof row.id !== "string" ||
      typeof row.description !== "string" ||
      amountUsd == null ||
      typeof row.validUntil !== "string" ||
      typeof row.createdAt !== "string" ||
      !isDeskQuoteStatus(row.status)
    ) {
      continue;
    }
    quotes.push({
      id: row.id,
      description: row.description,
      amountUsd,
      validUntil: row.validUntil,
      createdAt: row.createdAt,
      status: row.status,
      ...(typeof row.statusAt === "string" ? { statusAt: row.statusAt } : {}),
      ...(typeof row.by === "string" && row.by ? { by: row.by } : {}),
    });
  }
  return quotes.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function latestDeskQuote(metadata: Record<string, unknown> | null | undefined) {
  return readDeskQuotes(metadata)[0] ?? null;
}

/** Keeps at most the last 20 quotes on a record so metadata cannot grow forever. */
export function withDeskQuote(metadata: Record<string, unknown>, quote: DeskQuote) {
  const others = readDeskQuotes(metadata).filter((item) => item.id !== quote.id);
  return { ...metadata, [QUOTES_METADATA_KEY]: [quote, ...others].slice(0, 20) };
}

export function deskQuoteStatusLabel(status: DeskQuoteStatus, spanish: boolean) {
  const labels: Record<DeskQuoteStatus, [string, string]> = {
    drafted: ["Written, not sent", "Escrita, sin enviar"],
    sent: ["Sent", "Enviada"],
    accepted: ["Accepted", "Aceptada"],
    declined: ["Declined", "Rechazada"],
  };
  return spanish ? labels[status][1] : labels[status][0];
}

/** Buttons offered for a quote in its current state. Accepted and declined are final. */
export function deskQuoteStatusActions(status: DeskQuoteStatus, spanish: boolean) {
  const sent = { status: "sent" as const, label: spanish ? "Ya la envié" : "I sent it" };
  const accepted = { status: "accepted" as const, label: spanish ? "Aceptaron · ganado" : "They accepted · won" };
  const declined = { status: "declined" as const, label: spanish ? "Dijeron no" : "They said no" };
  switch (status) {
    case "drafted":
      return [sent, accepted, declined];
    case "sent":
      return [accepted, declined];
    default:
      return [];
  }
}

function formatValidUntil(validUntil: string, spanish: boolean) {
  const [year, month, day] = validUntil.split("-").map(Number);
  return new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", { month: "long", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

/** The exact words the owner sends. Plain, short, one price, one way to pay. */
export function deskQuoteText(input: {
  quote: DeskQuote;
  prospectName: string;
  contactName?: string | null;
  businessName?: string | null;
  payLink?: string | null;
  spanish: boolean;
}) {
  const { quote, spanish } = input;
  const name = input.contactName?.trim() || "";
  const greeting = spanish ? (name ? `Hola ${name},` : "Hola,") : name ? `Hi ${name},` : "Hi,";
  const amount = formatUsd(quote.amountUsd);
  const until = formatValidUntil(quote.validUntil, spanish);
  const business = input.businessName?.trim() || "";
  const pay = input.payLink?.trim() || "";
  const lines = spanish
    ? [
        greeting,
        "",
        `Aquí va la cotización para ${input.prospectName}:`,
        "",
        quote.description,
        "",
        `Total: ${amount}`,
        `Precio válido hasta el ${until}.`,
        ...(pay ? ["", `Para pagar o dejar el depósito: ${pay}`] : []),
        "",
        "Responde a este mensaje o llámame con cualquier duda.",
        "",
        business ? `Gracias,\n${business}` : "Gracias.",
      ]
    : [
        greeting,
        "",
        `Here is the quote for ${input.prospectName}:`,
        "",
        quote.description,
        "",
        `Total: ${amount}`,
        `Price good through ${until}.`,
        ...(pay ? ["", `To pay or leave a deposit: ${pay}`] : []),
        "",
        "Reply to this message or call me with any questions.",
        "",
        business ? `Thanks,\n${business}` : "Thanks.",
      ];
  const subject = spanish ? `Cotización · ${input.prospectName} · ${amount}` : `Quote · ${input.prospectName} · ${amount}`;
  return { subject: subject.slice(0, 180), body: lines.join("\n").slice(0, 4000) };
}

/** A pay link is a URL or a short "how to pay" line (Zelle number, "cash or check on the day"). */
export function normalizePayLink(raw: string) {
  const text = raw.trim().replace(/\s+/g, " ");
  // Under three characters cannot be a link or an instruction; treat it as "clear".
  if (text.length < 3) return "";
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(text) && !/^https?:\/\//i.test(text)) return `https://${text}`;
  return text;
}

export function validatePayLink(raw: string, spanish: boolean) {
  if (normalizePayLink(raw).length > 500) {
    return spanish ? "El enlace o la nota de pago es demasiado largo." : "The pay link or note is too long.";
  }
  return null;
}
