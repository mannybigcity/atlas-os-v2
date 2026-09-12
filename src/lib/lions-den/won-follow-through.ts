/**
 * What happens after the owner marks a prospect won. Pure: no I/O.
 *
 * A win is not the end of the desk work. Three days later the owner should
 * ask for a Google review and a referral, so the queue gets a dated step
 * whose body is the message the owner can send as-is.
 */

/** Days after the win before the queue asks the owner to request a review. */
export const WON_REVIEW_ASK_DAYS = 3;

export const REVIEW_LINK_MAX_LENGTH = 500;

/** Local calendar date (YYYY-MM-DD) `days` from `from`. */
export function localDateInDaysFrom(from: Date, days: number) {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Trims, adds https:// to a bare domain, and drops anything too short to be a link. */
export function normalizeReviewLink(value: unknown) {
  const raw = String(value ?? "").trim();
  if (raw.length < 3) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function validateReviewLink(value: unknown, spanish: boolean) {
  const link = normalizeReviewLink(value);
  if (link.length > REVIEW_LINK_MAX_LENGTH) {
    return {
      link: "",
      error: spanish ? "El enlace es demasiado largo." : "That link is too long.",
    };
  }
  if (link && /\s/.test(link)) {
    return {
      link: "",
      error: spanish ? "El enlace no puede tener espacios." : "A link cannot contain spaces.",
    };
  }
  return { link, error: null as string | null };
}

export type WonReviewAskInput = {
  prospectName: string;
  contactName?: string | null;
  businessName: string;
  reviewLink?: string | null;
  spanish: boolean;
  wonAt?: Date;
};

/**
 * The dated step the desk sets on a win: the review-and-referral ask.
 * `nextAction` is the exact text the owner sends; the queue reuses it as the draft body.
 */
export function wonReviewAsk(input: WonReviewAskInput) {
  const wonAt = input.wonAt ?? new Date();
  const business = input.businessName.trim() || (input.spanish ? "nosotros" : "us");
  const link = normalizeReviewLink(input.reviewLink);
  const linkLine = link
    ? input.spanish
      ? `Aquí está el enlace directo: ${link}`
      : `Here is the direct link: ${link}`
    : input.spanish
      ? "(Pega aquí tu enlace de reseñas de Google antes de enviar.)"
      : "(Paste your Google review link here before you send.)";

  const body = input.spanish
    ? `Gracias por confiar en ${business}. Fue un gusto trabajar con ustedes. Si quedaron contentos, una reseña rápida en Google nos ayuda muchísimo. ${linkLine} Y si conocen a alguien que necesite lo mismo, con gusto los atendemos.`
    : `Thank you for choosing ${business}. It was a pleasure working with you. If you are happy with the work, a quick Google review helps us more than you know. ${linkLine} And if you know anyone who needs the same kind of work, we would be glad to take care of them.`;

  return {
    nextAction: body.slice(0, 1200),
    nextActionDue: localDateInDaysFrom(wonAt, WON_REVIEW_ASK_DAYS),
  };
}

export function wonReviewAskHint(spanish: boolean, hasLink: boolean) {
  if (!hasLink) {
    return spanish
      ? "Guarda tu enlace de reseñas de Google una vez y cada cliente ganado recibirá el pedido de reseña con el enlace listo."
      : "Save your Google review link once and every won client gets the review ask with the link already in it.";
  }
  return spanish
    ? "Tres días después de ganar, el escritorio te recuerda pedir la reseña y una referencia. Tú lo mandas; Atlas nunca lo envía solo."
    : "Three days after a win the desk reminds you to ask for the review and a referral. You send it; Atlas never sends it on its own.";
}
