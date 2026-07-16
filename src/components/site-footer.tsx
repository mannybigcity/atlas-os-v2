import Link from "next/link";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/assessment", label: "Free assessment" },
  { href: "/login", label: "Client login" },
];

const trustLinks = [
  { href: "/responsible-ai", label: "Responsible AI" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/accessibility", label: "Accessibility" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#305ca8] bg-[#071b42] text-blue-100">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-6 text-blue-50 sm:px-6">
          <span className="font-bold text-white">Built for trust:</span>{" "}
          no AI experience required, human approval before external action, and
          assessment information is not sold.
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1fr]">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-white">Atlas For Entrepreneurs</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd068]">
              Guide. Grow. Live More.
            </p>
            <p className="mt-4 text-sm leading-6 text-blue-100">
              Practical, approval-controlled AI guidance for owner-led businesses
              that want useful help without the technology overwhelm.
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
              href="mailto:info@atlasforentrepreneurs.com"
            >
              info@atlasforentrepreneurs.com
            </a>
            <p className="mt-3 text-xs leading-5 text-blue-200">
              For privacy requests, use the subject line &ldquo;Privacy request.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-5 text-blue-200 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Atlas For Entrepreneurs. All rights reserved.</p>
          <p>Business results vary. No automatic subscription.</p>
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
