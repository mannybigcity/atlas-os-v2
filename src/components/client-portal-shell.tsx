import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth/actions";
import { getClientPortalName } from "@/lib/client-portal/identity";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientPortalShellProps = {
  organizationName?: string | null;
  eyebrow?: string;
  description: string;
  children: ReactNode;
  fullWidth?: boolean;
  showOverviewLink?: boolean;
  workspaces?: Array<{ name: string; slug: string }>;
};

export async function ClientPortalShell({
  organizationName,
  eyebrow = "Private client workspace",
  description,
  children,
  fullWidth = false,
  showOverviewLink = true,
  workspaces = [],
}: ClientPortalShellProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const portalName = getClientPortalName(organizationName);
  const isSisWorkspace = /^sis custom creations$/i.test(String(organizationName ?? ""));
  const localizedEyebrow = spanish && eyebrow === "Private client workspace"
    ? "Espacio privado del cliente"
    : eyebrow;
  const localizedPortalName = spanish && !isSisWorkspace
    ? portalName === "Your Lion’s Den"
      ? "Tu Centro de Mando"
      : `${portalName.replace(/’s Lion’s Den$/, "")} · Centro de Mando`
    : portalName;

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-5">
      <section className={`mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${fullWidth ? "w-full max-w-none" : "max-w-7xl"}`}>
        <header className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.1),transparent_34%),linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#5672f0]">
                {localizedEyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-3xl">
                {localizedPortalName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            <nav aria-label={spanish ? "Acciones del espacio de trabajo" : "Workspace actions"} className="flex flex-wrap items-center gap-2">
              {workspaces.length > 1 ? workspaces.map((workspace) => <Link className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${workspace.name === organizationName ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`} href={`/client?workspace=${encodeURIComponent(workspace.slug)}`} key={workspace.slug}>{workspace.name}</Link>) : null}
              {showOverviewLink ? <Link className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" href="/client">{spanish ? "Resumen" : "Overview"}</Link> : null}
              <LanguageSwitcher />
              <form action={signOut}>
                <button className="rounded-full bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
                  {spanish ? "Cerrar sesión" : "Sign out"}
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

