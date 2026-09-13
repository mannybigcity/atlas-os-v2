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
  "call",
  "phone",
  "script",
  "talk to",
  "reach out",
  "what do i say",
  "what to say",
  "who do i call",
  "who should i call",
  "who to call",
  "call today",
  "due today",
  "follow up today",
  "follow-up today",
  "content",
  "campaign",
  "post",
  "posts",
  "pic",
  "picture",
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
  "Ask me about who to call today, what to say, what's due, or the next follow-up on this desk.";

export const ATLAS_OFF_TOPIC_REPLY_ES =
  "Pregúntame a quién llamar hoy, qué decir, qué toca hoy o el siguiente seguimiento en este escritorio.";

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function hasJobKeyword(value: string) {
  return includesAny(value, JOB_KEYWORDS) || /\bweeks?\b/.test(value);
}

export function isLionDenJobPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;
  if (includesAny(normalized, TRIVIA_PATTERNS) && !hasJobKeyword(normalized)) {
    return false;
  }
  if (
    (/\b\d{5}\b/.test(normalized) && /\b(find|search|near|places|business)/.test(normalized)) ||
    /\b(find|search|look\s*up)\b.+\b(in|near|around)\s+(?!the\b|this\b|my\b|our\b)/.test(normalized)
  ) {
    return true;
  }
  return hasJobKeyword(normalized);
}
