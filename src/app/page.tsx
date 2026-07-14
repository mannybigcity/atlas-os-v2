import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const startHref =
  "mailto:info@atlasforentrepreneurs.com?subject=I%27m%20interested%20in%20an%20Atlas%20founding%20pilot&body=My%20name%20is%3A%0A%0AMy%20business%20is%3A%0A%0AThe%20biggest%20thing%20I%20need%20help%20with%20is%3A";

const pilotIncludes = [
  {
    title: "One clear 30-day goal",
    description:
      "We choose the business result that matters most right now and define what success looks like.",
  },
  {
    title: "A short priority plan",
    description:
      "You get focused next actions instead of another long report that sits unread.",
  },
  {
    title: "Work you can review",
    description:
      "Atlas shares completed work in your private workspace so you can approve it or request changes.",
  },
  {
    title: "A real check-in",
    description:
      "We review progress, decisions, and the next move together. Every client is currently human-guided.",
  },
];

const process = [
  {
    number: "01",
    title: "Tell us what is stuck",
    description:
      "Send a short note about your business and the result you need most.",
  },
  {
    number: "02",
    title: "Confirm the fit and scope",
    description:
      "We agree on the goal, work, timing, and price before you pay anything.",
  },
  {
    number: "03",
    title: "Pay securely through PayPal",
    description:
      "If the pilot is a fit, you receive a PayPal request or invoice that describes the approved work.",
  },
  {
    number: "04",
    title: "Work from one private space",
    description:
      "Your plan, actions, messages, and work for review stay together in your secure Atlas workspace.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <main className="bg-white">
        <section className="relative overflow-hidden border-b border-slate-200">
          <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_55%)]" />
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:py-28">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
                Practical help for small business owners
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Stop carrying the whole business in your head.
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-9 text-slate-600">
                Atlas helps you choose one important goal, turn it into clear
                next steps, and keep the work moving in one private workspace.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  className="rounded-full bg-blue-700 px-6 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  href={startHref}
                >
                  Ask about a founding pilot
                </a>
                <a
                  className="rounded-full border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  href="#how-it-works"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                Human-guided. Clear scope before payment. No fake agents or
                surprise automation.
              </p>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white shadow-xl shadow-slate-200/70 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                Founding client pilot
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Focus on what can create value now.
              </h2>
              <p className="mt-4 leading-7 text-slate-300">
                Built for owners who have too many ideas, unfinished projects,
                or urgent work competing for attention.
              </p>
              <ul className="mt-7 space-y-4 text-sm leading-6 text-slate-200">
                <li className="border-l-2 border-amber-300 pl-4">
                  One 30-day business goal
                </li>
                <li className="border-l-2 border-amber-300 pl-4">
                  Priorities and next actions
                </li>
                <li className="border-l-2 border-amber-300 pl-4">
                  Private client workspace
                </li>
                <li className="border-l-2 border-amber-300 pl-4">
                  Human-reviewed work and check-ins
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50" id="founding-pilot">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                What the pilot includes
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                A smaller plan you can actually use.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Atlas is not another pile of generic advice. We agree on a
                useful outcome, keep the plan visible, and give you a clear way
                to review the work.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {pilotIncludes.map((item) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-white p-7"
                  key={item.title}
                >
                  <h3 className="text-xl font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200" id="how-it-works">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
                A simple start
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                No complicated signup. No unclear charge.
              </h2>
            </div>

            <ol className="mt-12 grid gap-5 md:grid-cols-2">
              {process.map((item) => (
                <li
                  className="rounded-3xl border border-slate-200 bg-white p-7"
                  key={item.number}
                >
                  <p className="text-sm font-bold tracking-[0.18em] text-blue-700">
                    {item.number}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
                Ready to get unstuck?
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Tell Atlas what your business needs most.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Manny personally reviews each founding-pilot request. If Atlas
                can help, you will receive a clear scope and PayPal payment
                request before work begins.
              </p>
            </div>
            <a
              className="rounded-full bg-amber-300 px-7 py-4 text-center text-sm font-bold text-slate-950 transition hover:bg-amber-200"
              href={startHref}
            >
              Start the conversation
            </a>
          </div>
        </section>

        <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
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
