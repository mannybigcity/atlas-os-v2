import assert from "node:assert/strict";
import test from "node:test";
import {
  generateStructuredText,
  MAX_OPENAI_OUTPUT_TOKENS,
  openaiCompatibleJsonSchema,
} from "./openai-responses.ts";
import { IntegrationConfigurationError, IntegrationRequestError } from "./errors.ts";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["ok"],
  properties: { ok: { type: "boolean" } },
} as const;

function parseOk(value: unknown) {
  if (!value || typeof value !== "object" || (value as { ok?: unknown }).ok !== true) {
    throw new Error("invalid");
  }
  return { ok: true as const };
}

function jsonResponse(url: string, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_test",
    },
  });
}

const completedResponse = {
  id: "resp_test",
  object: "response",
  status: "completed",
  model: "gpt-5-mini",
  output_text: JSON.stringify({ ok: true }),
  output: [
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify({ ok: true }) }],
    },
  ],
  usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 },
};

const incompleteResponse = {
  ...completedResponse,
  id: "resp_incomplete",
  status: "incomplete",
  incomplete_details: { reason: "max_output_tokens" },
  output_text: '{"ok":',
};

async function readRequestJson(input: RequestInfo | URL, init?: RequestInit) {
  const rawBody = init?.body;
  if (typeof rawBody === "string") {
    return JSON.parse(rawBody) as Record<string, unknown>;
  }
  if (rawBody instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>;
  }

  if (input instanceof Request) {
    return (await input.clone().json()) as Record<string, unknown>;
  }

  return {};
}

test("generateStructuredText posts to OPENAI_BASE_URL/responses, not api.openai.com", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "gateway-placeholder";
  process.env.OPENAI_BASE_URL = "https://ai-gateway.example/v1";

  const urls: string[] = [];
  try {
    const result = await generateStructuredText({
      schemaName: "atlas_gateway_probe",
      schema,
      instructions: "Return JSON only.",
      input: "Ping the DEMO desk.",
      parse: parseOk,
      fetchImplementation: async (input) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        urls.push(url);
        return jsonResponse(url, 200, completedResponse);
      },
    });

    assert.equal(result.value.ok, true);
    assert.equal(result.model, "gpt-5-mini");
    assert.ok(urls.length > 0);
    assert.match(urls[0] ?? "", /https:\/\/ai-gateway\.example\/v1\/responses/);
    assert.doesNotMatch(urls.join(" "), /api\.openai\.com/);
    assert.doesNotMatch(urls.join(" "), /\/v1\/v1\//);
  } finally {
    process.env.OPENAI_API_KEY = previousKey;
    process.env.OPENAI_BASE_URL = previousBase;
  }
});

test("generateStructuredText fails closed when AI is not enabled", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      () =>
        generateStructuredText({
          schemaName: "atlas_gateway_probe",
          schema,
          instructions: "Return JSON only.",
          input: "Ping the DEMO desk.",
          parse: parseOk,
        }),
      (error: unknown) => error instanceof IntegrationConfigurationError,
    );
  } finally {
    process.env.OPENAI_API_KEY = previousKey;
  }
});

test("incomplete_response retries once at MAX_OPENAI_OUTPUT_TOKENS when the first cap is lower", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "gateway-placeholder";
  process.env.OPENAI_BASE_URL = "https://ai-gateway.example/v1";

  const tokenCaps: number[] = [];
  try {
    const result = await generateStructuredText({
      schemaName: "atlas_gateway_probe",
      schema,
      instructions: "Return JSON only.",
      input: "What's on follow-up today for this DEMO desk?",
      maxOutputTokens: 1_200,
      parse: parseOk,
      fetchImplementation: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const body = await readRequestJson(input, init);
        tokenCaps.push(Number(body.max_output_tokens ?? -1));
        if (Number(body.max_output_tokens ?? 0) < MAX_OPENAI_OUTPUT_TOKENS) {
          return jsonResponse(url, 200, incompleteResponse);
        }
        return jsonResponse(url, 200, completedResponse);
      },
    });

    assert.equal(result.value.ok, true);
    assert.deepEqual(tokenCaps, [1_200, MAX_OPENAI_OUTPUT_TOKENS]);
  } finally {
    process.env.OPENAI_API_KEY = previousKey;
    process.env.OPENAI_BASE_URL = previousBase;
  }
});

test("incomplete_response at the max cap does not retry and maps cleanly", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "gateway-placeholder";
  process.env.OPENAI_BASE_URL = "https://ai-gateway.example/v1";

  const tokenCaps: number[] = [];
  try {
    await assert.rejects(
      () =>
        generateStructuredText({
          schemaName: "atlas_gateway_probe",
          schema,
          instructions: "Return JSON only.",
          input: "What's on follow-up today for this DEMO desk?",
          maxOutputTokens: MAX_OPENAI_OUTPUT_TOKENS,
          parse: parseOk,
          fetchImplementation: async (input, init) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            const body = await readRequestJson(input, init);
            tokenCaps.push(Number(body.max_output_tokens ?? -1));
            return jsonResponse(url, 200, incompleteResponse);
          },
        }),
      (error: unknown) =>
        error instanceof IntegrationRequestError && error.code === "incomplete_response",
    );
    assert.deepEqual(tokenCaps, [MAX_OPENAI_OUTPUT_TOKENS]);
  } finally {
    process.env.OPENAI_API_KEY = previousKey;
    process.env.OPENAI_BASE_URL = previousBase;
  }
});

test("openaiCompatibleJsonSchema strips structured-output keywords OpenAI rejects", () => {
  const compatible = openaiCompatibleJsonSchema({
    type: "object",
    additionalProperties: false,
    required: ["answer", "nextStep", "missingInputs"],
    properties: {
      answer: { type: "string", minLength: 20, maxLength: 1600 },
      nextStep: { type: "string", minLength: 5, maxLength: 200 },
      missingInputs: {
        type: "array",
        minItems: 0,
        maxItems: 4,
        items: { type: "string", minLength: 3, maxLength: 120 },
      },
    },
  });
  const serialized = JSON.stringify(compatible);
  assert.equal(compatible.additionalProperties, false);
  assert.deepEqual(compatible.required, ["answer", "nextStep", "missingInputs"]);
  assert.doesNotMatch(serialized, /minLength|maxLength|minItems|maxItems|minimum|maximum/);
  assert.match(serialized, /"type":"string"/);
});

test("generateStructuredText posts Responses json_schema, not Images API fields", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "gateway-placeholder";
  process.env.OPENAI_BASE_URL = "https://ai-gateway.example/v1";

  const posted: Array<{ url: string; body: Record<string, unknown> }> = [];
  try {
    await generateStructuredText({
      schemaName: "client_micah_response",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["answer", "nextStep", "missingInputs"],
        properties: {
          answer: { type: "string", minLength: 20, maxLength: 1600 },
          nextStep: { type: "string", minLength: 5, maxLength: 200 },
          missingInputs: {
            type: "array",
            minItems: 0,
            maxItems: 4,
            items: { type: "string", minLength: 3, maxLength: 120 },
          },
        },
      },
      instructions: "Return JSON only. Never publish to Facebook or Instagram.",
      input: JSON.stringify({ userPrompt: "Make a Facebook post and a flyer image for Labor Day" }),
      parse: parseOk,
      fetchImplementation: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const body = await readRequestJson(input, init);
        posted.push({ url, body });
        return jsonResponse(url, 200, completedResponse);
      },
    });

    assert.equal(posted.length, 1);
    assert.match(posted[0]?.url ?? "", /\/responses$/);
    assert.doesNotMatch(posted[0]?.url ?? "", /\/images/);
    assert.doesNotMatch(JSON.stringify(posted[0]?.body ?? {}), /"size"|"quality"|"moderation"|"output_format"|dall-e|gpt-image/);

    const text = posted[0]?.body.text as
      | { format?: { type?: string; name?: string; strict?: boolean; schema?: unknown } }
      | undefined;
    assert.equal(text?.format?.type, "json_schema");
    assert.equal(text?.format?.name, "client_micah_response");
    assert.equal(text?.format?.strict, true);
    assert.doesNotMatch(
      JSON.stringify(text?.format?.schema ?? {}),
      /minLength|maxLength|minItems|maxItems/,
    );
    assert.equal(posted[0]?.body.store, false);
    assert.equal(posted[0]?.body.background, false);
  } finally {
    process.env.OPENAI_API_KEY = previousKey;
    process.env.OPENAI_BASE_URL = previousBase;
  }
});
