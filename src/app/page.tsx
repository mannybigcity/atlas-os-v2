import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const principles = [
  "Massive Action",
  "Maximum Effort",
  "Minimal Money",
];

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <main className="bg-white">
        <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-col justify-center px-6 py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            Atlas OS v2
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            A focused operating foundation for entrepreneurs and small businesses.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Atlas is being built deliberately: public website, secure access entry,
            client dashboard, and Super Admin operations are separated from the start
            before authentication, data access, billing, or AI are introduced.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/login"
            >
              Go to login
            </Link>
            <Link
              className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              href="/client"
            >
              View client shell
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {principles.map((principle) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-900"
                key={principle}
              >
                {principle}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
