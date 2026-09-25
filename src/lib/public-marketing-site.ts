/**
 * Canonical public marketing origin for Atlas For Entrepreneurs.
 * Live site 301s www → apex; keep sitemap/robots/metadata on apex.
 */
export const CANONICAL_SITE_ORIGIN = "https://atlasforentrepreneurs.com";

export const PUBLIC_ROBOTS_DISALLOW = ["/client/", "/lions-den/"] as const;

export const PRIVATE_SITEMAP_PATH_PREFIXES = ["/client", "/lions-den"] as const;

type SitemapChangeFrequency = "weekly" | "monthly" | "yearly";

export type PublicSitemapEntry = {
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

/** Indexable marketing pages only. Auth, checkout, and workspace routes stay out. */
export const PUBLIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/assessment", changeFrequency: "monthly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/responsible-ai", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/signscout/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.3 },
];

export function canonicalPublicUrl(path = "/") {
  if (path === "/") {
    return CANONICAL_SITE_ORIGIN;
  }
  return `${CANONICAL_SITE_ORIGIN}${path}`;
}

export function publicSitemapIndexUrl() {
  return `${CANONICAL_SITE_ORIGIN}/sitemap.xml`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildPublicSitemapXml(entries: readonly PublicSitemapEntry[] = PUBLIC_SITEMAP_ENTRIES) {
  const urls = entries
    .map((entry) => {
      const loc = escapeXml(canonicalPublicUrl(entry.path));
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <changefreq>${entry.changeFrequency}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}
