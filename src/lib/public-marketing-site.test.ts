import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CANONICAL_SITE_ORIGIN,
  PRIVATE_SITEMAP_PATH_PREFIXES,
  PUBLIC_ROBOTS_DISALLOW,
  PUBLIC_SITEMAP_ENTRIES,
  buildPublicSitemapXml,
  canonicalPublicUrl,
  publicSitemapIndexUrl,
} from "./public-marketing-site.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function sitemapLocs(xml: string) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

test("canonical public origin is apex, not www", () => {
  assert.equal(CANONICAL_SITE_ORIGIN, "https://atlasforentrepreneurs.com");
  assert.doesNotMatch(CANONICAL_SITE_ORIGIN, /www\./);
  assert.equal(publicSitemapIndexUrl(), "https://atlasforentrepreneurs.com/sitemap.xml");
  assert.equal(canonicalPublicUrl("/"), CANONICAL_SITE_ORIGIN);
  assert.equal(canonicalPublicUrl("/contact"), `${CANONICAL_SITE_ORIGIN}/contact`);
});

test("public sitemap XML is well-formed and lists only marketing pages", () => {
  const xml = buildPublicSitemapXml();

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n/);
  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.match(xml, /<\/urlset>\n$/);
  assert.equal(xml.includes("/client"), false);
  assert.equal(xml.includes("/lions-den"), false);

  const locs = sitemapLocs(xml);
  assert.deepEqual(
    locs,
    PUBLIC_SITEMAP_ENTRIES.map((entry) => canonicalPublicUrl(entry.path)),
  );

  for (const loc of locs) {
    assert.ok(loc.startsWith(CANONICAL_SITE_ORIGIN), loc);
    assert.doesNotMatch(loc, /www\.atlasforentrepreneurs\.com/);
    for (const prefix of PRIVATE_SITEMAP_PATH_PREFIXES) {
      assert.equal(new URL(loc).pathname === prefix || new URL(loc).pathname.startsWith(`${prefix}/`), false, loc);
    }
  }

  assert.ok(locs.includes(`${CANONICAL_SITE_ORIGIN}/contact`));
  assert.ok(locs.includes(`${CANONICAL_SITE_ORIGIN}/assessment`));
  assert.ok(locs.includes(`${CANONICAL_SITE_ORIGIN}/pricing`));
  assert.equal(
    locs.some((loc) => /\/(login|start-trial|go)\b/.test(loc)),
    false,
  );
});

test("robots.txt source points at the apex sitemap and blocks private workspaces", () => {
  const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
  assert.match(robots, /publicSitemapIndexUrl|CANONICAL_SITE_ORIGIN/);
  assert.match(robots, /PUBLIC_ROBOTS_DISALLOW/);
  assert.deepEqual([...PUBLIC_ROBOTS_DISALLOW], ["/client/", "/lions-den/"]);
});

test("sitemap is served by a static XML route, not metadata sitemap.ts", () => {
  assert.equal(existsSync(join(root, "src/app/sitemap.ts")), false);
  assert.equal(existsSync(join(root, "src/app/sitemap.xml/route.ts")), true);

  const route = readFileSync(join(root, "src/app/sitemap.xml/route.ts"), "utf8");
  assert.match(route, /buildPublicSitemapXml/);
  assert.match(route, /force-static/);
  assert.doesNotMatch(route, /from ["']next\/headers["']/);
  assert.doesNotMatch(route, /getSiteUrl\(/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_SITE_URL/);
});
