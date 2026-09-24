import assert from "node:assert/strict";
import test from "node:test";
import { allowedOrigin } from "./public-party-cors.ts";

test("public party CORS allows this SIS storefront and the existing preview hosts", () => {
  for (const origin of [
    "https://siscustomcreations.com",
    "https://www.siscustomcreations.com",
    "https://i5mszs-hq.myshopify.com",
    "https://atlasforentrepreneurs.com",
    "https://www.atlasforentrepreneurs.com",
    "https://atlas-os-v2.netlify.app",
    "https://atlas-os-v2.vercel.app",
    "https://mannybigcity.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]) {
    assert.equal(allowedOrigin(origin), true, origin);
  }
});

test("public party CORS stays HTTPS-only and does not open other Shopify shops", () => {
  for (const origin of [
    "http://siscustomcreations.com",
    "http://www.siscustomcreations.com",
    "http://i5mszs-hq.myshopify.com",
    "https://other-shop.myshopify.com",
    "https://evil.i5mszs-hq.myshopify.com",
    "https://i5mszs-hq.myshopify.com.evil.example",
    "https://notsiscustomcreations.com",
    "https://siscustomcreations.com.evil.example",
    "https://evil.siscustomcreations.com",
    "https://shopify.com",
    "https://admin.shopify.com",
    "https://localhost",
    "https://evil.example",
    "not a url",
    "",
  ]) {
    assert.equal(allowedOrigin(origin), false, origin);
  }
});
