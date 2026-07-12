import type { ReactNode } from "react";

type SurfaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SurfaceShell({
  eyebrow,
  title,
  description,
  children,
}: SurfaceShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          {description}
        </p>
        {children ? <div className="mt-8">{children}</div> : null}
      </section>
    </main>
  );
}
