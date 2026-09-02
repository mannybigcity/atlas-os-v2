import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEFAULT_OPENAI_BASE_URL,
  GATEWAY_OPENAI_MODEL,
  isOpenAIConfigured,
  openAIResponsesUrl,
  resolveOpenAIBaseUrl,
} from "./openai-gateway.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("gateway base URL does not double /v1 and defaults to OpenAI", () => {
  assert.equal(resolveOpenAIBaseUrl(undefined), DEFAULT_OPENAI_BASE_URL);
  assert.equal(resolveOpenAIBaseUrl("https://ai-gateway.example/v1"), "https://ai-gateway.example/v1");
  assert.equal(resolveOpenAIBaseUrl("https://ai-gateway.example/v1/"), "https://ai-gateway.example/v1");
  assert.equal(
    openAIResponsesUrl("https://ai-gateway.example/v1"),
    "https://ai-gateway.example/v1/responses",
  );
  assert.doesNotMatch(openAIResponsesUrl("https://ai-gateway.example/v1"), /\/v1\/v1\//);
  assert.equal(GATEWAY_OPENAI_MODEL, "gpt-5-mini");
});

test("Talk to Atlas does not hardcode api.openai.com or pass a constructor apiKey", () => {
  const source = readFileSync(join(here, "openai-responses.ts"), "utf8");
  assert.doesNotMatch(source, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.doesNotMatch(source, /requireServerIntegrationSecret\("OPENAI_API_KEY"\)/);
  assert.match(source, /new OpenAI\(\)/);
  assert.doesNotMatch(source, /new OpenAI\(\s*\{[^}]*apiKey/);
  assert.doesNotMatch(source, /new OpenAI\(\s*\{[^}]*baseURL/);
});

test("missing injected key means AI is not enabled", () => {
  assert.equal(isOpenAIConfigured(undefined), false);
  assert.equal(isOpenAIConfigured("   "), false);
  assert.equal(isOpenAIConfigured("gateway-placeholder"), true);
});
