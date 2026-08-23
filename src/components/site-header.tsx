"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher, useSiteLanguage } from "@/components/language-switcher";
import { withSiteLanguage } from "@/lib/site-language";

type SiteHeaderProps = {
  active?: "home" | "pricing" | "snapshot" | "login";
};

export function SiteHeader({ active }: SiteHeaderProps) {
  const language = useSiteLanguage();
  const spanish = language === "es";
  const navItems = [
    { href: "/", label: spanish ? "Inicio" : "Home", name: "home" },
    { href: "/pricing", label: spanish ? "Precios" : "Pricing", name: "pricing" },
    { href: "/assessment", label: spanish ? "Evaluación" : "Assessment", name: "snapshot" },
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link className="flex min-w-0 items-center gap-2 leading-tight text-[#071b42]" href={withSiteLanguage("/", language)}>
          <Image
            alt="Atlas lion and mountain logo"
            className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14"
            height={720}
            priority
            src="/brand/atlas-logo.png"
            width={720}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight sm:text-lg">
              Atlas For Entrepreneurs
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[#1246a0] sm:block">
              {spanish ? "Espacio de crecimiento para clientes" : "Client Growth Workspace"}
            </span>
          </span>
        </Link>

        <nav aria-label={spanish ? "Navegación principal" : "Primary navigation"} className="hidden items-center gap-2 lg:flex">
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
          <LanguageSwitcher />
          <Link
            className="rounded-full bg-[#f5b932] px-4 py-2 text-sm font-black !text-[#071b42] shadow-[0_8px_20px_rgba(245,185,50,0.2)] transition hover:bg-[#ffd064] hover:!text-[#071b42]"
            href={withSiteLanguage("/start-trial", language)}
          >
            {spanish ? "Iniciar prueba gratuita de 7 días" : "Start 7-day free trial"}
          </Link>
        </nav>
        <nav aria-label={spanish ? "Navegación móvil" : "Mobile navigation"} className="flex shrink-0 items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <Link
            className="rounded-full bg-[#f5b932] px-3 py-2 text-xs font-black !text-[#071b42] transition hover:bg-[#ffd064] hover:!text-[#071b42]"
            href={withSiteLanguage("/assessment", language)}
          >
            {spanish ? "Comenzar" : "Get started"}
          </Link>
          <Link
            className="rounded-full border border-[#1246a0] px-3 py-2 text-xs font-black text-[#1246a0] transition hover:bg-[#eef4ff]"
            href={withSiteLanguage("/login", language)}
          >
            {spanish ? "Iniciar sesión" : "Log in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
