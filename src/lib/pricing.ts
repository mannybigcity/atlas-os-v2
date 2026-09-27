export type AtlasPricingAvailability = "available" | "launch_offer" | "coming_soon";

export type AtlasPricingPlanSlug = "basic" | "grow" | "unlimited";

export type AtlasPublicPlanSlug = AtlasPricingPlanSlug | "elite";

export type AtlasPricingPlan = {
  slug: AtlasPricingPlanSlug;
  name: string;
  monthlyPrice: number;
  setupFee: number;
  bestFor: string;
  featured: boolean;
  cta: string;
  usageAllowance: string;
  availability: AtlasPricingAvailability;
  features: string[];
  futureFeatures: string[];
};

/** Public marketing card. Elite has no checkout slug and no Stripe link. */
export type AtlasPublicPricingPlan = Omit<AtlasPricingPlan, "slug"> & {
  slug: AtlasPublicPlanSlug;
};

export type AtlasPricingComparisonRow = {
  label: string;
  basic: string;
  grow: string;
  unlimited: string;
  elite: string;
};

export const ATLAS_QUICKSTART_AFTER_TRIAL = {
  en: "Start with a free 7-day QuickStart trial. If you stay, we charge your plan's one-time setup fee and your first month, and Debbie completes your full setup.",
  es: "Comienza con una prueba QuickStart gratis de 7 días. Si te quedas, cobramos la tarifa única de configuración de tu plan y tu primer mes, y Debbie completa tu configuración.",
} as const;

export function atlasSetupFeeNote(amount: number, language: "en" | "es" = "en") {
  if (language === "es") {
    return `+ $${amount} de configuración única, solo si te quedas después de la prueba`;
  }
  return `+ $${amount} one-time setup, only if you stay after the trial`;
}

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

export const atlasPricingPlans: AtlasPricingPlan[] = [
  {
    slug: "basic",
    name: "Starter",
    monthlyPrice: 99,
    setupFee: 149,
    bestFor: "Solo owners / very small businesses",
    featured: false,
    cta: "Choose Starter",
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
    name: "Growth",
    monthlyPrice: 249,
    setupFee: 299,
    bestFor: "Growing local businesses",
    featured: true,
    cta: "Choose Growth",
    usageAllowance: "Larger monthly usage allowance",
    availability: "available",
    features: [
      "Everything in Starter",
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
    name: "Pro",
    monthlyPrice: 499,
    setupFee: 499,
    bestFor: "Established teams",
    featured: false,
    cta: "Choose Pro",
    usageAllowance: "Higher monthly usage allowance",
    availability: "available",
    features: [
      "Everything in Growth",
      "Higher usage limits",
      "Multi-user team support",
      "Executive reporting",
      "Advanced workflows",
      "Priority onboarding",
      "Future automation privileges",
      "Phone AI is a future add-on, not live",
    ],
    futureFeatures: [
      "Phone and receptionist tooling stays a separate future add-on",
      "More advanced automation privileges as systems mature",
    ],
  },
];

const atlasElitePlan: AtlasPublicPricingPlan = {
  slug: "elite",
  name: "Elite",
  monthlyPrice: 749,
  setupFee: 749,
  bestFor: "Owners who want the highest allowance",
  featured: false,
  cta: "Choose Elite",
  usageAllowance: "Highest monthly usage allowance",
  availability: "available",
  features: [
    "Everything in Pro",
    "Highest monthly usage allowance",
    "In-person quarterly business review (Houston area)",
    "Priority onboarding with Debbie",
    "Phone and receptionist features are not included",
  ],
  futureFeatures: [
    "Quarterly review visits stay in the Houston area",
    "Front Desk phone handling stays a separate future add-on and is not part of Elite",
  ],
};

/** Marketing cards only. Checkout plans stay on atlasPricingPlans so logged-in billing does not grow a fourth Stripe door. */
export const atlasPublicPricingPlans: AtlasPublicPricingPlan[] = [...atlasPricingPlans, atlasElitePlan];

export const atlasPricingComparisonRows: AtlasPricingComparisonRow[] = [
  { label: "Monthly price", basic: "$99/mo", grow: "$249/mo", unlimited: "$499/mo", elite: "$749/mo" },
  { label: "One-time setup", basic: "$149", grow: "$299", unlimited: "$499", elite: "$749" },
  {
    label: "Best for",
    basic: "Solo owners / very small businesses",
    grow: "Growing local businesses",
    unlimited: "Established teams",
    elite: "Owners who want the highest allowance",
  },
  { label: "Users", basic: "1-2", grow: "Up to 5", unlimited: "Up to 15", elite: "Same as Pro" },
  {
    label: "Customer relationship management (CRM)",
    basic: "Included",
    grow: "Included",
    unlimited: "Included",
    elite: "Included",
  },
  { label: "Lead generation", basic: "Limited", grow: "Expanded", unlimited: "High-volume", elite: "Same as Pro" },
  {
    label: "Social media content",
    basic: "Basic",
    grow: "Full",
    unlimited: "Full + advanced workflows",
    elite: "Same as Pro",
  },
  { label: "AI business assistant", basic: "Basic", grow: "Full", unlimited: "Full", elite: "Same as Pro" },
  { label: "Business assessment", basic: "Included", grow: "Included", unlimited: "Included", elite: "Included" },
  { label: "Opportunity tracking", basic: "Included", grow: "Included", unlimited: "Included", elite: "Included" },
  {
    label: "Activity and follow-up center",
    basic: "Included",
    grow: "Included",
    unlimited: "Included",
    elite: "Included",
  },
  {
    label: "AI usage",
    basic: "Monthly allowance",
    grow: "Larger allowance",
    unlimited: "Higher allowance",
    elite: "Highest allowance",
  },
  {
    label: "Reporting",
    basic: "Basic",
    grow: "Growth dashboard",
    unlimited: "Executive dashboard",
    elite: "Same as Pro",
  },
  { label: "Integrations", basic: "Core", grow: "Expanded", unlimited: "Priority", elite: "Same as Pro" },
  {
    label: "Support",
    basic: "Standard",
    grow: "Priority",
    unlimited: "Priority + onboarding",
    elite: "Priority onboarding with Debbie",
  },
  {
    label: "In-person quarterly review",
    basic: "Not included",
    grow: "Not included",
    unlimited: "Not included",
    elite: "Houston area",
  },
  {
    label: "Future ATLAS Phone AI",
    basic: "Add-on",
    grow: "Add-on",
    unlimited: "Add-on",
    elite: "Add-on",
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
      "Usage is tracked against the AI and discovery work the system performs. Every plan includes a monthly allowance.",
  },
  {
    question: "Can my team use Atlas?",
    answer:
      "Yes. Pro is the clearest fit for established teams. Elite adds the highest monthly usage allowance, an in-person quarterly business review in the Houston area, and priority onboarding with Debbie. Phone and receptionist features are not included.",
  },
  {
    question: "Is Phone AI included?",
    answer:
      "Not yet. ATLAS FRONT DESK is coming soon as a separate future add-on, and it is not operational in this release.",
  },
  {
    question: "Is there a long-term contract?",
    answer:
      "Paid Starter, Growth, Pro, and Elite plans are monthly Stripe subscriptions. They renew until you cancel. Each checkout also charges that plan's one-time setup fee. Start with a free 7-day QuickStart trial. If you stay, we charge your plan's one-time setup fee and your first month, and Debbie completes your full setup. The business assessment and the 7-day trial at /start-trial are not paid subscriptions and do not take a card.",
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


