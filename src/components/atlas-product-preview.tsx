"use client";

import { useState } from "react";

const views = [
  {
    id: "leads",
    tab: "Lead control",
    eyebrow: "Revenue leak found",
    priority: "Follow up on three open estimates before noon.",
    description:
      "Atlas puts every opportunity, owner, and next date in one place so warm customers do not disappear into texts and memory.",
    metrics: [
      ["New requests", "8", "+3 today"],
      ["Open estimates", "4", "$12.8k value"],
      ["Needs follow-up", "3", "Due today"],
    ],
    rows: [
      ["New customer estimate", "2 days open", "Call today", "High"],
      ["First appointment request", "Form received", "Text tomorrow", "Next"],
      ["Service-plan renewal", "Warm customer", "Email Friday", "Next"],
    ],
  },
  {
    id: "marketing",
    tab: "Marketing plan",
    eyebrow: "This week’s campaign",
    priority: "Turn one customer problem into five useful local posts.",
    description:
      "Atlas connects content to the jobs you want more of, then keeps every draft private until you approve it.",
    metrics: [
      ["Posts planned", "5", "One weekly theme"],
      ["Drafts ready", "3", "Waiting on review"],
      ["Offers active", "1", "Seasonal campaign"],
    ],
    rows: [
      ["Get ready for the busy season", "Facebook + Instagram", "Ready to review", "Draft"],
      ["3 signs it is time to book", "Google Business", "Copy approved", "Ready"],
      ["Customer service reminder", "Email", "Needs offer", "Next"],
    ],
  },
  {
    id: "focus",
    tab: "Owner focus",
    eyebrow: "30-day growth priority",
    priority: "Increase estimate follow-up before buying more leads.",
    description:
      "Atlas turns scattered ideas into one measurable priority, a short action list, and a weekly review the owner can actually use.",
    metrics: [
      ["Primary goal", "1", "Clear owner"],
      ["Actions open", "4", "Two this week"],
      ["Decisions waiting", "2", "Owner approval"],
    ],
    rows: [
      ["Write the follow-up sequence", "DAVID", "Due Tuesday", "Active"],
      ["Review lost estimates", "ATLAS", "Due Wednesday", "Active"],
      ["Approve seasonal campaign", "MICAH", "Due Friday", "Review"],
    ],
  },
] as const;

type ViewId = (typeof views)[number]["id"];

export function AtlasProductPreview() {
  const [activeId, setActiveId] = useState<ViewId>("leads");
  const active = views.find((view) => view.id === activeId) ?? views[0];

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_20%_10%,rgba(45,116,255,0.24),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(245,183,50,0.20),transparent_40%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#091a38] p-2 shadow-[0_35px_90px_rgba(3,12,30,0.42)] sm:p-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-[#f5f8fd] text-[#071b42]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbe5f4] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1246a0] text-sm font-black text-white">
                A
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                  Atlas workspace
                </p>
                <p className="mt-0.5 text-sm font-bold">Sample Service Company</p>
              </div>
            </div>
            <span className="rounded-full border border-[#c7d8f0] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#527096]">
              Interactive preview
            </span>
          </div>

          <div
            aria-label="Atlas product preview"
            className="grid grid-cols-3 border-b border-[#dbe5f4] bg-white px-2 pt-2"
            role="tablist"
          >
            {views.map((view) => {
              const selected = active.id === view.id;
              return (
                <button
                  aria-controls="atlas-preview-panel"
                  aria-selected={selected}
                  className={`rounded-t-xl border-b-2 px-2 py-3 text-xs font-black transition sm:text-sm ${
                    selected
                      ? "border-[#1246a0] bg-[#f5f8fd] text-[#1246a0]"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-[#071b42]"
                  }`}
                  id={`atlas-preview-tab-${view.id}`}
                  key={view.id}
                  onClick={() => setActiveId(view.id)}
                  role="tab"
                  type="button"
                >
                  {view.tab}
                </button>
              );
            })}
          </div>

          <div
            aria-labelledby={`atlas-preview-tab-${active.id}`}
            className="p-4 sm:p-6"
            id="atlas-preview-panel"
            role="tabpanel"
          >
            <div className="rounded-2xl bg-[#0d3f94] p-5 text-white sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
                  {active.eyebrow}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-100">
                  This week
                </span>
              </div>
              <h3 className="mt-4 max-w-xl text-2xl font-black leading-tight sm:text-3xl">
                {active.priority}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
                {active.description}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {active.metrics.map(([label, value, note]) => (
                <div
                  className="rounded-2xl border border-[#dbe5f4] bg-white p-4"
                  key={label}
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-[#071b42]">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#527096]">
                    {note}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#dbe5f4] bg-white">
              <div className="flex items-center justify-between border-b border-[#e4ebf5] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1246a0]">
                  Work queue
                </p>
                <p className="text-[10px] font-bold text-slate-400">OWNER REVIEW</p>
              </div>
              <div className="divide-y divide-[#edf1f7]">
                {active.rows.map(([title, context, next, status]) => (
                  <div
                    className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[1.35fr_0.85fr_0.75fr_auto] sm:items-center"
                    key={title}
                  >
                    <p className="font-bold text-[#071b42]">{title}</p>
                    <p className="text-slate-500">{context}</p>
                    <p className="font-semibold text-[#527096]">{next}</p>
                    <span className="w-fit rounded-full bg-[#eef4ff] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#1246a0]">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/70">
          <span>Illustrative product view</span>
          <span>Nothing sends without approval</span>
        </div>
      </div>
    </div>
  );
}
