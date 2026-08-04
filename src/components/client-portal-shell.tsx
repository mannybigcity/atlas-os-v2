import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth/actions";
import { getClientPortalName } from "@/lib/client-portal/identity";

type ClientPortalShellProps = {
  organizationName?: string | null;
  eyebrow?: string;
  description: string;
  children: ReactNode;
};

export function ClientPortalShell({
  organizationName,
  eyebrow = "Private client workspace",
  description,
  children,
}: ClientPortalShellProps) {
  const portalName = getClientPortalName(organizationName);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#5672f0]">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
                {portalName}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                {description}
              </p>
            </div>
            <nav aria-label="Workspace actions" className="flex flex-wrap gap-2">
              <Link className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" href="/client">
                Overview
              </Link>
              <form action={signOut}>
                <button className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </header>
        <div className="p-5 sm:p-8">{children}</div>
      </section>
    </main>
  );
}

