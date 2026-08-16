"use client";

import Image from "next/image";
import Link from "next/link";

type SiteLanguage = "en" | "es";

type SiteHeaderProps = {
  active?: "home" | "pricing" | "assessment" | "login";
  language?: SiteLanguage;
  onLanguageChange?: (language: SiteLanguage) => void;
};

export function SiteHeader({ active, language = "en", onLanguageChange }: SiteHeaderProps) {
  const spanish = language === "es";
  const navItems = [
    { href: "/", label: spanish ? "Inicio" : "Home", name: "home" },
    { href: "/pricing", label: spanish ? "Precios" : "Pricing", name: "pricing" },
    { href: "/assessment", label: spanish ? "Evaluación" : "Assessment", name: "assessment" },
    { href: "/login", label: spanish ? "Acceso del cliente" : "Client Login", name: "login" },
  ] as const;

  const linkClass = (name: SiteHeaderProps["active"]) =>
    [
      "rounded-full px-3 py-2 text-sm font-medium transition",
      active === name
        ? "bg-[#1246a0] !text-white hover:bg-[#0a2f78] hover:!text-white"
        : "text-[#16325c] hover:bg-[#eef4ff] hover:text-[#0a2f78]",
    ].join(" ");

  return (
    <header className="border-b border-[#dce6f5] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-3 leading-tight text-[#071b42]" href="/">
          <Image
            alt="Atlas lion and mountain logo"
            className="h-14 w-14 object-contain"
            height={720}
            priority
            src="/brand/atlas-logo.png"
            width={720}
          />
          <span>
            <span className="block text-lg font-bold tracking-tight">
              Atlas For Entrepreneurs
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[#1246a0] sm:block">
              Service Business Growth OS
            </span>
          </span>
        </Link>

        <nav aria-label={spanish ? "Navegación principal" : "Primary navigation"} className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              aria-current={active === item.name ? "page" : undefined}
              className={linkClass(item.name)}
              href={item.href}
              key={item.name}
            >
              {item.label}
            </Link>
          ))}
          {onLanguageChange ? (
            <div aria-label="Language selection" className="atlas-language" role="group">
              <button
                aria-label="English"
                aria-pressed={!spanish}
                className={!spanish ? "active" : ""}
                onClick={() => onLanguageChange("en")}
                type="button"
              >
                EN
              </button>
              <button
                aria-label="Español"
                aria-pressed={spanish}
                className={spanish ? "active" : ""}
                onClick={() => onLanguageChange("es")}
                type="button"
              >
                ES
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
