import assert from "node:assert/strict";
import test from "node:test";
import {
  GOOGLE_PLACE_DETAILS_FIELD_MASK,
  GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK,
  getGooglePlaceDetails,
  googlePlaceResourceName,
  searchGooglePlacesText,
} from "./google-places.ts";

test("Places search and details request phone, website, and Maps fields", () => {
  assert.match(GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK.join(","), /nationalPhoneNumber/);
  assert.match(GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK.join(","), /internationalPhoneNumber/);
  assert.match(GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK.join(","), /websiteUri/);
  assert.match(GOOGLE_PLACES_TEXT_SEARCH_FIELD_MASK.join(","), /googleMapsUri/);
  assert.match(GOOGLE_PLACE_DETAILS_FIELD_MASK.join(","), /nationalPhoneNumber/);
  assert.match(GOOGLE_PLACE_DETAILS_FIELD_MASK.join(","), /websiteUri/);
  assert.equal(googlePlaceResourceName("ChIJ123"), "places/ChIJ123");
  assert.equal(googlePlaceResourceName("places/ChIJ123"), "places/ChIJ123");
});

test("text search keeps whatever phone Google returns and does not invent one", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  let fieldMask = "";
  const result = await searchGooglePlacesText(
    { textQuery: "paintless dent repair in Cypress TX", maxResults: 2 },
    {
      fetchImplementation: async (_url, init) => {
        fieldMask = String(
          init && typeof init === "object" && "headers" in init
            ? (init.headers as Record<string, string>)["X-Goog-FieldMask"]
            : "",
        );
        return new Response(
          JSON.stringify({
            places: [
              {
                id: "places/ChIJ-one",
                displayName: { text: "Mobile Dent Repair" },
                formattedAddress: "Cypress, TX",
                googleMapsUri: "https://maps.google.com/?cid=1",
                websiteUri: "https://mobiledent.example",
                nationalPhoneNumber: "(281) 246-8800",
                internationalPhoneNumber: "+1 281-246-8800",
                primaryType: "car_repair",
                businessStatus: "OPERATIONAL",
              },
              {
                id: "ChIJ-two",
                displayName: { text: "No Phone Shop" },
                formattedAddress: "Cypress, TX",
                googleMapsUri: "https://maps.google.com/?cid=2",
                primaryType: "car_repair",
                businessStatus: "OPERATIONAL",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  assert.match(fieldMask, /nationalPhoneNumber/);
  assert.match(fieldMask, /websiteUri/);
  assert.equal(result.places[0]?.placeId, "ChIJ-one");
  assert.equal(result.places[0]?.nationalPhoneNumber, "(281) 246-8800");
  assert.equal(result.places[0]?.websiteUrl, "https://mobiledent.example/");
  assert.equal(result.places[1]?.nationalPhoneNumber, null);
  assert.equal(result.places[1]?.websiteUrl, null);
});

test("text search retries Pro fields when Google denies Enterprise contact fields", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  const fieldMasks: string[] = [];
  const bodies: string[] = [];
  const result = await searchGooglePlacesText(
    { textQuery: "Nursing Home in ZIP code 77429 or Cypress, TX within 10 miles", maxResults: 2 },
    {
      fetchImplementation: async (_url, init) => {
        fieldMasks.push(
          String(
            init && typeof init === "object" && "headers" in init
              ? (init.headers as Record<string, string>)["X-Goog-FieldMask"]
              : "",
          ),
        );
        bodies.push(typeof init?.body === "string" ? init.body : "");
        if (fieldMasks.length === 1) {
          return new Response(
            JSON.stringify({
              error: {
                code: 403,
                message: "The provided API key does not have access to the requested field.",
                status: "PERMISSION_DENIED",
              },
            }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            places: [
              {
                id: "places/ChIJ-nursing",
                displayName: { text: "Cypress Nursing Center" },
                formattedAddress: "Cypress, TX 77429",
                googleMapsUri: "https://maps.google.com/?cid=3",
                primaryType: "nursing_home",
                businessStatus: "OPERATIONAL",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  assert.equal(fieldMasks.length, 2);
  assert.match(fieldMasks[0] ?? "", /nationalPhoneNumber/);
  assert.doesNotMatch(fieldMasks[1] ?? "", /nationalPhoneNumber/);
  assert.match(bodies[0] ?? "", /includePureServiceAreaBusinesses/);
  assert.equal(result.places[0]?.name, "Cypress Nursing Center");
  assert.equal(result.places[0]?.nationalPhoneNumber, null);
});

test("referrer-restricted keys fail once with an operator code and do not retry", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  let calls = 0;
  await assert.rejects(
    () =>
      searchGooglePlacesText(
        { textQuery: "Nursing Home in Cypress, TX", maxResults: 2 },
        {
          fetchImplementation: async () => {
            calls += 1;
            return new Response(
              "API keys with referer restrictions cannot be used with this API.",
              { status: 403 },
            );
          },
        },
      ),
    (error: unknown) => {
      assert.equal(calls, 1);
      assert.equal((error as { options?: { operatorCode?: string } }).options?.operatorCode, "provider_403_referrer");
      return true;
    },
  );
});

test("Places requests omit referrer and do not send extra cookies", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  await searchGooglePlacesText(
    { textQuery: "paintless dent repair in Cypress TX", maxResults: 1 },
    {
      fetchImplementation: async (_url, init) => {
        assert.equal(init && typeof init === "object" ? init.referrerPolicy : "", "no-referrer");
        const headers = init && typeof init === "object" && "headers" in init
          ? (init.headers as Record<string, string>)
          : {};
        assert.equal(headers.Cookie, undefined);
        assert.equal(headers["X-Goog-Api-Key"], "test-places-key");
        return new Response(JSON.stringify({ places: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  );
});

test("Place Details on Accept returns phone when Google has one", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  const place = await getGooglePlaceDetails("ChIJ-detail", {
    fetchImplementation: async (url) => {
      assert.match(String(url), /places\/ChIJ-detail/);
      return new Response(
        JSON.stringify({
          id: "ChIJ-detail",
          displayName: { text: "Mobile Dent Repair" },
          formattedAddress: "123 Paint St, Cypress, TX",
          googleMapsUri: "https://maps.google.com/?cid=9",
          websiteUri: "https://mobiledent.example",
          nationalPhoneNumber: "(281) 246-8800",
          internationalPhoneNumber: "+1 281-246-8800",
          primaryType: "car_repair",
          businessStatus: "OPERATIONAL",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(place?.nationalPhoneNumber, "(281) 246-8800");
  assert.equal(place?.internationalPhoneNumber, "+1 281-246-8800");
  assert.equal(place?.websiteUrl, "https://mobiledent.example/");
});
