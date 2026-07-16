"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
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

type AtlasChatTurnFinalization = {
  turnId: string;
  response: Record<string, unknown>;
  model: string | null;
  response_id: string | null;
  status: "succeeded" | "blocked" | "failed";
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  estimated_cost_microusd: number;
  error_code: string | null;
  metadata: Record<string, unknown>;
};

type ChatReservation = {
  allowed: boolean;
  turnId: string | null;
  remaining: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizePagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  if (trimmed.length > 200) return "/";
  if (!trimmed.startsWith("/")) return "/";
  return trimmed;
}

function estimateMicrousd(
  model: string,
  usage: {
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
  },
) {
  if (model !== "gpt-5-mini" && !model.startsWith("gpt-5-mini-")) {
    return 0;
  }

  const input = usage.inputTokens ?? 0;
  const cached = Math.min(usage.cachedInputTokens ?? 0, input);
  const output = usage.outputTokens ?? 0;

  return Math.round((input - cached) * 0.25 + cached * 0.025 + output * 2);
}

async function getServerChatSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("atlas_preview_server_session")?.value ?? "";

  if (isUuid(existing)) {
    return existing;
  }

  const sessionId = randomUUID();
  cookieStore.set("atlas_preview_server_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return sessionId;
}

async function reservePublicChatTurn(input: {
  sessionId: string;
  pagePath: string;
  prompt: string;
}): Promise<ChatReservation> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_atlas_public_chat_turn", {
    p_session_id: input.sessionId,
    p_page_path: input.pagePath,
    p_prompt: input.prompt,
  });

  if (error) {
    console.error("Failed to reserve public Atlas chat turn", error);
    throw new Error("chat_reservation_failed");
  }

  const reservation = data as {
    allowed?: unknown;
    turn_id?: unknown;
    remaining?: unknown;
  } | null;

  return {
    allowed: reservation?.allowed === true,
    turnId: typeof reservation?.turn_id === "string" ? reservation.turn_id : null,
    remaining:
      typeof reservation?.remaining === "number"
        ? Math.max(0, reservation.remaining)
        : 0,
  };
}

async function finalizePublicChatTurn(turn: AtlasChatTurnFinalization) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_atlas_public_chat_turn", {
    p_turn_id: turn.turnId,
    p_response: turn.response,
    p_model: turn.model,
    p_response_id: turn.response_id,
    p_status: turn.status,
    p_input_tokens: turn.input_tokens,
    p_cached_input_tokens: turn.cached_input_tokens,
    p_output_tokens: turn.output_tokens,
    p_reasoning_tokens: turn.reasoning_tokens,
    p_estimated_cost_microusd: turn.estimated_cost_microusd,
    p_error_code: turn.error_code,
    p_metadata: turn.metadata,
  });

  if (error) {
    console.error("Failed to finalize public Atlas chat turn", error);
  }
}

export async function askAtlasPreview(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const pagePath = normalizePagePath(String(formData.get("pagePath") ?? ""));

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

  const sessionId = await getServerChatSessionId();
  let reservation: ChatReservation;

  try {
    reservation = await reservePublicChatTurn({ sessionId, pagePath, prompt });
  } catch {
    return {
      ok: false,
      error: "Atlas preview is being updated. Please try again shortly.",
    } as const;
  }

  if (!reservation.allowed || !reservation.turnId) {
    return {
      ok: false,
      error:
        "Your free preview is complete. Start the free assessment so Atlas can build a plan around your business.",
      assessmentCta: true,
      remaining: 0,
    } as const;
  }

  try {
    const result = await generateStructuredText({
      schemaName: "atlas_homepage_chat_response",
      schema: atlasChatSchema,
      maxOutputTokens: 1_200,
      instructions:
        "You are Atlas, a practical business GPT for owner-led local service businesses. Be concise, useful, and grounded. Help the user think about what Atlas could build, organize, or improve. Keep the reply short. Never claim to have already done work. Never mention policy. Do not use markdown tables. Return only the requested JSON.",
      input: JSON.stringify({
        userPrompt: prompt,
        context:
          "Atlas helps owners gather business data, organize leads, draft follow-up, and prepare simple marketing. It is approval-controlled and built for practical business use.",
      }),
      parse: parseAtlasChatResponse,
    });

    await finalizePublicChatTurn({
      turnId: reservation.turnId,
      response: result.value,
      model: result.model,
      response_id: result.responseId,
      status: "succeeded",
      input_tokens: result.usage.inputTokens ?? 0,
      cached_input_tokens: result.usage.cachedInputTokens ?? 0,
      output_tokens: result.usage.outputTokens ?? 0,
      reasoning_tokens: result.usage.reasoningTokens ?? 0,
      estimated_cost_microusd: estimateMicrousd(result.model, {
        inputTokens: result.usage.inputTokens,
        cachedInputTokens: result.usage.cachedInputTokens,
        outputTokens: result.usage.outputTokens,
      }),
      error_code: null,
      metadata: {
        chat_surface: "homepage",
        prompt_length: prompt.length,
      },
    });

    return {
      ok: true,
      response: result.value,
      remaining: reservation.remaining,
    } as const;
  } catch (error) {
    const isOpenAIError =
      error instanceof IntegrationConfigurationError ||
      error instanceof IntegrationRequestError;

    await finalizePublicChatTurn({
      turnId: reservation.turnId,
      response: {},
      model:
        error instanceof IntegrationRequestError || error instanceof IntegrationConfigurationError
          ? "openai"
          : null,
      response_id: null,
      status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      estimated_cost_microusd: 0,
      error_code:
        error instanceof IntegrationConfigurationError
          ? error.code
          : error instanceof IntegrationRequestError
            ? error.code
            : "unknown_error",
      metadata: {
        chat_surface: "homepage",
        prompt_length: prompt.length,
        openai_error: isOpenAIError,
        provider_status:
          error instanceof IntegrationRequestError
            ? error.options.status
            : null,
        retryable:
          error instanceof IntegrationRequestError
            ? error.options.retryable
            : false,
      },
    });

    if (error instanceof IntegrationConfigurationError) {
      return {
        ok: false,
        error:
          "OpenAI is not configured in the server runtime. Restart npm run dev after checking OPENAI_API_KEY.",
        remaining: reservation.remaining,
      } as const;
    }

    if (error instanceof IntegrationRequestError) {
      console.error("Atlas OpenAI request failed", {
        code: error.code,
        status: error.options.status,
        retryable: error.options.retryable,
      });

      const message =
        error.options.status === 401
          ? "OpenAI rejected the API key configured in Netlify. Replace OPENAI_API_KEY and redeploy."
          : error.options.status === 403
            ? "The OpenAI project does not have access to the configured model."
            : error.options.status === 429
              ? "The OpenAI account reached a billing or rate limit. Check OpenAI billing and usage limits."
              : error.options.status === 400
                ? "OpenAI rejected the request configuration. Confirm OPENAI_MODEL is gpt-5-mini."
                : error.code === "incomplete_response"
                  ? "That's the end of this free Atlas preview. Start the free assessment so Atlas can learn about your business and prepare a more focused next step."
                  : `OpenAI request failed (${error.code}, status ${error.options.status ?? "unknown"}).`;
      return {
        ok: false,
        error: message,
        assessmentCta: error.code === "incomplete_response",
        remaining: reservation.remaining,
      } as const;
    }

    console.error("Atlas chat failed", error);
    return {
      ok: false,
      error: "Atlas is not ready right now. Try again in a moment.",
      remaining: reservation.remaining,
    } as const;
  }
}
