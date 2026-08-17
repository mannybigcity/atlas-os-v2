import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { requireTrialUser } from "@/server/trials/guards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Atlas Starter Workspace | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

export default async function StarterWorkspacePage() {
  const trial = await requireTrialUser("/starter");
  const days = Math.max(1, Math.ceil((new Date(trial.trial_ends_at).getTime() - Date.now()) / 86400000));

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#071b42]">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1246a0]">Starter workspace</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">Welcome, {trial.full_name}.</h1>
            <p className="mt-3 text-lg text-slate-600">{trial.business_name} · a focused place to capture leads, keep the pipeline moving, and know what to do next.</p>
          </div>
          <div className="rounded-2xl border border-[#f0c24a] bg-[#fff8df] px-5 py-4 text-sm text-[#4b3800]">
            <p className="font-black uppercase tracking-[.14em]">Trial active</p>
            <p className="mt-1 font-semibold">About {days} days remaining · no card required</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            ["Dashboard", "0 leads", "Your activity and next actions will appear here as you work."],
            ["Lead capture", "Start with one lead", "Keep new opportunities in one simple place."],
            ["Pipeline", "No opportunities yet", "Move each lead from new to qualified to won."],
          ].map(([title, stat, body]) => (
            <article id={title.toLowerCase().replace(" ", "-")} className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm" key={title}>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">{title}</p>
              <p className="mt-5 text-2xl font-black">{stat}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              <Link className="mt-6 inline-flex rounded-full border border-[#cbd8e8] px-4 py-2 text-sm font-bold text-[#16325c] transition hover:border-[#1246a0]" href={title === "Lead capture" ? "#lead-capture" : title === "Pipeline" ? "#pipeline" : "#dashboard"}>Open {title.toLowerCase()}</Link>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <article id="follow-up-desk" className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">Follow-up Desk</p>
            <h2 className="mt-3 text-2xl font-black">Your next actions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Reminders will live here so warm leads do not go quiet.</p>
            <div className="mt-6 rounded-2xl bg-[#f7f9fc] p-5 text-sm font-semibold text-slate-500">No follow-ups yet.</div>
          </article>
          <article id="onboarding" className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">Onboarding checklist</p>
            <ul className="mt-5 space-y-4 text-sm font-semibold text-slate-700">
              {["Confirm your email", "Add your first lead", "Set your first follow-up"].map((item) => <li className="flex gap-3" key={item}><span className="mt-0.5 h-5 w-5 rounded-full border-2 border-[#d8e2ee]" />{item}</li>)}
            </ul>
          </article>
        </div>

        <Link className="mt-8 inline-flex rounded-full border border-[#cbd8e8] bg-white px-5 py-3 text-sm font-bold text-[#16325c]" href="/pricing">View plans and upgrade</Link>
      </section>
    </main>
  );
}
