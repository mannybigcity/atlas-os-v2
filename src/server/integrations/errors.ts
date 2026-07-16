export type IntegrationProvider = "google_places" | "openai";

export type IntegrationErrorCode =
  | "invalid_request"
  | "network_error"
  | "provider_error"
  | "invalid_response"
  | "incomplete_response"
  | "refused"
  | "output_validation_failed";

const SAFE_ERROR_MESSAGES: Record<IntegrationErrorCode, string> = {
  invalid_request: "The integration request is invalid.",
  network_error: "The integration could not be reached.",
  provider_error: "The integration provider rejected the request.",
  invalid_response: "The integration provider returned an invalid response.",
  incomplete_response: "The integration provider returned an incomplete response.",
  refused: "The model declined to produce this output.",
  output_validation_failed: "The generated output could not be validated.",
};

export class IntegrationConfigurationError extends Error {
  readonly code = "integration_not_configured";

  constructor(
    readonly provider: IntegrationProvider,
    readonly variableName: string,
  ) {
    super(`${provider} is not configured on the server.`);
    this.name = "IntegrationConfigurationError";
  }
}

export class IntegrationRequestError extends Error {
  constructor(
    readonly provider: IntegrationProvider,
    readonly code: IntegrationErrorCode,
    readonly options: {
      status: number | null;
      retryable: boolean;
    } = { status: null, retryable: false },
  ) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = "IntegrationRequestError";
  }
}
