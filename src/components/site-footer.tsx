import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "#story", label: "My Why" },
  { href: "#experiences", label: "Experiences" },
  { href: "#work", label: "Work" },
  { href: "#gallery", label: "Gallery" },
  { href: "#inquiry", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[#ebe5f3] bg-white/70 px-4 py-10 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white shadow-[0_12px_35px_rgba(73,62,104,0.12)]">
          <Image src="/sis-real/fresh-official-logo.png" alt="SIS Custom Creations logo" fill sizes="64px" className="object-contain p-1.5" />
        </div>
        <p className="text-xs font-bold text-[#74677f]">SIS Custom Creations | Create. Connect. Celebrate.</p>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs font-black text-[#6c68c8]" aria-label="Footer">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-[11px] font-bold text-[#8b8195]">
          &copy; 2026 SIS Custom Creations. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
