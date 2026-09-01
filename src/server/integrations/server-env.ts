import { env } from "node:process";

import {
  IntegrationConfigurationError,
  type IntegrationProvider,
} from "./errors.ts";

export type ServerIntegrationSecretName =
  | "GOOGLE_PLACES_API_KEY"
  | "OPENAI_API_KEY";

const PROVIDERS_BY_SECRET: Record<
  ServerIntegrationSecretName,
  IntegrationProvider
> = {
  GOOGLE_PLACES_API_KEY: "google_places",
  OPENAI_API_KEY: "openai",
};

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Server integration modules cannot run in a browser.");
  }
}

export function hasServerIntegrationSecret(
  name: ServerIntegrationSecretName,
) {
  assertServerRuntime();
  return Boolean(env[name]?.trim());
}

export function requireServerIntegrationSecret(
  name: ServerIntegrationSecretName,
) {
  assertServerRuntime();
  const value = env[name]?.trim();

  if (!value) {
    throw new IntegrationConfigurationError(PROVIDERS_BY_SECRET[name], name);
  }

  return value;
}

export function getOpenAIModel() {
  assertServerRuntime();
  const configuredModel = env.OPENAI_MODEL?.trim();

  if (!configuredModel) {
    return DEFAULT_OPENAI_MODEL;
  }

  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(configuredModel)) {
    throw new IntegrationConfigurationError("openai", "OPENAI_MODEL");
  }

  return configuredModel;
}
