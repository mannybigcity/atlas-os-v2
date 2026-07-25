import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SurfaceShell } from "@/components/surface-shell";
import { ClientQTimeDashboard } from "@/components/client-qtime-dashboard";
import { signOut } from "@/server/auth/actions";
import {
  getClientWorkspaceContext,
} from "@/server/client-workspace/context";
import { getClientDashboardData } from "@/server/client-dashboard/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Command Center | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
    content?: string;
    identity?: string;
    message?: string;
    note?: string;
    pilot?: string;
    previewOrg?: string;
    profile?: string;
    status?: string;
  }>;
};

function StatusAlert({
  children,
  tone = "emerald",
}: {
  children: ReactNode;
  tone?: "emerald" | "amber" | "rose" | "blue";
}) {
  const classes = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`rounded-2xl border p-5 text-sm leading-6 ${classes[tone]}`}>
      {children}
    </div>
  );
}
export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const params = await searchParams;
  const workspace = await getClientWorkspaceContext("/client", params);
  const { isClientPreview, memberships, previewOrgSlug, previewOrganization, primaryOrganization } =
    workspace;

  const dashboard = primaryOrganization
    ? await getClientDashboardData(primaryOrganization.id)
    : null;

  return (
    <SurfaceShell
      description="A protected client workspace for QTIME that keeps the 30-day priority, approvals, calendar, pipeline, and scoped AI requests visible without exposing owner-only secrets or costs."
      eyebrow={isClientPreview ? "Client preview" : "Client command center"}
      title={primaryOrganization?.name ?? "Client workspace"}
    >
      <div className="space-y-4">
        {params?.status === "welcome" ? (
          <StatusAlert>
            Welcome to Atlas. Your private workspace is ready.
          </StatusAlert>
        ) : null}

        {params?.access === "denied" ? (
          <StatusAlert tone="amber">
            Your login worked, but this account is not authorized for that area.
          </StatusAlert>
        ) : null}

        {params?.pilot === "review_saved" || params?.content === "review_saved" ? (
          <StatusAlert>Your review was saved for Atlas.</StatusAlert>
        ) : null}

        {params?.pilot === "review_error" || params?.content === "review_error" ? (
          <StatusAlert tone="rose">
            That review could not be saved. Try again or message Atlas.
          </StatusAlert>
        ) : null}

        {previewOrganization?.setupRequired ? (
          <StatusAlert tone="rose">
            Atlas could not load the requested client preview. Confirm the
            organization slug and workspace access.
          </StatusAlert>
        ) : null}

        {previewOrgSlug && previewOrganization && !previewOrganization.data ? (
          <StatusAlert tone="amber">
            No organization was found for preview slug &ldquo;{previewOrgSlug}
            &rdquo;.
          </StatusAlert>
        ) : null}

        {isClientPreview ? (
          <StatusAlert tone="blue">
            <p className="font-semibold">Viewer mode</p>
            <p className="mt-1">
              You are seeing the client command center in read-only mode. Review
              and edit controls stay off here so you can audit the experience
              without acting as the client.
            </p>
          </StatusAlert>
        ) : null}

        {memberships.setupRequired ? (
          <StatusAlert tone="rose">
            Atlas could not load workspace access. Contact Atlas so we can
            restore the account.
          </StatusAlert>
        ) : null}

        {!memberships.setupRequired && memberships.data.length === 0 ? (
          <StatusAlert tone="amber">
            Your login is active, but a business workspace has not been assigned
            yet. Contact Atlas and we will connect it.
          </StatusAlert>
        ) : null}

        {primaryOrganization && dashboard ? (
          <ClientQTimeDashboard workspace={workspace} dashboard={dashboard} />
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/"
        >
          Public site
        </Link>
        <form action={signOut}>
          <button
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </SurfaceShell>
  );
}
