"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/language-switcher";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";

export function SiteFooter({ initialLanguage = "en" }: { initialLanguage?: SiteLanguage }) {
  const language = useSiteLanguage(initialLanguage);
  const spanish = language === "es";
  const exploreLinks = spanish
    ? [{ href: "/", label: "Inicio" }, { href: "/login", label: "Acceso seguro" }]
    : [{ href: "/", label: "Home" }, { href: "/login", label: "Secure login" }];
  const trustLinks = spanish
    ? [
        { href: "/responsible-ai", label: "IA responsable" },
        { href: "/privacy", label: "Política de privacidad" },
        { href: "/terms", label: "Términos de uso" },
        { href: "/accessibility", label: "Accesibilidad" },
      ]
    : [
        { href: "/responsible-ai", label: "Responsible AI" },
        { href: "/privacy", label: "Privacy policy" },
        { href: "/terms", label: "Terms of use" },
        { href: "/accessibility", label: "Accessibility" },
      ];

  return (
    <footer className="border-t border-[#305ca8] bg-[#071b42] text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-slate-100 sm:px-6">
          <span className="font-bold text-white">{spanish ? "Creado para la confianza:" : "Built for trust:"}</span>{" "}
          {spanish
            ? "espacios de trabajo privados, aprobación humana antes de acciones externas, controles claros de costos y evaluaciones que no se venden."
            : "private workspaces, human approval before external action, clear cost controls, and assessment information that is not sold."}
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.75fr_0.95fr_1fr]">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-white">Atlas For Entrepreneurs</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd068]">
              {spanish ? "Espacio de crecimiento para clientes" : "Client Growth Workspace"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              {spanish
                ? "Tu centro de control seguro para los negocios familiares que diriges y administras."
                : "Your secure command center for the family businesses you own and operate."}
            </p>
          </div>

          <FooterLinks heading={spanish ? "Explorar" : "Explore"} language={language} links={exploreLinks} />
          <FooterLinks heading={spanish ? "Confianza y legal" : "Trust & legal"} language={language} links={trustLinks} />

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">
              {spanish ? "Contacto" : "Contact"}
            </h2>
            <a
              className="mt-4 block break-words text-sm leading-7 text-slate-100 hover:text-white"
              href="mailto:atlasforentrepreneurs@gmail.com"
            >
              atlasforentrepreneurs@gmail.com
            </a>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              {spanish
                ? "Para solicitudes de privacidad, usa el asunto “Solicitud de privacidad.”"
                : "For privacy requests, use the subject line “Privacy request.”"}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-6 text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Atlas For Entrepreneurs. {spanish ? "Todos los derechos reservados." : "All rights reserved."}</p>
          <p>{spanish ? "Acceso seguro para clientes y operadores autorizados." : "Secure access for authorized clients and operators."}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  heading,
  language,
  links,
}: {
  heading: string;
  language: SiteLanguage;
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
            <Link className="hover:text-white" href={withSiteLanguage(link.href, language)}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
