import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyGooglePlacesHttpError,
  hunterPlacesErrorCopy,
  redactGooglePlacesErrorText,
} from "./google-places-error.ts";

test("Places HTTP errors map to operator codes without leaking API keys", () => {
  const leaked = redactGooglePlacesErrorText(
    'API key not valid. Please pass a valid API key. AIzaSyD-leaked-key-value-here extra',
  );
  assert.doesNotMatch(leaked, /AIza/);
  assert.match(leaked, /\[redacted\]/);

  assert.equal(
    classifyGooglePlacesHttpError(403, "API keys with referer restrictions cannot be used with this API.").operatorCode,
    "provider_403_referrer",
  );
  assert.equal(
    classifyGooglePlacesHttpError(400, JSON.stringify({
      error: { message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" },
    })).operatorCode,
    "provider_400_key_invalid",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, "Places API (New) has not been used in project 1 before or it is disabled.").operatorCode,
    "provider_403_api_disabled",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, "This API method requires billing to be enabled.").operatorCode,
    "provider_403_billing",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, "The provided API key does not have access to the requested field.").retryWithProFields,
    true,
  );
  assert.equal(
    classifyGooglePlacesHttpError(429, JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" } })).operatorCode,
    "provider_429_quota",
  );
  assert.equal(classifyGooglePlacesHttpError(400, "Request contains an invalid argument.").retryWithoutServiceArea, true);
});

test("HUNTER operator copy names GOOGLE_PLACES_API_KEY and never dumps provider bodies", () => {
  assert.match(hunterPlacesErrorCopy("integration_not_configured"), /GOOGLE_PLACES_API_KEY/);
  assert.match(hunterPlacesErrorCopy("provider_403_referrer"), /Places API \(New\)/);
  assert.match(hunterPlacesErrorCopy("provider_403_api_disabled"), /Places API \(New\)/);
  assert.match(hunterPlacesErrorCopy("provider_429_quota"), /20 searches\/day/);
  assert.match(hunterPlacesErrorCopy("provider_error_403"), /HTTP 403/);
  assert.doesNotMatch(hunterPlacesErrorCopy("provider_400_key_invalid"), /AIza/);
  assert.doesNotMatch(hunterPlacesErrorCopy("provider_error"), /places\.googleapis\.com\/v1\/places:searchText/);
});
