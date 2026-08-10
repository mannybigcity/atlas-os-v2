import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  atlasFoundingBusinessOffer,
  atlasPhoneAiAddOn,
  atlasPricingComparisonRows,
  atlasPricingFaqs,
  atlasPricingPlans,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing | Atlas For Entrepreneurs",
  description: "Atlas pricing for solo operators, growing businesses, and established teams.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Atlas Pricing",
    description:
      "One system to help you find more prospects, follow up faster, and close more deals.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas Pricing",
    description:
      "One system to help you find more prospects, follow up faster, and close more deals.",
  },
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function PricingPage() {
  return (
    <>
      <SiteHeader active="pricing" />
      <main className="bg-[#061631] text-white">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -left-44 top-24 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#1246a0]/30 blur-[130px]" />
          <div className="absolute -right-44 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#f5b932]/14 blur-[130px]" />

          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-end lg:py-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd068]">
                Pricing
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[4.9rem]">
                One system to help you find more prospects, follow up faster,
                and close more deals.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100/80 sm:text-xl sm:leading-9">
                Start with the tools your business needs today. Add more automation as you grow.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                  href="/atlas-team-live"
                >
                  See ATLAS in Action
                  <span aria-hidden="true" className="ml-2 text-lg leading-none">
                    &rarr;
                  </span>
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  href="/assessment"
                >
                  Start Your Business Assessment
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-blue-100/70">
                <span>Monthly usage allowance included</span>
                <span>Human approval before external action</span>
                <span>Founding business launch offer available by review</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_24px_80px_rgba(3,12,30,0.28)] sm:p-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#f7f9fc] p-5 text-[#071b42]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                  What the plans do
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                  One operating system, scaled by need.
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {atlasPricingPlans.map((plan) => (
                    <div
                      className={`rounded-2xl border p-4 ${
                        plan.featured
                          ? "border-[#f0c24a] bg-[#fff8df]"
                          : "border-[#dbe5f4] bg-white"
                      }`}
                      key={plan.slug}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#527096]">
                        {plan.name}
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight">
                        {money.format(plan.monthlyPrice)}
                        <span className="text-sm font-semibold text-slate-500">
                          /mo
                        </span>
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{plan.bestFor}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="grid gap-5 lg:grid-cols-3">
              {atlasPricingPlans.map((plan) => (
                <article
                  className={`relative overflow-hidden rounded-[1.9rem] border p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 ${
                    plan.featured
                      ? "border-[#f0c24a] bg-[#fffdf5] lg:scale-[1.02]"
                      : "border-[#dce5f1] bg-white"
                  }`}
                  key={plan.slug}
                >
                  {plan.featured ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[#f5b932] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#071b42]">
                      Most popular
                    </span>
                  ) : null}
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {plan.name}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <p className="text-5xl font-black tracking-[-0.06em]">
                      {money.format(plan.monthlyPrice)}
                    </p>
                    <p className="pb-2 text-sm font-semibold text-slate-500">/month</p>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#16325c]">
                    {plan.bestFor}
                  </p>
                  <div className="mt-5 rounded-2xl border border-[#dce5f1] bg-[#f8fbff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#527096]">
                    {plan.usageAllowance}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                    {plan.features.map((feature) => (
                      <li className="flex gap-3" key={feature}>
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b932]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 border-t border-[#e7edf6] pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#527096]">
                      Future capacity
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {plan.futureFeatures.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-7 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {plan.availability === "available"
                        ? "Available now"
                        : plan.availability === "launch_offer"
                          ? "Launch offer"
                          : "Coming soon"}
                    </p>
                    <Link
                      className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                        plan.featured
                          ? "bg-[#071b42] !text-white hover:bg-[#0a2f78] hover:!text-white"
                          : "bg-[#f5b932] !text-[#071b42] hover:bg-[#ffd064] hover:!text-[#071b42]"
                      }`}
                      href="/assessment"
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <section className="mt-8 rounded-[1.8rem] border border-[#d9e4f4] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="flex flex-col gap-2 border-b border-[#e5edf7] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    Plan comparison
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#071b42] sm:text-3xl">
                    What each Atlas plan includes
                  </h2>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  The table below is the plain-English version of the pricing structure.
                </p>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left">
                  <caption className="sr-only">
                    Atlas pricing comparison between Start, Grow, and Command.
                  </caption>
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <th className="border-b border-[#e5edf7] px-4 py-3 font-black">
                        Plan
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS START
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS GROW
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS COMMAND
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {atlasPricingComparisonRows.map((row, index) => (
                      <tr
                        className={index % 2 === 0 ? "bg-[#f8fbff]" : "bg-white"}
                        key={row.label}
                      >
                        <th className="border-b border-[#edf2f8] px-4 py-4 text-sm font-semibold text-[#16325c]">
                          {row.label}
                        </th>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {row.start}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {row.grow}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {row.command}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-8 rounded-[1.8rem] border border-[#d9e4f4] bg-white p-6 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    Launch offer
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                    {atlasFoundingBusinessOffer.name}
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                    {atlasFoundingBusinessOffer.summary}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f0c24a] bg-[#fff8df] px-5 py-4 text-sm text-[#4b3800]">
                  <p className="font-black uppercase tracking-[0.16em]">
                    Limited pilot
                  </p>
                  <p className="mt-2 font-semibold">
                    {atlasFoundingBusinessOffer.term} term, {atlasFoundingBusinessOffer.limit}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                What Atlas replaces or simplifies
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Fewer disconnected tools. More coordinated work.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Atlas reduces the need to bounce between disconnected prospecting,
                CRM, content, follow-up, and AI tools. It does not claim to fully
                replace HubSpot, GoHighLevel, ChatGPT, Canva, staff, or any other
                platform.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Lead discovery and sales organization in one flow",
                "Follow-up and next-step visibility without scattered notes",
                "Content drafts tied to the business goal instead of random posting",
                "Owner visibility without a pile of disconnected dashboards",
              ].map((item) => (
                <article
                  className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-5"
                  key={item}
                >
                  <span className="block h-2 w-10 rounded-full bg-[#f5b932]" />
                  <p className="mt-5 text-sm leading-7 text-slate-600">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                  Responsible automation
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  Assist and coordinate. Do not surprise the owner.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Atlas is built to stay supervised. Critical outreach, public
                  actions, and other sensitive steps remain approval-controlled
                  where the current product requires it.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [
                    "Approval gates",
                    "Sensitive actions stay in human review until the workflow is explicitly approved.",
                  ],
                  [
                    "Clear scope",
                    "Atlas coordinates the work but does not pretend to be fully autonomous.",
                  ],
                  [
                    "Business control",
                    "The owner keeps the final say on outreach, pricing changes, and public action.",
                  ],
                ].map(([title, text]) => (
                  <article
                    className="rounded-[1.6rem] border border-[#dce5f1] bg-[#f7f9fc] p-5"
                    key={title}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                      {title}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0b2553] text-white">
          <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                Coming soon
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                ATLAS FRONT DESK is the future phone layer.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100/80">
                Target future price: {atlasPhoneAiAddOn.targetPrice}. This is not
                live in the current product.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                  {atlasPhoneAiAddOn.label}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-100">
                  Not operational
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {atlasPhoneAiAddOn.name}
              </h3>
              <p className="mt-4 text-sm leading-7 text-blue-100/80">
                {atlasPhoneAiAddOn.summary}
              </p>
              <ul className="mt-5 grid gap-2 text-sm leading-6 text-blue-100/80 sm:grid-cols-2">
                {atlasPhoneAiAddOn.futureFeatures.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                FAQ
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Straight answers before you start.
              </h2>
            </div>

            <div className="mt-12 divide-y divide-[#dce5f1] rounded-[1.8rem] border border-[#dce5f1] bg-white">
              {atlasPricingFaqs.map((faq) => (
                <details className="group px-6 py-5" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-black text-[#071b42]">
                    {faq.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c8d6e8] text-lg font-medium text-[#1246a0] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-4 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#061631] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.06)_55%,transparent_55%)]" />
          <div className="relative mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                Next move
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                Choose the plan that matches your growth stage.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/80">
                If you want help deciding, start with the business assessment.
                Amanda and the sales workflow can guide the fit conversation
                without fabricating pricing or promises.
              </p>
            </div>
            <div className="text-center lg:text-right">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                href="/assessment"
              >
                Start Your Business Assessment
              </Link>
              <p className="mt-4 text-xs font-semibold text-blue-100/70">
                No automatic subscription. No unsupported feature claims.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}


