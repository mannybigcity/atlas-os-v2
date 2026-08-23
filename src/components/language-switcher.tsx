"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  normalizeSiteLanguage,
  SITE_LANGUAGE_COOKIE,
  SITE_LANGUAGE_MAX_AGE,
  SITE_LANGUAGE_STORAGE_KEY,
  siteLanguageFromSearch,
  type SiteLanguage,
} from "@/lib/site-language";

function readCookie(name: string) {
  const prefix = `${name}=`;
  return document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function getBrowserLanguage() {
  const queryLanguage = siteLanguageFromSearch(window.location.search);
  if (queryLanguage) return queryLanguage;

  const cookieLanguage = readCookie(SITE_LANGUAGE_COOKIE);
  if (cookieLanguage) return normalizeSiteLanguage(cookieLanguage);

  return normalizeSiteLanguage(window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY));
}

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("atlas-language-change", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("atlas-language-change", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function persistSiteLanguage(language: SiteLanguage) {
  document.cookie = `${SITE_LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${SITE_LANGUAGE_MAX_AGE}; SameSite=Lax`;
  window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new Event("atlas-language-change"));
}

export function useSiteLanguage(initialLanguage: SiteLanguage = "en") {
  const pathname = usePathname();
  const language = useSyncExternalStore(subscribeToLanguage, getBrowserLanguage, () => initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language, pathname]);

  return language;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const language = useSiteLanguage();
  const spanish = language === "es";

  function changeLanguage(nextLanguage: SiteLanguage) {
    persistSiteLanguage(nextLanguage);

    const url = new URL(window.location.href);
    url.pathname = pathname;
    if (nextLanguage === "es") url.searchParams.set("lang", "es");
    else url.searchParams.delete("lang");

    router.replace(`${url.pathname}${url.search}${url.hash}`);
    router.refresh();
  }

  return (
    <div
      aria-label={spanish ? "Selección de idioma" : "Language selection"}
      className="atlas-language"
      role="group"
    >
      <button
        aria-label="English"
        aria-pressed={!spanish}
        className={!spanish ? "active" : ""}
        onClick={() => changeLanguage("en")}
        type="button"
      >
        EN
      </button>
      <button
        aria-label="Español"
        aria-pressed={spanish}
        className={spanish ? "active" : ""}
        onClick={() => changeLanguage("es")}
        type="button"
      >
        ES
      </button>
    </div>
  );
}
