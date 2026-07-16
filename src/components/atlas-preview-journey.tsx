"use client";

import { useMemo, useState } from "react";

const steps = [
  {
    id: "assessment",
    label: "1. Assessment",
    title: "Start with the real business problem.",
    description:
      "Atlas asks a short, practical set of questions so the workspace starts with context, not a blank slate.",
    panelTitle: "Assessment received",
    panelBody:
      "The owner told Atlas what the business does, where customers come from, and what needs attention first.",
    chips: ["Lead source", "Goals", "Social links"],
    metricLabel: "Review status",
    metricValue: "Ready",
  },
  {
    id: "workspace",
    label: "2. Private workspace",
    title: "Show a sample workspace before asking for a decision.",
    description:
      "The preview looks and feels like the finished product, but the actions stay limited until the owner chooses to continue.",
    panelTitle: "Sample workspace",
    panelBody:
      "Atlas organizes leads, drafts, and next steps into one private place so the owner can see how the system would help.",
    chips: ["Priority", "Drafts", "Follow-up"],
    metricLabel: "Actions available",
    metricValue: "3",
  },
  {
    id: "decision",
    label: "3. Decide",
    title: "Convert only after the value is visible.",
    description:
      "Once Atlas has enough signal, the next step becomes simple: continue into the paid version or stop with no pressure.",
    panelTitle: "Next step",
    panelBody:
      "Atlas shows the scope, the expected work, and the approved cost before anything paid begins.",
    chips: ["Scope", "Price", "Approval"],
    metricLabel: "Decision",
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
              Guided preview
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Keep people leaning in by revealing Atlas in layers.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
              This is the exact kind of curiosity loop that makes a visitor want to
              keep going. They see a real problem, a private workspace, and a clean
              decision point before any paid work starts.
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
                      Atlas private preview
                    </p>
                    <p className="mt-1 text-sm font-bold">{current.panelTitle}</p>
                  </div>
                  <span className="rounded-full border border-[#dce6f5] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1246a0]">
                    Sample mode
                  </span>
                </div>

                <div className="mt-5 rounded-3xl bg-[#0a3b91] p-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
                      Preview state
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
                        {chip === "Scope" ? "Approved" : chip === "Price" ? "$" : "On"}
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
                        ? "The first questions tell Atlas what to look for."
                        : current.id === "workspace"
                          ? "The preview shows how the system would organize the work."
                          : "The owner sees the offer before any paid action begins."}
                    </p>
                    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#1246a0]">
                      {current.metricValue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100">
                <span>Curiosity loop</span>
                <span>Private preview</span>
                <span>Clear decision</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
