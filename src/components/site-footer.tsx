import Link from "next/link";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Secure login" },
];

const trustLinks = [
  { href: "/responsible-ai", label: "Responsible AI" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/accessibility", label: "Accessibility" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#305ca8] bg-[#071b42] text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-slate-100 sm:px-6">
          <span className="font-bold text-white">Built for trust:</span>{" "}
          private workspaces, human approval before external action, clear cost
          controls, and assessment information that is not sold.
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.75fr_0.95fr_1fr]">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-white">RamFam Atlas OS</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd068]">
              Private Family Operating System
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Your secure command center for the family businesses you own and operate.
            </p>
          </div>

          <FooterLinks heading="Explore" links={exploreLinks} />
          <FooterLinks heading="Trust & legal" links={trustLinks} />

          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white">
              Contact
            </h2>
            <a
              className="mt-4 block break-words text-sm leading-7 text-slate-100 hover:text-white"
              href="mailto:atlasforentrepreneurs@gmail.com"
            >
              atlasforentrepreneurs@gmail.com
            </a>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              For privacy requests, use the subject line &ldquo;Privacy request.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-6 text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 RamFam Atlas OS. All rights reserved.</p>
          <p>Private access for authorized family members and operators.</p>
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
