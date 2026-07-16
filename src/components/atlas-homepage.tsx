import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AtlasChatWidget } from "@/components/atlas-chat-widget";

const assessmentHref = "/assessment";

const steps = [
  {
    title: "Gather",
    text: "Atlas learns from the assessment, website, and public social links.",
  },
  {
    title: "Organize",
    text: "Leads, notes, and follow-up live in one private business workspace.",
  },
  {
    title: "Act",
    text: "Atlas drafts the next move, then the owner approves what goes out.",
  },
];

const samples = [
  {
    role: "ATLAS",
    title: "What matters next",
    text: "Focus warm leads first.",
  },
  {
    role: "HUNTER",
    title: "Who to reach",
    text: "Local prospects with fit signals.",
  },
  {
    role: "MICAH",
    title: "What to post",
    text: "Simple content tied to one goal.",
  },
  {
    role: "DAVID",
    title: "What to follow up",
    text: "Every open opportunity gets a next date.",
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
      className={`text-xs font-black uppercase tracking-[0.24em] ${
        light ? "text-[#ffd068]" : "text-[#1246a0]"
      }`}
    >
      {children}
    </p>
  );
}

function MockGPTPanel() {
  return (
    <aside className="relative mx-auto w-full max-w-xl rounded-[1.75rem] border border-[#cbd8ec] bg-white p-3 shadow-2xl shadow-[#a8bfdf]/40 sm:p-5">
      <div className="rounded-[1.35rem] border border-[#dce6f5] bg-[#f7faff] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[#dce6f5] pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1246a0]">
              Atlas and the team
            </p>
            <p className="mt-1 text-sm font-bold text-[#071b42]">
              Private workspace
            </p>
          </div>
          <span className="rounded-full border border-[#b9ddcd] bg-[#edf9f4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#167151]">
            Sample
          </span>
        </div>

        <div className="mt-4 rounded-2xl bg-[#0a3b91] p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
            Ask Atlas
          </p>
          <p className="mt-3 text-2xl font-black leading-tight">
            What can Atlas build for you today?
          </p>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            A new business? Sales help? Marketing? Tell Atlas what you need.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Leads", "4"],
            ["Drafts", "2"],
            ["Follow-ups", "3"],
          ].map(([label, value]) => (
            <div
              className="rounded-2xl border border-[#dce6f5] bg-white p-4"
              key={label}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#6b7d99]">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black text-[#071b42]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#dce6f5] bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]">
            Next move
          </p>
          <p className="mt-3 text-sm font-bold text-[#071b42]">
            Review the warm leads and send a short follow-up.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#dce6f5] bg-white p-4">
          <label className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]" htmlFor="atlas-chat">
            Chat with Atlas
          </label>
          <textarea
            id="atlas-chat"
            className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-[#cbd8ec] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-[#071b42] outline-none transition placeholder:text-slate-400 focus:border-[#1246a0]"
            placeholder="Example: I run a roofing company and need help with sales and follow-up."
            rows={4}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
              New business
            </span>
            <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
              Sales help
            </span>
            <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#1246a0]">
              Marketing
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 left-6 rounded-full border border-[#efd381] bg-[#fff9e8] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#7a5700] shadow-sm">
        Illustrative preview
      </div>
    </aside>
  );
}

export function AtlasHomepage({ preview = false }: { preview?: boolean }) {
  const homeHref = preview ? "/homepage-v2" : "/";

  return (
    <div className="min-h-screen bg-white text-[#071b42]">
      {preview ? (
        <div className="bg-[#071b42] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100">
          Private homepage review route
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-[#dce6f5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <Link className="flex items-center gap-3" href={homeHref}>
            <Image
              alt="Atlas lion and mountain logo"
              className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              height={720}
              priority
              src="/brand/atlas-logo.png"
              width={720}
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-base font-black tracking-tight sm:text-lg">
                Atlas For Entrepreneurs
              </span>
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#1246a0] sm:block">
                Guide. Grow. Live More.
              </span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="flex items-center gap-2">
            <a
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[#16325c] hover:bg-[#eef4ff] lg:block"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[#16325c] hover:bg-[#eef4ff] lg:block"
              href="#samples"
            >
              Sample work
            </a>
            <Link
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[#16325c] hover:bg-[#eef4ff] md:block"
              href="/login"
            >
              Client login
            </Link>
            <Link
              className="rounded-full bg-[#1246a0] px-4 py-2.5 text-xs font-black text-white hover:bg-[#0a2f78] sm:px-5 sm:text-sm"
              href={assessmentHref}
            >
              Free assessment
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-[#dce6f5] bg-[#f8fbff]">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
            <div>
              <Eyebrow>For local service businesses</Eyebrow>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                What can Atlas and the team build for you today?
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
                Atlas learns from the assessment, the website, and public social links,
                then turns that into a simple next step for the owner.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="rounded-full bg-[#1246a0] px-7 py-4 text-center text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-[#0a2f78]"
                  href={assessmentHref}
                >
                  Start free assessment
                </Link>
                <a
                  className="rounded-full border-2 border-[#d9a522] bg-white px-7 py-4 text-center text-sm font-black text-[#16325c] hover:bg-[#fff9e8]"
                  href="#samples"
                >
                  See sample output
                </a>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500">
                Free assessment first. Paid work only if Atlas is a fit.
              </p>
            </div>
            <AtlasChatWidget />
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-6 py-7 sm:grid-cols-3">
            {[
              "Built for owner-led businesses",
              "Private workspace",
              "Approved before action",
            ].map((item) => (
              <div
                className="flex items-center justify-center gap-3 text-center text-sm font-bold text-[#16325c]"
                key={item}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf9f4] text-xs text-[#167151]"
                >
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-[#071b42] text-white" id="how-it-works">
          <div className="mx-auto w-full max-w-7xl px-6 py-18 sm:py-20">
            <div className="max-w-3xl">
              <Eyebrow light>How Atlas works</Eyebrow>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Short flow. Real data. Clear next step.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <article className="rounded-3xl border border-white/10 bg-[#0b2553] p-6" key={step.title}>
                  <p className="text-xs font-black tracking-[0.16em] text-[#ffd068]">
                    0{steps.indexOf(step) + 1}
                  </p>
                  <h3 className="mt-5 text-2xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-blue-100">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-[#f7faff]" id="samples">
          <div className="mx-auto w-full max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <Eyebrow>Sample output</Eyebrow>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                What Atlas can produce.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {samples.map((sample) => (
                <article
                  className="rounded-3xl border border-[#dce6f5] bg-white p-7 shadow-sm"
                  key={sample.role}
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b17700]">
                    {sample.role}
                  </p>
                  <h3 className="mt-5 text-2xl font-black leading-tight">
                    {sample.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{sample.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Eyebrow>Who it is for</Eyebrow>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                HVAC, plumbing, roofing, cleaning, and other local service teams.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Owners who want a practical system to gather data, organize work, and
                use AI without becoming AI experts.
              </p>
            </div>
            <div className="rounded-[2rem] border border-[#dce6f5] bg-[#f8fbff] p-7 shadow-sm sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                The point
              </p>
              <p className="mt-4 text-2xl font-black leading-tight text-[#071b42]">
                Atlas gathers data, then helps the prospect or client.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                That is the whole model: learn enough, show the plan, and help the
                business move forward.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#0a3b91] text-white">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <Eyebrow light>Next move</Eyebrow>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Start with the assessment.
              </h2>
              <p className="mt-5 text-lg leading-8 text-blue-100">
                The better the data, the better the help.
              </p>
            </div>
            <div className="text-center lg:text-right">
              <Link
                className="inline-flex rounded-full bg-[#ffc94d] px-8 py-4 text-sm font-black text-[#071b42] shadow-lg hover:bg-[#ffda82]"
                href={assessmentHref}
              >
                Take the free assessment
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
