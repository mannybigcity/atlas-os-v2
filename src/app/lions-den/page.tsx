import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function LionsDenPage() {
  const user = await requireSuperAdmin("/lions-den");

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
