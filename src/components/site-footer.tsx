import Link from "next/link";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/sis-ai-design-studio", label: "Create" },
  { href: "/custom-apparel", label: "Shop" },
  { href: "/paint-parties", label: "Experiences" },
  { href: "/pricing", label: "Pricing" },
  { href: "/our-story", label: "Our Story" },
  { href: "/gallery", label: "Gallery" },
];

const trustLinks = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/responsible-ai", label: "Responsible AI" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0f172a] text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-6 text-slate-100 sm:px-6">
          <span className="font-bold text-white">Built for trust:</span>{" "}
          premium presentation, two included edits, configurable pricing, and
          white-label fulfillment that keeps SIS in front.
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg font-semibold tracking-[-0.03em] text-white">
              SIS Custom Creations
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7b06e]">
              Creative commerce studio
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Custom apparel, creative experiences, DIY kits, and SIS AI design
              tools for families, teams, churches, schools, and businesses.
            </p>
          </div>

          <FooterLinks heading="Explore" links={exploreLinks} />
          <FooterLinks heading="Trust & legal" links={trustLinks} />

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">
              Contact
            </h2>
            <a
              className="mt-4 block break-words text-sm leading-6 hover:text-white"
              href="mailto:hello@siscustomcreations.com"
            >
              hello@siscustomcreations.com
            </a>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              For order questions, use the subject line &ldquo;Custom print order.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 SIS Custom Creations. All rights reserved.</p>
          <p>White-label production, no minimums, and configurable revision rules.</p>
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
