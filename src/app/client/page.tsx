import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";

export default function ClientDashboardPage() {
  return (
    <SurfaceShell
      description="This route establishes the future client-facing Atlas workspace. Authentication, organization data, dashboards, and client records are not connected yet."
      eyebrow="Client access"
      title="Client Dashboard shell"
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Secure client access is not active yet. This page does not load customer
        data, metrics, documents, or activity.
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/"
        >
          Public site
        </Link>
        <Link
          className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/login"
        >
          Login shell
        </Link>
      </div>
    </SurfaceShell>
  );
}
