import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AtlasBetaProof } from "@/components/atlas-beta-proof";
import { AtlasProductPreview } from "@/components/atlas-product-preview";

const assessmentHref = "/assessment";

const painPoints = [
  {
    number: "01",
    title: "Warm leads go cold",
    text: "Calls, forms, estimates, and referrals land in different places. The next follow-up depends on memory.",
  },
  {
    number: "02",
    title: "Marketing stops when work gets busy",
    text: "Posting, reviews, offers, and customer reminders become one more job the owner cannot get to.",
  },
  {
    number: "03",
    title: "The owner carries the whole system",
    text: "Priorities, customer context, and growth ideas live in one head instead of a repeatable operating rhythm.",
  },
];

const capabilities = [
  {
    role: "ATLAS",
    title: "One growth priority",
    text: "Turns the business assessment into a focused 30-day plan, clear decisions, and the next best action.",
    badge: "Chief of Staff",
  },
  {
    role: "HUNTER",
    title: "Better opportunities",
    text: "Organizes lead research, fit signals, sources, and revenue opportunities for owner review.",
    badge: "Lead Research",
  },
  {
    role: "MICAH",
    title: "Consistent marketing",
    text: "Prepares useful local content, offers, and campaign drafts connected to the work you want more of.",
    badge: "Content Studio",
  },
  {
    role: "DAVID",
    title: "Every lead gets a next step",
    text: "Keeps contacts, notes, follow-up dates, and open opportunities visible in one private pipeline.",
    badge: "CRM + Follow-up",
  },
];

const sprintWeeks = [
  {
    week: "Week 1",
    title: "Find the leaks",
    text: "Review your lead flow, follow-up, marketing, website, and current 30-day goal.",
  },
  {
    week: "Week 2",
    title: "Install the operating view",
    text: "Organize the priorities, prospects, customer notes, and next actions that matter first.",
  },
  {
    week: "Week 3",
    title: "Build the growth assets",
    text: "Prepare the follow-up sequence, campaign, content, or workflow approved in your plan.",
  },
  {
    week: "Week 4",
    title: "Review what moved",
    text: "Measure the work, tighten the system, and choose the next growth priority with evidence.",
  },
];

const fitChecks = [
  "You run an owner-led service business with real customers and repeatable work.",
  "Most leads arrive through calls, forms, referrals, Google, or social media.",
  "Follow-up and marketing still depend heavily on you.",
  "You want a practical system without becoming an AI expert.",
  "You are willing to review and approve work before anything goes out.",
];

const faqs = [
  {
    question: "Is Atlas another CRM I have to learn?",
    answer:
      "Atlas includes a simple private sales pipeline, but the service is broader than a CRM. It connects lead follow-up, marketing work, owner priorities, and review history around one 30-day business goal.",
  },
  {
    question: "Do I need to know anything about AI?",
    answer:
      "No. Atlas is built for practical owners who want the benefit without learning prompts, models, or a complicated technology stack.",
  },
  {
    question: "Will Atlas contact customers or publish content by itself?",
    answer:
      "Not during the founding pilot. Drafts and next actions stay private until the authorized owner reviews and approves them. Connected actions are introduced only when the workflow, cost, and controls are ready.",
  },
  {
    question: "What happens after the assessment?",
    answer:
      "Manny reviews the business context and identifies the strongest practical starting point. If Atlas is a fit, you receive a clearly scoped recommendation before any paid work begins.",
  },
];

function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`text-xs font-black uppercase tracking-[0.22em] ${
        light ? "text-[#ffd068]" : "text-[#1246a0]"
      }`}
    >
      {children}
    </p>
  );
}
function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] ${className}`}
      href={assessmentHref}
    >
      Find my revenue leak
      <span aria-hidden="true" className="ml-2 text-lg leading-none">
        &rarr;
      </span>
    </Link>
  );
}

export function AtlasHomepage({ preview = false }: { preview?: boolean }) {
  const homeHref = preview ? "/homepage-v2" : "/";

  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#071b42]">
      {preview ? (
        <div className="bg-[#f5b932] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#071b42]">
          Private homepage review route
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061631]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-3 px-5 py-3 sm:px-7">
          <Link className="flex items-center gap-3" href={homeHref}>
            <span className="rounded-xl bg-white p-1.5">
              <Image
                alt="Atlas For Entrepreneurs lion and mountain logo"
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                height={720}
                priority
                src="/brand/atlas-logo.png"
                width={720}
              />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-tight sm:text-base">
                Atlas For Entrepreneurs
              </span>
              <span className="hidden text-[8px] font-bold uppercase tracking-[0.19em] text-blue-200 sm:block">
                Service Business Growth OS
              </span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-2">
            <a
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white lg:block"
              href="#product"
            >
              Product
            </a>
            <a
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white lg:block"
              href="#30-day-system"
            >
              30-day system
            </a>
            <Link
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white lg:block"
              href="/atlas-team-live"
            >
              Atlas team live
            </Link>
            <Link
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white md:block"
              href="/login"
            >
              Client login
            </Link>
            <Link
              className="rounded-full border border-white/20 bg-white px-4 py-2.5 text-xs font-black text-[#071b42] transition hover:bg-blue-50 sm:px-5 sm:text-sm"
              href={assessmentHref}
            >
              Free growth assessment
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#061631] text-white">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="absolute -left-40 top-24 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#1246a0]/25 blur-[120px]" />
          <div className="absolute -right-40 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#f5b932]/12 blur-[120px]" />

          <div className="mx-auto grid w-full max-w-[84rem] gap-14 px-6 py-16 sm:px-7 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-blue-100">
                <span className="h-2 w-2 rounded-full bg-[#f5b932] shadow-[0_0_18px_rgba(245,185,50,0.9)]" />
                Built for owner-led service businesses
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[4.7rem]">
                Stop losing revenue between inquiry and follow-up.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100/80 sm:text-xl sm:leading-9">
                Atlas gives businesses built on appointments, estimates,
                memberships, and repeat customers one operating system for
                leads, follow-up, practical marketing, and the next growth priority.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta />
                <a
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  href="#product"
                >
                  See how Atlas works
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-blue-100/65">
                <span>7-minute assessment</span>
                <span>No credit card</span>
                <span>Paid scope only after review</span>
              </div>
            </div>

            <AtlasProductPreview />
          </div>
        </section>

        <section className="border-b border-[#dde6f2] bg-white">
          <div className="mx-auto grid w-full max-w-[84rem] gap-5 px-6 py-7 sm:grid-cols-3 sm:px-7">
            {[
              ["One private workspace", "Leads, notes, plans, and review history"],
              ["Human approval built in", "Nothing external goes out by surprise"],
              ["No AI learning curve", "Plain-English help for practical owners"],
            ].map(([title, text]) => (
              <div className="flex items-start gap-3" key={title}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf8f2] text-xs font-black text-[#137454]">
                  &#10003;
                </span>
                <div>
                  <p className="text-sm font-black text-[#071b42]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f4f7fb]" id="problem">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <Eyebrow>The real growth problem</Eyebrow>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                  The owner is still the operating system.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">
                You probably do not need more software. You need one clear view
                of the opportunities, follow-up, marketing, and decisions that
                already move through your business every day.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {painPoints.map((item) => (
                <article
                  className="group rounded-[1.75rem] border border-[#dce5f1] bg-white p-7 transition hover:-translate-y-1 hover:border-[#b5cae8] hover:shadow-xl hover:shadow-blue-950/5 sm:p-8"
                  key={item.number}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-[0.16em] text-[#1246a0]">
                      {item.number}
                    </span>
                    <span className="h-px w-12 bg-[#dce5f1] transition group-hover:w-20 group-hover:bg-[#f5b932]" />
                  </div>
                  <h3 className="mt-10 text-2xl font-black tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white" id="product">
          <div className="mx-auto grid w-full max-w-[84rem] gap-14 px-6 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <Eyebrow>One system, not four more apps</Eyebrow>
              <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                See the work. Know the next move.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Atlas coordinates the operating loop. The named roles make each
                responsibility easy to understand, while the owner keeps one
                place to review the work and make decisions.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Capture every lead and customer commitment.",
                  "Assign one owner and one next date.",
                  "Prepare follow-up and marketing for review.",
                  "Track what moved before adding more work.",
                ].map((item) => (
                  <div className="flex items-center gap-3" key={item}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#071b42] text-xs font-black text-[#ffd068]">
                      +
                    </span>
                    <p className="text-sm font-bold text-[#16325c]">{item}</p>
                  </div>
                ))}
              </div>
              <a
                className="mt-9 inline-flex items-center text-sm font-black text-[#1246a0] hover:text-[#082d73]"
                href="#30-day-system"
              >
                See the 30-day operating plan
                <span aria-hidden="true" className="ml-2">
                  &darr;
                </span>
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => (
                <article
                  className="relative overflow-hidden rounded-[1.75rem] border border-[#dce5f1] bg-[#f7f9fc] p-7"
                  key={item.role}
                >
                  <div className="absolute right-3 top-0 text-7xl font-black tracking-tighter text-[#e9eff8]">
                    {capabilities.indexOf(item) + 1}
                  </div>
                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b17800]">
                      {item.role}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-[#527096]">
                      {item.badge}
                    </p>
                    <h3 className="mt-8 text-2xl font-black tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {item.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#071b42] text-white" id="30-day-system">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(24,85,190,0.35),transparent_35%)]" />
          <div className="relative mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-28">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Eyebrow light>The first operating cycle</Eyebrow>
                <h2 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                  Install one growth system in 30 days.
                </h2>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100/75">
                  Start with the leak costing the business the most attention or
                  revenue. Build the smallest useful system around it. Then
                  measure before expanding.
                </p>
              </div>
              <PrimaryCta className="lg:mb-1" />
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 lg:grid-cols-4">
              {sprintWeeks.map((item) => (
                <article className="bg-[#0b2553] p-7 sm:p-8" key={item.week}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
                    {item.week}
                  </p>
                  <h3 className="mt-8 text-2xl font-black tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-blue-100/75">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[#f5b932]/25 bg-[#f5b932]/10 px-5 py-4 text-sm leading-6 text-[#fff2c8]">
              <strong className="text-white">Clear commercial boundary:</strong>{" "}
              the assessment is free. If Atlas is a fit, scope, timing, price,
              outside costs, and approval controls are confirmed before paid work begins.
            </div>
          </div>
        </section>

        <AtlasBetaProof />

        <section className="bg-[#f4f7fb]">
          <div className="mx-auto grid w-full max-w-[84rem] gap-12 px-6 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Eyebrow>Built for a specific kind of owner</Eyebrow>
              <h2 className="mt-5 text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">
                Practical business. Real customers. Too much living in your head.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Atlas is built around the way service businesses actually grow:
                earn attention, respond quickly, deliver good work, and give
                every customer a reason to return or refer someone else.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Appointments", "Estimates", "Recurring services", "Memberships", "Local leads", "Repeat customers"].map(
                  (businessModel) => (
                    <span
                      className="rounded-full border border-[#cfdaea] bg-white px-4 py-2 text-xs font-black text-[#16325c]"
                      key={businessModel}
                    >
                      {businessModel}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d7e2f0] bg-white p-7 shadow-xl shadow-blue-950/5 sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                A strong founding-pilot fit
              </p>
              <div className="mt-7 space-y-5">
                {fitChecks.map((item) => (
                  <div className="flex items-start gap-4" key={item}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf8f2] text-xs font-black text-[#137454]">
                      &#10003;
                    </span>
                    <p className="pt-0.5 text-sm font-semibold leading-6 text-[#16325c]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-[#e0e8f2] pt-7">
                <PrimaryCta className="w-full" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid w-full max-w-[84rem] gap-12 px-6 py-20 sm:px-7 sm:py-28 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <Eyebrow>Accountable by design</Eyebrow>
              <h2 className="mt-5 text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl">
                AI assistance with a real person responsible for the work.
              </h2>
              <div className="mt-8 rounded-[1.75rem] border border-[#dce5f1] bg-[#f7f9fc] p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071b42] text-sm font-black text-[#ffd068]">
                    MR
                  </span>
                  <div>
                    <p className="font-black">Manny Ramirez</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#527096]">
                      Founder-led pilot
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-600">
                  Manny reviews assessments, confirms the operating problem,
                  coordinates the work, and approves the pilot scope before
                  automation is introduced.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Private by default", "Client work lives in an organization-scoped workspace with server-side access controls."],
                ["Approval before action", "Drafts remain private until the authorized owner reviews the next step."],
                ["Costs confirmed first", "Paid work, advertising, and outside API expenses require a clear scope."],
                ["History stays visible", "Plans, notes, decisions, and review messages remain attached to the work."],
              ].map(([title, text]) => (
                <article className="rounded-[1.75rem] border border-[#dce5f1] p-7" key={title}>
                  <span className="block h-2 w-10 rounded-full bg-[#f5b932]" />
                  <h3 className="mt-8 text-xl font-black">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dce5f1] bg-[#f7f9fc]">
          <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:px-7 sm:py-24">
            <div className="text-center">
              <Eyebrow>Questions before you start</Eyebrow>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Straight answers for busy owners.
              </h2>
            </div>
            <div className="mt-12 divide-y divide-[#dce5f1] border-y border-[#dce5f1]">
              {faqs.map((faq) => (
                <details className="group py-6" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-black text-[#071b42]">
                    {faq.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c8d6e8] text-lg font-medium text-[#1246a0] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-5 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0d459f] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,rgba(255,255,255,0.07)_45%,rgba(255,255,255,0.07)_55%,transparent_55%)]" />
          <div className="relative mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow light>Your next move</Eyebrow>
              <h2 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                Find the growth leak costing your business the most.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">
                Give Atlas the real picture. Get a focused starting point before
                buying another tool, campaign, or subscription.
              </p>
            </div>
            <div className="text-center lg:text-right">
              <PrimaryCta />
              <p className="mt-4 text-xs font-semibold text-blue-100/70">
                No payment. No automatic subscription.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
