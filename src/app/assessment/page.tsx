import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { submitBusinessAssessment } from "@/server/assessments/actions";

export const metadata: Metadata = {
  title: "Free Service-Business Growth Assessment | Atlas",
  description:
    "Find the lead, follow-up, marketing, or operating leak costing your service business the most.",
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

const monthlyLeadVolumes = [
  ["under_10", "Under 10 new leads per month"],
  ["10_25", "10-25 new leads per month"],
  ["26_75", "26-75 new leads per month"],
  ["76_plus", "76+ new leads per month"],
  ["not_sure", "Not sure yet"],
] as const;

const followUpSpeeds = [
  ["same_day", "Same day"],
  ["1_2_days", "1-2 days"],
  ["3_7_days", "3-7 days"],
  ["when_remembered", "When someone remembers"],
  ["not_tracking", "We are not tracking it yet"],
] as const;

const pilotBudgets = [
  ["under_500", "Under $500"],
  ["500_1500", "$500-$1,500"],
  ["1500_3000", "$1,500-$3,000"],
  ["3000_plus", "$3,000+"],
  ["need_recommendation", "I need a recommendation"],
] as const;

const contactPreferences = [
  ["phone", "Phone call"],
  ["email", "Email"],
  ["text", "Text message"],
] as const;

type PageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

function Choice({ name, value, label, type = "checkbox" }: {
  name: string; value: string; label: string; type?: "checkbox" | "radio";
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#d9e4f4] bg-white px-4 py-3 text-sm font-medium text-[#16325c] transition hover:border-[#1246a0] hover:bg-[#f6f9ff]">
      <input className="h-4 w-4 accent-[#1246a0]" name={name} required={type === "radio"} type={type} value={value} />
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
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c48713]">Free revenue leak assessment</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Find the revenue leak costing you the most.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Show Atlas how leads arrive, what happens after the first call, and where the owner gets pulled back in. Manny will review the answers and identify the strongest practical starting point.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#1246a0]">About 7 minutes. No payment required.</p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-6 py-12">
          {received ? (
            <section aria-live="polite" className="rounded-3xl border border-[#b8e2cf] bg-white p-8 shadow-sm sm:p-12">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#167151]">Assessment received</p>
              <h2 className="mt-3 text-3xl font-bold">Thank you. Your growth assessment is in.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Manny will review your lead flow, follow-up, marketing, and goals. If Atlas is a good fit, you will receive one clear recommended starting point before any payment is requested.
              </p>
              <Link className="mt-8 inline-flex rounded-full bg-[#1246a0] px-6 py-3 font-semibold text-white hover:bg-[#0a2f78]" href="/">Return to the Atlas home page</Link>
            </section>
          ) : (
            <form action={submitBusinessAssessment} className="space-y-7">
              {params.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800" role="alert">
                  {params.error === "missing_information" ? "Please complete every required question before sending your assessment." : "We could not save your assessment. Please try again in a moment."}
                </div>
              )}
              <input aria-hidden="true" autoComplete="off" className="absolute -left-[9999px]" name="companyFax" tabIndex={-1} type="text" />

              <Question number="1" title="Tell us about your service business." help="What do you provide, who do you serve, and where do you operate?">
                <textarea aria-labelledby="assessment-question-1" className="field min-h-36" maxLength={3000} name="businessDescription" required />
              </Question>
              <Question number="2" title="Who do you help?" help="Who is your ideal customer?">
                <textarea aria-labelledby="assessment-question-2" className="field min-h-28" maxLength={1500} name="idealCustomer" required />
              </Question>
              <Question number="3" title="Where do most of your customers come from?" help="Choose all that apply.">
                <div className="grid gap-3 sm:grid-cols-2">{customerSources.map(([value, label]) => <Choice key={value} label={label} name="customerSources" value={value} />)}</div>
              </Question>
              <Question number="4" title="What is your biggest challenge right now?" help="Choose the one that needs attention first.">
                <div className="grid gap-3 sm:grid-cols-2">{challenges.map(([value, label]) => <Choice key={value} label={label} name="biggestChallenge" type="radio" value={value} />)}</div>
              </Question>
              <Question number="5" title="If Atlas could fix one thing in the next 90 days, what would it be?">
                <textarea aria-labelledby="assessment-question-5" className="field min-h-32" maxLength={2000} name="ninetyDayGoal" required />
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
              <Question number="10" title="How many new leads do you usually get each month?" help="A close estimate is fine. This helps Atlas size the first operating cycle.">
                <div className="grid gap-3 sm:grid-cols-2">{monthlyLeadVolumes.map(([value, label]) => <Choice key={value} label={label} name="monthlyLeadVolume" type="radio" value={value} />)}</div>
              </Question>
              <Question number="11" title="How fast do new leads usually get a follow-up?">
                <div className="grid gap-3 sm:grid-cols-2">{followUpSpeeds.map(([value, label]) => <Choice key={value} label={label} name="followUpSpeed" type="radio" value={value} />)}</div>
              </Question>
              <Question number="12" title="If Atlas is a fit, what budget range should Manny design around?" help="This is not a payment screen. It keeps the recommendation realistic.">
                <div className="grid gap-3 sm:grid-cols-2">{pilotBudgets.map(([value, label]) => <Choice key={value} label={label} name="pilotBudget" type="radio" value={value} />)}</div>
              </Question>
              <Question number="13" title="What's the best way to reach you?">
                <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" name="contactName" /><Field label="Business name" name="businessName" /><Field label="Email" name="contactEmail" type="email" /><Field label="Phone" name="contactPhone" type="tel" /><div className="sm:col-span-2"><Field label="Website (optional)" name="website" placeholder="siscustomcreations.com" required={false} /></div></div>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-[#16325c]">Preferred contact method</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">{contactPreferences.map(([value, label]) => <Choice key={value} label={label} name="preferredContactMethod" type="radio" value={value} />)}</div>
                </div>
                <label className="mt-5 block text-sm font-semibold text-[#16325c]">Social media links or handles (optional)<textarea className="field mt-2 min-h-24" maxLength={1500} name="socialMedia" placeholder="Facebook, Instagram, TikTok, LinkedIn, YouTube, Etsy, or other public pages" /></label>
                <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
                  <input className="mt-1 h-4 w-4 accent-[#1246a0]" name="consentToContact" required type="checkbox" value="yes" />
                  <span>
                    Atlas may contact me about this assessment. My information will be used to respond to my request and will not be sold. See the{" "}
                    <Link className="font-semibold text-[#1246a0] underline underline-offset-4" href="/privacy">Privacy Policy</Link>.
                  </span>
                </label>
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
  return <fieldset className="rounded-3xl border border-[#dce6f5] bg-white p-6 shadow-sm sm:p-8"><legend className="w-full"><span className="flex gap-4"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1246a0] text-sm font-bold text-white">{number}</span><span><span className="block text-xl font-bold" id={`assessment-question-${number}`}>{title}</span>{help && <span className="mt-1 block text-sm font-normal text-slate-500">{help}</span>}</span></span></legend><div className="mt-6">{children}</div></fieldset>;
}

function Field({ label, name, type = "text", required = true, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  const autoComplete = {
    contactName: "name",
    businessName: "organization",
    contactEmail: "email",
    contactPhone: "tel",
    website: "url",
  }[name];

  return <label className="block text-sm font-semibold text-[#16325c]">{label}<input autoComplete={autoComplete} className="field mt-2" inputMode={name === "website" ? "url" : undefined} maxLength={name === "contactEmail" ? 320 : 250} name={name} placeholder={placeholder} required={required} type={type} /></label>;
}
