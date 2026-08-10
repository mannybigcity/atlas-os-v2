const proofCards = [
  {
    title: "Opportunity context stays attached",
    text: "The lead, source, and reason for interest stay with the opportunity so the next action is easier to make.",
  },
  {
    title: "Follow-up is prepared from the current thread",
    text: "Atlas keeps the reply tied to the conversation instead of forcing the owner to reconstruct the story later.",
  },
  {
    title: "Pipeline movement is easy to read",
    text: "The business can see what advanced, what is waiting, and what still needs owner attention.",
  },
] as const;

export function AtlasBetaProof() {
  return (
    <section className="bg-[#f7f8fb]" id="proof">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#1246a0]">
              Product proof
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#071b42] sm:text-5xl lg:text-6xl">
              Clear enough to understand instantly. Structured enough to use every day.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <div className="max-w-xl rounded-[1.35rem] border border-[#dbe5f1] bg-white px-5 py-4 text-sm leading-6 text-slate-600 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              Atlas is framed as a working system, not an abstract AI promise. The homepage shows how the product behaves before asking the visitor to take a next step.
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {proofCards.map((card) => (
            <article
              className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.04)]"
              key={card.title}
            >
              <span className="block h-1.5 w-12 rounded-full bg-[#f0bf43]" />
              <h3 className="mt-6 text-xl font-black tracking-[-0.04em] text-[#071b42]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-[#dbe5f1] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4f6a86]">
                Control and trust
              </p>
              <p className="mt-2 text-lg font-black tracking-[-0.03em] text-[#071b42]">
                Atlas keeps the owner in the loop before anything external happens.
              </p>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              This page is intentionally restrained: no flashy chatbot framing, no generic AI glow, and no promise that skips the work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
