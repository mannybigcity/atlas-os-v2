import { MICAH_STARTER_DAYS } from "./micah-starter-week.ts";
import { isExcludedTrialInboxOrganization } from "./trial-inbox.ts";
import {
  inferTrialDeskMarket,
  trialMarketAreaLabel,
  type TrialDeskMarket,
  type TrialDeskMarketInput,
  type TrialDeskVertical,
} from "./trial-desk-market.ts";
import {
  isAfeCrmDemoOrganization,
  isSisOrganization,
} from "../client-portal/identity.ts";

export const TRIAL_DESK_SEED_KIND = "afe_trial_lions_den_seed";
export const TRIAL_DESK_SEED_WEEK_KEY = "trial-seed-week";

export type TrialHunterSeedFind = {
  seedKey: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  primaryType: string;
  searchQuery: string;
};

export type TrialProspectSeed = {
  seedKey: string;
  name: string;
  contactName: string;
  contactEmail: string;
  daysUntilDue: number | null;
  nextAction: string;
  researchSummary: string;
  fitReason: string;
  hunterPlaceId: string;
  primaryType: string;
};

export type TrialMicahSeedSlot = {
  day: number;
  weekday: string;
  theme: string;
  slot: string;
  title: string;
  headline: string;
  supportingText: string;
  caption: string;
  callToAction: string;
  imageSvg: string;
};

export type TrialDeskOrganization = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

export type TrialDeskSeedClient = {
  from: (table: string) => any;
};

export type TrialLionsDenSeed = {
  hunterFinds: TrialHunterSeedFind[];
  prospects: TrialProspectSeed[];
  followUps: TrialProspectSeed[];
  micahSlots: TrialMicahSeedSlot[];
  market: TrialDeskMarket;
};

type CatalogRow = {
  seedKey: string;
  name: string;
  primaryType: string;
  contactName?: string;
};

const HUNTER_CATALOG: Record<TrialDeskVertical, CatalogRow[]> = {
  pest: [
    { seedKey: "fairway-pest", name: "Fairway Pest Patrol", primaryType: "pest_control_service" },
    { seedKey: "oak-hollow-termite", name: "Oak Hollow Termite Co", primaryType: "pest_control_service" },
    { seedKey: "lakeside-mosquito", name: "Lakeside Mosquito Control", primaryType: "pest_control_service" },
    { seedKey: "northgate-pest", name: "Northgate Pest Solutions", primaryType: "pest_control_service" },
    { seedKey: "brickhaven-exterminators", name: "Brickhaven Exterminators", primaryType: "pest_control_service" },
    { seedKey: "mill-road-rodent", name: "Mill Road Rodent Control", primaryType: "pest_control_service" },
    { seedKey: "creekview-wildlife", name: "Creekview Wildlife Control", primaryType: "pest_control_service" },
  ],
  maintenance: [
    { seedKey: "ridgeway-maintenance", name: "Ridgeway Maintenance", primaryType: "general_contractor" },
    { seedKey: "oakline-handyman", name: "Oakline Handyman Co", primaryType: "handyman" },
    { seedKey: "fairview-facilities", name: "Fairview Facilities Care", primaryType: "general_contractor" },
    { seedKey: "stonebridge-upkeep", name: "Stonebridge Upkeep", primaryType: "general_contractor" },
    { seedKey: "harbor-property-care", name: "Harbor Property Care", primaryType: "general_contractor" },
    { seedKey: "westfield-maintenance", name: "Westfield Maintenance", primaryType: "handyman" },
    { seedKey: "millstone-repairs", name: "Millstone Repair Crew", primaryType: "general_contractor" },
  ],
  hvac: [
    { seedKey: "cedar-ridge-hvac", name: "Cedar Ridge HVAC", primaryType: "hvac_contractor" },
    { seedKey: "lakeshore-air", name: "Lakeshore Air & Heat", primaryType: "hvac_contractor" },
    { seedKey: "pine-bend-cooling", name: "Pine Bend Cooling", primaryType: "hvac_contractor" },
    { seedKey: "north-mill-heating", name: "North Mill Heating", primaryType: "hvac_contractor" },
    { seedKey: "brookside-air", name: "Brookside Air Co", primaryType: "hvac_contractor" },
    { seedKey: "fairmont-climate", name: "Fairmont Climate", primaryType: "hvac_contractor" },
    { seedKey: "ridge-creek-hvac", name: "Ridge Creek HVAC", primaryType: "hvac_contractor" },
  ],
  cleaning: [
    { seedKey: "bright-lane-cleaning", name: "Bright Lane Cleaning", primaryType: "cleaning_service" },
    { seedKey: "oak-street-maids", name: "Oak Street Maids", primaryType: "cleaning_service" },
    { seedKey: "harbor-janitorial", name: "Harbor Janitorial", primaryType: "cleaning_service" },
    { seedKey: "pinecrest-clean", name: "Pinecrest Clean Co", primaryType: "cleaning_service" },
    { seedKey: "westbrook-custodial", name: "Westbrook Custodial", primaryType: "cleaning_service" },
    { seedKey: "mill-house-cleaning", name: "Mill House Cleaning", primaryType: "cleaning_service" },
    { seedKey: "fairway-sparkle", name: "Fairway Sparkle Crew", primaryType: "cleaning_service" },
  ],
  lawn: [
    { seedKey: "pinecrest-lawn", name: "Pinecrest Lawn Care", primaryType: "lawn_care_service" },
    { seedKey: "oak-ridge-turf", name: "Oak Ridge Turf", primaryType: "lawn_care_service" },
    { seedKey: "lakeside-mow", name: "Lakeside Mow Co", primaryType: "lawn_care_service" },
    { seedKey: "fairway-landscape", name: "Fairway Landscape", primaryType: "lawn_care_service" },
    { seedKey: "creek-bend-yards", name: "Creek Bend Yards", primaryType: "lawn_care_service" },
    { seedKey: "northgate-lawn", name: "Northgate Lawn Co", primaryType: "lawn_care_service" },
    { seedKey: "mill-road-turf", name: "Mill Road Turf", primaryType: "lawn_care_service" },
  ],
  contractor: [
    { seedKey: "harbor-lane-auto", name: "Harbor Lane Auto Detail", primaryType: "car_detailing" },
    { seedKey: "pinecrest-lawn", name: "Pinecrest Lawn Care", primaryType: "lawn_care_service" },
    { seedKey: "brookside-hvac", name: "Brookside HVAC", primaryType: "hvac_contractor" },
    { seedKey: "oakline-handyman", name: "Oakline Handyman Co", primaryType: "handyman" },
    { seedKey: "fairview-painting", name: "Fairview Painting Co", primaryType: "painter" },
    { seedKey: "ridgeway-maintenance", name: "Ridgeway Maintenance", primaryType: "general_contractor" },
    { seedKey: "millstone-roofing", name: "Millstone Roofing", primaryType: "roofing_contractor" },
  ],
  professional: [
    { seedKey: "lakeside-bookkeeping", name: "Lakeside Bookkeeping", primaryType: "accounting" },
    { seedKey: "oak-street-insurance", name: "Oak Street Insurance", primaryType: "insurance_agency" },
    { seedKey: "fairway-tax", name: "Fairway Tax Studio", primaryType: "accounting" },
    { seedKey: "northgate-advisors", name: "Northgate Advisors", primaryType: "consultant" },
    { seedKey: "brookside-legal", name: "Brookside Legal Help", primaryType: "lawyer" },
    { seedKey: "pine-bend-cpa", name: "Pine Bend CPA", primaryType: "accounting" },
    { seedKey: "ridge-view-consulting", name: "Ridge View Consulting", primaryType: "consultant" },
  ],
  retail: [
    { seedKey: "midtown-print", name: "Midtown Print Shop", primaryType: "printing_shop" },
    { seedKey: "oak-supply", name: "Oak Street Supply", primaryType: "hardware_store" },
    { seedKey: "fairway-boutique", name: "Fairway Boutique", primaryType: "clothing_store" },
    { seedKey: "lakeside-goods", name: "Lakeside Goods", primaryType: "store" },
    { seedKey: "pinecrest-print", name: "Pinecrest Print Co", primaryType: "printing_shop" },
    { seedKey: "harbor-lane-shop", name: "Harbor Lane Shop", primaryType: "store" },
    { seedKey: "mill-road-supply", name: "Mill Road Supply", primaryType: "hardware_store" },
  ],
  other: [
    { seedKey: "harbor-lane-auto", name: "Harbor Lane Auto Detail", primaryType: "car_detailing" },
    { seedKey: "pinecrest-lawn", name: "Pinecrest Lawn Care", primaryType: "lawn_care_service" },
    { seedKey: "midtown-print", name: "Midtown Print Shop", primaryType: "printing_shop" },
    { seedKey: "oakline-handyman", name: "Oakline Handyman Co", primaryType: "handyman" },
    { seedKey: "lakeside-bookkeeping", name: "Lakeside Bookkeeping", primaryType: "accounting" },
    { seedKey: "fairway-boutique", name: "Fairway Boutique", primaryType: "clothing_store" },
    { seedKey: "ridgeway-maintenance", name: "Ridgeway Maintenance", primaryType: "general_contractor" },
  ],
};

const PROSPECT_CATALOG: Record<TrialDeskVertical, CatalogRow[]> = {
  pest: [
    { seedKey: "rivergate-pest", name: "Rivergate Pest Co", primaryType: "pest_control_service", contactName: "Casey Nguyen" },
    { seedKey: "westfield-pest", name: "Westfield Pest Service", primaryType: "pest_control_service", contactName: "Morgan Ellis" },
    { seedKey: "pinebrook-pest", name: "Pinebrook Pest Control", primaryType: "pest_control_service", contactName: "Riley Brooks" },
  ],
  maintenance: [
    { seedKey: "cedar-house-care", name: "Cedar House Care", primaryType: "general_contractor", contactName: "Alex Rivera" },
    { seedKey: "north-mill-upkeep", name: "North Mill Upkeep", primaryType: "handyman", contactName: "Jordan Hale" },
    { seedKey: "lakeshore-facilities", name: "Lakeshore Facilities", primaryType: "general_contractor", contactName: "Quinn Patel" },
  ],
  hvac: [
    { seedKey: "westbrook-air", name: "Westbrook Air Co", primaryType: "hvac_contractor", contactName: "Taylor Grant" },
    { seedKey: "oakmont-heating", name: "Oakmont Heating", primaryType: "hvac_contractor", contactName: "Jamie Cole" },
    { seedKey: "fair-lake-cooling", name: "Fair Lake Cooling", primaryType: "hvac_contractor", contactName: "Reese Diaz" },
  ],
  cleaning: [
    { seedKey: "south-brook-clean", name: "South Brook Clean Co", primaryType: "cleaning_service", contactName: "Avery Chen" },
    { seedKey: "ridge-house-maids", name: "Ridge House Maids", primaryType: "cleaning_service", contactName: "Cameron Blake" },
    { seedKey: "lakeview-janitorial", name: "Lakeview Janitorial", primaryType: "cleaning_service", contactName: "Harper Singh" },
  ],
  lawn: [
    { seedKey: "willow-lawn", name: "Willow Lawn Co", primaryType: "lawn_care_service", contactName: "Drew Sullivan" },
    { seedKey: "eastgate-turf", name: "Eastgate Turf", primaryType: "lawn_care_service", contactName: "Parker Lane" },
    { seedKey: "stone-creek-yards", name: "Stone Creek Yards", primaryType: "lawn_care_service", contactName: "Sam Ortiz" },
  ],
  contractor: [
    { seedKey: "cedar-house-care", name: "Cedar House Care", primaryType: "general_contractor", contactName: "Alex Rivera" },
    { seedKey: "north-mill-upkeep", name: "North Mill Upkeep", primaryType: "handyman", contactName: "Jordan Hale" },
    { seedKey: "lakeshore-facilities", name: "Lakeshore Facilities", primaryType: "general_contractor", contactName: "Quinn Patel" },
  ],
  professional: [
    { seedKey: "west-oak-books", name: "West Oak Books", primaryType: "accounting", contactName: "Morgan Ellis" },
    { seedKey: "fair-harbor-advisors", name: "Fair Harbor Advisors", primaryType: "consultant", contactName: "Casey Nguyen" },
    { seedKey: "pine-street-tax", name: "Pine Street Tax", primaryType: "accounting", contactName: "Riley Brooks" },
  ],
  retail: [
    { seedKey: "east-mill-supply", name: "East Mill Supply", primaryType: "hardware_store", contactName: "Jamie Cole" },
    { seedKey: "harbor-print-co", name: "Harbor Print Co", primaryType: "printing_shop", contactName: "Taylor Grant" },
    { seedKey: "oak-lane-goods", name: "Oak Lane Goods", primaryType: "store", contactName: "Avery Chen" },
  ],
  other: [
    { seedKey: "cedar-house-care", name: "Cedar House Care", primaryType: "general_contractor", contactName: "Alex Rivera" },
    { seedKey: "west-oak-books", name: "West Oak Books", primaryType: "accounting", contactName: "Morgan Ellis" },
    { seedKey: "harbor-print-co", name: "Harbor Print Co", primaryType: "printing_shop", contactName: "Taylor Grant" },
  ],
};

function sampleBusinessName(name: string) {
  return `${name} · SAMPLE`;
}

function sampleAddress(market: TrialDeskMarket) {
  const area = trialMarketAreaLabel(market);
  return `SAMPLE address — ${area}. Not a real location. Do not visit or contact.`;
}

function sampleSearchQuery(market: TrialDeskMarket) {
  const area = trialMarketAreaLabel(market);
  return `SAMPLE trial review pile — ${market.serviceQuery} in ${area} — no live Places search`;
}

export function getTrialHunterSeedFinds(marketInput: TrialDeskMarketInput = {}): TrialHunterSeedFind[] {
  const market = inferTrialDeskMarket(marketInput);
  return HUNTER_CATALOG[market.vertical].slice(0, 7).map((row) => ({
    seedKey: row.seedKey,
    placeId: `trial-seed-${row.seedKey}`,
    name: sampleBusinessName(row.name),
    formattedAddress: sampleAddress(market),
    primaryType: row.primaryType,
    searchQuery: sampleSearchQuery(market),
  }));
}

export function getTrialProspectSeeds(marketInput: TrialDeskMarketInput = {}): TrialProspectSeed[] {
  const market = inferTrialDeskMarket(marketInput);
  const area = trialMarketAreaLabel(market);
  return PROSPECT_CATALOG[market.vertical].slice(0, 3).map((row, index) => {
    const name = sampleBusinessName(row.name);
    const contactName = row.contactName ?? "Alex Rivera";
    const daysUntilDue = index === 0 ? 0 : index === 1 ? 1 : null;
    const nextAction = daysUntilDue == null
      ? `SAMPLE next step — call ${contactName} at ${row.name} when you are ready. Atlas has not contacted them.`
      : `SAMPLE draft follow-up — review, then you send to ${contactName} at ${row.name}. Atlas has not emailed, called, or texted anyone.`;
    return {
      seedKey: row.seedKey,
      name,
      contactName,
      contactEmail: `desk+trial-${row.seedKey}@example.invalid`,
      daysUntilDue,
      nextAction,
      researchSummary: [
        `SAMPLE prospect only. ${row.name} is a practice ${market.serviceQuery} record in ${area}.`,
        "Not a real business. Do not visit or contact.",
        "Atlas has not called, emailed, or texted anyone. The owner approves any send.",
      ].join(" "),
      fitReason: `SAMPLE fixture so Prospects shows a local ${market.serviceQuery} name. Do not contact.`,
      hunterPlaceId: `trial-seed-accepted-${row.seedKey}`,
      primaryType: row.primaryType,
    };
  });
}

export function trialHunterSeedPlaceIds(marketInput: TrialDeskMarketInput = {}) {
  return getTrialHunterSeedFinds(marketInput).map((find) => find.placeId);
}

export function getTrialMicahSeedSlots(): TrialMicahSeedSlot[] {
  return MICAH_STARTER_DAYS.map((item) => {
    const slot = `${TRIAL_DESK_SEED_WEEK_KEY}-d${item.day}`;
    const title = `SAMPLE · Day ${item.day} · ${item.weekday}`;
    const headline = `${item.theme} · SAMPLE placeholder`;
    const supportingText = "Gallery placeholder. Download and post it yourself.";
    const caption = [
      "SAMPLE gallery placeholder.",
      `${item.weekday} ${item.theme} is a draft slot only. Copy or download when you are ready.`,
      "Atlas did not post this to Facebook or Instagram. Nothing is scheduled.",
      "#SampleDraft",
    ].join("\n\n");
    return {
      day: item.day,
      weekday: item.weekday,
      theme: item.theme,
      slot,
      title,
      headline,
      supportingText,
      caption,
      callToAction: "Download this draft. Do not expect Atlas to post it.",
      imageSvg: trialMicahPlaceholderSvg(headline, item.theme),
    };
  });
}

export function trialMicahSeedSlots() {
  return getTrialMicahSeedSlots().map((item) => item.slot);
}

export function getTrialLionsDenSeed(marketInput: TrialDeskMarketInput = {}): TrialLionsDenSeed {
  const market = inferTrialDeskMarket(marketInput);
  const prospects = getTrialProspectSeeds(market);
  return {
    hunterFinds: getTrialHunterSeedFinds(market),
    prospects,
    followUps: prospects.filter((row) => row.daysUntilDue != null),
    micahSlots: getTrialMicahSeedSlots(),
    market,
  };
}

export function trialDeskSeedWriteTables() {
  return [
    "organization_hunter_review_items",
    "organization_opportunities",
    "organization_opportunity_events",
    "organization_content_drafts",
    "organization_content_draft_events",
  ] as const;
}

function trialMicahPlaceholderSvg(headline: string, theme: string) {
  const safeHeadline = escapeXml(headline);
  const safeTheme = escapeXml(theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="160" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">SAMPLE DRAFT</text><text x="80" y="280" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif">${safeTheme}</text><text x="80" y="420" fill="#ffffff" font-size="52" font-family="Arial,sans-serif">${safeHeadline}</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Download and post yourself. Atlas did not post this.</text></svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function assertTrialDeskSeedIsSafe(seed = getTrialLionsDenSeed()) {
  if (seed.hunterFinds.length < 5 || seed.hunterFinds.length > 8) {
    throw new Error("Trial seed should be a denser HUNTER review pile (5–8 SAMPLE rows).");
  }
  if (seed.prospects.length < 2 || seed.prospects.length > 3) {
    throw new Error("Trial seed should include 2–3 Accept-ready SAMPLE prospects.");
  }
  if (seed.followUps.length < 1 || seed.followUps.length > 2) {
    throw new Error("Trial seed should include 1–2 SAMPLE follow-up drafts.");
  }
  if (seed.micahSlots.length !== 7) {
    throw new Error("Trial seed must include one MICAH placeholder for each weekday.");
  }

  const blob = JSON.stringify(seed);
  if (/\b(?:contact_)?phone|\(\s*555\s*\)|\+1[\s-]?\d/i.test(blob)) {
    throw new Error("Trial seed must not invent phone numbers.");
  }
  if (/sis_lions_den|sis custom creations|afe-crm-demo/i.test(blob)) {
    throw new Error("Trial seed must not mention SIS or the sample desk.");
  }
  if (/\bfaith\b/i.test(blob)) {
    throw new Error("Trial seed must not default Faith language.");
  }
  if (/auto-?send|already sent|was sent|front desk phone/i.test(blob)) {
    throw new Error("Trial seed must not auto-send or turn on Front Desk phone AI.");
  }

  for (const find of seed.hunterFinds) {
    if (!/\bSAMPLE\b/.test(find.name) || find.searchQuery.indexOf("SAMPLE") < 0) {
      throw new Error(`HUNTER trial find must be labeled SAMPLE: ${find.name}`);
    }
    if (!find.placeId.startsWith("trial-seed-")) {
      throw new Error(`HUNTER trial place_id must be namespaced: ${find.placeId}`);
    }
  }

  for (const prospect of seed.prospects) {
    if (!/\bSAMPLE\b/.test(prospect.name) || !/\bSAMPLE\b/.test(prospect.nextAction)) {
      throw new Error(`Prospect trial row must be labeled SAMPLE: ${prospect.name}`);
    }
    if (!/@example\.invalid$/.test(prospect.contactEmail)) {
      throw new Error(`Prospect trial email must be clearly fake: ${prospect.contactEmail}`);
    }
    if (!/do not (visit or )?contact|has not (called|emailed|contacted)/i.test(prospect.researchSummary)) {
      throw new Error(`Prospect trial row must stay do-not-contact: ${prospect.name}`);
    }
    if (!prospect.hunterPlaceId.startsWith("trial-seed-accepted-")) {
      throw new Error(`Accepted trial hunter place_id must be namespaced: ${prospect.hunterPlaceId}`);
    }
  }

  for (const followUp of seed.followUps) {
    if (!/review, then you send|owner approval/i.test(followUp.nextAction)) {
      throw new Error(`Follow-up trial draft must stay owner-approval only: ${followUp.name}`);
    }
    if (followUp.daysUntilDue == null) {
      throw new Error(`Follow-up trial draft needs a queue date: ${followUp.name}`);
    }
  }

  for (const slot of seed.micahSlots) {
    if (!/\bSAMPLE\b/.test(slot.title) || !/\bSAMPLE\b/.test(slot.caption)) {
      throw new Error(`MICAH trial slot must be labeled SAMPLE: ${slot.title}`);
    }
    if (!/did not post|not posted|nothing is scheduled/i.test(slot.caption)) {
      throw new Error(`MICAH trial slot must stay gallery-only: ${slot.title}`);
    }
  }
}

export function canSeedTrialLionsDenDesk(input: {
  organization?: TrialDeskOrganization | null;
  hasTrialProfile?: boolean;
}) {
  const organization = input.organization;
  if (!organization?.id) return false;
  if (input.hasTrialProfile === false) return false;
  if (isSisOrganization(organization) || isAfeCrmDemoOrganization(organization)) return false;
  if (isExcludedTrialInboxOrganization(organization)) return false;
  return true;
}

function isoDateFromToday(daysUntilDue = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysUntilDue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readOrganization(
  client: TrialDeskSeedClient,
  organizationId: string,
): Promise<TrialDeskOrganization | null> {
  const result = await client.from("organizations").select("id, name, slug").eq("id", organizationId).maybeSingle();
  if (result?.error) {
    throw new Error(result.error.message);
  }
  const row = result?.data as TrialDeskOrganization | null | undefined;
  return row?.id ? row : null;
}

export async function applyTrialLionsDenSeed(
  client: TrialDeskSeedClient,
  input: {
    organizationId: string;
    userId?: string | null;
    organization?: TrialDeskOrganization | null;
    hasTrialProfile?: boolean;
    market?: TrialDeskMarketInput | null;
  },
) {
  const organization =
    input.organization?.id === input.organizationId
      ? input.organization
      : await readOrganization(client, input.organizationId);

  if (
    !canSeedTrialLionsDenDesk({
      organization,
      hasTrialProfile: input.hasTrialProfile,
    })
  ) {
    return { status: "skipped" as const, reason: "not_eligible" };
  }

  const market = inferTrialDeskMarket({
    businessName: input.market?.businessName || organization?.name,
    businessType: input.market?.businessType,
    city: input.market?.city,
    zipCode: input.market?.zipCode,
    state: input.market?.state,
    metadata: input.market?.metadata,
  });
  const seed = getTrialLionsDenSeed(market);
  assertTrialDeskSeedIsSafe(seed);

  const placeIds = seed.hunterFinds.map((find) => find.placeId);
  const slots = trialMicahSeedSlots();

  const hunterRead = await client
    .from("organization_hunter_review_items")
    .select("id, place_id, status, accepted_opportunity_id")
    .eq("organization_id", organization!.id);
  if (hunterRead.error) {
    throw new Error(hunterRead.error.message);
  }
  const existingHunter = (hunterRead.data ?? []) as Array<{
    place_id?: string;
    status?: string;
    accepted_opportunity_id?: string | null;
  }>;
  const hasAnyHunter = existingHunter.length > 0;

  const opportunityRead = await client
    .from("organization_opportunities")
    .select("id, name, metadata")
    .eq("organization_id", organization!.id);
  if (opportunityRead.error) {
    throw new Error(opportunityRead.error.message);
  }
  const existingOpportunities = (opportunityRead.data ?? []) as Array<{
    id?: string;
    name?: string;
    metadata?: Record<string, unknown> | null;
  }>;
  const hasAnyProspects = existingOpportunities.length > 0;

  const draftRead = await client
    .from("organization_content_drafts")
    .select("id, slot, metadata")
    .eq("organization_id", organization!.id);
  if (draftRead.error) {
    throw new Error(draftRead.error.message);
  }
  const existingDrafts = (draftRead.data ?? []) as Array<{
    slot?: string;
    metadata?: Record<string, unknown> | null;
  }>;
  const existingSlots = new Set(
    existingDrafts
      .filter((row) => row.metadata?.trial_seed === true || String(row.slot ?? "").startsWith(`${TRIAL_DESK_SEED_WEEK_KEY}-`))
      .map((row) => String(row.slot ?? "")),
  );
  const hasOwnWeek = existingDrafts.some((row) => {
    const metadata = row.metadata ?? {};
    return metadata.week_pack === true && metadata.trial_seed !== true;
  });

  const alreadyHasDeskData = hasAnyHunter || hasAnyProspects || hasOwnWeek || existingSlots.size > 0;
  const missingHunter = alreadyHasDeskData ? [] : seed.hunterFinds;
  const missingProspects = alreadyHasDeskData ? [] : seed.prospects;
  const missingMicah = alreadyHasDeskData ? [] : seed.micahSlots.filter((item) => !existingSlots.has(item.slot));

  if (missingHunter.length === 0 && missingProspects.length === 0 && missingMicah.length === 0) {
    return {
      status: "already_seeded" as const,
      organizationId: organization!.id,
      hunterCount: existingHunter.filter((row) => String(row.place_id ?? "").startsWith("trial-seed-")).length,
      prospectCount: existingOpportunities.filter((row) => row.metadata?.trial_seed === true).length,
      followUpCount: seed.followUps.length,
      micahCount: existingSlots.size,
    };
  }

  if (missingHunter.length > 0) {
    const hunterRows = missingHunter.map((find) => ({
      organization_id: organization!.id,
      place_id: find.placeId,
      name: find.name,
      formatted_address: find.formattedAddress,
      google_maps_url: null,
      website_url: null,
      primary_type: find.primaryType,
      business_status: "SAMPLE",
      search_query: find.searchQuery,
      status: "pending",
      accepted_opportunity_id: null,
      created_by: input.userId || null,
    }));
    const hunterWrite = await client
      .from("organization_hunter_review_items")
      .upsert(hunterRows, { onConflict: "organization_id,place_id" });
    if (hunterWrite.error) {
      throw new Error(hunterWrite.error.message);
    }
  }

  if (missingProspects.length > 0) {
    const opportunityRows = missingProspects.map((prospect) => ({
      organization_id: organization!.id,
      name: prospect.name,
      opportunity_type: "customer",
      stage: prospect.daysUntilDue == null ? "ready_for_follow_up" : "follow_up_queued",
      fit_score: 0,
      owner_role: "client",
      source_label: "SAMPLE trial seed — no outreach",
      source_url: `https://example.invalid/trial/${prospect.seedKey}`,
      contact_name: prospect.contactName,
      contact_email: prospect.contactEmail,
      contact_phone: null,
      contact_social: null,
      research_summary: prospect.researchSummary,
      fit_reason: prospect.fitReason,
      next_action: prospect.nextAction,
      next_action_due: prospect.daysUntilDue == null ? null : isoDateFromToday(prospect.daysUntilDue),
      metadata: {
        source: TRIAL_DESK_SEED_KIND,
        trial_seed: true,
        seed_key: prospect.seedKey,
        demo_labeled: true,
        no_outreach_sent: true,
        accepted_for_calling: true,
        owner_approval_required: true,
        no_auto_send: true,
        formatted_address: sampleAddress(seed.market),
        primary_type: prospect.primaryType,
        business_status: "SAMPLE",
      },
    }));
    const opportunityWrite = await client
      .from("organization_opportunities")
      .upsert(opportunityRows, { onConflict: "organization_id,name,opportunity_type" });
    if (opportunityWrite.error) {
      throw new Error(opportunityWrite.error.message);
    }

    const opportunities = await client
      .from("organization_opportunities")
      .select("id, name")
      .eq("organization_id", organization!.id);
    if (opportunities.error) {
      throw new Error(opportunities.error.message);
    }
    const opportunityIdByName = new Map(
      ((opportunities.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.name, row.id]),
    );

    const acceptedHunterRows = missingProspects.flatMap((prospect) => {
      const opportunityId = opportunityIdByName.get(prospect.name);
      if (!opportunityId) return [];
      return [
        {
          organization_id: organization!.id,
          place_id: prospect.hunterPlaceId,
          name: prospect.name,
          formatted_address: sampleAddress(seed.market),
          google_maps_url: null,
          website_url: null,
          primary_type: prospect.primaryType,
          business_status: "SAMPLE",
          search_query: `SAMPLE accepted find — ${prospect.name} — no live Places search`,
          status: "accepted",
          accepted_opportunity_id: opportunityId,
          created_by: input.userId || null,
        },
      ];
    });
    if (acceptedHunterRows.length > 0) {
      const acceptedWrite = await client
        .from("organization_hunter_review_items")
        .upsert(acceptedHunterRows, { onConflict: "organization_id,place_id" });
      if (acceptedWrite.error) {
        throw new Error(acceptedWrite.error.message);
      }
    }

    for (const prospect of missingProspects) {
      const opportunityId = opportunityIdByName.get(prospect.name);
      if (!opportunityId) continue;
      const existingEvents = await client
        .from("organization_opportunity_events")
        .select("id")
        .eq("opportunity_id", opportunityId)
        .eq("event_type", "created");
      if (existingEvents.error) {
        throw new Error(existingEvents.error.message);
      }
      if (((existingEvents.data ?? []) as unknown[]).length === 0) {
        const created = await client.from("organization_opportunity_events").insert({
          opportunity_id: opportunityId,
          organization_id: organization!.id,
          event_type: "created",
          actor_role: "hunter",
          summary: "SAMPLE seed: accepted into Prospects. Atlas has not contacted anyone.",
          body: prospect.researchSummary,
        });
        if (created.error) throw new Error(created.error.message);
      }
      if (prospect.daysUntilDue != null) {
        const queued = await client
          .from("organization_opportunity_events")
          .select("id")
          .eq("opportunity_id", opportunityId)
          .eq("event_type", "follow_up_queued");
        if (queued.error) {
          throw new Error(queued.error.message);
        }
        if (((queued.data ?? []) as unknown[]).length === 0) {
          const followUp = await client.from("organization_opportunity_events").insert({
            opportunity_id: opportunityId,
            organization_id: organization!.id,
            event_type: "follow_up_queued",
            actor_role: "david",
            summary: prospect.nextAction,
            body: "SAMPLE draft only. Owner reviews and sends. Atlas did not send this.",
          });
          if (followUp.error) throw new Error(followUp.error.message);
        }
      }
    }
  }

  if (missingMicah.length > 0) {
    const draftDate = isoDateFromToday(0);
    const draftRows = missingMicah.map((item) => ({
      organization_id: organization!.id,
      draft_date: draftDate,
      slot: item.slot,
      campaign: "SAMPLE week placeholders",
      title: item.title,
      headline: item.headline,
      supporting_text: item.supportingText,
      caption: item.caption,
      call_to_action: item.callToAction,
      platforms: ["facebook", "instagram", "linkedin"],
      visual_style: "atlas_branded",
      image_svg: item.imageSvg,
      status: "ready_for_review",
      generated_by: "micah",
      generation_source: "manual",
      metadata: {
        source: TRIAL_DESK_SEED_KIND,
        trial_seed: true,
        week_pack: true,
        week_day: item.day,
        weekday: item.weekday,
        week_theme: item.theme,
        micah_demeanor: "straight",
        faith_language: false,
        demo_labeled: true,
        company_name: "",
        no_live_post: true,
        no_scheduler: true,
        requested_by: input.userId || null,
      },
    }));
    const draftWrite = await client
      .from("organization_content_drafts")
      .upsert(draftRows, { onConflict: "organization_id,draft_date,slot" });
    if (draftWrite.error) {
      throw new Error(draftWrite.error.message);
    }

    const refreshed = await client
      .from("organization_content_drafts")
      .select("id, slot")
      .eq("organization_id", organization!.id);
    if (!refreshed.error) {
      const inserted = ((refreshed.data ?? []) as Array<{ id: string; slot: string }>).filter((row) =>
        missingMicah.some((item) => item.slot === row.slot),
      );
      if (inserted.length > 0) {
        await client.from("organization_content_draft_events").insert(
          inserted.map((row) => ({
            draft_id: row.id,
            organization_id: organization!.id,
            event_type: "created",
            note: "SAMPLE MICAH week placeholder. Gallery draft only. Atlas did not post this.",
            actor_user_id: input.userId || null,
            actor_label: "MICAH",
          })),
        );
      }
    }
  }

  return {
    status: "applied" as const,
    organizationId: organization!.id,
    hunterCount: placeIds.length,
    prospectCount: seed.prospects.length,
    followUpCount: seed.followUps.length,
    micahCount: slots.length,
    wroteProspects: missingProspects.length > 0,
  };
}
