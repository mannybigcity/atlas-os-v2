import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Client Dashboard | Atlas For Entrepreneurs",
  description:
    "A simple public walkthrough showing how ATLAS answers, captures leads, assigns work, keeps owners in control, and follows through to an opportunity.",
  robots: { index: false, follow: false },
};

const storyFlow = [
  "Customer Calls",
  "ATLAS Answers",
  "Lead Captured",
  "Work Assigned",
  "Owner Approves",
  "ATLAS Follows Up",
  "Opportunity Created",
];

const leadDetails = [
  { label: "Customer", value: "Sarah Johnson" },
  { label: "Location", value: "Cypress, TX" },
  { label: "Need", value: "Water heater leak" },
  { label: "Priority", value: "Urgent" },
  { label: "Potential value", value: "$1,500-$3,000" },
];

const assignmentFlow = [
  { title: "ATLAS", copy: "Starts the process and keeps every step moving.", icon: "A" },
  { title: "Lead Intelligence", copy: "Captures details and qualifies the request.", icon: "01" },
  { title: "Follow-Up", copy: "Sends the next message and keeps the lead warm.", icon: "02" },
  { title: "Marketing", copy: "Feeds future campaigns and future opportunities.", icon: "03" },
];

const ecosystem = ["Lead Finder", "CRM", "Follow-Up", "Social Manager", "Phone AI"];

const timeline = [
  "9:03 AM - Incoming customer call",
  "9:05 AM - Lead captured by ATLAS",
  "9:08 AM - Appointment requested",
  "10:15 AM - Estimate approved",
  "11:32 AM - Follow-up message sent",
  "12:40 PM - Opportunity created",
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1246a0]">
      {children}
    </p>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border border-[#dbe4f0] bg-white shadow-[0_1.5rem_3rem_rgba(6,27,82,.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function ProcessArrow() {
  return (
    <div
      aria-hidden="true"
      className="hidden h-px w-10 shrink-0 bg-gradient-to-r from-[#b9c9e6] via-[#d9b85d] to-[#b9c9e6] lg:block"
    />
  );
}

function SimpleIcon({ label }: { label: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dce6f5] bg-[#f7fbff] text-[11px] font-black tracking-[0.16em] text-[#06266d]">
      {label}
    </span>
  );
}

export default function AtlasTeamLivePage() {
  return (
    <main className="bg-[#f7f9fc] text-[#071b42]">
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(241,193,72,.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(6,38,109,.08),transparent_28%),linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)]" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <Link className="flex items-center gap-3" href="/">
              <Image
                alt="Atlas lion logo"
                className="h-12 w-12 object-contain"
                src="/brand/atlas-logo.png"
                width={720}
                height={720}
                priority
              />
              <span className="grid gap-0.5">
                <strong className="text-lg font-black tracking-[0.18em] text-[#06266d]">
                  ATLAS
                </strong>
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Public client dashboard
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#2a5abd] px-5 text-sm font-black text-[#06266d] transition hover:bg-[#eef4ff]"
                href="/assessment"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:px-8 lg:pb-14 lg:pt-6">
            <div className="max-w-2xl">
              <SectionLabel>Client Dashboard</SectionLabel>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.08em] text-[#06266d] sm:text-6xl lg:text-7xl">
                Client Dashboard
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Watch how ATLAS helps a small business turn a new lead into a
                real opportunity.
              </p>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Find more prospects. Follow up faster. Close more deals. This
                public story uses one plumbing example to show ATLAS answering
                the call, capturing the lead, assigning work, getting approval,
                and driving the opportunity forward.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f0b83d] px-6 text-sm font-black text-[#181307] shadow-[0_0.9rem_1.8rem_rgba(221,150,13,.18)] transition hover:-translate-y-0.5 hover:bg-[#f6c855]"
                  href="/assessment"
                >
                  Request a Demo
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d2dcec] bg-white px-6 text-sm font-black text-[#06266d] transition hover:border-[#2a5abd] hover:bg-[#f6f9ff]"
                  href="/login"
                >
                  Client Login
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {storyFlow.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-[#dbe4f0] bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-[0_0.4rem_1rem_rgba(6,27,82,.05)]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06266d] text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {ecosystem.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#274060]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[2rem] border border-[#e0e8f2] bg-[#0b1f4f] shadow-[0_2rem_4rem_rgba(6,27,82,.18)]">
                <div className="relative min-h-[31rem]">
                  <Image
                    alt="A realistic small-business service owner in a workshop setting"
                    className="object-cover object-center opacity-[0.78]"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 52vw"
                    src="/atlas-service-industry-collage-landscape.png"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,45,.14)_0%,rgba(6,17,45,.55)_100%)]" />

                  <div className="absolute left-4 top-4 max-w-[16rem] rounded-2xl border border-white/20 bg-white/95 p-4 text-[#071b42] shadow-[0_1rem_2rem_rgba(0,0,0,.14)] backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
                          Incoming call
                        </p>
                        <p className="mt-1 text-base font-black tracking-[-0.03em]">
                          Sarah Johnson
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f7cc62] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#181307]">
                        12 sec
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">
                          ATLAS:
                        </span>{" "}
                        I can help with that. Tell me what is happening.
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">
                          Customer:
                        </span>{" "}
                        The water heater is leaking and I need help today.
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 grid gap-3">
                    <div className="rounded-[1.5rem] border border-white/20 bg-[#081736]/92 p-4 text-white shadow-[0_1rem_2rem_rgba(0,0,0,.22)] backdrop-blur">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0c85c]">
                            Simple process
                          </p>
                          <p className="mt-1 text-base font-black tracking-[-0.04em] sm:text-lg">
                            Customer Calls {">"} ATLAS Answers {">"} Appointment
                            Booked {">"} Opportunity Created
                          </p>
                        </div>
                        <div className="hidden rounded-full border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/75 sm:block">
                          ATLAS
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/20 bg-white/95 p-4 text-[#071b42] shadow-[0_1rem_2rem_rgba(0,0,0,.16)] backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
                        Lead captured
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Sarah Johnson, Cypress, TX, urgent water heater leak.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
          <div className="space-y-6">
            <div className="max-w-xl">
              <SectionLabel>ATLAS answers the call</SectionLabel>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.07em] text-[#06266d] sm:text-5xl">
                ATLAS speaks with the customer, understands the request, and
                captures the lead.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                The owner does not need to stop what they are doing to protect
                the first conversation. ATLAS collects the important details
                and turns the call into something the business can act on.
              </p>
            </div>

            <Card className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 sm:p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#06266d,#f0b83d,#06266d)]" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
                    New lead captured
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#06266d]">
                    Sarah Johnson
                  </h3>
                </div>
                <span className="rounded-full border border-[#f0d48a] bg-[#fff9e8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#8a6410]">
                  Urgent
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {leadDetails.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[#dbe4f0] bg-white px-4 py-3 shadow-[0_0.4rem_1rem_rgba(6,27,82,.04)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#071b42]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
                  ATLAS summary
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Sarah called about a leaking water heater. ATLAS captured the
                  request, marked it urgent, and flagged it as a high-value job
                  for the Cypress area.
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <SectionLabel>ATLAS assigns the right jobs to the right people</SectionLabel>
              <div className="ml-auto rounded-full border border-[#dbe4f0] bg-[#f7fbff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Simple orchestration
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-stretch">
              {assignmentFlow.map((item, index) => (
                <Fragment key={item.title}>
                  <div
                    className="flex-1 rounded-[1.5rem] border border-[#dbe4f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 sm:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <SimpleIcon label={item.icon} />
                      <div>
                        <h3 className="text-xl font-black tracking-[-0.05em] text-[#06266d]">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {item.copy}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < assignmentFlow.length - 1 ? <ProcessArrow /> : null}
                </Fragment>
              ))}
            </div>

              <div className="mt-5 rounded-[1.5rem] border border-[#dbe4f0] bg-[#081736] p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#dce6f5] bg-white shadow-[0_0.75rem_1.5rem_rgba(0,0,0,.12)]">
                    <Image
                      alt="Atlas logo"
                      className="h-7 w-7 object-contain"
                    src="/brand/atlas-logo.png"
                    width={720}
                    height={720}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f7cc62]">
                    ATLAS
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    The business sees one clean story. The internal work stays
                    simple and controlled.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
            <Card className="p-5 sm:p-6">
              <SectionLabel>You stay in control</SectionLabel>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.07em] text-[#06266d] sm:text-5xl">
                ATLAS handles the work, but you approve the important
                decisions.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                The system can move quickly without taking away judgment.
                Estimate approval still belongs to the owner.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-[#dbe4f0] bg-[#f7fbff] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
                      Approval required
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#06266d]">
                      Water Heater Replacement
                    </h3>
                  </div>
                  <div className="rounded-full bg-[#fff2c8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#7d5a0d]">
                    $2,400
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#dbe4f0] bg-white p-4">
                  <p className="text-sm font-black text-[#071b42]">Sarah Johnson</p>
                  <p className="mt-1 text-sm text-slate-600">Cypress, TX</p>
                  <p className="mt-1 text-sm text-slate-600">Estimated amount: $2,400</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#06266d] px-5 text-sm font-black text-white"
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d2dcec] bg-white px-5 text-sm font-black text-[#06266d]"
                    type="button"
                  >
                    Review Details
                  </button>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="grid min-h-full gap-0 lg:grid-cols-[.9fr_1.1fr]">
                <div className="bg-[#081736] p-5 text-white">
                  <div className="mx-auto flex h-full max-w-[15rem] flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#0d234f,#081736)] p-4 shadow-[0_1.5rem_3rem_rgba(0,0,0,.24)]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                      <span>Mobile view</span>
                      <span>Owner</span>
                    </div>
                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f7cc62]">
                        Approval required
                      </p>
                      <p className="mt-2 text-lg font-black tracking-[-0.04em]">
                        Sarah Johnson
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        Water heater replacement
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold">
                        ATLAS kept the job moving.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold">
                        You decide what gets approved.
                      </div>
                    </div>
                    <div className="mt-auto pt-5">
                      <div className="h-1.5 w-24 rounded-full bg-white/18" />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <SectionLabel>Human oversight</SectionLabel>
                  <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-[#06266d] sm:text-4xl">
                    ATLAS does the busywork. You keep the say on the important
                    stuff.
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                    The business moves faster because the owner is not blocking
                    every small step. Only the meaningful decision comes back
                    for approval.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Lead captured without delay",
                      "Estimate paused for approval",
                      "Follow-up sent automatically",
                      "Owner stays in control",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-[#dbe4f0] bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-[#274060]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto_.9fr] lg:items-start">
          <div>
            <SectionLabel>ATLAS follows through and drives results</SectionLabel>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.07em] text-[#06266d] sm:text-5xl">
              Find more prospects. Follow up faster. Close more deals.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              ATLAS keeps the process moving until the business has something
              real to work with: an opportunity, not just a conversation.
            </p>

            <div className="mt-6 space-y-3">
              {timeline.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-2xl border border-[#dbe4f0] bg-white px-4 py-4 shadow-[0_0.75rem_1.5rem_rgba(6,27,82,.05)]"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06266d] text-[11px] font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <p className="pt-1 text-sm font-semibold text-[#274060]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden h-full w-px bg-gradient-to-b from-transparent via-[#d8e2f0] to-transparent lg:block" />

          <Card className="self-start overflow-hidden p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
              Result
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#06266d]">
              Opportunity Created
            </h3>
            <div className="mt-5 rounded-[1.75rem] border border-[#f0d48a] bg-[linear-gradient(180deg,#fff9e7_0%,#fffdf7_100%)] p-5 sm:p-6">
              <p className="text-4xl font-black tracking-[-0.08em] text-[#06266d] sm:text-5xl">
                $2,400
              </p>
              <p className="mt-3 text-lg font-bold text-[#274060]">
                Water Heater Replacement
              </p>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                The owner can see what happened, what was approved, and what
                value ATLAS moved into the pipeline.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-[#e3e9f2] bg-[#f9fbff]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <SectionLabel>Why it matters</SectionLabel>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {[
              "More Prospects",
              "Faster Follow-Up",
              "More Opportunities",
              "More Deals",
            ].map((item, index) => (
              <div
                key={item}
                className="relative rounded-[1.5rem] border border-[#dbe4f0] bg-white p-6 shadow-[0_1rem_2rem_rgba(6,27,82,.06)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-lg font-black tracking-[-0.05em] text-[#06266d]">
                    {item}
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7cc62] text-sm font-black text-[#181307]">
                    {index + 1}
                  </span>
                </div>
                {index < 3 ? (
                  <div className="mt-5 h-px w-full bg-gradient-to-r from-[#d8e2f0] via-[#f0b83d] to-[#d8e2f0]" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-[#dbe4f0] bg-white px-6 py-6 shadow-[0_1.5rem_3rem_rgba(6,27,82,.08)] lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-[-0.07em] text-[#06266d] sm:text-5xl">
                Ready to see what ATLAS can do for your business?
              </h2>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {[
                  "Built for small businesses",
                  "Works 24/7",
                  "Secure & confidential",
                  "You stay in control",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f0b83d] px-6 text-sm font-black text-[#181307] transition hover:-translate-y-0.5 hover:bg-[#f6c855]"
                href="/assessment"
              >
                Request a Demo
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d2dcec] bg-white px-6 text-sm font-black text-[#06266d] transition hover:border-[#2a5abd] hover:bg-[#f6f9ff]"
                href="/login"
              >
                Client Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
