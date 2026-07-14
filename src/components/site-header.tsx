import Link from "next/link";

type SiteHeaderProps = {
  active?: "home" | "login";
};

export function SiteHeader({ active }: SiteHeaderProps) {
  const linkClass = (name: SiteHeaderProps["active"]) =>
    [
      "rounded-full px-3 py-2 text-sm font-medium transition",
      active === name
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="leading-tight text-slate-950" href="/">
          <span className="block text-lg font-bold tracking-tight">
            Atlas For Entrepreneurs
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 sm:block">
            Guide. Grow. Live More.
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {active === "home" ? (
            <>
              <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block" href="#how-it-works">
                How it works
              </a>
              <a className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 md:block" href="#founding-pilot">
                Founding pilot
              </a>
            </>
          ) : (
            <Link className={linkClass("home")} href="/">
              Home
            </Link>
          )}
          <Link className={linkClass("login")} href="/login">
            Client login
          </Link>
        </nav>
      </div>
    </header>
  );
}
