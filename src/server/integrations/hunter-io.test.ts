import assert from "node:assert/strict";
import test from "node:test";
import { enrichHunterDomain, parseHunterDomainSearch } from "./hunter-io.ts";

test("Hunter domain search parses email, phone, and missing social profiles", () => {
  const parsed = parseHunterDomainSearch({
    data: {
      domain: "paused.example",
      facebook: null,
      instagram: "",
      linkedin: null,
      twitter: null,
      youtube: null,
      emails: [{ value: "Desk@Paused.example", phone_number: "(281) 555-0144" }],
    },
  });
  assert.deepEqual(parsed, {
    email: "desk@paused.example",
    phone: "(281) 555-0144",
    hasSocialProfile: false,
  });

  const withSocial = parseHunterDomainSearch({
    data: {
      facebook: "https://facebook.com/paused",
      emails: [],
    },
  });
  assert.equal(withSocial?.hasSocialProfile, true);
  assert.equal(parseHunterDomainSearch({ data: {} }), null);
  assert.equal(parseHunterDomainSearch(null), null);
});

test("missing HUNTER_API_KEY skips the network", async () => {
  const previous = process.env.HUNTER_API_KEY;
  delete process.env.HUNTER_API_KEY;
  let called = false;
  try {
    const result = await enrichHunterDomain("paused.example", {
      fetchImplementation: async () => {
        called = true;
        throw new Error("Hunter should not be called");
      },
    });
    assert.equal(result, null);
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.HUNTER_API_KEY;
    else process.env.HUNTER_API_KEY = previous;
  }
});

test("a configured key calls domain search and degrades on a bad response", async () => {
  const previous = process.env.HUNTER_API_KEY;
  process.env.HUNTER_API_KEY = "hunter-test-key";
  const urls: string[] = [];
  try {
    const found = await enrichHunterDomain("www.paused.example", {
      fetchImplementation: async (input) => {
        urls.push(String(input));
        return new Response(
          JSON.stringify({
            data: {
              facebook: null,
              instagram: null,
              emails: [{ value: "desk@paused.example" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    assert.equal(found?.email, "desk@paused.example");
    assert.equal(found?.hasSocialProfile, false);
    assert.match(urls[0] ?? "", /domain=paused\.example/);
    assert.match(urls[0] ?? "", /api_key=hunter-test-key/);
    assert.doesNotMatch(urls[0] ?? "", /www\.paused/);

    const failed = await enrichHunterDomain("paused.example", {
      fetchImplementation: async () => new Response("nope", { status: 401 }),
    });
    assert.equal(failed, null);
  } finally {
    if (previous === undefined) delete process.env.HUNTER_API_KEY;
    else process.env.HUNTER_API_KEY = previous;
  }
});
