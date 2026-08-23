export type SiteLanguage = "en" | "es";

export const SITE_LANGUAGE_COOKIE = "atlas_language";
export const SITE_LANGUAGE_STORAGE_KEY = "afe-language";
export const SITE_LANGUAGE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeSiteLanguage(value: string | null | undefined): SiteLanguage {
  return value === "es" ? "es" : "en";
}

export function siteLanguageFromSearch(search: string): SiteLanguage | null {
  const value = new URLSearchParams(search).get("lang");
  return value === null ? null : normalizeSiteLanguage(value);
}

export function withSiteLanguage(href: string, language: SiteLanguage) {
  if (language === "en" || href.startsWith("mailto:") || href.startsWith("#")) return href;

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = base.indexOf("?");
  const pathname = queryIndex >= 0 ? base.slice(0, queryIndex) : base;
  const query = queryIndex >= 0 ? base.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  params.set("lang", language);

  return `${pathname}?${params.toString()}${hash}`;
}
