import assert from "node:assert/strict";
import test from "node:test";
import { generateStructuredText } from "./openai-responses.ts";
import { IntegrationConfigurationError } from "./errors.ts";

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
