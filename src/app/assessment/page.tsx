import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BusinessAssessmentForm } from "@/components/business-assessment-form";

export const metadata: Metadata = {
  title: "Business Health Assessment | Atlas",
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
      <SiteHeader active="snapshot" />
      <main className="min-h-screen bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c48713]">
                Business Health Assessment
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#06266d] sm:text-6xl">
                Tell Atlas about the business.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Share the company story, customer flow, and growth goals so Atlas
                can recommend the right next step.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Complete the assessment to see whether Atlas is the right fit for
                the next stage of growth.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f7cc62]">
                Your growth path
              </p>
              <p className="mt-3 text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">
                Get more leads. Follow up faster. Close more deals.
              </p>
              <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Atlas assessment outcomes">
                {[
                  ["01", "Get more leads", "Find where qualified opportunities are being missed."],
                  ["02", "Follow up faster", "See where your sales process loses momentum."],
                  ["03", "Close more deals", "Identify the highest-impact next step for growth."],
                ].map(([number, title, detail]) => (
                  <li className="rounded-2xl border border-white/15 bg-white/10 p-4" key={number}>
                    <span className="text-xs font-black tracking-[0.2em] text-[#f7cc62]">{number}</span>
                    <h2 className="mt-3 text-base font-black leading-5 text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-5 text-white/72">{detail}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm leading-6 text-white/78">
                Answer a few focused questions, then Atlas will recommend the
                clearest place to start.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {received ? (
            <section className="rounded-[1.75rem] border border-[#b8e2cf] bg-white p-8 shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.08)] sm:p-12">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#167151]">
                Assessment received
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#06266d] sm:text-4xl">
                Thank you. Atlas has the company details.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Atlas will review the answers and recommend the best starting
                point. If the fit is right, you will see the next step, including
                a 7-day free trial review option.
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
