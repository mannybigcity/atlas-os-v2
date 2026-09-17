"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher, useSiteLanguage } from "@/components/language-switcher";
import { AFE_CALL_TODAY_EN, AFE_CALL_TODAY_ES, AFE_MANNY_PHONE_TEL } from "@/lib/afe-public-contact";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";

type SiteHeaderProps = {
  active?: "home" | "pricing" | "snapshot" | "login";
  initialLanguage?: SiteLanguage;
};

export function SiteHeader({ active, initialLanguage = "en" }: SiteHeaderProps) {
  const language = useSiteLanguage(initialLanguage);
  const spanish = language === "es";
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { href: "/", label: spanish ? "Inicio" : "Home", name: "home" },
    { href: "/pricing", label: spanish ? "Precios" : "Pricing", name: "pricing" },
    { href: "/assessment", label: spanish ? "Evaluación" : "Assessment", name: "snapshot" },
    { href: "/login", label: spanish ? "Acceso del cliente" : "Client Login", name: "login" },
  ] as const;

  const linkClass = (name: SiteHeaderProps["active"]) =>
    [
      "whitespace-nowrap px-1.5 py-1 text-sm font-medium transition",
      active === name
        ? "text-[#071b42] underline decoration-[#f5b932] decoration-2 underline-offset-4"
        : "text-[#16325c] hover:text-[#0a2f78]",
    ].join(" ");

  return (
    <header className="border-b border-[#dce6f5] bg-white">
      <div className="mx-auto flex max-w-[1250px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 xl:gap-5">
        <Link className="flex min-w-0 items-center gap-2 leading-tight text-[#071b42]" href={withSiteLanguage("/", language)}>
          <Image
            alt="Atlas For Entrepreneurs logo"
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
            height={720}
            priority
            src="/brand/atlas-logo.png"
            width={720}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight sm:text-base">
              Atlas For Entrepreneurs
            </span>
            <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#1246a0] sm:block">
              {spanish ? "Espacio de crecimiento para clientes" : "Client Growth Workspace"}
            </span>
          </span>
        </Link>

        <nav aria-label={spanish ? "Navegación principal" : "Primary navigation"} className="hidden shrink-0 items-center gap-x-2.5 xl:flex">
          {navItems.map((item) => (
            <Link
              aria-current={active === item.name ? "page" : undefined}
              className={linkClass(item.name)}
              href={withSiteLanguage(item.href, language)}
              key={item.name}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 xl:flex">
          <a
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold text-[#1246a0] transition hover:bg-[#eef4ff] hover:text-[#0a2f78]"
            href={`tel:${AFE_MANNY_PHONE_TEL}`}
          >
            {spanish ? AFE_CALL_TODAY_ES : AFE_CALL_TODAY_EN}
          </a>
          <LanguageSwitcher compact initialLanguage={initialLanguage} />
          <Link
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-[#f5b932] px-3.5 text-sm font-black !text-[#071b42] shadow-[0_8px_20px_rgba(245,185,50,0.2)] transition hover:bg-[#ffd064] hover:!text-[#071b42]"
            href={withSiteLanguage("/start-trial", language)}
          >
            {spanish ? "Iniciar prueba gratuita de 7 días" : "Start 7-day free trial"}
          </Link>
        </div>

        <nav aria-label={spanish ? "Navegación móvil" : "Mobile navigation"} className="flex shrink-0 items-center gap-1.5 xl:hidden">
          <a
            aria-label={spanish ? AFE_CALL_TODAY_ES : AFE_CALL_TODAY_EN}
            className="inline-flex h-8 items-center whitespace-nowrap rounded-full border border-[#1246a0] px-2.5 text-xs font-semibold text-[#1246a0] transition hover:bg-[#eef4ff]"
            href={`tel:${AFE_MANNY_PHONE_TEL}`}
          >
            {spanish ? "Llama hoy" : "Call today"}
          </a>
          <LanguageSwitcher compact initialLanguage={initialLanguage} />
          <Link
            aria-label={spanish ? "Crear una cuenta. Comenzar prueba gratis de 7 días" : "Create an account. Start 7-day free trial"}
            className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-[#f5b932] px-2.5 text-xs font-black !text-[#071b42] transition hover:bg-[#ffd064] hover:!text-[#071b42]"
            href={withSiteLanguage("/start-trial", language)}
          >
            {spanish ? "Crear cuenta" : "Create account"}
          </Link>
          <button
            aria-controls="atlas-mobile-nav"
            aria-expanded={menuOpen}
            aria-label={spanish ? "Abrir menú" : "Open menu"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dce6f5] text-[#071b42] transition hover:bg-[#eef4ff]"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true" className="flex flex-col gap-[3px]">
              <span className={`block h-0.5 w-3.5 bg-current transition ${menuOpen ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`block h-0.5 w-3.5 bg-current transition ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-3.5 bg-current transition ${menuOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </nav>
      </div>

      {menuOpen ? (
        <nav
          aria-label={spanish ? "Enlaces del sitio" : "Site links"}
          className="space-y-1 border-t border-[#dce6f5] bg-white px-4 py-3 xl:hidden"
          id="atlas-mobile-nav"
        >
          {navItems.map((item) => (
            <Link
              aria-current={active === item.name ? "page" : undefined}
              className="block whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-[#16325c] hover:bg-[#eef4ff] hover:text-[#0a2f78]"
              href={withSiteLanguage(item.href, language)}
              key={item.name}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
