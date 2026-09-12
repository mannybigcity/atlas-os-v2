export const TRIAL_DESK_VERTICALS = [
  "pest",
  "maintenance",
  "hvac",
  "cleaning",
  "lawn",
  "contractor",
  "professional",
  "retail",
  "other",
] as const;

export type TrialDeskVertical = (typeof TRIAL_DESK_VERTICALS)[number];

export type TrialDeskMarket = {
  businessName: string;
  businessType: string;
  city: string;
  zipCode: string;
  state: string;
  vertical: TrialDeskVertical;
  serviceQuery: string;
};

export type TrialDeskMarketInput = {
  businessName?: string | null;
  businessType?: string | null;
  city?: string | null;
  zipCode?: string | null;
  state?: string | null;
  metadata?: Record<string, unknown> | null;
};

const HOUSTON_METRO_CITIES: Array<{ name: string }> = [
  { name: "Cypress" },
  { name: "Houston" },
  { name: "Katy" },
  { name: "Spring" },
  { name: "Tomball" },
  { name: "Humble" },
  { name: "Klein" },
  { name: "The Woodlands" },
  { name: "Sugar Land" },
  { name: "Pearland" },
  { name: "Pasadena" },
  { name: "Baytown" },
  { name: "Conroe" },
  { name: "Magnolia" },
  { name: "Richmond" },
  { name: "Rosenberg" },
  { name: "Missouri City" },
  { name: "League City" },
  { name: "Friendswood" },
  { name: "Stafford" },
  { name: "Bellaire" },
  { name: "Jersey Village" },
  { name: "Copperfield" },
];

const VERTICAL_KEYWORDS: Array<{ vertical: TrialDeskVertical; pattern: RegExp; service: string }> = [
  { vertical: "pest", pattern: /\b(pest|termite|mosquito|exterminat|rodent|wildlife)\b/i, service: "pest control" },
  { vertical: "hvac", pattern: /\b(hvac|air\s*cond|heating|ac\b|furnace)\b/i, service: "HVAC" },
  { vertical: "lawn", pattern: /\b(lawn|landscap|turf|yard)\b/i, service: "lawn care" },
  { vertical: "cleaning", pattern: /\b(clean|janitorial|maid|custodial)\b/i, service: "cleaning service" },
  { vertical: "maintenance", pattern: /\b(maintenance|handyman|facility|property\s*care)\b/i, service: "home maintenance" },
  { vertical: "contractor", pattern: /\b(plumb|electric|roof|paint|remodel|contractor)\b/i, service: "home service" },
  { vertical: "professional", pattern: /\b(account|bookkeep|insur|consult|legal|tax|advisor)\b/i, service: "professional service" },
  { vertical: "retail", pattern: /\b(retail|shop|boutique|store|print|supply)\b/i, service: "retail shop" },
];

function cleanMarketText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function metadataValue(metadata: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!metadata) return "";
  for (const key of keys) {
    const value = cleanMarketText(metadata[key], 200);
    if (value) return value;
  }
  return "";
}

function matchHoustonCity(text: string) {
  const haystack = ` ${text} `;
  return HOUSTON_METRO_CITIES.find((city) => new RegExp(`\\b${city.name.replace(/\s+/g, "\\s+")}\\b`, "i").test(haystack));
}

export function inferTrialCityFromName(businessName: string) {
  return matchHoustonCity(businessName)?.name ?? "";
}

export function inferTrialVertical(input: { businessName?: string; businessType?: string }): {
  vertical: TrialDeskVertical;
  serviceQuery: string;
} {
  const blob = `${input.businessName ?? ""} ${input.businessType ?? ""}`;
  const fromName = VERTICAL_KEYWORDS.find((item) => item.pattern.test(blob));
  if (fromName) {
    return { vertical: fromName.vertical, serviceQuery: fromName.service };
  }

  const type = String(input.businessType ?? "").toLowerCase();
  if (type.includes("contractor") || type.includes("home service")) {
    return { vertical: "contractor", serviceQuery: "home service" };
  }
  if (type.includes("professional")) {
    return { vertical: "professional", serviceQuery: "professional service" };
  }
  if (type.includes("retail") || type.includes("ecommerce")) {
    return { vertical: "retail", serviceQuery: "retail shop" };
  }
  return { vertical: "other", serviceQuery: "local business" };
}

export function inferTrialDeskMarket(input: TrialDeskMarketInput = {}): TrialDeskMarket {
  const metadata = input.metadata ?? null;
  const businessName =
    cleanMarketText(input.businessName, 200) ||
    metadataValue(metadata, "business_name", "businessName");
  const businessType =
    cleanMarketText(input.businessType, 100) ||
    metadataValue(metadata, "business_type", "businessType");
  const zipCode =
    cleanMarketText(input.zipCode, 16) ||
    metadataValue(metadata, "postal_code", "postalCode", "zip_code", "zipCode");
  const explicitCity =
    cleanMarketText(input.city, 80) || metadataValue(metadata, "city");
  const inferredCity = inferTrialCityFromName(businessName);
  const city = explicitCity || inferredCity;
  const explicitState =
    cleanMarketText(input.state, 2).toUpperCase() ||
    metadataValue(metadata, "state", "region").toUpperCase().slice(0, 2);
  const metro = matchHoustonCity(city || businessName);
  const { vertical, serviceQuery } = inferTrialVertical({ businessName, businessType });

  return {
    businessName,
    businessType,
    city,
    zipCode,
    state: explicitState || (metro ? "TX" : ""),
    vertical,
    serviceQuery,
  };
}

/**
 * A business that sends a trade steady work: what to type into Google Maps
 * and why the owner should care. HUNTER searches for these, never for the
 * owner's own trade; a plumber does not need a list of plumbers.
 */
export type ReferralTarget = { query: string; why: string; whyEs: string };

const PROPERTY_MANAGER: ReferralTarget = {
  query: "property management company",
  why: "Manages dozens of units and signs one vendor for all of them.",
  whyEs: "Administra docenas de unidades y firma con un solo proveedor para todas.",
};
const APARTMENTS: ReferralTarget = {
  query: "apartment complex",
  why: "Hundreds of doors, one maintenance manager, recurring work.",
  whyEs: "Cientos de puertas, un gerente de mantenimiento, trabajo recurrente.",
};
const REALTOR: ReferralTarget = {
  query: "real estate agency",
  why: "Every closing needs repairs and inspections on a deadline.",
  whyEs: "Cada cierre necesita reparaciones e inspecciones con fecha límite.",
};
const GENERAL_CONTRACTOR: ReferralTarget = {
  query: "general contractor",
  why: "Subs out the trades on every remodel and build.",
  whyEs: "Subcontrata los oficios en cada remodelación y obra.",
};
const RESTAURANT: ReferralTarget = {
  query: "restaurant",
  why: "Kitchens break at the worst time and inspections are not optional.",
  whyEs: "Las cocinas fallan en el peor momento y las inspecciones no son opcionales.",
};
const HOA: ReferralTarget = {
  query: "homeowners association",
  why: "Contracts common-area work for years at a time.",
  whyEs: "Contrata el trabajo de áreas comunes por años.",
};
const CHURCH: ReferralTarget = {
  query: "church",
  why: "Big building, aging systems, a board that wants one trusted vendor.",
  whyEs: "Edificio grande, sistemas viejos, una junta que quiere un solo proveedor de confianza.",
};
const DAYCARE: ReferralTarget = {
  query: "daycare center",
  why: "Licensing requires scheduled, documented service.",
  whyEs: "La licencia exige servicio programado y documentado.",
};
const MEDICAL_OFFICE: ReferralTarget = {
  query: "dental office",
  why: "Daily standards to meet and the decision-maker is on site.",
  whyEs: "Estándares diarios que cumplir y quien decide está en el local.",
};
const OFFICE_BUILDING: ReferralTarget = {
  query: "office building",
  why: "Facilities managers buy recurring service, not one-offs.",
  whyEs: "Los gerentes de instalaciones compran servicio recurrente, no trabajos sueltos.",
};
const SELF_STORAGE: ReferralTarget = {
  query: "self storage facility",
  why: "Large grounds, small staff, everything is outsourced.",
  whyEs: "Terreno grande, poco personal, todo se subcontrata.",
};
const HOME_BUILDER: ReferralTarget = {
  query: "home builder",
  why: "New houses need every trade, on a schedule, all year.",
  whyEs: "Las casas nuevas necesitan todos los oficios, con calendario, todo el año.",
};
const RESTORATION: ReferralTarget = {
  query: "water damage restoration company",
  why: "Insurance jobs need a licensed trade fast; they pay on time.",
  whyEs: "Los trabajos de seguro necesitan un oficio con licencia rápido; pagan a tiempo.",
};
const SMALL_BUSINESS: ReferralTarget = {
  query: "auto repair shop",
  why: "Owner-operated, busy, and no one in-house handles this.",
  whyEs: "Dueño-operador, ocupado, y nadie interno se encarga de esto.",
};
const SALON: ReferralTarget = {
  query: "hair salon",
  why: "Cash-flow business with no back office.",
  whyEs: "Negocio de flujo de efectivo sin oficina administrativa.",
};
const EVENT_VENUE: ReferralTarget = {
  query: "event venue",
  why: "Books events every week and needs branded goods and vendors.",
  whyEs: "Agenda eventos cada semana y necesita productos y proveedores.",
};
const SCHOOL: ReferralTarget = {
  query: "private school",
  why: "Spirit wear, fundraisers, and facilities work on a yearly cycle.",
  whyEs: "Uniformes, recaudaciones y mantenimiento en ciclo anual.",
};

const REFERRAL_TARGETS: Record<TrialDeskVertical, ReferralTarget[]> = {
  pest: [PROPERTY_MANAGER, APARTMENTS, RESTAURANT, REALTOR, DAYCARE, SELF_STORAGE],
  hvac: [PROPERTY_MANAGER, REALTOR, GENERAL_CONTRACTOR, APARTMENTS, CHURCH, HOME_BUILDER],
  lawn: [PROPERTY_MANAGER, HOA, APARTMENTS, OFFICE_BUILDING, CHURCH, SELF_STORAGE],
  cleaning: [PROPERTY_MANAGER, REALTOR, MEDICAL_OFFICE, OFFICE_BUILDING, DAYCARE, CHURCH],
  maintenance: [PROPERTY_MANAGER, REALTOR, APARTMENTS, HOA, CHURCH, SELF_STORAGE],
  contractor: [PROPERTY_MANAGER, APARTMENTS, REALTOR, GENERAL_CONTRACTOR, RESTAURANT, RESTORATION],
  professional: [GENERAL_CONTRACTOR, RESTAURANT, MEDICAL_OFFICE, SMALL_BUSINESS, SALON, REALTOR],
  retail: [EVENT_VENUE, SCHOOL, CHURCH, REALTOR, OFFICE_BUILDING, RESTAURANT],
  other: [PROPERTY_MANAGER, REALTOR, GENERAL_CONTRACTOR, RESTAURANT, CHURCH, OFFICE_BUILDING],
};

export function referralTargetsForVertical(vertical: TrialDeskVertical): ReferralTarget[] {
  return REFERRAL_TARGETS[vertical] ?? REFERRAL_TARGETS.other;
}

/** True when the owner typed their own trade into HUNTER (a plumber searching "plumber"). */
export function isSelfSearch(service: string, market: Pick<TrialDeskMarket, "serviceQuery" | "vertical">) {
  const typed = service.trim().toLowerCase();
  if (!typed) return false;
  if (typed === market.serviceQuery.toLowerCase()) return true;
  const keywords = VERTICAL_KEYWORDS.find((entry) => entry.vertical === market.vertical);
  if (!keywords) return false;
  // Drop the trailing word boundary so "plumber" and "exterminators" still count as the trade.
  return new RegExp(keywords.pattern.source.replace(/\\b$/, ""), "i").test(typed);
}

export function hunterSearchDefaultsFromMarket(market: TrialDeskMarket) {
  const targets = referralTargetsForVertical(market.vertical);
  return {
    service: targets[0].query,
    zipCode: market.zipCode,
    city: market.city,
    state: market.state,
    /** The owner's own trade, so the form can warn when they search for competitors. */
    ownService: market.serviceQuery,
    vertical: market.vertical,
    targets,
  };
}

export function trialMarketAreaLabel(market: Pick<TrialDeskMarket, "city" | "state">) {
  if (market.city && market.state) return `${market.city}, ${market.state}`;
  if (market.city) return market.city;
  return "this area";
}
