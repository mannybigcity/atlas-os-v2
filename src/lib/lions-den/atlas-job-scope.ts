const JOB_KEYWORDS = [
  "business",
  "client",
  "customer",
  "crm",
  "desk",
  "lion",
  "lions den",
  "lion's den",
  "pipeline",
  "prospect",
  "prospects",
  "lead",
  "leads",
  "follow-up",
  "follow up",
  "followup",
  "hunter",
  "micah",
  "calendar",
  "note",
  "notes",
  "draft",
  "drafts",
  "caption",
  "captions",
  "pile",
  "quote",
  "quotes",
  "estimate",
  "appointment",
  "appointments",
  "opportunity",
  "opportunities",
  "next action",
  "next step",
  "what's next",
  "whats next",
  "check-in",
  "check in",
  "content",
  "campaign",
  "post",
  "posts",
  "pic",
  "picture",
  "flyer",
  "social",
  "image",
  "instagram",
  "facebook",
  "google places",
  "review",
  "queue",
  "workspace",
  "satisfaction",
  "satisfied",
];

const TRIVIA_PATTERNS = [
  "who won",
  "who is the president",
  "capital of",
  "weather",
  "stock price",
  "latest news",
  "tell me a joke",
  "write a poem",
  "meaning of life",
  "super bowl",
  "world series",
  "google that",
  "search google",
  "ask grok",
];

export const ATLAS_OFF_TOPIC_REPLY =
  "I only work this desk. Ask about your pipeline, prospects, follow-up, notes, calendar, HUNTER pile, or MICAH drafts.";

export const ATLAS_OFF_TOPIC_REPLY_ES =
  "Solo trabajo en este escritorio. Pregunta por tu pipeline, prospectos, seguimiento, notas, calendario, la pila de HUNTER o los borradores de MICAH.";

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function isLionDenJobPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;
  if (includesAny(normalized, TRIVIA_PATTERNS) && !includesAny(normalized, JOB_KEYWORDS)) {
    return false;
  }
  if (
    (/\b\d{5}\b/.test(normalized) && /\b(find|search|near|places|business)/.test(normalized)) ||
    /\b(find|search|look\s*up)\b.+\b(in|near|around)\s+(?!the\b|this\b|my\b|our\b)/.test(normalized)
  ) {
    return true;
  }
  return includesAny(normalized, JOB_KEYWORDS);
}
