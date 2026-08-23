import Link from "next/link";
import type { ReactNode } from "react";
import { ClientPortalShell } from "@/components/client-portal-shell";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientWorkspaceScreenProps = {
  backHref: string;
  children: ReactNode;
  description: string;
  eyebrow: string;
  previewMode?: boolean;
  organizationName?: string | null;
};

export async function ClientWorkspaceScreen({
  backHref,
  children,
  description,
  eyebrow,
  organizationName,
}: ClientWorkspaceScreenProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  return (
    <ClientPortalShell description={description} eyebrow={eyebrow} organizationName={organizationName}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            href={backHref}
          >
            {spanish ? "← Resumen del espacio" : "← Workspace overview"}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              href="/"
            >
              {spanish ? "Sitio público" : "Public site"}
            </Link>
          </div>
        </div>

        {children}
      </div>
    </ClientPortalShell>
  );
}
