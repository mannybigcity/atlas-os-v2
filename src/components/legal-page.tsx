import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export function LegalPage({
  eyebrow,
  title,
  summary,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b17700]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              {summary}
            </p>
            <p className="mt-5 text-sm font-semibold text-[#1246a0]">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        <article className="mx-auto max-w-4xl space-y-7 px-6 py-12 sm:py-16">
          {children}
        </article>
      </main>
    </>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#dce6f5] bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-slate-600">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>;
}

export const legalLinkClass =
  "font-semibold text-[#1246a0] underline decoration-blue-200 underline-offset-4 hover:text-[#0a2f78]";
