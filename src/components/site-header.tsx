import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  active?: "home" | "assessment" | "login";
};

export function SiteHeader({ active }: SiteHeaderProps) {
  const linkClass = (name: SiteHeaderProps["active"]) =>
    [
      "rounded-full px-3 py-2 text-sm font-medium transition",
      active === name
        ? "bg-[#1246a0] text-white"
        : "text-[#16325c] hover:bg-[#eef4ff] hover:text-[#0a2f78]",
    ].join(" ");

  return (
    <header className="border-b border-[#dce6f5] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-3 leading-tight text-[#071b42]" href="/">
          <Image
            alt="Atlas lion and mountain logo"
            className="h-14 w-14 object-contain"
            height={720}
            priority
            src="/brand/atlas-logo.png"
            width={720}
          />
          <span>
            <span className="block text-lg font-bold tracking-tight">
              Atlas For Entrepreneurs
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1246a0] sm:block">
              Service Business Growth OS
            </span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {active === "home" ? (
            <>
              <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#16325c] transition hover:bg-[#eef4ff] hover:text-[#0a2f78] sm:block" href="#how-it-works">
                How it works
              </a>
              <Link className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#16325c] transition hover:bg-[#eef4ff] hover:text-[#0a2f78] md:block" href="/atlas-team-live">
                Atlas team live
              </Link>
              <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#16325c] transition hover:bg-[#eef4ff] hover:text-[#0a2f78] md:block" href="#founding-pilot">
                30-day sprint
              </a>
            </>
          ) : (
            <Link className={linkClass("home")} href="/">
              Home
            </Link>
          )}
          <Link className={linkClass("assessment")} href="/assessment">
            <span className="sm:hidden">Find my leak</span>
            <span className="hidden sm:inline">Find my revenue leak</span>
          </Link>
          <Link className={linkClass("login")} href="/login">
            <span className="hidden sm:inline">Client login</span>
            <span className="sm:hidden">Login</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
