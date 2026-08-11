"use client";

import { useMemo, useState } from "react";

const steps = [
  {
    id: "assessment",
    label: "1. Business visibility",
    title: "See the business clearly.",
    description:
      "Atlas starts with the company, the customer, and the work already moving through the business.",
    panelTitle: "Business context",
    panelBody:
      "Share what you do, where leads come from, and what needs attention first so Atlas can organize the work around the business.",
    chips: ["Company", "Customers", "Attention"],
    metricLabel: "Starts with",
    metricValue: "Context",
  },
  {
    id: "workspace",
    label: "2. Stronger follow-up",
    title: "Keep every opportunity moving.",
    description:
      "Atlas keeps opportunities visible so next steps do not get lost in a crowded inbox or a busy day.",
    panelTitle: "Opportunity visibility",
    panelBody:
      "Leads, reminders, and next steps stay organized in one place so the follow-up process stays clear and consistent.",
    chips: ["Leads", "Follow-up", "Reminders"],
    metricLabel: "Focus",
    metricValue: "Priority",
  },
  {
    id: "decision",
    label: "3. Clear next step",
    title: "Turn activity into growth decisions.",
    description:
      "Atlas shows what deserves attention next so the owner can move from scattered activity to a more focused operating rhythm.",
    panelTitle: "Growth direction",
    panelBody:
      "See the priorities, the open opportunities, and the next move before the work expands into something larger.",
    chips: ["Priorities", "Opportunities", "Next step"],
    metricLabel: "Outcome",
    metricValue: "Clear",
  },
] as const;

export function AtlasPreviewJourney() {
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]["id"]>("assessment");

  const current = useMemo(
    () => steps.find((step) => step.id === activeStep) ?? steps[0],
    [activeStep],
  );

  return (
    <section className="border-b border-[#dce6f5] bg-[#071b42] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd068]">
              Atlas workspace
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              See how ATLAS helps you turn daily business activity into clear
              priorities, stronger follow-up, and measurable growth.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
              Atlas helps service businesses make sense of the work already in
              motion: who needs follow-up, what needs attention, and which
              opportunity should move first.
            </p>

            <div className="mt-8 space-y-3">
              {steps.map((step) => {
                const isActive = step.id === activeStep;

                return (
                  <button
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                      isActive
                        ? "border-[#ffd068] bg-white/10"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/7"
                    }`}
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-black uppercase tracking-[0.14em] text-[#ffd068]">
                        {step.label}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isActive ? "bg-[#ffd068]" : "bg-white/30"
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-lg font-black">{step.title}</p>
                    <p className="mt-2 text-sm leading-6 text-blue-100">
                      {step.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(255,201,77,0.24),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(18,70,160,0.45),_transparent_48%)] blur-xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-[#0b2553] p-4 shadow-2xl shadow-black/20 sm:p-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#f8fbff] p-5 text-[#071b42] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce6f5] pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1246a0]">
                      Atlas customer view
                    </p>
                    <p className="mt-1 text-sm font-bold">{current.panelTitle}</p>
                  </div>
                  <span className="rounded-full border border-[#dce6f5] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1246a0]">
                    Customer view
                  </span>
                </div>

                <div className="mt-5 rounded-3xl bg-[#0a3b91] p-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
                      Business visibility
                    </p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                      {current.metricLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-black leading-tight">
                    {current.panelBody}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {current.chips.map((chip) => (
                    <div
                      className="rounded-2xl border border-[#dce6f5] bg-white p-4"
                      key={chip}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#6b7d99]">
                        {chip}
                      </p>
                      <p className="mt-2 text-xl font-black text-[#071b42]">
                        {{
                          Company: "Set",
                          Customers: "Clear",
                          Attention: "Focused",
                          Leads: "Tracked",
                          "Follow-up": "Queued",
                          Reminders: "Visible",
                          Priorities: "Named",
                          Opportunities: "Open",
                          "Next step": "Ready",
                        }[chip]}
                      </p>
                    </div>
                  ))}
                </div>

                  <div className="mt-5 rounded-2xl border border-[#dce6f5] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1246a0]">
                        {current.metricLabel}
                      </p>
                    <span className="rounded-full bg-[#fff4d7] px-2.5 py-1 text-[10px] font-bold text-[#8b5d00]">
                      Atlas
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-[#071b42]">
                      {current.id === "assessment"
                        ? "Atlas starts by understanding the company and the context behind the work."
                        : current.id === "workspace"
                          ? "The workspace keeps opportunities and follow-up visible in one place."
                          : "The next step becomes clearer when priorities and opportunities are organized together."}
                    </p>
                    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#1246a0]">
                      {current.metricValue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100">
                <span>Business visibility</span>
                <span>Follow-up clarity</span>
                <span>Next steps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
