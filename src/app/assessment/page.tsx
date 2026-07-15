import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { submitBusinessAssessment } from "@/server/assessments/actions";

export const metadata: Metadata = {
  title: "Free Business Assessment | Atlas For Entrepreneurs",
  description: "Tell Atlas where your business is now and what you want to improve next.",
};

const customerSources = [
  ["referrals", "Referrals"], ["facebook", "Facebook"], ["instagram", "Instagram"],
  ["google", "Google"], ["website", "Website"], ["walk_ins", "Walk-ins"],
  ["networking", "Networking"], ["repeat_customers", "Repeat customers"],
  ["paid_ads", "Paid ads"], ["other", "Other"],
] as const;

const challenges = [
  ["finding_customers", "Finding more customers"],
  ["getting_customers_to_buy", "Getting customers to buy"],
  ["not_enough_time", "Not enough time"],
  ["too_much_manual_work", "Too much manual work"],
  ["hiring", "Hiring"], ["cash_flow", "Cash flow"], ["marketing", "Marketing"],
  ["keeping_customers", "Keeping customers"],
  ["growing_the_business", "Growing the business"], ["other", "Other"],
] as const;

const evaluationAreas = [
  ["sales", "Sales"], ["marketing", "Marketing"], ["operations", "Operations"],
  ["customer_service", "Customer service"], ["pricing", "Pricing"],
  ["automation", "Automation"], ["ai", "AI"], ["website", "Website"],
  ["branding", "Branding"], ["hiring", "Hiring"], ["finance", "Finance"],
  ["technology", "Technology"],
] as const;

type PageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

function Choice({ name, value, label, type = "checkbox" }: {
  name: string; value: string; label: string; type?: "checkbox" | "radio";
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d9e4f4] bg-white px-4 py-3 text-sm font-medium text-[#16325c] transition hover:border-[#1246a0] hover:bg-[#f6f9ff]">
      <input className="h-4 w-4 accent-[#1246a0]" name={name} type={type} value={value} />
      {label}
    </label>
  );
}

export default async function AssessmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const received = params.status === "received";

  return (
    <>
      <SiteHeader active="assessment" />
      <main className="min-h-screen bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto max-w-4xl px-6 py-14 text-center sm:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c48713]">Free business assessment</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Let&apos;s find your strongest next move.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Give Atlas the real picture of your business. Manny will review your answers and identify where focused action can create the most value.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#1246a0]">About 7 minutes. No payment required.</p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-6 py-12">
          {received ? (
            <section className="rounded-3xl border border-[#b8e2cf] bg-white p-8 shadow-sm sm:p-12">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#167151]">Assessment received</p>
              <h2 className="mt-3 text-3xl font-bold">Thank you. Your business is now on our radar.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Manny will review your answers and contact you using the information you provided. If Atlas is a good fit, you will receive a clear recommended next step before any payment is requested.
              </p>
              <Link className="mt-8 inline-flex rounded-full bg-[#1246a0] px-6 py-3 font-semibold text-white hover:bg-[#0a2f78]" href="/">Return to the Atlas home page</Link>
            </section>
          ) : (
            <form action={submitBusinessAssessment} className="space-y-7">
              {params.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
                  {params.error === "missing_information" ? "Please complete every required question before sending your assessment." : "We could not save your assessment. Please try again in a moment."}
                </div>
              )}
              <input className="absolute -left-[9999px]" name="companyFax" tabIndex={-1} type="text" />

              <Question number="1" title="Tell us about your business." help="What does your business do?">
                <textarea className="field min-h-36" maxLength={3000} name="businessDescription" required />
              </Question>
              <Question number="2" title="Who do you help?" help="Who is your ideal customer?">
                <textarea className="field min-h-28" maxLength={1500} name="idealCustomer" required />
              </Question>
              <Question number="3" title="Where do most of your customers come from?" help="Choose all that apply.">
                <div className="grid gap-3 sm:grid-cols-2">{customerSources.map(([value, label]) => <Choice key={value} label={label} name="customerSources" value={value} />)}</div>
              </Question>
              <Question number="4" title="What is your biggest challenge right now?" help="Choose the one that needs attention first.">
                <div className="grid gap-3 sm:grid-cols-2">{challenges.map(([value, label]) => <Choice key={value} label={label} name="biggestChallenge" type="radio" value={value} />)}</div>
              </Question>
              <Question number="5" title="If Atlas could fix one thing in the next 90 days, what would it be?">
                <textarea className="field min-h-32" maxLength={2000} name="ninetyDayGoal" required />
              </Question>
              <Question number="6" title="Which areas would you like Atlas to evaluate?" help="Choose all that apply.">
                <div className="grid gap-3 sm:grid-cols-3">{evaluationAreas.map(([value, label]) => <Choice key={value} label={label} name="evaluationAreas" value={value} />)}</div>
              </Question>
              <Question number="7" title="Approximately how large is your business?">
                <div className="grid gap-3 sm:grid-cols-2"><Choice label="Just me" name="businessSize" type="radio" value="just_me" /><Choice label="2–5 employees" name="businessSize" type="radio" value="2_5" /><Choice label="6–15 employees" name="businessSize" type="radio" value="6_15" /><Choice label="16–50 employees" name="businessSize" type="radio" value="16_50" /><Choice label="50+ employees" name="businessSize" type="radio" value="50_plus" /></div>
              </Question>
              <Question number="8" title="Are you currently using any AI tools?">
                <div className="grid gap-3 sm:grid-cols-2"><Choice label="No" name="aiTools" type="radio" value="none" /><Choice label="ChatGPT" name="aiTools" type="radio" value="chatgpt" /><Choice label="Claude" name="aiTools" type="radio" value="claude" /><Choice label="Gemini" name="aiTools" type="radio" value="gemini" /><Choice label="Copilot" name="aiTools" type="radio" value="copilot" /><Choice label="Multiple tools" name="aiTools" type="radio" value="multiple" /></div>
              </Question>
              <Question number="9" title="How soon are you looking to improve your business?">
                <div className="grid gap-3 sm:grid-cols-2"><Choice label="Immediately" name="improvementTiming" type="radio" value="immediately" /><Choice label="Within 30 days" name="improvementTiming" type="radio" value="30_days" /><Choice label="Within 90 days" name="improvementTiming" type="radio" value="90_days" /><Choice label="Just exploring" name="improvementTiming" type="radio" value="exploring" /></div>
              </Question>
              <Question number="10" title="What's the best way to reach you?">
                <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" name="contactName" /><Field label="Business name" name="businessName" /><Field label="Email" name="contactEmail" type="email" /><Field label="Phone" name="contactPhone" type="tel" /><div className="sm:col-span-2"><Field label="Website (optional)" name="website" required={false} type="url" /></div></div>
                <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600"><input className="mt-1 h-4 w-4 accent-[#1246a0]" name="consentToContact" required type="checkbox" value="yes" />Atlas may contact me about this assessment. My information will be used to respond to my request and will not be sold.</label>
              </Question>

              <button className="w-full rounded-full bg-[#f4b52f] px-8 py-4 text-lg font-bold text-[#071b42] shadow-sm transition hover:bg-[#ffc94f]" type="submit">Send my free assessment</button>
              <p className="text-center text-sm text-slate-500">No charge today. No automatic subscription.</p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

function Question({ number, title, help, children }: { number: string; title: string; help?: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-[#dce6f5] bg-white p-6 shadow-sm sm:p-8"><div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1246a0] text-sm font-bold text-white">{number}</span><div><h2 className="text-xl font-bold">{title}</h2>{help && <p className="mt-1 text-sm text-slate-500">{help}</p>}</div></div><div className="mt-6">{children}</div></section>;
}

function Field({ label, name, type = "text", required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-[#16325c]">{label}<input className="field mt-2" maxLength={name === "contactEmail" ? 320 : 250} name={name} required={required} type={type} /></label>;
}
