"use server";

import { requireSuperAdmin } from "@/server/auth/guards";
import { generateStructuredText } from "@/server/integrations/openai-responses";
import { IntegrationConfigurationError, IntegrationRequestError } from "@/server/integrations/errors";
import { getSalesProspects } from "@/server/sales/queries";

export type SalesAiState = {
  status: "idle" | "success" | "error";
  answer: string | null;
  error: string | null;
};

export const initialSalesAiState: SalesAiState = {
  status: "idle",
  answer: null,
  error: null,
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: {
    answer: { type: "string", minLength: 10, maxLength: 1800 },
  },
} as const;

export async function askSalesAssistant(
  _previousState: SalesAiState,
  formData: FormData,
): Promise<SalesAiState> {
  await requireSuperAdmin("/lions-den/sales");
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (prompt.length < 2) {
    return { status: "error", answer: null, error: "Ask a specific CRM question." };
  }

  if (prompt.length > 1200) {
    return { status: "error", answer: null, error: "Keep the question under 1,200 characters." };
  }

  const prospects = await getSalesProspects();
  const context = prospects.data.map((prospect) => ({
    business: prospect.businessName,
    stage: prospect.status,
    owner: prospect.assignedRole,
    nextAction: prospect.nextAction,
    due: prospect.nextActionAt,
    fit: prospect.fitScore,
  }));

  try {
    const result = await generateStructuredText({
      schemaName: "atlas_sales_assistant_response",
      schema: responseSchema,
      maxOutputTokens: 900,
      instructions: [
        "You are the read-only ChatGPT assistant inside Atlas Sales Command.",
        "Use only the supplied CRM context. Never invent contacts, events, timing, results, or commitments.",
        "Do not send outreach, schedule anything, change records, or claim an action was completed.",
        "Give concise, practical guidance and identify missing information when needed.",
        "Return only JSON.",
      ].join("\n"),
      input: JSON.stringify({ userQuestion: prompt, crm: context }),
      parse: (value) => {
        if (!value || typeof value !== "object" || !("answer" in value)) throw new Error("invalid");
        const answer = String((value as { answer: unknown }).answer).trim();
        if (answer.length < 10 || answer.length > 1800) throw new Error("invalid");
        return { answer };
      },
    });

    return { status: "success", answer: result.value.answer, error: null };
  } catch (error) {
    const message = error instanceof IntegrationConfigurationError
      ? "The CRM assistant is not configured in the server runtime yet."
      : error instanceof IntegrationRequestError
        ? `The assistant request failed (${error.code}).`
        : "The assistant could not answer that question right now.";
    return { status: "error", answer: null, error: message };
  }
}
