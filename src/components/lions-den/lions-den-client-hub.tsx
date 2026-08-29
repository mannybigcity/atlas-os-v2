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
    <div className="lions-den-hub min-h-screen bg-white text-[#071b42]">
      <header className="border-b border-[#0a2a5c] bg-[#071b42] text-white">
        <div className="flex flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f5b932]">
              {portalName}
            </p>
            {orgLabel ? (
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.04em]">
                {orgLabel}
              </h1>
            ) : (
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.04em]">
                {spanish ? "Escritorio de trabajo" : "Working desk"}
              </h1>
            )}
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
        <aside className="border-b border-[#0a2a5c] bg-[#071b42] text-white xl:min-h-[calc(100vh-4.5rem)] xl:border-b-0 xl:border-r">
          <div className="hidden px-4 pt-5 xl:block">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f5b932]">
              {spanish ? "Menú del escritorio" : "Desk menu"}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/70">
              {spanish
                ? "Prioridades, seguimiento y herramientas. ATLAS está a la derecha."
                : "Priorities, follow-up, and tools. ATLAS stays on the right."}
            </p>
          </div>
          <nav aria-label={spanish ? "The Lion’s Den" : "The Lion’s Den"} className="flex gap-2 overflow-x-auto p-3 xl:block xl:space-y-1 xl:overflow-visible xl:p-4">
            {lionsDenBoards.map((item) => {
              const active = item.id === board;
              return (
                <Link
                  className={`block shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#f5b932] text-[#071b42]"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
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

        <main className="min-w-0 bg-white p-4 sm:p-6">{children}</main>

        <aside className="border-t border-[#d5d0c4] bg-[#fbfaf4] xl:border-t-0 xl:border-l">
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
