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
