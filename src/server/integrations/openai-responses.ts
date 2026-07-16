import { IntegrationRequestError } from "@/server/integrations/errors";
import {
  getOpenAIModel,
  requireServerIntegrationSecret,
} from "@/server/integrations/server-env";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 1_200;

export const MAX_OPENAI_OUTPUT_TOKENS = 4_000;
export const MAX_OPENAI_INPUT_CHARACTERS = 50_000;
export const MAX_OPENAI_INSTRUCTIONS_CHARACTERS = 12_000;
export const MAX_OPENAI_SCHEMA_CHARACTERS = 30_000;

export type JsonSchema = Record<string, unknown>;

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
    input_tokens_details?: unknown;
    output_tokens?: unknown;
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
    inputTokens: normalizeTokenCount(usage.input_tokens),
    cachedInputTokens: normalizeTokenCount(inputDetails.cached_tokens),
    outputTokens: normalizeTokenCount(usage.output_tokens),
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

export async function generateStructuredText<T>(
  request: OpenAIStructuredTextRequest<T>,
): Promise<OpenAIStructuredTextResult<T>> {
  const normalized = normalizeRequest(request);
  const apiKey = requireServerIntegrationSecret("OPENAI_API_KEY");
  const configuredModel = getOpenAIModel();
  let response: Response;

  try {
    response = await (request.fetchImplementation ?? fetch)(
      OPENAI_RESPONSES_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: configuredModel,
          instructions: normalized.instructions,
          input: normalized.input,
          max_output_tokens: normalized.maxOutputTokens,
          store: false,
          background: false,
          truncation: "disabled",
          text: {
            format: {
              type: "json_schema",
              name: normalized.schemaName,
              strict: true,
              schema: normalized.schema,
            },
          },
        }),
        cache: "no-store",
        signal: request.signal,
      },
    );
  } catch {
    throw new IntegrationRequestError("openai", "network_error", {
      status: null,
      retryable: true,
    });
  }

  if (!response.ok) {
    throw new IntegrationRequestError("openai", "provider_error", {
      status: response.status,
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  const responsePayload = payload as OpenAIResponsePayload;
  if (responsePayload.status === "incomplete") {
    throw new IntegrationRequestError("openai", "incomplete_response");
  }

  if (
    typeof responsePayload.status === "string" &&
    responsePayload.status !== "completed"
  ) {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  const outputText = getOutputText(responsePayload);
  if (!outputText) {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(outputText);
  } catch {
    throw new IntegrationRequestError("openai", "invalid_response");
  }

  let value: T;
  try {
    value = request.parse(parsedValue);
  } catch {
    throw new IntegrationRequestError(
      "openai",
      "output_validation_failed",
    );
  }

  return {
    value,
    model:
      typeof responsePayload.model === "string"
        ? responsePayload.model
        : configuredModel,
    responseId:
      typeof responsePayload.id === "string" ? responsePayload.id : null,
    usage: normalizeUsage(responsePayload.usage),
  };
}
