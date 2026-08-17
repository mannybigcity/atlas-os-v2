import type { ReactNode } from "react";

type SurfaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  contentClassName?: string;
  wide?: boolean;
  children?: ReactNode;
};

export function SurfaceShell({
  eyebrow,
  title,
  description,
  className = "",
  contentClassName = "",
  wide = false,
  children,
}: SurfaceShellProps) {
  return (
    <main className={`min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 ${className}`}>
      <section className={`mx-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 ${wide ? "max-w-none" : "max-w-7xl"}`}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          {description}
        </p>
        {children ? <div className={`mt-8 ${contentClassName}`}>{children}</div> : null}
      </section>
    </main>
  );
}
