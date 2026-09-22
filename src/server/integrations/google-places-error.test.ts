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
  const emptyReferrer = classifyGooglePlacesHttpError(403, JSON.stringify({
    error: {
      code: 403,
      message: "Requests from referer <empty> are blocked.",
      status: "PERMISSION_DENIED",
      details: [{
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        reason: "API_KEY_HTTP_REFERRER_BLOCKED",
        metadata: { httpReferrer: "<empty>" },
      }],
    },
  }));
  assert.equal(emptyReferrer.operatorCode, "provider_403_referrer");
  assert.equal(emptyReferrer.retryWithProFields, false);
  assert.equal(emptyReferrer.reason, "API_KEY_HTTP_REFERRER_BLOCKED");

  const ipBlocked = classifyGooglePlacesHttpError(403, JSON.stringify({
    error: {
      code: 403,
      message: "Requests from IP address 203.0.113.10 are blocked.",
      status: "PERMISSION_DENIED",
      details: [{ reason: "API_KEY_IP_ADDRESS_BLOCKED" }],
    },
  }));
  assert.equal(ipBlocked.operatorCode, "provider_403_ip");
  assert.equal(ipBlocked.retryWithProFields, false);

  const serviceBlocked = classifyGooglePlacesHttpError(403, JSON.stringify({
    error: {
      code: 403,
      message: "Requests to this API places.googleapis.com method google.maps.places.v1.Places.SearchText are blocked.",
      status: "PERMISSION_DENIED",
      details: [{ reason: "API_KEY_SERVICE_BLOCKED" }],
    },
  }));
  assert.equal(serviceBlocked.operatorCode, "provider_403_api_restriction");
  assert.equal(serviceBlocked.retryWithProFields, false);

  assert.equal(
    classifyGooglePlacesHttpError(403, "Requests from this Android client application <empty> are blocked.").operatorCode,
    "provider_403_application",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, "Permission denied.").operatorCode,
    "provider_error_403",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, JSON.stringify({
      error: { status: "PERMISSION_DENIED", message: "Permission denied.", details: [{ reason: "BILLING_DISABLED" }] },
    })).operatorCode,
    "provider_403_billing",
  );
  assert.equal(
    classifyGooglePlacesHttpError(403, JSON.stringify({
      error: { status: "PERMISSION_DENIED", message: "Permission denied.", details: [{ reason: "SERVICE_DISABLED" }] },
    })).operatorCode,
    "provider_403_api_disabled",
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
  assert.match(hunterPlacesErrorCopy("provider_403_referrer"), /Application restrictions to None/);
  assert.doesNotMatch(hunterPlacesErrorCopy("provider_403_referrer"), /IP addresses/);
  assert.match(hunterPlacesErrorCopy("provider_403_ip"), /fixed outbound IP/);
  assert.match(hunterPlacesErrorCopy("provider_403_api_restriction"), /Legacy Places API/);
  assert.match(hunterPlacesErrorCopy("provider_403_api_disabled"), /Places API \(New\)/);
  assert.match(hunterPlacesErrorCopy("provider_429_quota"), /20 searches\/day/);
  assert.match(hunterPlacesErrorCopy("provider_error_403"), /HTTP 403/);
  assert.match(hunterPlacesErrorCopy("provider_error_403"), /Application restrictions to None/);
  assert.doesNotMatch(hunterPlacesErrorCopy("provider_400_key_invalid"), /AIza/);
  assert.doesNotMatch(hunterPlacesErrorCopy("provider_error"), /places\.googleapis\.com\/v1\/places:searchText/);
});
