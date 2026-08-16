"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/assessment", label: "Revenue leak assessment" },
  { href: "/login", label: "Client login" },
];

const trustLinks = [
  { href: "/responsible-ai", label: "Responsible AI" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/accessibility", label: "Accessibility" },
];

export function SiteFooter() {
  const searchParams = useSearchParams();
  const cookieLanguage = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("atlas-language-change", onStoreChange);
      window.addEventListener("popstate", onStoreChange);
      return () => {
        window.removeEventListener("atlas-language-change", onStoreChange);
        window.removeEventListener("popstate", onStoreChange);
      };
    },
    () => (window.location.search.includes("lang=es") || document.cookie.includes("atlas_language=es") ? "es" : "en"),
    () => "en",
  ) as SiteLanguage;
  const language: SiteLanguage = searchParams.get("lang") === "es" ? "es" : cookieLanguage;
  const spanish = language === "es";
  const link = (href: string) => withSiteLanguage(href, language);
  return (
    <footer className="border-t border-[#305ca8] bg-[#071b42] text-blue-100">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-6 text-blue-50 sm:px-6">
          <span className="font-bold text-white">{spanish ? "Creado para la confianza:" : "Built for trust:"}</span>{" "}
          {spanish ? "espacios de trabajo privados, aprobación humana antes de acciones externas, controles claros de costos y evaluaciones que no se venden." : "private workspaces, human approval before external action, clear cost controls, and assessment information that is not sold."}
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1fr]">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-white">Atlas For Entrepreneurs</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd068]">
              Service Business Growth OS
            </p>
            <p className="mt-4 text-sm leading-6 text-blue-100">
              {spanish ? "Seguimiento de prospectos, marketing práctico y una prioridad clara de crecimiento para negocios de servicios dirigidos por sus dueños." : "Lead follow-up, practical marketing, and one clear growth priority for owner-led service businesses."}
            </p>
          </div>

          <FooterLinks heading={spanish ? "Explorar" : "Explore"} links={exploreLinks.map((item) => ({ ...item, href: link(item.href) }))} />
          <FooterLinks heading={spanish ? "Confianza y legal" : "Trust & legal"} links={trustLinks.map((item) => ({ ...item, href: link(item.href) }))} />

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">
              {spanish ? "Contacto" : "Contact"}
            </h2>
            <a
              className="mt-4 block break-words text-sm leading-6 hover:text-white"
              href="mailto:info@atlasforentrepreneurs.com"
            >
              info@atlasforentrepreneurs.com
            </a>
            <p className="mt-3 text-xs leading-5 text-blue-200">
              {spanish ? "Para solicitudes de privacidad, usa el asunto “Solicitud de privacidad.”" : "For privacy requests, use the subject line “Privacy request.”"}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-blue-200 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Atlas For Entrepreneurs. All rights reserved.</p>
          <p>{spanish ? "Los resultados varían. No hay suscripción automática." : "Business results vary. No automatic subscription."}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">
        {heading}
      </h2>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link className="hover:text-white" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
