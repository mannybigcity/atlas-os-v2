/**
 * Netlify AI Gateway injects OPENAI_API_KEY (placeholder) and OPENAI_BASE_URL.
 * A user-defined OPENAI_API_KEY disables injection and sends traffic to OpenAI
 * directly. Do not pass apiKey or baseURL into the OpenAI SDK constructor.
 */
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const GATEWAY_OPENAI_MODEL = "gpt-5-mini";
export const AI_NOT_ENABLED_MESSAGE = "AI is not enabled on this site";

export function resolveOpenAIBaseUrl(baseUrl?: string | null) {
  const configured = String(baseUrl ?? "").trim().replace(/\/+$/, "");
  return configured || DEFAULT_OPENAI_BASE_URL;
}

export function openAIResponsesUrl(baseUrl?: string | null) {
  return `${resolveOpenAIBaseUrl(baseUrl)}/responses`;
}

export function isOpenAIConfigured(apiKey?: string | null) {
  return Boolean(String(apiKey ?? "").trim());
}
