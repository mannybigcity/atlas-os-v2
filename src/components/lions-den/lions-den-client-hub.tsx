import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AtlasStaffPane } from "@/components/lions-den/atlas-staff-pane";
import { getClientPortalName, getClientPortalOrgLabel, isAfeCrmDemoOrganization } from "@/lib/client-portal/identity";
import {
  lionsDenHref,
  lionsDenOperatorBoards,
  visibleLionsDenBoards,
  type LionsDenBoard,
} from "@/lib/lions-den/client-hub";
import { trialInboxNavLabel } from "@/lib/lions-den/trial-inbox";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { ClientAiRequest } from "@/server/client-ai/queries";
import type { ClientAiDailyUsage } from "@/server/client-ai/queries";

type LionsDenClientHubProps = {
  board: LionsDenBoard;
  organizationId?: string;
  organizationName?: string | null;
  organizationSlug?: string | null;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  workspaces?: Array<{ name: string; slug: string }>;
  aiRequests?: ClientAiRequest[];
  aiUsage?: ClientAiDailyUsage | null;
  showTrialInbox?: boolean;
  trialInboxCount?: number;
  children: ReactNode;
};

export async function LionsDenClientHub({
  board,
  organizationId,
  organizationName,
  organizationSlug,
  previewOrgSlug,
  workspaceSlug,
  workspaces = [],
  aiRequests = [],
  aiUsage = null,
  showTrialInbox = false,
  trialInboxCount = 0,
  children,
}: LionsDenClientHubProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const organization = { name: organizationName, slug: organizationSlug || workspaceSlug };
  const portalName = getClientPortalName(organizationName, organization);
  const orgLabel = getClientPortalOrgLabel(organization);
  const boards = visibleLionsDenBoards({
    name: organizationName,
    slug: workspaceSlug || previewOrgSlug,
  });

  return (
    <div className="lions-den-hub bg-white text-[#071b42]">
      <header className="shrink-0 border-b border-[#0a2a5c] bg-[#071b42] text-white">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5b932]">
              {portalName}
            </p>
            <h1 className="truncate font-[family-name:var(--font-display)] text-lg leading-tight tracking-[-0.03em] sm:text-xl">
              {orgLabel || (spanish ? "Escritorio de trabajo" : "Working desk")}
            </h1>
          </div>
          <nav aria-label={spanish ? "Acciones del espacio" : "Workspace actions"} className="flex shrink-0 flex-wrap items-center gap-2">
            {workspaces.length > 1
              ? workspaces.map((workspace) => (
                  <Link
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      workspace.slug === organizationSlug || workspace.name === organizationName
                        ? "border-[#f5b932] bg-[#f5b932] text-[#071b42]"
                        : "border-white/25 bg-transparent text-white hover:border-[#f5b932]"
                    }`}
                    href={`/client?workspace=${encodeURIComponent(workspace.slug)}`}
                    key={workspace.slug}
                  >
                    {getClientPortalOrgLabel(workspace) || workspace.name}
                  </Link>
                ))
              : null}
            <LanguageSwitcher />
            <form action={signOut}>
              <button
                className="rounded-full bg-[#f5b932] px-3 py-1.5 text-xs font-semibold text-[#071b42] transition hover:bg-[#ffd266]"
                type="submit"
              >
                {spanish ? "Cerrar sesión" : "Sign out"}
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="lions-den-hub-body">
        <aside className="lions-den-hub-nav border-b border-[#0a2a5c] bg-[#071b42] text-white xl:border-b-0 xl:border-r">
          <div className="hidden px-3 pt-3 xl:block">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f5b932]">
              {spanish ? "Menú del escritorio" : "Desk menu"}
            </p>
          </div>
          <nav aria-label="The Lion’s Den" className="flex gap-1 overflow-x-auto p-2 xl:block xl:space-y-0.5 xl:overflow-visible xl:p-3">
            {boards.map((item) => {
              const active = item.id === board;
              return (
                <Link
                  className={`block shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
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
            {showTrialInbox
              ? lionsDenOperatorBoards.map((item) => {
                  const active = item.id === board;
                  const hasNew = trialInboxCount > 0;
                  return (
                    <Link
                      className={`block shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
                        active
                          ? "bg-[#f5b932] text-[#071b42]"
                          : hasNew
                            ? "ld-trial-nav-new text-[#f5b932] hover:bg-white/10"
                            : "text-white/85 hover:bg-white/10 hover:text-white"
                      }`}
                      href={item.href}
                      key={item.id}
                    >
                      {trialInboxNavLabel(trialInboxCount, spanish)}
                    </Link>
                  );
                })
              : null}
          </nav>
        </aside>

        <main className="lions-den-hub-main min-w-0 bg-[#f7f5ee] p-3 sm:p-4" data-board={board}>
          {children}
        </main>

        <aside className="lions-den-hub-staff border-t border-[#d5d0c4] bg-[#fbfaf4] xl:border-t-0 xl:border-l">
          <AtlasStaffPane
            compact
            dailyUsage={aiUsage}
            organizationId={organizationId ?? ""}
            organizationName={orgLabel || portalName}
            requests={aiRequests}
            sampleDesk={isAfeCrmDemoOrganization({ name: organizationName, slug: organizationSlug || workspaceSlug })}
          />
        </aside>
      </div>
    </div>
  );
}
