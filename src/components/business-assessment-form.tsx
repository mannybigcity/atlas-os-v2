"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { submitBusinessAssessment } from "@/server/assessments/actions";

const customerSources = [
  ["referrals", "Referrals"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["google", "Google"],
  ["website", "Website"],
  ["walk_ins", "Walk-ins"],
  ["networking", "Networking"],
  ["repeat_customers", "Repeat customers"],
  ["paid_ads", "Paid ads"],
  ["other", "Other"],
] as const;

const challenges = [
  ["finding_customers", "Finding more customers"],
  ["getting_customers_to_buy", "Getting customers to buy"],
  ["not_enough_time", "Not enough time"],
  ["too_much_manual_work", "Too much manual work"],
  ["hiring", "Hiring"],
  ["cash_flow", "Cash flow"],
  ["marketing", "Marketing"],
  ["keeping_customers", "Keeping customers"],
  ["growing_the_business", "Growing the business"],
  ["other", "Other"],
] as const;

const evaluationAreas = [
  ["sales", "Sales"],
  ["marketing", "Marketing"],
  ["operations", "Operations"],
  ["customer_service", "Customer service"],
  ["pricing", "Pricing"],
  ["automation", "Automation"],
  ["ai", "AI"],
  ["website", "Website"],
  ["branding", "Branding"],
  ["hiring", "Hiring"],
  ["finance", "Finance"],
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

type Props = {
  error?: string;
};

function isFilled(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function sectionStates(form: HTMLFormElement | null): [boolean, boolean, boolean, boolean] {
  if (!form) {
    return [false, false, false, false];
  }

  const data = new FormData(form);
  return [
    isFilled(data.get("businessDescription")) &&
      isFilled(data.get("idealCustomer")) &&
      isFilled(data.get("businessName")),
    data.getAll("customerSources").length > 0 &&
      isFilled(data.get("biggestChallenge")) &&
      data.getAll("evaluationAreas").length > 0,
    isFilled(data.get("ninetyDayGoal")) &&
      isFilled(data.get("businessSize")) &&
      data.getAll("aiTools").length > 0 &&
      isFilled(data.get("improvementTiming")) &&
      isFilled(data.get("monthlyLeadVolume")) &&
      isFilled(data.get("followUpSpeed")) &&
      isFilled(data.get("pilotBudget")),
    isFilled(data.get("contactName")) &&
      isFilled(data.get("contactEmail")) &&
      isFilled(data.get("contactPhone")) &&
      isFilled(data.get("preferredContactMethod")) &&
      data.get("consentToContact") === "yes",
  ];
}

function ProgressDot({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-3 w-3 shrink-0 rounded-full ${complete ? "bg-emerald-500" : "bg-slate-300"}`}
    />
  );
}

function Choice({
  name,
  value,
  label,
  type = "checkbox",
}: {
  name: string;
  value: string;
  label: string;
  type?: "checkbox" | "radio";
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d9e4f4] bg-white px-3.5 py-3 text-sm font-medium text-[#16325c] transition hover:border-[#1246a0] hover:bg-[#f6f9ff] focus-within:border-[#1246a0] focus-within:ring-2 focus-within:ring-[#1246a0]/12">
      <input
        className="h-4 w-4 shrink-0 accent-[#1246a0]"
        name={name}
        required={type === "radio"}
        type={type}
        value={value}
      />
      <span className="leading-5">{label}</span>
    </label>
  );
}

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[#16325c]">
      <span>{label}</span>
      <input
        autoComplete={
          {
            contactName: "name",
            businessName: "organization",
            contactEmail: "email",
            contactPhone: "tel",
            website: "url",
          }[name]
        }
        className="assessment-field mt-2"
        inputMode={name === "website" ? "url" : undefined}
        maxLength={name === "contactEmail" ? 320 : 250}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  const maxLength =
    name === "businessDescription"
      ? 3000
      : name === "idealCustomer"
        ? 1500
        : 2000;

  return (
    <label className="block text-sm font-semibold text-[#16325c]">
      <span>{label}</span>
      <textarea
        className="assessment-field assessment-textarea mt-2"
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function SectionCard({
  number,
  title,
  helper,
  complete,
  children,
}: {
  number: string;
  title: string;
  helper: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#dbe6f3] bg-white p-5 shadow-[0_1.25rem_2.75rem_rgba(6,27,82,.08)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf2f8] pb-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#1246a0]">
            Section {number}
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.05em] text-[#06266d] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
        </div>
        <span
          className={`inline-flex min-h-9 items-center rounded-full px-3 text-[11px] font-black uppercase tracking-[0.18em] ${complete ? "bg-emerald-50 text-emerald-700" : "bg-[#eef4ff] text-[#1246a0]"}`}
        >
          {complete ? "Complete" : "In progress"}
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BusinessAssessmentForm({ error }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [sections, setSections] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  const completeCount = sections.filter(Boolean).length;
  const percent = Math.round((completeCount / sections.length) * 100);
  const activeSection = sections.findIndex((complete) => !complete);
  const currentSection = activeSection === -1 ? sections.length : activeSection + 1;

  useEffect(() => {
    setSections(sectionStates(formRef.current));
  }, []);

  function handleChange() {
    setSections(sectionStates(formRef.current));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
      <form
        ref={formRef}
        action={submitBusinessAssessment}
        className="space-y-6"
        onChangeCapture={handleChange}
        onInputCapture={handleChange}
      >
        {error ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800"
            role="alert"
          >
            {error === "missing_information"
              ? "Please complete every required question before sending the company snapshot."
              : "We could not save the snapshot. Please try again in a moment."}
          </div>
        ) : null}

        <input
          aria-hidden="true"
          autoComplete="off"
          className="absolute -left-[9999px]"
          name="companyFax"
          tabIndex={-1}
          type="text"
        />

        <div className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
          <SectionCard
            complete={sections[0]}
            helper="Start with the business story, the offer, and the customer they serve."
            number="01"
            title="Company basics"
          >
            <div className="grid gap-4">
              <TextAreaField
                label="Tell us about the company"
                name="businessDescription"
                placeholder="What do you provide, who do you serve, and where do you operate?"
              />
              <TextAreaField
                label="Who is the ideal customer?"
                name="idealCustomer"
                placeholder="Describe the best-fit customer in one or two sentences."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Business name" name="businessName" />
                <TextField
                  label="Website"
                  name="website"
                  placeholder="example.com"
                  required={false}
                />
              </div>
            </div>
          </SectionCard>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.75rem] border border-[#cfdcf0] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)]">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f7cc62]">
                Completion
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-4xl font-black tracking-[-0.08em]">
                    {percent}%
                  </div>
                  <p className="mt-1 text-sm leading-6 text-white/75">
                    {currentSection > sections.length
                      ? "All sections complete"
                      : `Section ${currentSection} of ${sections.length}`}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/8 text-sm font-black text-[#f7cc62]">
                  {completeCount}/{sections.length}
                </div>
              </div>
              <div aria-hidden="true" className="mt-4 h-2 rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f7cc62] to-[#df9815] transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-white/78">
                Complete the company snapshot to see if Atlas is the right fit and
                unlock a 7-day free trial review option.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-white p-5 shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.08)]">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#1246a0]">
                What Atlas learns
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="flex gap-3">
                  <ProgressDot complete={sections[0]} />
                  <span>How the company operates and who it serves.</span>
                </li>
                <li className="flex gap-3">
                  <ProgressDot complete={sections[1]} />
                  <span>Where leads come from and what slows follow-up.</span>
                </li>
                <li className="flex gap-3">
                  <ProgressDot complete={sections[2]} />
                  <span>What growth target, budget, and timing fit best.</span>
                </li>
                <li className="flex gap-3">
                  <ProgressDot complete={sections[3]} />
                  <span>How Atlas should contact the right person next.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <SectionCard
          complete={sections[1]}
          helper="Show how customers arrive, what slows the handoff, and where Atlas should help first."
          number="02"
          title="Customer flow and priorities"
        >
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                Where do most customers come from?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {customerSources.map(([value, label]) => (
                  <Choice key={value} label={label} name="customerSources" value={value} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                What is the biggest challenge right now?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {challenges.map(([value, label]) => (
                  <Choice
                    key={value}
                    label={label}
                    name="biggestChallenge"
                    type="radio"
                    value={value}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                Which areas should Atlas evaluate?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {evaluationAreas.map(([value, label]) => (
                  <Choice key={value} label={label} name="evaluationAreas" value={value} />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          complete={sections[2]}
          helper="Capture the next 90 days so Atlas can recommend the right first move."
          number="03"
          title="Growth plan"
        >
          <div className="grid gap-4">
            <TextAreaField
              label="What would success look like in 90 days?"
              name="ninetyDayGoal"
              placeholder="Share the result you want Atlas to help create."
            />
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                What is the company size?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Choice label="Just me" name="businessSize" type="radio" value="just_me" />
                <Choice label="2-5 employees" name="businessSize" type="radio" value="2_5" />
                <Choice label="6-15 employees" name="businessSize" type="radio" value="6_15" />
                <Choice label="16-50 employees" name="businessSize" type="radio" value="16_50" />
                <Choice label="50+ employees" name="businessSize" type="radio" value="50_plus" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                Are you currently using any AI tools?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Choice label="No" name="aiTools" type="radio" value="none" />
                <Choice label="ChatGPT" name="aiTools" type="radio" value="chatgpt" />
                <Choice label="Claude" name="aiTools" type="radio" value="claude" />
                <Choice label="Gemini" name="aiTools" type="radio" value="gemini" />
                <Choice label="Copilot" name="aiTools" type="radio" value="copilot" />
                <Choice label="Multiple tools" name="aiTools" type="radio" value="multiple" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                When do you want to improve things?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Choice
                  label="Immediately"
                  name="improvementTiming"
                  type="radio"
                  value="immediately"
                />
                <Choice
                  label="Within 30 days"
                  name="improvementTiming"
                  type="radio"
                  value="30_days"
                />
                <Choice
                  label="Within 90 days"
                  name="improvementTiming"
                  type="radio"
                  value="90_days"
                />
                <Choice
                  label="Just exploring"
                  name="improvementTiming"
                  type="radio"
                  value="exploring"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-[#16325c]">New leads per month</p>
                <div className="mt-3 grid gap-3">
                  {monthlyLeadVolumes.map(([value, label]) => (
                    <Choice
                      key={value}
                      label={label}
                      name="monthlyLeadVolume"
                      type="radio"
                      value={value}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#16325c]">
                  Usual follow-up speed
                </p>
                <div className="mt-3 grid gap-3">
                  {followUpSpeeds.map(([value, label]) => (
                    <Choice
                      key={value}
                      label={label}
                      name="followUpSpeed"
                      type="radio"
                      value={value}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#16325c]">Budget range</p>
                <div className="mt-3 grid gap-3">
                  {pilotBudgets.map(([value, label]) => (
                    <Choice
                      key={value}
                      label={label}
                      name="pilotBudget"
                      type="radio"
                      value={value}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          complete={sections[3]}
          helper="Give Atlas the best contact and the consent needed to follow up."
          number="04"
          title="Contact and consent"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Your name" name="contactName" />
              <TextField label="Your title (optional)" name="contactTitle" required={false} />
              <TextField label="Email" name="contactEmail" type="email" />
              <TextField label="Phone" name="contactPhone" type="tel" />
              <div className="sm:col-span-2">
                <TextField
                  label="Website (optional)"
                  name="website"
                  placeholder="example.com"
                  required={false}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#16325c]">
                Preferred contact method
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {contactPreferences.map(([value, label]) => (
                  <Choice
                    key={value}
                    label={label}
                    name="preferredContactMethod"
                    type="radio"
                    value={value}
                  />
                ))}
              </div>
            </div>
            <label className="block text-sm font-semibold text-[#16325c]">
              <span>Social media links or handles (optional)</span>
              <textarea
                className="assessment-field assessment-textarea mt-2"
                maxLength={1500}
                name="socialMedia"
                placeholder="Facebook, Instagram, TikTok, LinkedIn, YouTube, Etsy, or other public pages"
                required={false}
              />
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-[#d9e4f4] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-slate-600">
              <input
                className="mt-1 h-4 w-4 accent-[#1246a0]"
                name="consentToContact"
                required
                type="checkbox"
                value="yes"
              />
              <span>
                Atlas may contact me about this company snapshot. My information
                will be used to respond to my request and will not be sold.
              </span>
            </label>
          </div>
        </SectionCard>

        <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-white p-5 shadow-[0_1.25rem_2.75rem_rgba(6,27,82,.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#c48713]">
                Finish and unlock
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[#06266d] sm:text-3xl">
                Send the company snapshot
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Atlas will review the answers and show the next step, including a
                7-day free trial review option if the business is a fit.
              </p>
            </div>
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f4b52f] px-6 text-sm font-black text-[#071b42] shadow-sm transition hover:bg-[#ffc94f]"
              type="submit"
            >
              Send my company snapshot
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500 sm:text-left">
            No charge today. No automatic subscription.
          </p>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.75rem_rgba(6,27,82,.08)]">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#f7cc62]">
            Need the product preview?
          </p>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Review the public preview before you submit the assessment.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#06266d] transition hover:bg-[#f5f7fb]"
            href="/atlas-preview"
          >
            See ATLAS in Action
          </Link>
        </div>
      </aside>
    </div>
  );
}
