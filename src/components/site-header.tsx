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
        <Link className="text-lg font-bold tracking-tight text-slate-950" href="/">
          Atlas OS
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          <Link className={linkClass("home")} href="/">
            Home
          </Link>
          <Link className={linkClass("login")} href="/login">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
