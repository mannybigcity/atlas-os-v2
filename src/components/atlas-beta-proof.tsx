const scorecard = [
  {
    label: "Lead follow-up coverage",
    before: "40%",
    after: "100%",
    note: "Every inquiry has an owner and next date",
  },
  {
    label: "Unassigned opportunities",
    before: "6",
    after: "0",
    note: "Nothing valuable waits in an inbox",
  },
  {
    label: "Marketing drafts ready",
    before: "0",
    after: "4",
    note: "One useful campaign prepared for review",
  },
] as const;

const beforeWorkflow = [
  "Inquiry lands in a call log, inbox, or direct message",
  "The owner remembers the details and intended follow-up",
  "Marketing happens only when the week slows down",
  "There is no simple record of what moved or went quiet",
] as const;

const afterWorkflow = [
  "Every inquiry is captured in one private opportunity queue",
  "Each opportunity has an owner, status, and next date",
  "Follow-up and campaign drafts are prepared for approval",
  "The owner reviews one scorecard and chooses the next priority",
] as const;

function WorkflowCard({
  eyebrow,
  title,
  items,
  improved = false,
}: {
  eyebrow: string;
  title: string;
  items: readonly string[];
  improved?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.75rem] border p-6 sm:p-7 ${
        improved
          ? "border-[#b8e2cf] bg-[#f3fbf7]"
          : "border-[#ead0cc] bg-[#fff8f6]"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-[0.18em] ${
          improved ? "text-[#137454]" : "text-[#a34333]"
        }`}
      >
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-black tracking-tight text-[#071b42]">
        {title}
      </h3>
      <ol className="mt-6 space-y-4">
        {items.map((item, index) => (
          <li className="flex gap-3 text-sm leading-6 text-slate-600" key={item}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                improved
                  ? "bg-[#dff5e9] text-[#137454]"
                  : "bg-[#f7e5e1] text-[#a34333]"
              }`}
            >
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function AtlasBetaProof() {
  return (
    <section className="overflow-hidden bg-white" id="beta-proof">
      <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1246a0]">
              Beta proof framework
            </p>
            <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.045em] text-[#071b42] sm:text-6xl">
              Measure the leak. Install the fix. Prove what moved.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <div className="max-w-xl rounded-2xl border border-[#efd38f] bg-[#fff9e8] px-5 py-4 text-sm leading-6 text-[#72540c]">
              <strong className="text-[#493300]">Illustrative beta scenario:</strong>{" "}
              this section shows the evidence Atlas will collect. It is not a
              claim about an existing customer or completed result.
            </div>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-[#d8e3f1] bg-[#f7f9fc] shadow-[0_28px_80px_rgba(7,27,66,0.10)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8e3f1] bg-[#071b42] px-6 py-5 text-white sm:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
                Sample beta scorecard
              </p>
              <p className="mt-1 text-lg font-black">Owner-led service business</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
              <span className="h-2 w-2 rounded-full bg-[#55d39b]" />
              30-day test design
            </div>
          </div>

          <div className="grid gap-px bg-[#d8e3f1] lg:grid-cols-3">
            {scorecard.map((metric) => (
              <article className="bg-white p-6 sm:p-8" key={metric.label}>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#527096]">
                  {metric.label}
                </p>
                <div className="mt-6 flex items-end gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Example baseline
                    </p>
                    <p className="mt-1 text-3xl font-black text-slate-400 line-through decoration-[#d47b69] decoration-2">
                      {metric.before}
                    </p>
                  </div>
                  <span aria-hidden="true" className="pb-1 text-2xl text-[#c4972d]">
                    &rarr;
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#137454]">
                      Pilot target
                    </p>
                    <p className="mt-1 text-4xl font-black tracking-tight text-[#071b42]">
                      {metric.after}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600">{metric.note}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <WorkflowCard
            eyebrow="Before Atlas"
            items={beforeWorkflow}
            title="The owner is the workflow"
          />
          <WorkflowCard
            eyebrow="After the operating cycle"
            improved
            items={afterWorkflow}
            title="The business has a workflow"
          />
        </div>

        <div className="mt-6 grid gap-6 rounded-[2rem] bg-[#0d459f] p-7 text-white sm:p-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd068]">
              Sample testimonial format
            </p>
            <p className="mt-3 text-sm leading-6 text-blue-100">
              Placeholder only. This is not an actual customer quote.
            </p>
          </div>
          <blockquote className="text-2xl font-black leading-snug tracking-[-0.025em] sm:text-3xl">
            &ldquo;For the first time, I could see which opportunities were
            waiting on me, what needed a follow-up, and what the business should
            focus on next.&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}
