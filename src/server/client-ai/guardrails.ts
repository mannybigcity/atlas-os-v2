import path from "node:path";

export type ClientAiRole = "atlas" | "hunter" | "micah" | "david";

export type ClientAiRoleSpec = {
  role: ClientAiRole;
  label: string;
  title: string;
  summary: string;
  promptHint: string;
  markdownPath: string;
};

export type ClientAiRouteDecision = {
  role: ClientAiRole;
  routedTo: ClientAiRole | null;
  scopeStatus: "in_scope" | "needs_input" | "rerouted" | "declined";
  reason: string | null;
  blocked: boolean;
};

const roleKeywordSets: Record<ClientAiRole, string[]> = {
  atlas: [
    "priority",
    "plan",
    "coordinate",
    "coordination",
    "next move",
    "missing input",
    "approval",
    "workflow",
  ],
  hunter: [
    "google places",
    "local business",
    "local businesses",
    "find prospects",
    "find leads",
    "prospect",
    "prospects",
    "lead",
    "leads",
    "hunter",
    "research",
    "sponsor",
    "sponsors",
    "partner",
    "partners",
    "venue",
    "venues",
  ],
  micah: [
    "social",
    "pic",
    "pics",
    "picture",
    "flyer",
    "flyers",
    "post",
    "posts",
    "image",
    "images",
    "caption",
    "captions",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
    "content",
    "creative",
    "draft",
    "drafts",
    "visual",
    "micah",
  ],
  david: [
    "crm",
    "follow-up",
    "follow up",
    "followup",
    "pipeline",
    "notes",
    "history",
    "next step",
    "next action",
    "what's next",
    "whats next",
    "sale",
    "sales",
    "david",
  ],
};

const blockedPatterns = [
  "publish",
  "send email",
  "send text",
  "send message",
  "publish post",
  "post live",
  "call lead",
  "contact lead",
  "browse",
  "scrape",
  "crawl",
  "buy",
  "spend",
  "make payment",
  "send invoice",
  "invoice",
  "payment",
  "credential",
  "password",
  "token",
  "secret",
  "service role",
  "openai key",
  "supabase key",
];

export const clientAiRoleSpecs: ClientAiRoleSpec[] = [
  {
    role: "atlas",
    label: "Customer Relations",
    title: "Customer Relations",
    summary:
      "Manage the CRM, identify the next move, and keep approvals explicit.",
    promptHint: "Ask Customer Relations to organize the workspace or identify the next move.",
    markdownPath: path.join("docs", "client-ai", "atlas.md"),
  },
  {
    role: "hunter",
    label: "Prospect Research",
    title: "Prospect Research",
    summary:
      "Research prospects and opportunities already in the workspace and identify missing facts.",
    promptHint: "Ask Prospect Research to review prospects, fit, or lead research.",
    markdownPath: path.join("docs", "client-ai", "hunter.md"),
  },
  {
    role: "micah",
    label: "Content Manager",
    title: "Content Manager",
    summary:
      "Draft captions, content calendars, and creative direction for human review.",
    promptHint: "Ask Content Manager for draft content or content planning.",
    markdownPath: path.join("docs", "client-ai", "micah.md"),
  },
  {
    role: "david",
    label: "Follow-up Desk",
    title: "Follow-up Desk",
    summary:
      "Report on follow-up, review status, and the next action the client should see.",
    promptHint: "Ask the Follow-up Desk about CRM status, follow-up, or review queues.",
    markdownPath: path.join("docs", "client-ai", "david.md"),
  },
];

export function getClientAiRoleSpec(role: ClientAiRole) {
  return clientAiRoleSpecs.find((spec) => spec.role === role) ?? clientAiRoleSpecs[0];
}

export function isClientAiRole(value: string): value is ClientAiRole {
  return value === "atlas" || value === "hunter" || value === "micah" || value === "david";
}

function includesAny(prompt: string, keywords: string[]) {
  return keywords.some((keyword) => prompt.includes(keyword));
}

const businessKeywordSets = [
  "business",
  "client",
  "customer",
  "crm",
  "lead",
  "leads",
  "prospect",
  "prospects",
  "follow-up",
  "follow up",
  "note",
  "notes",
  "message",
  "messages",
  "appointment",
  "appointments",
  "check-in",
  "check in",
  "what's next",
  "whats next",
  "pipeline",
  "quote",
  "quotes",
  "estimate",
  "estimates",
  "service",
  "services",
  "sales",
  "sale",
  "content",
  "campaign",
  "post",
  "posts",
  "account",
  "accounts",
  "revenue",
];

export function isBusinessRelevantPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  return includesAny(normalized, businessKeywordSets);
}

export function looksLikeHunterSearch(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;
  if (/\b\d{5}\b/.test(normalized) && /\b(find|search|look\s*up|places|business)/.test(normalized)) {
    return true;
  }
  return /\b(find|search|look\s*up)\b.+\b(in|near|around)\s+(?!the\b|this\b|my\b|our\b)/.test(
    normalized,
  );
}

export function detectSpecialistLane(prompt: string): ClientAiRole | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return null;
  if (includesAny(normalized, roleKeywordSets.micah)) return "micah";
  if (looksLikeHunterSearch(normalized) || includesAny(normalized, roleKeywordSets.hunter)) {
    return "hunter";
  }
  if (includesAny(normalized, roleKeywordSets.david)) return "david";
  return null;
}

export function isMicahCreatePrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;
  if (/(summarize|list|show|how many|what(?:'s| is) in).*(draft|micah|gallery)/.test(normalized)) {
    return false;
  }
  return includesAny(normalized, [
    "social",
    "pic",
    "pics",
    "picture",
    "flyer",
    "flyers",
    "post",
    "posts",
    "image",
    "images",
    "caption",
    "captions",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
    "create",
    "make",
    "design",
    "draft",
    "graphic",
  ]);
}

export function isHunterFindPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;
  if (/(who|what(?:'s| is)|show|summarize|list).*(pile|hunter)/.test(normalized)) {
    return false;
  }
  return (
    looksLikeHunterSearch(normalized) ||
    includesAny(normalized, [
      "google places",
      "local business",
      "local businesses",
      "find prospects",
      "find leads",
    ]) ||
    (/\b(find|search|look\s*up)\b/.test(normalized) &&
      includesAny(normalized, ["prospect", "prospects", "lead", "leads", "business", "businesses", "hunter"]))
  );
}

export function decideClientAiRoute(input: {
  role: ClientAiRole;
  prompt: string;
}): ClientAiRouteDecision {
  const prompt = input.prompt.trim().toLowerCase();
  const requestedRole = input.role;

  if (!prompt) {
    return {
      role: requestedRole,
      routedTo: null,
      scopeStatus: "needs_input",
      reason: "Type a question before sending it to a role.",
      blocked: true,
    };
  }

  if (blockedPatterns.some((pattern) => prompt.includes(pattern))) {
    return {
      role: requestedRole,
      routedTo: "atlas",
      scopeStatus: "declined",
      reason:
        "That request asks the workspace team to take an external or credentialed action, which is not allowed here.",
      blocked: true,
    };
  }

  const lane = detectSpecialistLane(prompt);

  if (requestedRole === "atlas") {
    if (lane) {
      return {
        role: requestedRole,
        routedTo: lane,
        scopeStatus: "rerouted",
        reason: `Atlas sent this to ${lane.toUpperCase()}.`,
        blocked: false,
      };
    }
    return {
      role: requestedRole,
      routedTo: null,
      scopeStatus: "in_scope",
      reason: null,
      blocked: false,
    };
  }

  if (lane && lane !== requestedRole) {
    return {
      role: requestedRole,
      routedTo: lane,
      scopeStatus: "rerouted",
      reason: `Atlas sent this to ${lane.toUpperCase()}.`,
      blocked: false,
    };
  }

  return {
    role: requestedRole,
    routedTo: null,
    scopeStatus: "in_scope",
    reason: null,
    blocked: false,
  };
}
