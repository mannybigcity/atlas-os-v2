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

export function hunterSearchDefaultsFromMarket(market: TrialDeskMarket) {
  return {
    service: market.serviceQuery,
    zipCode: market.zipCode,
    city: market.city,
    state: market.state,
  };
}

export function trialMarketAreaLabel(market: Pick<TrialDeskMarket, "city" | "state">) {
  if (market.city && market.state) return `${market.city}, ${market.state}`;
  if (market.city) return market.city;
  return "this area";
}
