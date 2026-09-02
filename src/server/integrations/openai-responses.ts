import { env } from "node:process";

import OpenAI, { APIError, APIConnectionError, NotFoundError } from "openai";

import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "./errors.ts";
import { isOpenAIConfigured } from "./openai-gateway.ts";
import { getOpenAIModel } from "./server-env.ts";

const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 1_200;

export const MAX_OPENAI_OUTPUT_TOKENS = 4_000;
export const MAX_OPENAI_INPUT_CHARACTERS = 50_000;
export const MAX_OPENAI_INSTRUCTIONS_CHARACTERS = 12_000;
export const MAX_OPENAI_SCHEMA_CHARACTERS = 30_000;

export type JsonSchema = Record<string, unknown>;

/** OpenAI structured outputs (strict json_schema) reject these keywords. */
const UNSUPPORTED_JSON_SCHEMA_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
  "uniqueItems",
]);

export function openaiCompatibleJsonSchema(schema: JsonSchema): JsonSchema {
  return stripUnsupportedJsonSchemaKeywords(schema) as JsonSchema;
}

function stripUnsupportedJsonSchemaKeywords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedJsonSchemaKeywords);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (UNSUPPORTED_JSON_SCHEMA_KEYWORDS.has(key)) continue;
    result[key] = stripUnsupportedJsonSchemaKeywords(child);
  }
  return result;
}

export type OpenAIUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

export type OpenAIStructuredTextRequest<T> = {
  schemaName: string;
  schema: JsonSchema;
  instructions: string;
  input: string;
  parse: (value: unknown) => T;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  fetchImplementation?: typeof fetch;
};

export type OpenAIStructuredTextResult<T> = {
  value: T;
  model: string;
  responseId: string | null;
  usage: OpenAIUsage;
};

type OpenAIResponsePayload = {
  id?: unknown;
  model?: unknown;
  status?: unknown;
  output?: unknown;
  output_text?: unknown;
  usage?: unknown;
};

function invalidRequest(): never {
  throw new IntegrationRequestError("openai", "invalid_request");
}

function normalizeTokenCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function normalizeUsage(value: unknown): OpenAIUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
      totalTokens: null,
    };
  }

  const usage = value as {
    input_tokens?: unknown;
    prompt_tokens?: unknown;
    input_tokens_details?: unknown;
    output_tokens?: unknown;
    completion_tokens?: unknown;
    output_tokens_details?: unknown;
    total_tokens?: unknown;
  };
  const inputDetails =
    usage.input_tokens_details &&
    typeof usage.input_tokens_details === "object" &&
    !Array.isArray(usage.input_tokens_details)
      ? (usage.input_tokens_details as { cached_tokens?: unknown })
      : {};
  const outputDetails =
    usage.output_tokens_details &&
    typeof usage.output_tokens_details === "object" &&
    !Array.isArray(usage.output_tokens_details)
      ? (usage.output_tokens_details as { reasoning_tokens?: unknown })
      : {};

  return {
    inputTokens: normalizeTokenCount(usage.input_tokens ?? usage.prompt_tokens),
    cachedInputTokens: normalizeTokenCount(inputDetails.cached_tokens),
    outputTokens: normalizeTokenCount(usage.output_tokens ?? usage.completion_tokens),
    reasoningTokens: normalizeTokenCount(outputDetails.reasoning_tokens),
    totalTokens: normalizeTokenCount(usage.total_tokens),
  };
}

function getOutputText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  const textParts: string[] = [];

  for (const item of payload.output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object" || Array.isArray(part)) {
        continue;
      }

      const typedPart = part as {
        type?: unknown;
        text?: unknown;
      };

      if (typedPart.type === "refusal") {
        throw new IntegrationRequestError("openai", "refused");
      }

      if (
        typedPart.type === "output_text" &&
        typeof typedPart.text === "string"
      ) {
        textParts.push(typedPart.text);
      }
    }
  }

  const outputText = textParts.join("").trim();
  return outputText || null;
}

function normalizeRequest<T>(request: OpenAIStructuredTextRequest<T>) {
  const schemaName = request.schemaName.trim();
  const instructions = request.instructions.trim();
  const input = request.input.trim();
  const maxOutputTokens =
    request.maxOutputTokens ?? DEFAULT_OPENAI_MAX_OUTPUT_TOKENS;

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(schemaName)) {
    invalidRequest();
  }

  if (
    !instructions ||
    instructions.length > MAX_OPENAI_INSTRUCTIONS_CHARACTERS ||
    !input ||
    input.length > MAX_OPENAI_INPUT_CHARACTERS ||
    !Number.isInteger(maxOutputTokens) ||
    maxOutputTokens < 1 ||
    maxOutputTokens > MAX_OPENAI_OUTPUT_TOKENS ||
    !request.schema ||
    typeof request.schema !== "object" ||
    Array.isArray(request.schema) ||
    typeof request.parse !== "function"
  ) {
    invalidRequest();
  }

  let serializedSchema: string;
  try {
    serializedSchema = JSON.stringify(request.schema);
  } catch {
    invalidRequest();
  }

  if (serializedSchema.length > MAX_OPENAI_SCHEMA_CHARACTERS) {
    invalidRequest();
  }

  return {
    schemaName,
    schema: request.schema,
    instructions,
    input,
    maxOutputTokens,
  };
}

function assertOpenAIConfigured() {
  if (typeof window !== "undefined") {
    throw new Error("Server integration modules cannot run in a browser.");
  }

  if (!isOpenAIConfigured(env.OPENAI_API_KEY)) {
    throw new IntegrationConfigurationError("openai", "OPENAI_API_KEY");
  }
}

function createGatewayOpenAIClient(fetchImplementation?: typeof fetch) {
  assertOpenAIConfigured();

  try {
    // Bare client: Netlify AI Gateway injects OPENAI_API_KEY + OPENAI_BASE_URL.
    // Never pass apiKey or baseURL — a user-set key disables gateway injection.
    return fetchImplementation
      ? new OpenAI({ fetch: fetchImplementation })
      : new OpenAI();
  } catch {
    throw new IntegrationConfigurationError("openai", "OPENAI_API_KEY");
  }
}

function throwMappedOpenAIError(error: unknown): never {
  if (
    error instanceof IntegrationConfigurationError ||
    error instanceof IntegrationRequestError
  ) {
    throw error;
  }

  if (error instanceof APIConnectionError) {
    throw new IntegrationRequestError("openai", "network_error", {
      status: null,
      retryable: true,
    });
  }

  if (error instanceof APIError) {
    throw new IntegrationRequestError("openai", "provider_error", {
      status: error.status ?? null,
      retryable: error.status === 429 || (error.status ?? 0) >= 500,
    });
  }

  throw new IntegrationRequestError("openai", "network_error", {
    status: null,
    retryable: true,
  });
}

function parseStructuredOutput<T>(
  outputText: string | null,
  parse: (value: unknown) => T,
): T {
  if (!outputText) {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(outputText);
  } catch {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  try {
    return parse(parsedValue);
  } catch {
    throw new IntegrationRequestError("openai", "output_validation_failed");
  }
}

function responsesBody(input: {
  model: string;
  schemaName: string;
  schema: JsonSchema;
  instructions: string;
  prompt: string;
  maxOutputTokens: number;
}) {
  return {
    model: input.model,
    instructions: input.instructions,
    input: input.prompt,
    max_output_tokens: input.maxOutputTokens,
    store: false,
    background: false,
    truncation: "disabled" as const,
    text: {
      format: {
        type: "json_schema" as const,
        name: input.schemaName,
        strict: true,
        schema: openaiCompatibleJsonSchema(input.schema),
      },
    },
  };
}

async function generateViaChatCompletions<T>(
  client: OpenAI,
  input: {
    model: string;
    schemaName: string;
    schema: JsonSchema;
    instructions: string;
    prompt: string;
    maxOutputTokens: number;
    parse: (value: unknown) => T;
    signal?: AbortSignal;
  },
): Promise<OpenAIStructuredTextResult<T>> {
  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>;

  try {
    completion = await client.chat.completions.create(
      {
        model: input.model,
        messages: [
          { role: "system", content: input.instructions },
          { role: "user", content: input.prompt },
        ],
        max_completion_tokens: input.maxOutputTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            strict: true,
            schema: openaiCompatibleJsonSchema(input.schema),
          },
        },
      },
      { signal: input.signal },
    );
  } catch (error) {
    throwMappedOpenAIError(error);
  }

  const outputText =
    completion.choices[0]?.message?.content?.trim() ||
    (typeof (completion as { output_text?: unknown }).output_text === "string"
      ? String((completion as { output_text?: string }).output_text).trim()
      : null);

  return {
    value: parseStructuredOutput(outputText, input.parse),
    model: completion.model || input.model,
    responseId: completion.id ?? null,
    usage: normalizeUsage(completion.usage),
  };
}

export async function generateStructuredText<T>(
  request: OpenAIStructuredTextRequest<T>,
): Promise<OpenAIStructuredTextResult<T>> {
  const normalized = normalizeRequest(request);
  const configuredModel = getOpenAIModel();
  const client = createGatewayOpenAIClient(request.fetchImplementation);
  const body = responsesBody({
    model: configuredModel,
    schemaName: normalized.schemaName,
    schema: normalized.schema,
    instructions: normalized.instructions,
    prompt: normalized.input,
    maxOutputTokens: normalized.maxOutputTokens,
  });

  async function attempt(maxOutputTokens: number): Promise<OpenAIStructuredTextResult<T>> {
    const attemptBody = {
      ...body,
      max_output_tokens: maxOutputTokens,
    };

    try {
      const response = await client.responses.create(attemptBody, {
        signal: request.signal,
      });
      const payload = response as OpenAIResponsePayload;

      if (payload.status === "incomplete") {
        throw new IntegrationRequestError("openai", "incomplete_response");
      }

      if (
        typeof payload.status === "string" &&
        payload.status !== "completed"
      ) {
        throw new IntegrationRequestError("openai", "invalid_response");
      }

      return {
        value: parseStructuredOutput(getOutputText(payload), request.parse),
        model: typeof payload.model === "string" ? payload.model : configuredModel,
        responseId: typeof payload.id === "string" ? payload.id : null,
        usage: normalizeUsage(payload.usage),
      };
    } catch (error) {
      if (
        error instanceof IntegrationConfigurationError ||
        error instanceof IntegrationRequestError
      ) {
        throw error;
      }

      if (error instanceof NotFoundError) {
        return generateViaChatCompletions(client, {
          model: configuredModel,
          schemaName: normalized.schemaName,
          schema: normalized.schema,
          instructions: normalized.instructions,
          prompt: normalized.input,
          maxOutputTokens,
          parse: request.parse,
          signal: request.signal,
        });
      }

      throwMappedOpenAIError(error);
    }
  }

  try {
    return await attempt(normalized.maxOutputTokens);
  } catch (error) {
    if (
      error instanceof IntegrationRequestError &&
      error.code === "incomplete_response" &&
      normalized.maxOutputTokens < MAX_OPENAI_OUTPUT_TOKENS
    ) {
      return await attempt(MAX_OPENAI_OUTPUT_TOKENS);
    }

    throw error;
  }
}

export { openAIResponsesUrl } from "./openai-gateway.ts";
