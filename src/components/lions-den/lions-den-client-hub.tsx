import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AtlasStaffPane } from "@/components/lions-den/atlas-staff-pane";
import { getClientPortalName } from "@/lib/client-portal/identity";
import {
  lionsDenBoards,
  lionsDenHref,
  type LionsDenBoard,
} from "@/lib/lions-den/client-hub";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { ClientAiRequest } from "@/server/client-ai/queries";
import type { ClientAiDailyUsage } from "@/server/client-ai/queries";

type LionsDenClientHubProps = {
  board: LionsDenBoard;
  organizationId?: string;
  organizationName?: string | null;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  workspaces?: Array<{ name: string; slug: string }>;
  previewMode?: boolean;
  aiRequests?: ClientAiRequest[];
  aiUsage?: ClientAiDailyUsage | null;
  children: ReactNode;
};

export async function LionsDenClientHub({
  board,
  organizationId,
  organizationName,
  previewOrgSlug,
  workspaceSlug,
  workspaces = [],
  previewMode = false,
  aiRequests = [],
  aiUsage = null,
  children,
}: LionsDenClientHubProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const portalName = getClientPortalName(organizationName);
  const orgLabel = String(organizationName ?? "").trim();

  return (
    <div className="lions-den-hub min-h-screen bg-[#f4f1e8] text-[#071b42]">
      <header className="border-b border-[#d8c27a] bg-[#071b42] text-white">
        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5b932]">
              {spanish ? "Centro de operaciones" : "Operations hub"}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em]">
              {portalName}
            </h1>
            {orgLabel ? (
              <p className="mt-1 text-sm text-white/75">{orgLabel}</p>
            ) : null}
          </div>
          <nav aria-label={spanish ? "Acciones del espacio" : "Workspace actions"} className="flex flex-wrap items-center gap-2">
            {workspaces.length > 1
              ? workspaces.map((workspace) => (
                  <Link
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      workspace.name === organizationName
                        ? "border-[#f5b932] bg-[#f5b932] text-[#071b42]"
                        : "border-white/25 bg-transparent text-white hover:border-[#f5b932]"
                    }`}
                    href={`/client?workspace=${encodeURIComponent(workspace.slug)}`}
                    key={workspace.slug}
                  >
                    {workspace.name}
                  </Link>
                ))
              : null}
            <LanguageSwitcher />
            <form action={signOut}>
              <button
                className="rounded-full bg-[#f5b932] px-3.5 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#ffd266]"
                type="submit"
              >
                {spanish ? "Cerrar sesión" : "Sign out"}
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="grid gap-0 xl:grid-cols-[15rem_minmax(0,1fr)_20rem]">
        <aside className="border-b border-[#d8c27a] bg-white xl:border-b-0 xl:border-r">
          <nav aria-label={spanish ? "The Lion’s Den" : "The Lion’s Den"} className="flex gap-2 overflow-x-auto p-3 xl:block xl:space-y-1 xl:overflow-visible xl:p-4">
            {lionsDenBoards.map((item) => {
              const active = item.id === board;
              return (
                <Link
                  className={`block shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#071b42] text-[#f5b932]"
                      : "text-[#071b42] hover:bg-[#f5b932]/20"
                  }`}
                  href={lionsDenHref(item.href, previewOrgSlug, workspaceSlug)}
                  key={item.id}
                >
                  {spanish ? item.labelEs : item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 bg-[#fbfaf4] p-4 sm:p-6">{children}</main>

        <aside className="border-t border-[#d8c27a] bg-white xl:border-t-0 xl:border-l">
          <AtlasStaffPane
            dailyUsage={aiUsage}
            organizationId={organizationId ?? ""}
            organizationName={orgLabel || portalName}
            previewMode={previewMode || !organizationId}
            requests={aiRequests}
          />
        </aside>
      </div>
    </div>
  );
}
