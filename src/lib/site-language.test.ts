import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSiteLanguage,
  resolveSiteLanguage,
  siteLanguageFromSearch,
} from "./site-language.ts";

test("missing language preference defaults to English", () => {
  assert.equal(normalizeSiteLanguage(undefined), "en");
  assert.equal(normalizeSiteLanguage(null), "en");
  assert.equal(normalizeSiteLanguage(""), "en");
  assert.equal(resolveSiteLanguage({}), "en");
});

test("query lang=en wins over a leftover Spanish cookie or storage", () => {
  assert.equal(siteLanguageFromSearch("?lang=en"), "en");
  assert.equal(
    resolveSiteLanguage({ search: "?lang=en", cookie: "es", storage: "es" }),
    "en",
  );
});

test("query lang=es still selects Spanish", () => {
  assert.equal(siteLanguageFromSearch("?lang=es"), "es");
  assert.equal(
    resolveSiteLanguage({ search: "?lang=es", cookie: "en", storage: "en" }),
    "es",
  );
});

test("cookie and storage keep Spanish when the URL has no lang", () => {
  assert.equal(siteLanguageFromSearch(""), null);
  assert.equal(resolveSiteLanguage({ cookie: "es" }), "es");
  assert.equal(resolveSiteLanguage({ storage: "es" }), "es");
});
