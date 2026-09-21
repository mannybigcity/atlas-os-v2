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
    "GOOGLE_PLACES_API_KEY is restricted to HTTP referrers. Netlify sends no browser referrer, so Places API (New) returns HTTP 403. In Google Cloud Console → Credentials, set Application restrictions to None and API restrictions to Places API (New) only, then retry.",
  provider_403_ip:
    "GOOGLE_PLACES_API_KEY is restricted to IP addresses that do not include Netlify. Functions do not have a fixed outbound IP. Set Application restrictions to None and API restrictions to Places API (New) only, then retry.",
  provider_403_application:
    "GOOGLE_PLACES_API_KEY has an Android, iOS, or other application restriction. Netlify server calls need Application restrictions set to None and API restrictions set to Places API (New) only, then retry.",
  provider_403_api_restriction:
    "GOOGLE_PLACES_API_KEY is not allowed to call Places API (New). Edit the key's API restrictions and allow Places API (New) only. Legacy Places API alone still returns HTTP 403. Enable Places API (New) on the project, then retry.",
  provider_403_api_disabled:
    "Places API (New) is not enabled on the Google Cloud project for GOOGLE_PLACES_API_KEY. Enable Places API (New) and confirm billing is active.",
  provider_403_billing:
    "Google Cloud billing blocked this Places request. Check billing and budgets on the project that owns GOOGLE_PLACES_API_KEY.",
  provider_error_403:
    "Google Places denied this search (HTTP 403). For GOOGLE_PLACES_API_KEY: set Application restrictions to None, set API restrictions to Places API (New) only, enable Places API (New), and confirm billing is active. Retry in a few minutes. The failed request was recorded.",
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
  /** Google ErrorInfo reason, when the body included one. Never an API key. */
  reason: string | null;
  /** Short redacted hint safe for server logs. */
  logHint: string;
};

const API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{10,}/g;

export function redactGooglePlacesErrorText(raw: string) {
  return raw
    .replace(API_KEY_PATTERN, "[redacted]")
    .replace(/key=[^&\s"']+/gi, "key=[redacted]")
    .replace(/x-goog-api-key:\s*\S+/gi, "x-goog-api-key: [redacted]")
    .slice(0, 2000);
}

function classified(
  operatorCode: string,
  options: {
    retryable?: boolean;
    retryWithoutServiceArea?: boolean;
    retryWithProFields?: boolean;
    reason?: string | null;
    logHint?: string | null;
  } = {},
): GooglePlacesHttpClassification {
  const reason = options.reason ?? null;
  return {
    operatorCode,
    retryable: options.retryable ?? false,
    retryWithoutServiceArea: options.retryWithoutServiceArea ?? false,
    retryWithProFields: options.retryWithProFields ?? false,
    reason,
    logHint: options.logHint ?? reason ?? "unclassified",
  };
}

function googleErrorFacts(bodyText: string) {
  const reasons: string[] = [];
  let rpcStatus = "";
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { status?: unknown; details?: unknown };
    };
    if (typeof parsed.error?.status === "string") {
      rpcStatus = parsed.error.status.toUpperCase();
    }
    const details = parsed.error?.details;
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (!detail || typeof detail !== "object") continue;
        const reason = (detail as { reason?: unknown }).reason;
        if (typeof reason === "string" && reason.trim()) {
          reasons.push(reason.trim().toUpperCase());
        }
      }
    }
  } catch {
    // Plain-text provider bodies are classified from the redacted text.
  }
  return { rpcStatus, reasons };
}

function hasSignal(text: string, reasons: string[], needles: string[]) {
  return needles.some((needle) => text.includes(needle.toLowerCase()) || reasons.includes(needle.toUpperCase()));
}

function matchedReason(reasons: string[], names: string[], fallback: string) {
  return names.find((name) => reasons.includes(name)) ?? fallback;
}

export function classifyGooglePlacesHttpError(
  status: number,
  bodyText: string,
): GooglePlacesHttpClassification {
  const text = redactGooglePlacesErrorText(bodyText).toLowerCase();
  const { rpcStatus, reasons } = googleErrorFacts(bodyText);

  if (status === 429 || rpcStatus === "RESOURCE_EXHAUSTED" || /\bquota\b/.test(text)) {
    return classified("provider_429_quota", {
      retryable: true,
      reason: matchedReason(reasons, ["RESOURCE_EXHAUSTED"], "quota"),
    });
  }

  if (
    hasSignal(text, reasons, [
      "referer restriction",
      "referrer restriction",
      "http referer",
      "http referrer",
      "browser restriction",
      "requests from referer",
      "requests from referrer",
      "referer <empty>",
      "referrer <empty>",
      "API_KEY_HTTP_REFERRER_BLOCKED",
    ])
  ) {
    return classified("provider_403_referrer", {
      reason: matchedReason(reasons, ["API_KEY_HTTP_REFERRER_BLOCKED"], "referrer"),
    });
  }

  if (
    hasSignal(text, reasons, [
      "ip address restriction",
      "requests from ip address",
      "requests from this ip",
      "originating ip address",
      "API_KEY_IP_ADDRESS_BLOCKED",
    ])
  ) {
    return classified("provider_403_ip", {
      reason: matchedReason(reasons, ["API_KEY_IP_ADDRESS_BLOCKED"], "ip"),
    });
  }

  if (
    hasSignal(text, reasons, [
      "android client application",
      "ios client application",
      "android application restriction",
      "ios application restriction",
      "android restrictions",
      "ios restrictions",
      "not authorized to use this api key",
      "API_KEY_ANDROID_APP_BLOCKED",
      "API_KEY_IOS_APP_BLOCKED",
    ])
  ) {
    return classified("provider_403_application", {
      reason: matchedReason(
        reasons,
        ["API_KEY_ANDROID_APP_BLOCKED", "API_KEY_IOS_APP_BLOCKED"],
        "application",
      ),
    });
  }

  if (
    hasSignal(text, reasons, [
      "api key not valid",
      "api key is invalid",
      "api_key_invalid",
      "invalid api key",
      "api key expired",
      "API_KEY_INVALID",
      "API_KEY_EXPIRED",
    ]) ||
    (status === 400 && text.includes("api key"))
  ) {
    return classified("provider_400_key_invalid", {
      reason: matchedReason(reasons, ["API_KEY_INVALID", "API_KEY_EXPIRED"], "key_invalid"),
    });
  }

  if (
    hasSignal(text, reasons, [
      "billing not enabled",
      "billing has not been enabled",
      "billingnotenabled",
      "this api method requires billing",
      "billing account",
      "BILLING_DISABLED",
    ])
  ) {
    return classified("provider_403_billing", {
      reason: matchedReason(reasons, ["BILLING_DISABLED"], "billing"),
    });
  }

  if (
    hasSignal(text, reasons, [
      "has not been used",
      "api is not enabled",
      "is disabled",
      "accessnotconfigured",
      "service_disabled",
      "enable it by visiting",
      "SERVICE_DISABLED",
      "ACCESS_NOT_CONFIGURED",
    ])
  ) {
    return classified("provider_403_api_disabled", {
      reason: matchedReason(reasons, ["SERVICE_DISABLED", "ACCESS_NOT_CONFIGURED"], "api_disabled"),
    });
  }

  if (
    hasSignal(text, reasons, ["API_KEY_SERVICE_BLOCKED"]) ||
    (text.includes("requests to this api") && text.includes("are blocked"))
  ) {
    return classified("provider_403_api_restriction", {
      reason: matchedReason(reasons, ["API_KEY_SERVICE_BLOCKED"], "api_restriction"),
    });
  }

  if (
    text.includes("fieldmask") ||
    text.includes("field mask") ||
    text.includes("requested field") ||
    text.includes("invalid field") ||
    text.includes("does not have access to")
  ) {
    return classified("provider_403_fields", {
      retryWithProFields: true,
      reason: "fields",
    });
  }

  if (status === 403) {
    return classified("provider_error_403", {
      retryWithProFields: true,
      logHint: `unclassified:${text.slice(0, 160)}`,
    });
  }

  if (status === 400) {
    return classified("provider_400_invalid_argument", {
      retryWithoutServiceArea: true,
      retryWithProFields: true,
      logHint: `invalid_argument:${text.slice(0, 160)}`,
    });
  }

  if (status >= 500) {
    return classified(`provider_error_${status}`, { retryable: true });
  }

  return classified(status ? `provider_error_${status}` : "provider_error");
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
