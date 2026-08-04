import Link from "next/link";
import type { ReactNode } from "react";
import { ClientPortalShell } from "@/components/client-portal-shell";

type ClientWorkspaceScreenProps = {
  backHref: string;
  children: ReactNode;
  description: string;
  eyebrow: string;
  previewMode?: boolean;
  organizationName?: string | null;
};

export function ClientWorkspaceScreen({
  backHref,
  children,
  description,
  eyebrow,
  previewMode = false,
  organizationName,
}: ClientWorkspaceScreenProps) {
  return (
    <ClientPortalShell description={description} eyebrow={eyebrow} organizationName={organizationName}>
      <div className="space-y-5">
        {previewMode ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            <p className="font-semibold">Viewer mode</p>
            <p className="mt-1">
              You are auditing the client view. Client approval and edit controls
              are disabled here.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            href={backHref}
          >
            ← Workspace overview
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              href="/"
            >
              Public site
            </Link>
          </div>
        </div>

        {children}
      </div>
    </ClientPortalShell>
  );
}
