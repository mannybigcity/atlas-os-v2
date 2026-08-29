"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import type { SiteLanguage } from "@/lib/site-language";

function hidePublicFooterOnPath(pathname: string) {
  return pathname === "/client" || pathname.startsWith("/client/");
}

export function RouteFooter({ initialLanguage = "en" }: { initialLanguage?: SiteLanguage }) {
  const pathname = usePathname();

  if (hidePublicFooterOnPath(pathname)) {
    return null;
  }

  return <SiteFooter initialLanguage={initialLanguage} />;
}
