"use server";

import { generateStructuredText } from "@/server/integrations/openai-responses";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "@/server/integrations/errors";

type AtlasChatResponse = {
  answer: string;
  nextSteps: string[];
  followUpQuestion: string;
};

const atlasChatSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "nextSteps", "followUpQuestion"],
  properties: {
    answer: { type: "string", minLength: 20, maxLength: 500 },
    nextSteps: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string", minLength: 4, maxLength: 100 },
    },
    followUpQuestion: { type: "string", minLength: 5, maxLength: 140 },
  },
} as const;

function parseAtlasChatResponse(value: unknown): AtlasChatResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid");
  }

  const candidate = value as {
    answer?: unknown;
    nextSteps?: unknown;
    followUpQuestion?: unknown;
  };

  if (
    typeof candidate.answer !== "string" ||
    candidate.answer.trim().length < 20 ||
    !Array.isArray(candidate.nextSteps) ||
    candidate.nextSteps.length < 2 ||
    candidate.nextSteps.length > 2 ||
    typeof candidate.followUpQuestion !== "string" ||
    candidate.followUpQuestion.trim().length < 5
  ) {
    throw new Error("invalid");
  }

  const nextSteps = candidate.nextSteps.map((item) => {
    if (typeof item !== "string" || item.trim().length < 4) {
      throw new Error("invalid");
    }
    return item.trim();
  });

  return {
    answer: candidate.answer.trim(),
    nextSteps,
    followUpQuestion: candidate.followUpQuestion.trim(),
  };
}

export async function askAtlasPreview(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!prompt) {
    return {
      ok: false,
      error: "Type a question for Atlas.",
    } as const;
  }

  if (prompt.length > 800) {
    return {
      ok: false,
      error: "Keep it under 800 characters.",
    } as const;
  }

  try {
    const result = await generateStructuredText({
      schemaName: "atlas_homepage_chat_response",
      schema: atlasChatSchema,
      maxOutputTokens: 450,
      instructions:
        "You are Atlas, a practical business GPT for owner-led local service businesses. Be concise, useful, and grounded. Help the user think about what Atlas could build, organize, or improve. Keep the reply short. Never claim to have already done work. Never mention policy. Do not use markdown tables. Return only the requested JSON.",
      input: JSON.stringify({
        userPrompt: prompt,
        context:
          "Atlas helps owners gather business data, organize leads, draft follow-up, and prepare simple marketing. It is approval-controlled and built for practical business use.",
      }),
      parse: parseAtlasChatResponse,
    });

    return {
      ok: true,
      response: result.value,
    } as const;
  } catch (error) {
    if (error instanceof IntegrationConfigurationError) {
      return {
        ok: false,
        error:
          "OpenAI is not configured in the server runtime. Restart npm run dev after checking OPENAI_API_KEY.",
      } as const;
    }

    if (error instanceof IntegrationRequestError) {
      const hint =
        error.code === "incomplete_response"
          ? " The model likely hit its output limit."
          : "";
      return {
        ok: false,
        error: `OpenAI request failed (${error.code}). Check model access or try again.${hint}`,
      } as const;
    }

    console.error("Atlas chat failed", error);
    return {
      ok: false,
      error: "Atlas is not ready right now. Try again in a moment.",
    } as const;
  }
}
