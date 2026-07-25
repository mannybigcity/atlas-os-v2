import Image from "next/image";
import Link from "next/link";

const homeNav = [
  { href: "#home", label: "Home" },
  { href: "#story", label: "My Why" },
  { href: "#experiences", label: "Experiences" },
  { href: "#work", label: "Work" },
  { href: "#inquiry", label: "Contact" },
  { href: "#gallery", label: "Gallery" },
] as const;

const pageNav = [
  { href: "/", label: "Home" },
  { href: "/paint-parties", label: "Experiences" },
  { href: "/diy-kits", label: "DIY Kits" },
  { href: "/custom-apparel", label: "Apparel" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
] as const;

type SisHeaderProps = {
  variant?: "home" | "page";
};

export function SisHeader({ variant = "page" }: SisHeaderProps) {
  const navItems = variant === "home" ? homeNav : pageNav;

  return (
    <header className="relative z-30 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/82 bg-white/82 px-3 py-2 shadow-[0_18px_60px_rgba(73,62,104,0.14)] backdrop-blur-xl">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-[#21182e]">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white">
            <Image
              src="/sis-real/fresh-official-logo.png"
              alt="SIS Custom Creations"
              fill
              sizes="40px"
              className="object-contain p-1"
              priority
            />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-xs font-black">SIS Custom Creations</span>
            <span className="block text-[10px] font-bold text-[#74677f]">Create. Connect. Celebrate.</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-4 text-xs font-black text-[#2b2238] lg:flex">
          {navItems.map((item) => (
            <a key={item.href} className="transition hover:text-[#6c68c8]" href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="#inquiry"
          className="rounded-full bg-[#6c68c8] px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(108,104,200,0.28)] transition hover:-translate-y-0.5"
        >
          Book Now
        </Link>
      </div>
    </header>
  );
}
