import type { Metadata } from "next";
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
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c48713]">
                Company snapshot
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#06266d] sm:text-6xl">
                Tell Atlas about the business.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Share the company story, customer flow, and growth goals so Atlas
                can recommend the right next step.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Finish the snapshot to unlock a 7-day free trial review option if
                the business is a fit.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)] sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f7cc62]">
                What to expect
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/78">
                <li>Company story and ideal customer</li>
                <li>Lead flow, follow-up, and priorities</li>
                <li>Budget, timing, and contact details</li>
                <li>7-day free trial review option if Atlas is a fit</li>
              </ul>
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
                Manny will review the answers and recommend the best starting
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
