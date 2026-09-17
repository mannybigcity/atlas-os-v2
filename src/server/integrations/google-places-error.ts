export const HUNTER_PLACES_ERROR_COPY = {
  integration_not_configured:
    "GOOGLE_PLACES_API_KEY is not configured in the server deployment environment.",
  network_error:
    "Atlas could not reach Google Places (places.googleapis.com). Check Netlify outbound access, then retry.",
  invalid_request:
    "That search request was not valid. Enter a business type plus a ZIP code or city/state.",
  invalid_response:
    "Google Places returned a response Atlas could not read. The failed request was recorded.",
  provider_400_key_invalid:
    "GOOGLE_PLACES_API_KEY was rejected by Google. In Netlify, set GOOGLE_PLACES_API_KEY (Builds and Functions scopes) to a valid Places API (New) server key, then redeploy.",
  provider_403_referrer:
    "GOOGLE_PLACES_API_KEY is restricted to HTTP referrers. Places API (New) server calls from Netlify cannot use a browser referrer key. Set Application restriction to None or IP addresses, and API restriction to Places API (New) only.",
  provider_403_api_disabled:
    "Places API (New) is not enabled on the Google Cloud project for GOOGLE_PLACES_API_KEY. Enable Places API (New) and confirm billing is active.",
  provider_403_billing:
    "Google Cloud billing blocked this Places request. Check billing and budgets on the project that owns GOOGLE_PLACES_API_KEY.",
  provider_403_fields:
    "Google Places denied the requested contact fields. Enable Places API (New) Pro/Enterprise SKUs for phone and website, then retry.",
  provider_429_quota:
    "Google Places quota was exceeded. Check Places API (New) quotas in Google Cloud, then retry. Atlas still caps HUNTER at 20 searches/day.",
  provider_400_invalid_argument:
    "Google Places rejected this search request. Try a simpler query (business type plus city or ZIP). The failed request was recorded.",
  provider_error:
    "Google Places could not complete this search. The failed request was recorded.",
} as const;

export type HunterPlacesErrorCopyKey = keyof typeof HUNTER_PLACES_ERROR_COPY;

export type GooglePlacesHttpClassification = {
  operatorCode: string;
  retryable: boolean;
  retryWithoutServiceArea: boolean;
  retryWithProFields: boolean;
};

const API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{10,}/g;

export function redactGooglePlacesErrorText(raw: string) {
  return raw
    .replace(API_KEY_PATTERN, "[redacted]")
    .replace(/key=[^&\s"']+/gi, "key=[redacted]")
    .replace(/x-goog-api-key:\s*\S+/gi, "x-goog-api-key: [redacted]")
    .slice(0, 2000);
}

function googleRpcStatus(bodyText: string) {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { status?: unknown; message?: unknown } };
    return typeof parsed.error?.status === "string" ? parsed.error.status : "";
  } catch {
    return "";
  }
}

export function classifyGooglePlacesHttpError(
  status: number,
  bodyText: string,
): GooglePlacesHttpClassification {
  const text = redactGooglePlacesErrorText(bodyText).toLowerCase();
  const rpcStatus = googleRpcStatus(bodyText).toUpperCase();

  if (status === 429 || rpcStatus === "RESOURCE_EXHAUSTED" || /\bquota\b/.test(text)) {
    return {
      operatorCode: "provider_429_quota",
      retryable: true,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  if (
    text.includes("referer restriction") ||
    text.includes("referrer restriction") ||
    text.includes("http referer") ||
    text.includes("http referrer") ||
    text.includes("browser restriction")
  ) {
    return {
      operatorCode: "provider_403_referrer",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  if (
    text.includes("api key not valid") ||
    text.includes("api_key_invalid") ||
    text.includes("invalid api key") ||
    (status === 400 && text.includes("api key"))
  ) {
    return {
      operatorCode: "provider_400_key_invalid",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  if (
    text.includes("billing not enabled") ||
    text.includes("billingnotenabled") ||
    text.includes("this api method requires billing") ||
    text.includes("billing account")
  ) {
    return {
      operatorCode: "provider_403_billing",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  if (
    text.includes("has not been used") ||
    text.includes("api is not enabled") ||
    text.includes("is disabled") ||
    text.includes("accessnotconfigured") ||
    text.includes("service_disabled")
  ) {
    return {
      operatorCode: "provider_403_api_disabled",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  if (
    text.includes("fieldmask") ||
    text.includes("field mask") ||
    text.includes("requested field") ||
    text.includes("invalid field") ||
    text.includes("does not have access to")
  ) {
    return {
      operatorCode: "provider_403_fields",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: true,
    };
  }

  if (status === 403) {
    return {
      operatorCode: "provider_error_403",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: true,
    };
  }

  if (status === 400) {
    return {
      operatorCode: "provider_400_invalid_argument",
      retryable: false,
      retryWithoutServiceArea: true,
      retryWithProFields: true,
    };
  }

  if (status >= 500) {
    return {
      operatorCode: `provider_error_${status}`,
      retryable: true,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
    };
  }

  return {
    operatorCode: status ? `provider_error_${status}` : "provider_error",
    retryable: false,
    retryWithoutServiceArea: false,
    retryWithProFields: false,
  };
}

export function hunterPlacesErrorCopy(
  operatorCode?: string | null,
  status?: number | null,
): string {
  if (operatorCode && operatorCode in HUNTER_PLACES_ERROR_COPY) {
    return HUNTER_PLACES_ERROR_COPY[operatorCode as HunterPlacesErrorCopyKey];
  }
  const httpFromCode = operatorCode?.match(/^provider_error_(\d{3})$/)?.[1];
  if (httpFromCode) {
    return `Google Places could not complete this search (HTTP ${httpFromCode}). The failed request was recorded.`;
  }
  if (typeof status === "number" && status >= 400) {
    return `Google Places could not complete this search (HTTP ${status}). The failed request was recorded.`;
  }
  return HUNTER_PLACES_ERROR_COPY.provider_error;
}
