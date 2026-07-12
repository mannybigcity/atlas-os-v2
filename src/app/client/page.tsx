import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { signOut } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
  }>;
};

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const user = await requireUser("/client");
  const params = await searchParams;
  const memberships = await getUserMemberships(user.id);

  return (
    <SurfaceShell
      description="This route is the authenticated client-facing Atlas workspace shell. It now reads organization membership through Supabase RLS."
      eyebrow="Client access"
      title="Client Dashboard shell"
    >
      <div className="space-y-4">
        {params?.access === "denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Your account is authenticated, but it is not authorized for The
            Lion&apos;s Den.
          </div>
        ) : null}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          Signed in as {user.email}. This page only reads your organization
          membership shell. Customer data, metrics, documents, and activity are
          not connected yet.
        </div>

        {memberships.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Workspace tables are not ready yet. Apply the workspace foundation
            migration in Supabase, then add an organization membership.
          </div>
        ) : null}

        {!memberships.setupRequired && memberships.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            No organization membership is assigned to this account yet.
          </div>
        ) : null}

        {memberships.data.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Your organizations
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {memberships.data.map((membership) => (
                <div className="py-4 first:pt-0 last:pb-0" key={membership.id}>
                  <p className="font-medium text-slate-950">
                    {membership.organization?.name ?? "Unknown organization"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Role: {membership.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
