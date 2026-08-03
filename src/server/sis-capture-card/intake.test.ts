import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCaptureFingerprintSeed,
  normalizeWebsite,
  parseSisCaptureCardInput,
} from "./intake";

test("normalizeWebsite rejects local hosts for customer websites", () => {
  assert.equal(normalizeWebsite("localhost"), null);
});

test("normalizeWebsite accepts localhost for source URLs when allowed", () => {
  assert.equal(normalizeWebsite("localhost:3000", { allowLocalHost: true }), "https://localhost:3000/");
});

test("parseSisCaptureCardInput normalizes and accepts a valid capture card", () => {
  const result = parseSisCaptureCardInput(
    {
      requestId: "req_123456",
      businessName: "  SIS Custom Creations  ",
      contactName: "  Jane Doe  ",
      contactEmail: "JANE@EXAMPLE.COM ",
      contactPhone: "(512) 555-0199",
      website: "example.com",
      socialMedia: "@sis_custom_creations",
      consentToContact: true,
      sourceUrl: "http://localhost:3000/capture",
    },
    null,
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.value.requestId, "req_123456");
    assert.equal(result.value.businessName, "SIS Custom Creations");
    assert.equal(result.value.contactEmail, "jane@example.com");
    assert.equal(result.value.website, "https://example.com/");
    assert.equal(result.value.websiteDomain, "example.com");
    assert.equal(result.value.sourceUrl, "http://localhost:3000/capture");
    assert.equal(
      result.value.fingerprintSeed,
      buildCaptureFingerprintSeed({
        businessName: "SIS Custom Creations",
        contactEmail: "jane@example.com",
        contactPhone: "(512) 555-0199",
        websiteDomain: "example.com",
        socialMedia: "@sis_custom_creations",
      }),
    );
  }
});

test("parseSisCaptureCardInput reports missing consent and contact routes", () => {
  const result = parseSisCaptureCardInput(
    {
      requestId: "req_123456",
      businessName: "SIS Custom Creations",
      consentToContact: false,
    },
    null,
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.match(result.failure.issues.join(","), /consent_to_contact_is_required/);
    assert.match(result.failure.issues.join(","), /at_least_one_contact_route_is_required/);
  }
});
