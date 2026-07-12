import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";

export default function LionsDenPage() {
  return (
    <SurfaceShell
      description="This route establishes the future internal operations surface for Atlas Super Admin users. It is intentionally isolated from the client dashboard route and contains no operational controls yet."
      eyebrow="Super Admin"
      title="The Lion's Den shell"
    >
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
        Super Admin access is not active yet. This page does not expose platform
        controls, client records, diagnostics, or privileged data.
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
