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
    "next step",
    "missing input",
    "approval",
    "workflow",
  ],
  hunter: [
    "research",
    "prospect",
    "prospects",
    "lead",
    "leads",
    "sponsor",
    "sponsors",
    "partner",
    "partners",
    "venue",
    "venues",
    "opportunity",
    "opportunities",
  ],
  micah: [
    "caption",
    "captions",
    "copy",
    "post",
    "posts",
    "content",
    "calendar",
    "creative",
    "draft",
    "drafts",
    "visual",
  ],
  david: [
    "crm",
    "follow-up",
    "follow up",
    "pipeline",
    "report",
    "reporting",
    "status",
    "review",
    "queue",
    "next action",
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
    label: "Workspace Coordinator",
    title: "Coordinator",
    summary:
      "Coordinate the workspace, identify the next move, and keep approvals explicit.",
    promptHint: "Ask the coordinator to organize the workspace or identify the next move.",
    markdownPath: path.join("docs", "client-ai", "atlas.md"),
  },
  {
    role: "hunter",
    label: "Growth Research",
    title: "Growth Research",
    summary:
      "Research prospects and opportunities already in the workspace and identify missing facts.",
    promptHint: "Ask Growth Research to review prospects, fit, or lead research.",
    markdownPath: path.join("docs", "client-ai", "hunter.md"),
  },
  {
    role: "micah",
    label: "Content Studio",
    title: "Content Studio",
    summary:
      "Draft captions, content calendars, and creative direction for human review.",
    promptHint: "Ask Content Studio for draft content or content planning.",
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

  if (requestedRole === "atlas") {
    return {
      role: requestedRole,
      routedTo: null,
      scopeStatus: "in_scope",
      reason: null,
      blocked: false,
    };
  }

  if (includesAny(prompt, roleKeywordSets.atlas)) {
    return {
      role: requestedRole,
      routedTo: "atlas",
      scopeStatus: "rerouted",
      reason:
        "That is a coordination question, so the coordinator should handle it instead of a narrower tool.",
      blocked: false,
    };
  }

  const roleKeywords = roleKeywordSets[requestedRole];
  const matchesRequestedRole = includesAny(prompt, roleKeywords);

  if (matchesRequestedRole) {
    return {
      role: requestedRole,
      routedTo: null,
      scopeStatus: "in_scope",
      reason: null,
      blocked: false,
    };
  }

  if (includesAny(prompt, roleKeywordSets.hunter)) {
    return {
      role: requestedRole,
      routedTo: "atlas",
      scopeStatus: "rerouted",
      reason:
        "That is outside this tool's scope. Ask the coordinator to handle it or switch to the right tool.",
      blocked: false,
    };
  }

  if (includesAny(prompt, roleKeywordSets.micah)) {
    return {
      role: requestedRole,
      routedTo: "atlas",
      scopeStatus: "rerouted",
      reason:
        "That is outside this tool's scope. Ask the coordinator to handle it or switch to the right tool.",
      blocked: false,
    };
  }

  if (includesAny(prompt, roleKeywordSets.david)) {
    return {
      role: requestedRole,
      routedTo: "atlas",
      scopeStatus: "rerouted",
      reason:
        "That is outside this tool's scope. Ask the coordinator to handle it or switch to the right tool.",
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
