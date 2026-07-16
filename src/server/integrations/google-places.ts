import {
  IntegrationRequestError,
} from "@/server/integrations/errors";
import { requireServerIntegrationSecret } from "@/server/integrations/server-env";

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const BASE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.primaryType",
  "places.businessStatus",
];

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
  primaryType?: unknown;
  businessStatus?: unknown;
};

function invalidRequest(): never {
  throw new IntegrationRequestError("google_places", "invalid_request");
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
    placeId,
    name: displayName,
    formattedAddress: asOptionalString(place.formattedAddress),
    googleMapsUrl: asOptionalHttpUrl(place.googleMapsUri),
    websiteUrl: asOptionalHttpUrl(place.websiteUri),
    primaryType: asOptionalString(place.primaryType),
    businessStatus: normalizeBusinessStatus(place.businessStatus),
  };
}

export async function searchGooglePlacesText(
  input: GooglePlacesTextSearchInput,
  options: GooglePlacesRequestOptions = {},
): Promise<GooglePlacesSearchResult> {
  const normalized = normalizeInput(input);
  const apiKey = requireServerIntegrationSecret("GOOGLE_PLACES_API_KEY");
  const fieldMask = normalized.includeWebsite
    ? [...BASE_FIELD_MASK, "places.websiteUri"].join(",")
    : BASE_FIELD_MASK.join(",");
  const requestBody = {
    textQuery: normalized.textQuery,
    pageSize: normalized.maxResults,
    ...(normalized.languageCode
      ? { languageCode: normalized.languageCode }
      : {}),
    ...(normalized.regionCode ? { regionCode: normalized.regionCode } : {}),
    includePureServiceAreaBusinesses:
      normalized.includePureServiceAreaBusinesses,
  };

  let response: Response;

  try {
    response = await (options.fetchImplementation ?? fetch)(
      GOOGLE_PLACES_TEXT_SEARCH_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        signal: options.signal,
      },
    );
  } catch {
    throw new IntegrationRequestError("google_places", "network_error", {
      status: null,
      retryable: true,
    });
  }

  if (!response.ok) {
    throw new IntegrationRequestError("google_places", "provider_error", {
      status: response.status,
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new IntegrationRequestError("google_places", "invalid_response");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new IntegrationRequestError("google_places", "invalid_response");
  }

  const rawPlaces = (payload as { places?: unknown }).places;
  if (rawPlaces !== undefined && !Array.isArray(rawPlaces)) {
    throw new IntegrationRequestError("google_places", "invalid_response");
  }

  const places = (rawPlaces ?? [])
    .slice(0, normalized.maxResults)
    .map(normalizePlace)
    .filter((place): place is GooglePlaceProspect => place !== null);

  return {
    textQuery: normalized.textQuery,
    maxResults: normalized.maxResults,
    places,
  };
}
