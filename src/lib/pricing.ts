export type AtlasPricingAvailability = "available" | "launch_offer" | "coming_soon";

export type AtlasPricingPlanSlug = "basic" | "grow" | "unlimited";

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
  basic: string;
  grow: string;
  unlimited: string;
};

export type AtlasPricingFaq = {
  question: string;
  answer: string;
};

export type AtlasFutureAddOn = {
  label: string;
  name: string;
  targetPrice: string;
  summary: string;
  availability: AtlasPricingAvailability;
  futureFeatures: string[];
};

export const atlasSprintOffer = {
  name: "Atlas 30-Day Revenue Rescue Sprint",
  price: 500,
  summary:
    "A focused, human-led 30-day engagement to identify one revenue leak, install a practical follow-up system, and review what changed.",
  includes: [
    "Focused business and revenue-leak assessment",
    "One agreed measurable 30-day goal",
    "One private Atlas workspace",
    "Simple opportunity and follow-up pipeline",
    "One approved follow-up sequence or focused marketing asset set",
    "Weekly owner check-ins and a day-30 review",
  ],
  notIncluded: [
    "Phone AI or autonomous customer contact",
    "Autonomous publishing, ad spend, or paid third-party software",
    "Unlimited consulting or multiple unrelated business problems",
    "Guaranteed leads, sales, revenue, or business results",
  ],
} as const;

export const atlasPricingPlans: AtlasPricingPlan[] = [
  {
    slug: "basic",
    name: "ATLAS BASIC",
    monthlyPrice: 99,
    bestFor: "Solo owners / very small businesses",
    featured: false,
    cta: "Choose BASIC",
    usageAllowance: "Monthly usage allowance",
    availability: "available",
    features: [
      "CRM / Sales Command",
      "Lead generation tools",
      "Social media content tools",
      "Customer relationship management",
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
      "Everything in BASIC",
      "Expanded lead generation",
      "Full Sales Command workflow",
      "Stronger follow-up capability",
      "Full social media content tools",
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
    slug: "unlimited",
    name: "ATLAS UNLIMITED",
    monthlyPrice: 499,
    bestFor: "Established teams",
    featured: false,
    cta: "Choose UNLIMITED",
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
  { label: "Suggested price", basic: "$99/mo", grow: "$249/mo", unlimited: "$499/mo" },
  {
    label: "Best for",
    basic: "Solo owners / very small businesses",
    grow: "Growing local businesses",
    unlimited: "Established teams",
  },
  { label: "Users", basic: "1-2", grow: "Up to 5", unlimited: "Up to 15" },
  { label: "Customer relationship management (CRM)", basic: "Included", grow: "Included", unlimited: "Included" },
  { label: "Lead generation", basic: "Limited", grow: "Expanded", unlimited: "High-volume" },
  { label: "Social media content", basic: "Basic", grow: "Full", unlimited: "Full + advanced workflows" },
  { label: "AI business assistant", basic: "Basic", grow: "Full", unlimited: "Full" },
  { label: "Business assessment", basic: "Included", grow: "Included", unlimited: "Included" },
  { label: "Opportunity tracking", basic: "Included", grow: "Included", unlimited: "Included" },
  { label: "Activity and follow-up center", basic: "Included", grow: "Included", unlimited: "Included" },
  {
    label: "AI usage",
    basic: "Monthly allowance",
    grow: "Larger allowance",
    unlimited: "Largest allowance",
  },
  { label: "Reporting", basic: "Basic", grow: "Growth dashboard", unlimited: "Executive dashboard" },
  { label: "Integrations", basic: "Core", grow: "Expanded", unlimited: "Priority" },
  {
    label: "Support",
    basic: "Standard",
    grow: "Priority",
    unlimited: "Priority + onboarding",
  },
  {
    label: "Future ATLAS Phone AI",
    basic: "Add-on",
    grow: "Add-on",
    unlimited: "Included allowance / discounted",
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
      "Yes, Atlas includes content drafting support. Drafts still need human review before anything goes live.",
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
      "Yes. ATLAS UNLIMITED is the clearest fit for teams, and the product is designed to expand with organization needs.",
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


