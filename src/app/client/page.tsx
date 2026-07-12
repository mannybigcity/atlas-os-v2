import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { signOut } from "@/server/auth/actions";
import { requireUser } from "@/server/auth/guards";

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

  return (
    <SurfaceShell
      description="This route is the authenticated client-facing Atlas workspace shell. Organization data, dashboards, and client records are not connected yet."
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
          Signed in as {user.email}. This page does not load customer data,
          metrics, documents, or activity yet.
        </div>
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
