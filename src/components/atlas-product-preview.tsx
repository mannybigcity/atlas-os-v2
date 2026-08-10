import Image from "next/image";

const steps = [
  ["Lead found", "Website form", "#1246a0"],
  ["Context loaded", "Recent work + notes", "#f0bf43"],
  ["Follow-up queued", "Text + email draft", "#137454"],
  ["Deal moving", "Next action assigned", "#0f4aa5"],
] as const;

const businesses = [
  ["RidgeLine Roofing", "Active", "$12.4k"],
  ["Summit Electric", "Active", "$8.2k"],
  ["Northline HVAC", "Needs follow-up", "$5.9k"],
  ["Harbor Plumbing", "Proposal sent", "$9.7k"],
] as const;

export function AtlasProductPreview() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200 bg-[#fbfcfe] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1246a0]">
              Atlas workspace
            </p>
            <p className="mt-1 text-sm font-bold text-[#071b42]">
              Lead follow-up, jobs, and next actions
            </p>
          </div>
          <span className="rounded-full border border-[#dbe5f1] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#4f6a86]">
            Mockup
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[24rem] overflow-hidden rounded-[1.6rem] bg-[#f3f7ff]">
            <Image
              alt="Contractors and small business owners in a working collage"
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              src="/atlas-hero-collage.png"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-transparent to-transparent" />

            <div className="absolute left-4 top-4 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1246a0]">
                New lead
              </p>
              <p className="mt-1 text-sm font-bold text-[#071b42]">Roof repair request</p>
              <p className="mt-1 text-xs text-slate-500">Sent from the website 8 min ago</p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
              {steps.map(([title, detail, tint]) => (
                <div
                  className="rounded-2xl border border-white/70 bg-white/92 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur"
                  key={title}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tint }} />
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {title}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#071b42]">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              ["Today at a glance", "14", "leads needing attention"],
              ["Follow-ups due", "6", "ready to send or call"],
              ["Deals in motion", "9", "opportunities progressing"],
            ].map(([label, value, detail]) => (
              <article
                className="rounded-[1.4rem] border border-slate-200 bg-[#fbfcfe] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.03)]"
                key={label}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[#071b42]">
                  {value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
              </article>
            ))}

            <article className="rounded-[1.4rem] border border-slate-200 bg-[#071b42] p-4 text-white shadow-[0_12px_28px_rgba(7,27,66,0.18)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f0bf43]">
                Next move
              </p>
              <p className="mt-3 text-xl font-black tracking-[-0.04em]">
                Follow up on the warm lead before it cools off.
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-100/80">
                Atlas keeps the contact, context, and next action in one place so the owner can move fast.
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-200 sm:grid-cols-4">
          {businesses.map(([name, status, value]) => (
            <article className="bg-white px-4 py-3" key={name}>
              <p className="text-sm font-black text-[#071b42]">{name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1246a0]">{status}</span>
                <span className="text-sm font-black text-[#071b42]">{value}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Lead source", "Website + referral"],
            ["Current action", "Quote review"],
            ["Business value", "$41,000 pipeline"],
          ].map(([label, value]) => (
            <article className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3" key={label}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 text-sm font-bold text-[#071b42]">{value}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
