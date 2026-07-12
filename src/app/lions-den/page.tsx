import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

export default async function LionsDenPage() {
  const user = await requireSuperAdmin("/lions-den");
  const organizations = await getOrganizationsForSuperAdmin();

  return (
    <SurfaceShell
      description="This authenticated route establishes the future internal operations surface for Atlas Super Admin users. It is intentionally isolated from the client dashboard route and contains no operational controls yet."
      eyebrow="Super Admin"
      title="The Lion's Den shell"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        Signed in as Super Admin {user.email}. This page does not expose
        platform controls, client records, diagnostics, or privileged data yet.
      </div>

      <div className="mt-4 space-y-4">
        {organizations.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Workspace tables are not ready yet. Apply the workspace foundation
            migration in Supabase to enable the organization list shell.
          </div>
        ) : null}

        {!organizations.setupRequired && organizations.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            No organizations exist yet.
          </div>
        ) : null}

        {organizations.data.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Organizations
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {organizations.data.map((organization) => (
                <div className="py-4 first:pt-0 last:pb-0" key={organization.id}>
                  <p className="font-medium text-slate-950">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Slug: {organization.slug ?? "not set"}
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
