import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BusinessAssessmentForm } from "@/components/business-assessment-form";

export const metadata: Metadata = {
  title: "Company Snapshot | Atlas",
  description:
    "Learn about the prospect's company, customers, systems, and growth goals before Atlas recommends a starting point.",
};

type PageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function AssessmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const received = params.status === "received";

  return (
    <>
      <SiteHeader active="assessment" />
      <main className="min-h-screen bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#c48713]">
                Company snapshot
              </p>
              <h1 className="mt-4 max-w-xl text-5xl font-black tracking-[-0.085em] text-[#06266d] sm:text-6xl lg:text-7xl">
                Tell Atlas about the business.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Share the company story, customer flow, and growth goals so Atlas
                can recommend the right next step.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Finish the snapshot to unlock a 7-day free trial review option if
                the business is a fit.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["4 sections", "No credit card", "Human review", "Company focused"].map(
                  (item) => (
                    <span
                      className="rounded-full border border-[#dbe6f3] bg-[#f8fbff] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#1246a0]"
                      key={item}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-[radial-gradient(circle_at_20%_15%,rgba(245,185,50,0.18),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(18,70,160,0.18),transparent_45%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[#dbe6f3] bg-[#071b42] p-4 text-white shadow-[0_1.25rem_2.75rem_rgba(6,27,82,.16)] sm:p-5">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                  <div className="relative aspect-[16/11]">
                    <Image
                      alt="Atlas company snapshot preview"
                      className="object-cover"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 48vw"
                      src="/brand/free-business-assessment.png"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Lead flow", "How customers arrive"],
                    ["Priority", "What needs attention first"],
                    ["Review", "What Atlas learns next"],
                  ].map(([title, text]) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/7 p-4"
                      key={title}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ffd068]">
                        {title}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-5 text-blue-100">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {received ? (
            <section className="rounded-[1.75rem] border border-[#b8e2cf] bg-white p-8 shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.08)] sm:p-12">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#167151]">
                Company snapshot received
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#06266d] sm:text-4xl">
                Thank you. Atlas has the company details.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                We will review the answers and recommend the best starting
                point. Your company snapshot is now in the Atlas review queue;
                if the fit is right, you will see the next step, including a
                7-day free trial review option.
              </p>
              <Link
                className="mt-8 inline-flex rounded-full bg-[#1246a0] px-6 py-3 font-black text-white hover:bg-[#0a2f78]"
                href="/"
              >
                Return to the Atlas home page
              </Link>
            </section>
          ) : (
            <BusinessAssessmentForm error={params.error} />
          )}
        </div>
      </main>
    </>
  );
}
