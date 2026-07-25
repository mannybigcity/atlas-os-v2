import type { ClientAiRole } from "@/server/client-ai/guardrails";

export type ClientAiResponse = {
  answer: string;
  nextStep: string;
  missingInputs: string[];
};

export type ClientAiActionState = {
  status: "idle" | "success" | "blocked" | "failed";
  role: ClientAiRole;
  routedTo: ClientAiRole | null;
  scopeStatus: "in_scope" | "needs_input" | "rerouted" | "declined";
  requestId: string | null;
  createdAt: string | null;
  answer: string | null;
  nextStep: string | null;
  missingInputs: string[];
  error: string | null;
};

export const initialClientAiActionState: ClientAiActionState = {
  status: "idle",
  role: "atlas",
  routedTo: null,
  scopeStatus: "in_scope",
  requestId: null,
  createdAt: null,
  answer: null,
  nextStep: null,
  missingInputs: [],
  error: null,
};

