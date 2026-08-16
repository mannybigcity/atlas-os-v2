export type SiteLanguage = "en" | "es";

export function normalizeSiteLanguage(value: string | undefined): SiteLanguage {
  return value === "es" ? "es" : "en";
}

export function withSiteLanguage(href: string, language: SiteLanguage) {
  if (language === "en" || href.startsWith("mailto:") || href.startsWith("#")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=es`;
}
