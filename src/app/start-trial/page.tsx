import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { startTrial } from "@/server/auth/actions";

export const metadata: Metadata = {
  title: "Start Your 7-Day Free Trial | Atlas For Entrepreneurs",
  description: "Preview the no-card seven-day Atlas trial enrollment journey.",
  robots: { index: false, follow: false },
};

const fields = [
  ["Full name", "Your name", "text"],
  ["Business name", "Your business", "text"],
  ["Email", "you@business.com", "email"],
  ["Phone", "Your phone number", "tel"],
] as const;

export default async function StartTrialPage({ searchParams }: { searchParams?: Promise<{ error?: string; status?: string }> }) {
  const params = await searchParams;
  const message = params?.status === "check_email"
    ? "Check your email to confirm your address. Your seven-day trial begins when your profile is created after confirmation."
    : params?.error === "validation"
      ? "Complete every field, accept the terms and privacy policy, and make sure both passwords match."
      : params?.error === "weak_password"
        ? "Use at least 12 characters with uppercase, lowercase, a number, and a symbol."
        : params?.error
          ? "We could not start the trial. Check your details and try again."
          : null;

  return (
    <main className="min-h-screen bg-[#fffdf8] text-[#071b42]">
      <SiteHeader />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-20">
        <div className="self-start rounded-[2rem] bg-[#061631] p-7 text-white shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.16)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd068]">Atlas For Entrepreneurs</p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl font-black leading-[.95] tracking-[-.07em] sm:text-6xl">
            Start your 7-day free trial.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/80">
            Get a focused starter workspace for leads, pipeline, follow-up, and next actions.
          </p>
          <div className="mt-8 space-y-3 text-sm font-semibold text-blue-100">
            <p>✓ No card required</p>
            <p>✓ Seven days to explore the starter workspace</p>
            <p>✓ Upgrade after seven days if Atlas is right for your business</p>
          </div>
          <p className="mt-8 border-t border-white/15 pt-6 text-xs leading-6 text-blue-100/65">
            Your account is created only after you submit this form. Email verification is required before the starter workspace opens.
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#dfe5ef] bg-white p-6 shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.08)] sm:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">Trial enrollment</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">Tell us about your business</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Complete these details so your starter workspace can be prepared.</p>
          </div>
          <form action={startTrial} className="mt-7 space-y-5">
            {message ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">{message}</div> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(([label, placeholder, type]) => (
                <label className="block space-y-2" key={label}>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <input aria-label={label} className="assessment-field" name={label === "Full name" ? "fullName" : label === "Business name" ? "businessName" : label.toLowerCase()} placeholder={placeholder} required type={type} />
                </label>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Business type</span>
              <select aria-label="Business type" className="assessment-field" defaultValue="" name="businessType" required>
                <option disabled value="">Choose a business type</option>
                <option>Contractor or home service</option>
                <option>Professional service</option>
                <option>Retail or ecommerce</option>
                <option>Other small business</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Primary growth goal</span>
              <textarea aria-label="Primary growth goal" className="assessment-field assessment-textarea" name="primaryGrowthGoal" placeholder="What would you most like to improve in the next 90 days?" required />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Create a password</span><input autoComplete="new-password" className="assessment-field" minLength={12} name="password" required type="password" /></label>
              <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Confirm password</span><input autoComplete="new-password" className="assessment-field" minLength={12} name="confirmPassword" required type="password" /></label>
            </div>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input aria-label="Terms and privacy consent" className="mt-1 h-4 w-4 accent-[#1246a0]" name="consent" required type="checkbox" />
              <span>I agree to the Atlas <Link className="font-semibold text-[#1246a0]" href="/terms">terms</Link> and <Link className="font-semibold text-[#1246a0]" href="/privacy">privacy policy</Link>.</span>
            </label>
            <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#f5b932] px-5 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]" type="submit">
              Start my 7-day free trial
            </button>
            <p className="text-center text-xs leading-5 text-slate-500">No card required. Upgrade after seven days if Atlas is right for your business.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
