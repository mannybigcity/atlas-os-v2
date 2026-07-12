import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
              Secure access
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Login shell for Atlas clients and Super Admin users.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              This page is a visual foundation only. Secure authentication is not
              active yet, and this form does not submit credentials or provide data
              access.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
                href="/"
              >
                Back to public site
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-500"
                  disabled
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-500"
                  disabled
                  id="password"
                  placeholder="Not active yet"
                  type="password"
                />
              </div>

              <button
                className="w-full cursor-not-allowed rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
                disabled
                type="button"
              >
                Authentication not active
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
