import {
  isHunterFindPrompt,
  isMicahCreatePrompt,
  type ClientAiRole,
} from "../../server/client-ai/guardrails.ts";

export type AtlasDeskNextHref =
  | "/client/micah"
  | "/client/prospects"
  | "/client/david"
  | "/client/calendar"
  | "/client/notes";

function includesAny(prompt: string, keywords: string[]) {
  return keywords.some((keyword) => prompt.includes(keyword));
}

export function atlasDeskNextHref(input: {
  prompt: string;
  routedTo: ClientAiRole | null;
  status: "idle" | "success" | "blocked" | "failed";
  scopeStatus?: "in_scope" | "needs_input" | "rerouted" | "declined";
}): AtlasDeskNextHref | null {
  if (input.status === "idle" || input.status === "failed") return null;
  if (input.scopeStatus === "declined") return null;

  const prompt = input.prompt.trim().toLowerCase();
  if (!prompt) return null;

  const micahWork =
    input.routedTo === "micah" || isMicahCreatePrompt(input.prompt);
  if (micahWork) {
    if (input.status === "success" || input.scopeStatus === "needs_input") {
      return "/client/micah";
    }
    return null;
  }

  const hunterWork =
    input.routedTo === "hunter" || isHunterFindPrompt(input.prompt);
  if (hunterWork) {
    if (input.status === "success") return "/client/prospects";
    return null;
  }

  if (includesAny(prompt, ["calendar", "appointment", "appointments", "schedule"])) {
    return "/client/calendar";
  }

  if (/\bnotes?\b/.test(prompt) && !includesAny(prompt, ["follow-up", "follow up", "due today"])) {
    return "/client/notes";
  }

  if (
    input.routedTo === "david" ||
    includesAny(prompt, ["follow-up", "follow up", "followup", "due today"])
  ) {
    return "/client/david";
  }

  return null;
}
