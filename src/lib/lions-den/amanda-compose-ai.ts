/**
 * Cost-controlled Ask Amanda first-touch: prompt + parse + safety checks.
 * Pure — zero Next or Supabase. Nothing here sends.
 */

import { allowedFounderPhoneDigits } from "./founder-contact-kit.ts";
import {
  amandaClose,
  hasSafeBusinessProfile,
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
const PERSONAL_INVENTION =
  /\b(kid|kids|hijo|hija|daughter|son|wife|husband|esposa|esposo|graduated|used to work)\b/i;
const MARKDOWN_OR_EMOJI = /[#*_`]|[\u{1F300}-\u{1FAFF}]/u;

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

export function amandaComposeAiInstructions(spanish: boolean) {
  return [
    "You draft one first-touch email the owner will read and send. Atlas never sends it.",
    "Write as Amanda, outreach for the owner's business. The prospect is the reader.",
    "Use only facts in the JSON: owner name, business name, trade, city, owner phone, extra founder phones, prospect name/company/type.",
    "Never invent a kid, job history, quote, website, or a phone that is not in ownerPhone or extraPhones.",
    "3 to 6 short plain-text lines. No markdown. No emoji. No opt-out lecture.",
    "Every sendable body must end with the exact close string provided.",
    "Variants must be real rewrites, not the same paragraph.",
    "Do not write owner-facing coach copy such as need-one-fact or 'add a note'.",
    spanish ? "Write the email in Spanish." : "Write the email in English.",
    "Return only the requested JSON.",
  ].join("\n");
}

export function amandaComposeAiInput(input: NextMessageInput, close: string) {
  return {
    spanish: input.spanish,
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
  if (COACH_COPY.test(text)) return false;
  if (MARKDOWN_OR_EMOJI.test(text)) return false;
  if (PERSONAL_INVENTION.test(text) && !PERSONAL_INVENTION.test(input.notesText)) return false;
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
  const close = amandaClose(input);
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
