import { IntegrationRequestError } from "./errors.ts";
import {
  classifyGooglePlacesHttpError,
  type GooglePlacesHttpClassification,
} from "./google-places-error.ts";
import { requireServerIntegrationSecret } from "./server-env.ts";

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

export const GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.primaryType",
  "places.businessStatus",
] as const;

/** Pro SKU fields only — used when Enterprise phone/website fields are denied. */
export const GOOGLE_PLACES_PRO_TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.primaryType",
  "places.businessStatus",
] as const;

export const GOOGLE_PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "googleMapsUri",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "primaryType",
  "businessStatus",
] as const;

export const GOOGLE_PLACE_DETAILS_PRO_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "googleMapsUri",
  "primaryType",
  "businessStatus",
] as const;

const GOOGLE_PLACE_DETAILS_URL = "https://places.googleapis.com/v1";

export const MAX_GOOGLE_PLACES_RESULTS = 20;

export type GooglePlacesTextSearchInput = {
  textQuery: string;
  maxResults?: number;
  languageCode?: string;
  regionCode?: string;
  includeWebsite?: boolean;
  includePureServiceAreaBusinesses?: boolean;
};

export type GooglePlaceBusinessStatus =
  | "OPERATIONAL"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY";

export type GooglePlaceProspect = {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  googleMapsUrl: string | null;
  websiteUrl: string | null;
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  primaryType: string | null;
  businessStatus: GooglePlaceBusinessStatus | null;
};

/**
 * A transient, normalized provider result for an operator review screen.
 * This type does not imply storage rights. Callers must not persist returned
 * Places content until a Google Maps Platform data-handling and attribution
 * policy has been reviewed for that exact use.
 */
export type GooglePlacesSearchResult = {
  textQuery: string;
  maxResults: number;
  places: GooglePlaceProspect[];
};

export type GooglePlacesRequestOptions = {
  signal?: AbortSignal;
  fetchImplementation?: typeof fetch;
};

type GooglePlacePayload = {
  id?: unknown;
  displayName?: unknown;
  formattedAddress?: unknown;
  googleMapsUri?: unknown;
  websiteUri?: unknown;
  nationalPhoneNumber?: unknown;
  internationalPhoneNumber?: unknown;
  primaryType?: unknown;
  businessStatus?: unknown;
};

function invalidRequest(): never {
  throw new IntegrationRequestError("google_places", "invalid_request", {
    status: null,
    retryable: false,
    operatorCode: "invalid_request",
  });
}

function normalizeInput(input: GooglePlacesTextSearchInput) {
  const textQuery = input.textQuery.trim();
  const maxResults = input.maxResults ?? 10;

  if (textQuery.length < 3 || textQuery.length > 500) {
    invalidRequest();
  }

  if (
    !Number.isInteger(maxResults) ||
    maxResults < 1 ||
    maxResults > MAX_GOOGLE_PLACES_RESULTS
  ) {
    invalidRequest();
  }

  const languageCode = input.languageCode?.trim();
  if (
    languageCode &&
    !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(languageCode)
  ) {
    invalidRequest();
  }

  const regionCode = input.regionCode?.trim().toUpperCase();
  if (regionCode && !/^[A-Z]{2}$/.test(regionCode)) {
    invalidRequest();
  }

  return {
    textQuery,
    maxResults,
    languageCode,
    regionCode,
    includeWebsite: input.includeWebsite === true,
    includePureServiceAreaBusinesses:
      input.includePureServiceAreaBusinesses !== false,
  };
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asOptionalHttpUrl(value: unknown) {
  const text = asOptionalString(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeBusinessStatus(
  value: unknown,
): GooglePlaceBusinessStatus | null {
  if (
    value === "OPERATIONAL" ||
    value === "CLOSED_TEMPORARILY" ||
    value === "CLOSED_PERMANENTLY"
  ) {
    return value;
  }

  return null;
}

function normalizePlace(value: unknown): GooglePlaceProspect | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const place = value as GooglePlacePayload;
  const displayName =
    place.displayName &&
    typeof place.displayName === "object" &&
    !Array.isArray(place.displayName)
      ? asOptionalString((place.displayName as { text?: unknown }).text)
      : null;
  const placeId = asOptionalString(place.id);

  if (!placeId || !displayName) {
    return null;
  }

  return {
    placeId: placeId.replace(/^places\//, ""),
    name: displayName,
    formattedAddress: asOptionalString(place.formattedAddress),
    googleMapsUrl: asOptionalHttpUrl(place.googleMapsUri),
    websiteUrl: asOptionalHttpUrl(place.websiteUri),
    nationalPhoneNumber: asOptionalString(place.nationalPhoneNumber),
    internationalPhoneNumber: asOptionalString(place.internationalPhoneNumber),
    primaryType: asOptionalString(place.primaryType),
    businessStatus: normalizeBusinessStatus(place.businessStatus),
  };
}

export function googlePlaceResourceName(placeId: string) {
  const trimmed = placeId.trim();
  if (!trimmed) invalidRequest();
  return trimmed.startsWith("places/") ? trimmed : `places/${trimmed}`;
}

function networkError(): never {
  throw new IntegrationRequestError("google_places", "network_error", {
    status: null,
    retryable: true,
    operatorCode: "network_error",
  });
}

function invalidResponse(): never {
  throw new IntegrationRequestError("google_places", "invalid_response", {
    status: null,
    retryable: false,
    operatorCode: "invalid_response",
  });
}

function throwClassifiedProviderError(
  status: number,
  classified: GooglePlacesHttpClassification,
): never {
  console.error(
    "[hunter.google_places]",
    classified.operatorCode,
    status,
    classified.logHint,
  );
  throw new IntegrationRequestError("google_places", "provider_error", {
    status,
    retryable: classified.retryable,
    operatorCode: classified.operatorCode,
  });
}

async function placesRequest(
  url: string,
  init: {
    method: "GET" | "POST";
    apiKey: string;
    fieldMask: string;
    body?: string;
    signal?: AbortSignal;
    fetchImplementation?: typeof fetch;
  },
) {
  try {
    return await (init.fetchImplementation ?? fetch)(url, {
      method: init.method,
      headers: {
        Accept: "application/json",
        "X-Goog-Api-Key": init.apiKey,
        "X-Goog-FieldMask": init.fieldMask,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body,
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: init.signal,
    });
  } catch {
    networkError();
  }
}

function parsePlacesPayload(payload: unknown, maxResults: number) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    invalidResponse();
  }

  const rawPlaces = (payload as { places?: unknown }).places;
  if (rawPlaces !== undefined && !Array.isArray(rawPlaces)) {
    invalidResponse();
  }

  return (rawPlaces ?? [])
    .slice(0, maxResults)
    .map(normalizePlace)
    .filter((place): place is GooglePlaceProspect => place !== null);
}

async function readJsonPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    invalidResponse();
  }
}

export async function searchGooglePlacesText(
  input: GooglePlacesTextSearchInput,
  options: GooglePlacesRequestOptions = {},
): Promise<GooglePlacesSearchResult> {
  const normalized = normalizeInput(input);
  const apiKey = requireServerIntegrationSecret("GOOGLE_PLACES_API_KEY");
  const fullMask = [...GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK].join(",");
  const proMask = [...GOOGLE_PLACES_PRO_TEXT_SEARCH_FIELD_MASK].join(",");

  const attempts: Array<{ fieldMask: string; includePureServiceAreaBusinesses: boolean }> = [
    {
      fieldMask: fullMask,
      includePureServiceAreaBusinesses: normalized.includePureServiceAreaBusinesses,
    },
  ];
  const tried = new Set<string>();
  let lastStatus = 0;
  let lastClassification: GooglePlacesHttpClassification | null = null;

  while (attempts.length > 0 && tried.size < 3) {
    const attempt = attempts.shift();
    if (!attempt) break;
    const attemptKey = `${attempt.fieldMask}|${attempt.includePureServiceAreaBusinesses}`;
    if (tried.has(attemptKey)) continue;
    tried.add(attemptKey);

    const requestBody = {
      textQuery: normalized.textQuery,
      pageSize: normalized.maxResults,
      ...(normalized.languageCode
        ? { languageCode: normalized.languageCode }
        : {}),
      ...(normalized.regionCode ? { regionCode: normalized.regionCode } : {}),
      ...(attempt.includePureServiceAreaBusinesses
        ? { includePureServiceAreaBusinesses: true }
        : {}),
    };

    const response = await placesRequest(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      apiKey,
      fieldMask: attempt.fieldMask,
      body: JSON.stringify(requestBody),
      signal: options.signal,
      fetchImplementation: options.fetchImplementation,
    });

    if (response.ok) {
      const payload = await readJsonPayload(response);
      return {
        textQuery: normalized.textQuery,
        maxResults: normalized.maxResults,
        places: parsePlacesPayload(payload, normalized.maxResults),
      };
    }

    lastStatus = response.status;
    const raw = await response.text().catch(() => "");
    lastClassification = classifyGooglePlacesHttpError(response.status, raw);

    if (
      lastClassification.retryWithoutServiceArea &&
      attempt.includePureServiceAreaBusinesses
    ) {
      attempts.push({
        fieldMask: attempt.fieldMask,
        includePureServiceAreaBusinesses: false,
      });
    }
    if (lastClassification.retryWithProFields && attempt.fieldMask !== proMask) {
      attempts.push({
        fieldMask: proMask,
        includePureServiceAreaBusinesses: attempt.includePureServiceAreaBusinesses,
      });
    }
  }

  throwClassifiedProviderError(
    lastStatus,
    lastClassification ?? {
      operatorCode: lastStatus ? `provider_error_${lastStatus}` : "provider_error",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
      reason: null,
      logHint: "unclassified",
    },
  );
}

export async function getGooglePlaceDetails(
  placeId: string,
  options: GooglePlacesRequestOptions = {},
): Promise<GooglePlaceProspect | null> {
  const resourceName = googlePlaceResourceName(placeId);
  const apiKey = requireServerIntegrationSecret("GOOGLE_PLACES_API_KEY");
  const masks = [
    [...GOOGLE_PLACE_DETAILS_FIELD_MASK].join(","),
    [...GOOGLE_PLACE_DETAILS_PRO_FIELD_MASK].join(","),
  ];
  let lastStatus = 0;
  let lastClassification: GooglePlacesHttpClassification | null = null;

  for (const fieldMask of masks) {
    const response = await placesRequest(
      `${GOOGLE_PLACE_DETAILS_URL}/${resourceName}`,
      {
        method: "GET",
        apiKey,
        fieldMask,
        signal: options.signal,
        fetchImplementation: options.fetchImplementation,
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (response.ok) {
      const payload = await readJsonPayload(response);
      return normalizePlace(payload);
    }

    lastStatus = response.status;
    const raw = await response.text().catch(() => "");
    lastClassification = classifyGooglePlacesHttpError(response.status, raw);
    if (!lastClassification.retryWithProFields) {
      break;
    }
  }

  throwClassifiedProviderError(
    lastStatus,
    lastClassification ?? {
      operatorCode: lastStatus ? `provider_error_${lastStatus}` : "provider_error",
      retryable: false,
      retryWithoutServiceArea: false,
      retryWithProFields: false,
      reason: null,
      logHint: "unclassified",
    },
  );
}
