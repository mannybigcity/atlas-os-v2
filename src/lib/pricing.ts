export type AtlasPricingAvailability = "available" | "launch_offer" | "coming_soon";

export type AtlasPricingPlanSlug = "start" | "grow" | "command";

export type AtlasPricingPlan = {
  slug: AtlasPricingPlanSlug;
  name: string;
  monthlyPrice: number;
  bestFor: string;
  featured: boolean;
  cta: string;
  usageAllowance: string;
  availability: AtlasPricingAvailability;
  features: string[];
  futureFeatures: string[];
};

export type AtlasPricingComparisonRow = {
  label: string;
  start: string;
  grow: string;
  command: string;
};

export type AtlasPricingFaq = {
  question: string;
  answer: string;
};

export type AtlasLaunchOffer = {
  label: string;
  name: string;
  monthlyPrice: number;
  summary: string;
  term: string;
  limit: string;
};

export type AtlasFutureAddOn = {
  label: string;
  name: string;
  targetPrice: string;
  summary: string;
  availability: AtlasPricingAvailability;
  futureFeatures: string[];
};

export const atlasPricingPlans: AtlasPricingPlan[] = [
  {
    slug: "start",
    name: "ATLAS START",
    monthlyPrice: 99,
    bestFor: "Solo owners / very small businesses",
    featured: false,
    cta: "Choose START",
    usageAllowance: "Monthly usage allowance",
    availability: "available",
    features: [
      "CRM / Sales Command",
      "Basic HUNTER prospect discovery",
      "Basic MICAH content studio",
      "Basic DAVID follow-up desk",
      "Business assessment",
      "Opportunity tracking",
      "Activity / attention center",
      "Monthly AI allowance",
      "Standard support",
    ],
    futureFeatures: [
      "Expanded automation as the workflow matures",
      "Higher usage capacity as the business grows",
    ],
  },
  {
    slug: "grow",
    name: "ATLAS GROW",
    monthlyPrice: 249,
    bestFor: "Growing local businesses",
    featured: true,
    cta: "Choose GROW",
    usageAllowance: "Larger monthly usage allowance",
    availability: "available",
    features: [
      "Everything in START",
      "Expanded HUNTER prospect discovery",
      "Full Sales Command workflow",
      "Stronger follow-up capability",
      "Full MICAH content studio",
      "Growth reporting",
      "Expanded workflows and integrations",
      "Priority support",
    ],
    futureFeatures: [
      "Priority onboarding for the next phase",
      "More specialized automation as usage proves the need",
    ],
  },
  {
    slug: "command",
    name: "ATLAS COMMAND",
    monthlyPrice: 499,
    bestFor: "Established teams",
    featured: false,
    cta: "Choose COMMAND",
    usageAllowance: "Largest monthly usage allowance",
    availability: "available",
    features: [
      "Everything in GROW",
      "Higher usage limits",
      "Multi-user team support",
      "Executive reporting",
      "Advanced workflows",
      "Priority onboarding",
      "Future automation privileges",
      "Preferred pricing and allowance for ATLAS Phone AI",
    ],
    futureFeatures: [
      "Preferred access to future voice and receptionist tooling",
      "More advanced automation privileges as systems mature",
    ],
  },
];

export const atlasPricingComparisonRows: AtlasPricingComparisonRow[] = [
  { label: "Suggested price", start: "$99/mo", grow: "$249/mo", command: "$499/mo" },
  {
    label: "Best for",
    start: "Solo owners / very small businesses",
    grow: "Growing local businesses",
    command: "Established teams",
  },
  { label: "Users", start: "1-2", grow: "Up to 5", command: "Up to 15" },
  { label: "CRM / Sales Command", start: "âœ“", grow: "âœ“", command: "âœ“" },
  {
    label: "HUNTER prospect discovery",
    start: "Limited",
    grow: "Expanded",
    command: "High-volume",
  },
  {
    label: "MICAH content studio",
    start: "Basic",
    grow: "Full",
    command: "Full + advanced workflows",
  },
  {
    label: "DAVID follow-up desk",
    start: "Basic",
    grow: "Full",
    command: "Full",
  },
  { label: "Business assessment", start: "âœ“", grow: "âœ“", command: "âœ“" },
  { label: "Opportunity tracking", start: "âœ“", grow: "âœ“", command: "âœ“" },
  { label: "Activity / attention center", start: "âœ“", grow: "âœ“", command: "âœ“" },
  {
    label: "AI usage",
    start: "Monthly allowance",
    grow: "Larger allowance",
    command: "Largest allowance",
  },
  { label: "Reporting", start: "Basic", grow: "Growth dashboard", command: "Executive dashboard" },
  { label: "Integrations", start: "Core", grow: "Expanded", command: "Priority" },
  {
    label: "Support",
    start: "Standard",
    grow: "Priority",
    command: "Priority + onboarding",
  },
  {
    label: "Future ATLAS Phone AI",
    start: "Add-on",
    grow: "Add-on",
    command: "Included allowance / discounted",
  },
];

export const atlasPricingFaqs: AtlasPricingFaq[] = [
  {
    question: "Can I change plans later?",
    answer:
      "Yes. The plans are designed as a progression, so you can move up when your workflow and usage justify it.",
  },
  {
    question: "Does Atlas automatically contact prospects?",
    answer:
      "No. Critical outreach and other external actions stay approval-controlled unless the current product explicitly says otherwise.",
  },
  {
    question: "Is Atlas a CRM?",
    answer:
      "Atlas includes CRM-style prospect tracking, but the product is broader than a traditional CRM. It coordinates lead discovery, follow-up, content, and owner visibility around a business goal.",
  },
  {
    question: "Does Atlas generate social content?",
    answer:
      "Yes, Atlas includes content drafting support through MICAH. Drafts still need human review before anything goes live.",
  },
  {
    question: "Does Atlas replace my employees?",
    answer:
      "No. Atlas is meant to coordinate work, reduce missed steps, and help your team move faster with clearer priorities.",
  },
  {
    question: "What counts toward AI or prospect-search usage?",
    answer:
      "Usage is tracked against the AI and discovery work the system performs. The product includes allowances, not unlimited usage.",
  },
  {
    question: "Can my team use Atlas?",
    answer:
      "Yes. ATLAS COMMAND is the clearest fit for teams, and the product is designed to expand with organization needs.",
  },
  {
    question: "Is Phone AI included?",
    answer:
      "Not yet. ATLAS FRONT DESK is coming soon as a separate future add-on, and it is not operational in this release.",
  },
  {
    question: "Is there a long-term contract?",
    answer:
      "The pricing page does not introduce a billing contract. Any paid engagement should be confirmed before purchase or onboarding.",
  },
];

export const atlasFoundingBusinessOffer: AtlasLaunchOffer = {
  label: "Launch offer",
  name: "FOUNDING BUSINESS",
  monthlyPrice: 149,
  summary:
    "$149/month for 12 months for the first 10 qualified pilot businesses.",
  term: "12 months",
  limit: "First 10 qualified pilot businesses",
};

export const atlasPhoneAiAddOn: AtlasFutureAddOn = {
  label: "Coming soon",
  name: "ATLAS FRONT DESK",
  targetPrice: "$149-$249/month plus usage",
  summary:
    "AI receptionist and inbound call handling for lead capture, callback capture, call summaries, and CRM writeback.",
  availability: "coming_soon",
  futureFeatures: [
    "AI receptionist",
    "Inbound call handling",
    "Lead capture",
    "Appointment and callback capture",
    "Call summaries",
    "CRM writeback",
    "Owner notifications",
  ],
};

export function getAtlasPricingPlan(slug: AtlasPricingPlanSlug) {
  return atlasPricingPlans.find((plan) => plan.slug === slug) ?? null;
}


