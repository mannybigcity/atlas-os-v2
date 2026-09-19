/**
 * Cost-controlled Ask Amanda first-touch: prompt + parse + safety checks.
 * Pure — zero Next or Supabase. Nothing here sends.
 */

import { allowedFounderPhoneDigits } from "./founder-contact-kit.ts";
import {
  firstTouchClose,
  hasSafeBusinessProfile,
  messageDeskLane,
  notesAreThin,
  usableTrade,
  type NextMessageInput,
  type NextMessageResult,
} from "./next-message-engine.ts";

export const AMANDA_COMPOSE_AI_SCHEMA_NAME = "amanda_first_touch_email";

export const amandaComposeAiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body", "shorter", "softer", "askYes", "extra1", "extra2"],
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    shorter: { type: "string" },
    softer: { type: "string" },
    askYes: { type: "string" },
    extra1: { type: "string" },
    extra2: { type: "string" },
  },
} as const;

export type AmandaComposeAiDraft = {
  subject: string;
  body: string;
  shorter: string;
  softer: string;
  askYes: string;
  extra1: string;
  extra2: string;
};

const COACH_COPY =
  /need one fact|falta un dato|add a note on this|agrega una nota|a single note is enough|con una sola nota alcanza/i;
const PERSONAL_FAMILY =
  /\b(daughter|son|wife|husband|esposa|esposo|graduated|used to work)\b/i;
const PERSONAL_KID = /\b(kid|kids|hijo|hija)\b/i;
const MARKDOWN_OR_EMOJI = /[#*_`]|[\u{1F300}-\u{1FAFF}]/u;
const ATLAS_SELL = /\b(atlas|front desk|auto-?call|basic \$99|grow \$249|unlimited \$499)\b/i;
const SIS_SIGN_PARTY = /\b(sign party|fiesta de letreros|sis custom)\b/i;

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function phonesIn(text: string) {
  return [...text.matchAll(/\+?\d[\d().\s-]{7,}\d/g)].map((match) => digits(match[0])).filter(Boolean);
}

export function parseAmandaComposeAiDraft(value: unknown): AmandaComposeAiDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const subject = clean(row.subject, 140);
  const body = clean(row.body, 1800);
  const shorter = clean(row.shorter, 1800);
  const softer = clean(row.softer, 1800);
  const askYes = clean(row.askYes, 1800);
  const extra1 = clean(row.extra1, 1800);
  const extra2 = clean(row.extra2, 1800);
  if (subject.length < 2 || body.length < 20 || shorter.length < 12 || softer.length < 12) return null;
  if (askYes.length < 12 || extra1.length < 12 || extra2.length < 12) return null;
  return { subject, body, shorter, softer, askYes, extra1, extra2 };
}

export function amandaComposeAiInstructions(spanish: boolean, deskLane: "sis" | "afe" | null = null) {
  const shared = [
    "You draft one first-touch email the owner will read and send. Atlas never sends it.",
    "Use only facts in the JSON: owner name, business name, trade, city, owner phone, extra founder phones, prospect name/company/type.",
    "Never invent a child's name, job history, quote, website, or a phone that is not in ownerPhone or extraPhones.",
    "No markdown. No emoji. No triple exclamation. No em dashes.",
    "Every sendable body must end with the exact close string provided.",
    "Variants must be real rewrites, not the same paragraph.",
    "Do not write owner-facing coach copy such as need-one-fact or 'add a note'.",
    spanish ? "Write the email in Spanish." : "Write the email in English.",
    "Return only the requested JSON.",
  ];
  if (deskLane === "sis") {
    return [
      "This is the SIS Custom Creations Sign Party desk. Do not sell Atlas, Front Desk, AFE plans, or auto-call.",
      "First line is the center, program, or city. Never write Hi there.",
      "Subject in sentence case, specific, like Sign party for {Center} kids.",
      "Plain offer: we bring supplies on-site, kids paint, they take a project home. 'Kids' here is the activity, not a named child.",
      "One ask: ages, headcount, and Saturday morning vs weekday afternoon.",
      "About 60 to 110 words. Sign-off is the exact close string (Deleana and Manny, both phones, siscustomcreationstx@gmail.com).",
      ...shared,
    ].join("\n");
  }
  if (deskLane === "afe") {
    return [
      "This is the Atlas For Entrepreneurs desk. Do not use SIS Custom Creations voice, Sign Party copy, or Deleana's number.",
      "First line is their trade or city. Never write Hi there.",
      "Pain: leads dying between the first call and the follow-up.",
      "Offer: leads on the desk, a drafted follow-up, and owner Approve. The human keeps the customer.",
      "One ask: Tuesday or Wednesday 15 minutes, OR send a sample follow-up.",
      "Do not claim live Front Desk or auto-call. Do not quote BASIC $99, GROW $249, or UNLIMITED $499 unless the JSON says they asked.",
      ...shared,
    ].join("\n");
  }
  return [
    "Write as Amanda, outreach for the owner's business. The prospect is the reader.",
    "3 to 6 short plain-text lines. No opt-out lecture.",
    ...shared,
  ].join("\n");
}

export function amandaComposeAiInput(input: NextMessageInput, close: string) {
  const deskLane = messageDeskLane(input);
  return {
    spanish: input.spanish,
    deskLane,
    ownerFirstName: input.ownerFirstName,
    businessName: input.businessName,
    trade: String(input.trade ?? "").trim() || null,
    city: String(input.city ?? "").trim() || null,
    ownerPhone: input.ownerPhone,
    extraPhones: (input.contactLines ?? []).map((line) => line.phone).filter(Boolean),
    prospectName: input.prospectName,
    prospectCompany: input.prospectCompany,
    prospectType: String(input.prospectType ?? "").replaceAll("_", " ").trim() || null,
    close,
  };
}

function textIsSafe(text: string, input: NextMessageInput, close: string) {
  const lane = messageDeskLane(input);
  if (COACH_COPY.test(text)) return false;
  if (MARKDOWN_OR_EMOJI.test(text)) return false;
  if (PERSONAL_FAMILY.test(text) && !PERSONAL_FAMILY.test(input.notesText)) return false;
  if (lane !== "sis" && PERSONAL_KID.test(text) && !PERSONAL_KID.test(input.notesText)) return false;
  if (lane === "sis" && ATLAS_SELL.test(text)) return false;
  if (lane === "afe" && SIS_SIGN_PARTY.test(text)) return false;
  if (!text.includes(close.split(".")[0] ?? "Amanda")) return false;
  const allowed = allowedFounderPhoneDigits(input).join("");
  for (const phone of phonesIn(text)) {
    if (!allowed || !allowed.includes(phone.slice(-7))) return false;
  }
  if (/https?:\/\//i.test(text)) return false;
  return true;
}

export function nextMessageFromAiDraft(
  input: NextMessageInput,
  draft: AmandaComposeAiDraft,
): NextMessageResult | null {
  if (!hasSafeBusinessProfile(input)) return null;
  const close = firstTouchClose(input);
  const wrap = (text: string) => {
    const trimmed = text.trim();
    return trimmed.includes(close) ? trimmed : `${trimmed}\n\n${close}`.trim();
  };
  const body = wrap(draft.body);
  const shorter = wrap(draft.shorter);
  const softer = wrap(draft.softer);
  const askYes = wrap(draft.askYes);
  const extra: [string, string] = [wrap(draft.extra1), wrap(draft.extra2)];
  const texts = [body, shorter, softer, askYes, extra[0], extra[1]];
  if (texts.some((text) => !textIsSafe(text, input, close))) return null;
  if (new Set(texts).size < 5) return null;
  return {
    job: "first_touch",
    jobLabel: input.spanish ? "Primer saludo" : "First hello",
    subject: draft.subject.slice(0, 140),
    body,
    variants: { shorter, softer, askYes, extra },
    aiEligible: true,
    profile: {
      ownerFirstName: String(input.ownerFirstName ?? "").trim().split(/\s+/)[0] ?? "",
      businessName: input.businessName.trim(),
      ownerPhone: String(input.ownerPhone ?? "").trim() || null,
      contactLines: input.contactLines,
      trade: usableTrade(input.trade),
      city: String(input.city ?? "").trim(),
      prospectCompany: String(input.prospectCompany ?? "").trim(),
      prospectType: String(input.prospectType ?? "").replaceAll("_", " ").trim(),
      notesThin: notesAreThin(input.notesText),
    },
  };
}
