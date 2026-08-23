"use client";

import Link from "next/link";
import { LanguageSwitcher, useSiteLanguage } from "@/components/language-switcher";
import { withSiteLanguage } from "@/lib/site-language";

export function PrivateAtlasAuthHeader() {
  const language = useSiteLanguage();
  const spanish = language === "es";

  return (
    <header className="border-b border-[#dce6f5] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link className="leading-tight text-[#071b42]" href={withSiteLanguage("/login", language)}>
          <span className="block text-lg font-bold tracking-tight">Atlas For Entrepreneurs</span>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#1246a0]">
            {spanish ? "Espacio seguro para clientes" : "Secure Client Workspace"}
          </span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
