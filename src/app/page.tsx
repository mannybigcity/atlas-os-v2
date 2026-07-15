import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const assessmentHref = "/assessment";

const businessTeam = [
  {
    name: "ATLAS",
    role: "Chief of Staff",
    description:
      "Keeps the goal clear, organizes the work, and coordinates what happens next.",
  },
  {
    name: "HUNTER",
    role: "Lead Research",
    description:
      "Finds and organizes potential customers using approved business-data sources such as Google Maps and Places.",
  },
  {
    name: "MICAH",
    role: "Content Studio",
    description:
      "Helps create graphics, campaign ideas, and social-media drafts that stay true to your brand.",
  },
  {
    name: "DAVID",
    role: "CRM & Follow-Up",
    description:
      "Organizes contacts, tracks next steps, and prepares follow-up so opportunities do not get forgotten.",
  },
];

const opportunitySprintIncludes = [
  "A focused assessment and kickoff",
  "One measurable 30-day goal",
  "A private ATLAS workspace",
  "Up to 10 leads or opportunities organized",
  "Follow-up and content drafts for your review",
  "Two progress reviews with practical AI guidance",
];

const process = [
  {
    number: "01",
    title: "Take the free assessment",
    description:
      "Tell us what your business does, where customers come from, and what you want to improve most.",
  },
  {
    number: "02",
    title: "Get a focused recommendation",
    description:
      "Manny reviews your answers and identifies a practical starting point for ATLAS to help.",
  },
  {
    number: "03",
    title: "Confirm the plan and price",
    description:
      "You see the scope, timing, and price before any paid work begins.",
  },
  {
    number: "04",
    title: "Move the work forward",
    description:
      "Your goal, next steps, messages, and work for review stay together in one private space.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <main className="bg-white text-[#071b42]">
        <section className="relative overflow-hidden border-b border-[#dce6f5]">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,_#fff1bf_0,_transparent_34%),radial-gradient(circle_at_10%_20%,_#e8f1ff_0,_transparent_42%)]" />
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#1246a0]">
                Your AI-powered business team
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Build a stronger business with ATLAS in your corner.
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-9 text-slate-600">
                Start with a free Business Assessment, discover the opportunity
                that matters most, and turn it into a clear plan for leads,
                content, follow-up, and execution.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="rounded-full bg-[#1246a0] px-7 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0a2f78]"
                  href={assessmentHref}
                >
                  Take the Free Business Assessment
                </Link>
                <a
                  className="rounded-full border-2 border-[#d9a522] bg-white px-7 py-4 text-center text-sm font-bold text-[#16325c] transition hover:bg-[#fff8e5]"
                  href="#business-team"
                >
                  Meet your business team
                </a>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500">
                Clear recommendations. Plain English. You approve the plan
                before paid work begins.
              </p>
            </div>

            <aside className="rounded-[2rem] border border-[#e5bb51] bg-white p-6 shadow-2xl shadow-[#cbd8ec]/70 sm:p-9">
              <Image
                alt="ATLAS lion logo — Guide. Grow. Live More."
                className="mx-auto h-auto w-full max-w-md object-contain"
                height={1624}
                priority
                src="/brand/atlas-logo.png"
                width={1600}
              />
              <div className="mt-5 rounded-2xl bg-[#0a3b91] px-6 py-5 text-center text-white">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd068]">
                  Guide. Grow. Live More.
                </p>
                <p className="mt-2 text-lg font-semibold">
                  One leader. Four focused roles. One place to move the work
                  forward.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-[#f7faff]" id="business-team">
          <div className="mx-auto w-full max-w-7xl px-6 py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b17700]">
                Meet the ATLAS business team
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Four roles built around the work that grows a business.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                ATLAS coordinates the plan while HUNTER, MICAH, and DAVID focus
                on finding opportunities, creating content, and keeping up with
                the people who matter.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {businessTeam.map((member, index) => (
                <article
                  className="relative overflow-hidden rounded-3xl border border-[#dce6f5] bg-white p-7 shadow-sm"
                  key={member.name}
                >
                  <span className="absolute right-5 top-4 text-6xl font-black text-[#edf3ff]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="relative text-sm font-black tracking-[0.18em] text-[#1246a0]">
                    {member.name}
                  </p>
                  <h3 className="relative mt-3 text-2xl font-bold">
                    {member.role}
                  </h3>
                  <p className="relative mt-4 leading-7 text-slate-600">
                    {member.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-[#efd381] bg-[#fff9e8] p-6 text-sm leading-7 text-[#5c4511] sm:p-8">
              <strong className="text-[#071b42]">Built responsibly:</strong>{" "}
              these capabilities are being introduced in stages with review
              and approval built in. ATLAS will not publish a post, message a
              prospect, or start outreach without your approval. Data and
              external API costs are confirmed before use.
            </div>
          </div>
        </section>

        <section className="border-b border-[#dce6f5]" id="founding-pilot">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="mx-auto w-full max-w-lg rounded-[2rem] border border-[#e5bb51] bg-[#071b42] p-7 text-white shadow-2xl shadow-blue-100 sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd068]">
                Founding pilot
              </p>
              <div className="mt-7 flex items-end gap-3">
                <span className="text-7xl font-black tracking-tight">30</span>
                <span className="pb-2 text-xl font-bold text-blue-100">days</span>
              </div>
              <h3 className="mt-5 text-3xl font-bold tracking-tight">
                ATLAS Opportunity Sprint
              </h3>
              <p className="mt-4 leading-7 text-blue-100">
                One focused business outcome, organized and moved forward with
                hands-on guidance. No AI experience required.
              </p>
              <div className="mt-8 rounded-2xl bg-white px-6 py-5 text-[#071b42]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                  Founding price
                </p>
                <p className="mt-2 text-5xl font-black tracking-tight">
                  $750
                  <span className="ml-2 text-sm font-bold text-slate-500">
                    one time
                  </span>
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Available to the first three clients. Standard sprint: $995.
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#b17700]">
                A practical first engagement
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Start with one important opportunity, not another tool.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                In 30 days, ATLAS helps identify a useful business priority,
                organize the work around it, prepare the follow-up and supporting
                content, and show you where AI can help without overwhelming you.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {opportunitySprintIncludes.map((item) => (
                  <li
                    className="flex gap-3 rounded-2xl border border-[#dce6f5] bg-[#f7faff] p-4 text-sm font-semibold leading-6 text-[#16325c]"
                    key={item}
                  >
                    <span className="mt-0.5 text-[#d79b05]">◆</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="rounded-full bg-[#1246a0] px-7 py-4 text-center text-sm font-bold text-white transition hover:bg-[#0a2f78]"
                  href={assessmentHref}
                >
                  Apply for the founding sprint
                </Link>
                <p className="self-center text-sm leading-6 text-slate-500">
                  Start with the free assessment. Continuing support is
                  optional and available from $349/month.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-[#f7faff]" id="how-it-works">
          <div className="mx-auto w-full max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1246a0]">
                A simple start
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                From business challenge to a plan you can use.
              </h2>
            </div>

            <ol className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {process.map((item) => (
                <li
                  className="rounded-3xl border border-[#dce6f5] bg-white p-7 shadow-sm"
                  key={item.number}
                >
                  <p className="text-sm font-black tracking-[0.18em] text-[#b17700]">
                    {item.number}
                  </p>
                  <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#0a3b91] text-white">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ffd068]">
                Your next move starts here
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Find out where ATLAS can help your business first.
              </h2>
              <p className="mt-5 text-lg leading-8 text-blue-50">
                Complete the free assessment and give us the information needed
                to recommend a useful, realistic starting point.
              </p>
            </div>
            <Link
              className="rounded-full bg-[#ffc94d] px-8 py-4 text-center text-sm font-black text-[#071b42] shadow-lg transition hover:bg-[#ffda82]"
              href={assessmentHref}
            >
              Take the Free Business Assessment
            </Link>
          </div>
        </section>

        <footer className="border-t border-[#305ca8] bg-[#071b42] text-blue-100">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Atlas For Entrepreneurs — Guide. Grow. Live More.</p>
            <div className="flex gap-5">
              <a className="hover:text-white" href="mailto:info@atlasforentrepreneurs.com">
                Contact
              </a>
              <Link className="hover:text-white" href="/login">
                Client login
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
