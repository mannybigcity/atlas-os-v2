const principles = ["Massive Action", "Maximum Effort", "Minimal Money"];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-sky-950/30 backdrop-blur">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
          Atlas OS v2
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
          The AI operating system for entrepreneurs starts with a clear foundation.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          This scaffold is intentionally minimal: product direction, architecture notes,
          and a clean Next.js starting point. The next step is a focused Command Center
          shell before adding infrastructure or product features.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {principles.map((principle) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-slate-100"
              key={principle}
            >
              {principle}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
