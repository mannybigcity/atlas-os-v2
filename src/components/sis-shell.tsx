import Link from "next/link";

const homeNav = [
  { href: "#experience", label: "Experience" },
  { href: "#studio", label: "SIS AI" },
  { href: "#products", label: "Products" },
  { href: "#story", label: "Our Story" },
  { href: "#how-it-works", label: "How it works" },
] as const;

const pageNav = [
  { href: "/sis-ai-design-studio", label: "Create" },
  { href: "/custom-apparel", label: "Shop" },
  { href: "/paint-parties", label: "Experiences" },
  { href: "/diy-kits", label: "DIY Kits" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

type SisHeaderProps = {
  variant?: "home" | "page";
};

export function SisHeader({ variant = "page" }: SisHeaderProps) {
  const navItems = variant === "home" ? homeNav : pageNav;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090d1a]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-7">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white text-sm font-black tracking-[0.2em] text-[#091022] shadow-[0_16px_36px_rgba(9,13,26,0.35)]">
            SC
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-black uppercase tracking-[0.24em] sm:text-base">
              SIS Custom Creations
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Creative commerce and family-centered craft
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-slate-200 md:flex"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/sis-ai-design-studio"
          className="inline-flex items-center justify-center rounded-full bg-[#8b6cff] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_38px_rgba(139,108,255,0.32)] transition hover:-translate-y-0.5 hover:bg-[#a18bff] sm:px-5 sm:text-sm"
        >
          Create With SIS AI
        </Link>
      </div>
    </header>
  );
}

