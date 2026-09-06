import { getAtlasPricingPlan, type AtlasPricingPlanSlug } from "./pricing.ts";

export const assessmentChallenges = [
  "finding_customers",
  "getting_customers_to_buy",
  "not_enough_time",
  "too_much_manual_work",
  "hiring",
  "cash_flow",
  "marketing",
  "keeping_customers",
  "growing_the_business",
  "other",
] as const;

export const assessmentLeadVolumes = [
  "under_10",
  "10_25",
  "26_75",
  "76_plus",
  "not_sure",
] as const;

export const assessmentFollowUpSpeeds = [
  "same_day",
  "1_2_days",
  "3_7_days",
  "when_remembered",
  "not_tracking",
] as const;

export const assessmentBusinessSizes = [
  "just_me",
  "2_5",
  "6_15",
  "16_50",
  "50_plus",
] as const;

export const assessmentBudgets = [
  "under_500",
  "500_1500",
  "1500_3000",
  "3000_plus",
  "need_recommendation",
] as const;

export const assessmentTimings = [
  "immediately",
  "30_days",
  "90_days",
  "exploring",
] as const;

export const assessmentEvaluationAreas = [
  "sales",
  "marketing",
  "operations",
  "customer_service",
  "pricing",
  "automation",
  "ai",
  "website",
  "branding",
  "hiring",
  "finance",
  "technology",
] as const;

export type AssessmentChallenge = (typeof assessmentChallenges)[number];
export type AssessmentLeadVolume = (typeof assessmentLeadVolumes)[number];
export type AssessmentFollowUpSpeed = (typeof assessmentFollowUpSpeeds)[number];
export type AssessmentBusinessSize = (typeof assessmentBusinessSizes)[number];
export type AssessmentBudget = (typeof assessmentBudgets)[number];
export type AssessmentTiming = (typeof assessmentTimings)[number];
export type AssessmentEvaluationArea = (typeof assessmentEvaluationAreas)[number];
export type AssessmentPriority = "leads" | "follow_up" | "close";
export type AssessmentRecommendedPlan = Extract<AtlasPricingPlanSlug, "grow" | "unlimited">;

export type LocalizedCopy = { en: string; es: string };

export type AssessmentSignals = {
  challenge: AssessmentChallenge;
  leadVolume: AssessmentLeadVolume;
  followUpSpeed: AssessmentFollowUpSpeed;
  businessSize: AssessmentBusinessSize;
  budget: AssessmentBudget;
  timing: AssessmentTiming;
  areas: AssessmentEvaluationArea[];
};

export type AssessmentRecommendation = {
  score: number;
  plan: AssessmentRecommendedPlan;
  planName: "ATLAS GROW" | "ATLAS UNLIMITED";
  monthlyPrice: 249 | 499;
  bestFor: LocalizedCopy;
  planWhy: LocalizedCopy;
  planProof: LocalizedCopy[];
  priority: AssessmentPriority;
  priorityTitle: LocalizedCopy;
  nextStep: LocalizedCopy;
  preview: LocalizedCopy[];
};

const leakyFollowUp = new Set<AssessmentFollowUpSpeed>([
  "when_remembered",
  "not_tracking",
]);

const leadChallenges = new Set<AssessmentChallenge>(["finding_customers", "marketing"]);
const closeChallenges = new Set<AssessmentChallenge>([
  "getting_customers_to_buy",
  "growing_the_business",
  "keeping_customers",
  "cash_flow",
]);
const opsChallenges = new Set<AssessmentChallenge>([
  "too_much_manual_work",
  "not_enough_time",
  "hiring",
]);

export const defaultAssessmentSignals: AssessmentSignals = {
  challenge: "growing_the_business",
  leadVolume: "10_25",
  followUpSpeed: "when_remembered",
  businessSize: "2_5",
  budget: "need_recommendation",
  timing: "30_days",
  areas: ["sales", "marketing"],
};

function isOneOf<T extends string>(value: string | undefined, allowed: readonly T[]): value is T {
  return Boolean(value && (allowed as readonly string[]).includes(value));
}

export function resolveAssessmentSignals(input: {
  c?: string;
  v?: string;
  f?: string;
  s?: string;
  b?: string;
  t?: string;
  a?: string;
}): AssessmentSignals {
  return {
    challenge: isOneOf(input.c, assessmentChallenges) ? input.c : defaultAssessmentSignals.challenge,
    leadVolume: isOneOf(input.v, assessmentLeadVolumes) ? input.v : defaultAssessmentSignals.leadVolume,
    followUpSpeed: isOneOf(input.f, assessmentFollowUpSpeeds)
      ? input.f
      : defaultAssessmentSignals.followUpSpeed,
    businessSize: isOneOf(input.s, assessmentBusinessSizes)
      ? input.s
      : defaultAssessmentSignals.businessSize,
    budget: isOneOf(input.b, assessmentBudgets) ? input.b : defaultAssessmentSignals.budget,
    timing: isOneOf(input.t, assessmentTimings) ? input.t : defaultAssessmentSignals.timing,
    areas: String(input.a ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is AssessmentEvaluationArea => isOneOf(value, assessmentEvaluationAreas))
      .slice(0, 6),
  };
}

export function assessmentReceivedPath(signals: AssessmentSignals) {
  const params = new URLSearchParams({
    status: "received",
    c: signals.challenge,
    v: signals.leadVolume,
    f: signals.followUpSpeed,
    s: signals.businessSize,
    b: signals.budget,
    t: signals.timing,
  });

  if (signals.areas.length > 0) {
    params.set("a", signals.areas.slice(0, 6).join(","));
  }

  return `/assessment?${params.toString()}`;
}

export function pickAssessmentPriority(signals: AssessmentSignals): AssessmentPriority {
  if (leakyFollowUp.has(signals.followUpSpeed)) {
    return "follow_up";
  }

  if (leadChallenges.has(signals.challenge)) {
    return "leads";
  }

  if (signals.followUpSpeed === "3_7_days" && !leadChallenges.has(signals.challenge)) {
    return "follow_up";
  }

  if (closeChallenges.has(signals.challenge)) {
    return "close";
  }

  if (opsChallenges.has(signals.challenge)) {
    return "follow_up";
  }

  if (signals.leadVolume === "under_10" || signals.leadVolume === "not_sure") {
    return "leads";
  }

  if (signals.areas.includes("sales")) {
    return "close";
  }

  if (signals.areas.includes("marketing")) {
    return "leads";
  }

  return "follow_up";
}

export function pickAssessmentPlan(signals: AssessmentSignals): AssessmentRecommendedPlan {
  const establishedTeam = signals.businessSize === "16_50" || signals.businessSize === "50_plus";
  const growingTeam = signals.businessSize === "6_15";
  const highVolume = signals.leadVolume === "76_plus";
  const highBudget = signals.budget === "3000_plus";

  if (establishedTeam || (growingTeam && (highVolume || highBudget))) {
    return "unlimited";
  }

  return "grow";
}

export function scoreAssessment(signals: AssessmentSignals) {
  const timingScore = { immediately: 12, "30_days": 8, "90_days": 4, exploring: 0 }[signals.timing];
  const followUpScore = {
    when_remembered: 8,
    not_tracking: 8,
    "3_7_days": 6,
    "1_2_days": 4,
    same_day: 2,
  }[signals.followUpSpeed];
  const volumeScore = {
    "76_plus": 8,
    "26_75": 6,
    "10_25": 4,
    under_10: 3,
    not_sure: 2,
  }[signals.leadVolume];
  const sizeScore = {
    "50_plus": 5,
    "16_50": 6,
    "6_15": 6,
    "2_5": 4,
    just_me: 3,
  }[signals.businessSize];
  const budgetScore = {
    "3000_plus": 8,
    "1500_3000": 6,
    "500_1500": 4,
    need_recommendation: 3,
    under_500: 1,
  }[signals.budget];
  const areaScore = Math.min(6, signals.areas.length * 2);
  const raw = 40 + timingScore + followUpScore + volumeScore + sizeScore + budgetScore + areaScore;

  return Math.min(92, Math.max(42, raw));
}

const priorityCopy: Record<
  AssessmentPriority,
  { title: LocalizedCopy; nextStep: LocalizedCopy; preview: LocalizedCopy[] }
> = {
  follow_up: {
    title: {
      en: "Follow up faster",
      es: "Da seguimiento más rápido",
    },
    nextStep: {
      en: "Put every new lead in one pipeline so follow-up does not depend on memory.",
      es: "Pon cada prospecto nuevo en un solo pipeline para que el seguimiento no dependa de la memoria.",
    },
    preview: [
      {
        en: "See overdue next actions before warm leads go cold.",
        es: "Ve las próximas acciones vencidas antes de que se enfríen los prospectos interesados.",
      },
      {
        en: "Keep notes, tasks, and owner-approved follow-up drafts in one private workspace.",
        es: "Mantén notas, tareas y borradores de seguimiento aprobados por el dueño en un espacio privado.",
      },
      {
        en: "Atlas does not call, email, or text anyone. You approve before anything goes out.",
        es: "Atlas no llama, envía correo ni escribe a nadie. Tú apruebas antes de que salga cualquier mensaje.",
      },
    ],
  },
  leads: {
    title: {
      en: "Get more leads",
      es: "Consigue más prospectos",
    },
    nextStep: {
      en: "Find where qualified opportunities are being missed and keep new inquiries in one place.",
      es: "Encuentra dónde se están perdiendo oportunidades calificadas y junta las consultas nuevas en un solo lugar.",
    },
    preview: [
      {
        en: "Organize inbound and local-prospect sources around one growth goal.",
        es: "Organiza las fuentes de consultas y prospectos locales alrededor de una meta de crecimiento.",
      },
      {
        en: "Stop losing inquiries across texts, DMs, and walk-ins.",
        es: "Deja de perder consultas entre mensajes, redes y clientes sin cita.",
      },
      {
        en: "Atlas prepares the shortlist. A person reviews before any outreach.",
        es: "Atlas prepara la lista corta. Una persona revisa antes de cualquier contacto.",
      },
    ],
  },
  close: {
    title: {
      en: "Close more deals",
      es: "Cierra más ventas",
    },
    nextStep: {
      en: "Keep the next step to a sale visible on every opportunity so nothing stalls.",
      es: "Mantén visible el siguiente paso hacia la venta en cada oportunidad para que nada se estanque.",
    },
    preview: [
      {
        en: "Track quotes, follow-ups, and decisions in one pipeline.",
        es: "Da seguimiento a cotizaciones, contactos y decisiones en un solo pipeline.",
      },
      {
        en: "See what needs your attention today instead of hunting through notes.",
        es: "Ve lo que necesita tu atención hoy en lugar de buscar entre notas sueltas.",
      },
      {
        en: "Drafts stay approval-controlled. Atlas does not send them automatically.",
        es: "Los borradores siguen bajo aprobación. Atlas no los envía automáticamente.",
      },
    ],
  },
};

const planCopy: Record<
  AssessmentRecommendedPlan,
  { why: LocalizedCopy; bestFor: LocalizedCopy; proof: LocalizedCopy[] }
> = {
  grow: {
    why: {
      en: "ATLAS GROW is the right starting plan for a growing local business that needs Sales Command, stronger follow-up, and expanded lead generation.",
      es: "ATLAS CRECIMIENTO es el plan de partida correcto para un negocio local en crecimiento que necesita Sales Command, un seguimiento más firme y más generación de prospectos.",
    },
    bestFor: {
      en: "Growing local businesses",
      es: "Negocios locales en crecimiento",
    },
    proof: [
      {
        en: "Full Sales Command workflow so every lead has a next action.",
        es: "Flujo completo de Sales Command para que cada prospecto tenga una próxima acción.",
      },
      {
        en: "Stronger follow-up capability and growth reporting at $249/month.",
        es: "Seguimiento más firme e informes de crecimiento por $249 al mes.",
      },
      {
        en: "Expanded lead generation and priority support while you run the trial.",
        es: "Mayor generación de prospectos y soporte prioritario mientras usas la prueba.",
      },
    ],
  },
  unlimited: {
    why: {
      en: "ATLAS UNLIMITED is the right starting plan for an established team that needs multi-user support, higher usage, and executive reporting.",
      es: "ATLAS ILIMITADO es el plan de partida correcto para un equipo establecido que necesita varios usuarios, más uso e informes ejecutivos.",
    },
    bestFor: {
      en: "Established teams",
      es: "Equipos establecidos",
    },
    proof: [
      {
        en: "Everything in GROW, plus multi-user team support.",
        es: "Todo lo de CRECIMIENTO, más soporte para equipos con varios usuarios.",
      },
      {
        en: "Highest usage limits and executive reporting at $499/month.",
        es: "Los límites de uso más altos e informes ejecutivos por $499 al mes.",
      },
      {
        en: "Priority onboarding for teams. Phone AI remains a future add-on, not live.",
        es: "Incorporación prioritaria para equipos. La IA telefónica sigue siendo un extra futuro, no está activa.",
      },
    ],
  },
};

export function recommendAssessment(signals: AssessmentSignals): AssessmentRecommendation {
  const priority = pickAssessmentPriority(signals);
  const plan = pickAssessmentPlan(signals);
  const priced = getAtlasPricingPlan(plan);
  const copy = priorityCopy[priority];
  const recommended = planCopy[plan];

  return {
    score: scoreAssessment(signals),
    plan,
    planName: plan === "unlimited" ? "ATLAS UNLIMITED" : "ATLAS GROW",
    monthlyPrice: (priced?.monthlyPrice ?? (plan === "unlimited" ? 499 : 249)) as 249 | 499,
    bestFor: recommended.bestFor,
    planWhy: recommended.why,
    planProof: recommended.proof,
    priority,
    priorityTitle: copy.title,
    nextStep: copy.nextStep,
    preview: copy.preview,
  };
}
