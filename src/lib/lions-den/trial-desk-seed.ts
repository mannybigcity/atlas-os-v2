import { isExcludedTrialInboxOrganization } from "./trial-inbox.ts";
import { deskDateInDays } from "../desk-time.ts";
import {
  inferTrialDeskMarket,
  trialMarketAreaLabel,
  type TrialDeskMarket,
  type TrialDeskMarketInput,
  type TrialDeskVertical,
} from "./trial-desk-market.ts";
import {
  TRIAL_MICAH_WEEK_KEY,
  getTrialMicahSeedSlots,
  trialMicahSeedSlots,
  type TrialMicahSeedSlot,
} from "./trial-micah-week.ts";
import {
  isAfeCrmDemoOrganization,
  isSisOrganization,
} from "../client-portal/identity.ts";

export const TRIAL_DESK_SEED_KIND = "afe_trial_lions_den_seed";
export const TRIAL_DESK_SEED_WEEK_KEY = TRIAL_MICAH_WEEK_KEY;
export { getTrialMicahSeedSlots, trialMicahSeedSlots };
export type { TrialMicahSeedSlot };

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

export type TrialClientSeed = {
  seedKey: string;
  name: string;
  contactName: string;
  contactEmail: string;
  nextAction: string;
  researchSummary: string;
  fitReason: string;
  note: string;
  hunterPlaceId: string;
  primaryType: string;
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
  clients: TrialClientSeed[];
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

const CLIENT_CATALOG: Record<TrialDeskVertical, CatalogRow> = {
  pest: { seedKey: "maple-grove-hoa", name: "Maple Grove HOA", primaryType: "pest_control_service", contactName: "Dana Whitfield" },
  maintenance: { seedKey: "harbor-view-estates", name: "Harbor View Estates", primaryType: "general_contractor", contactName: "Ellis Grant" },
  hvac: { seedKey: "west-oak-clinic", name: "West Oak Clinic", primaryType: "hvac_contractor", contactName: "Priya Shah" },
  cleaning: { seedKey: "north-mill-offices", name: "North Mill Offices", primaryType: "cleaning_service", contactName: "Chris Alvarez" },
  lawn: { seedKey: "fair-harbor-apartments", name: "Fair Harbor Apartments", primaryType: "lawn_care_service", contactName: "Morgan Lee" },
  contractor: { seedKey: "cedar-ridge-hoa", name: "Cedar Ridge HOA", primaryType: "general_contractor", contactName: "Dana Whitfield" },
  professional: { seedKey: "mill-street-clinic", name: "Mill Street Clinic", primaryType: "accounting", contactName: "Ellis Grant" },
  retail: { seedKey: "pine-harbor-market", name: "Pine Harbor Market", primaryType: "store", contactName: "Priya Shah" },
  other: { seedKey: "maple-grove-hoa", name: "Maple Grove HOA", primaryType: "general_contractor", contactName: "Dana Whitfield" },
};

function seedBusinessName(name: string) {
  return name;
}

function seedAddress(market: TrialDeskMarket) {
  return trialMarketAreaLabel(market);
}

function seedSearchQuery(market: TrialDeskMarket) {
  const area = trialMarketAreaLabel(market);
  return `${market.serviceQuery} in ${area}`;
}

export function getTrialHunterSeedFinds(marketInput: TrialDeskMarketInput = {}): TrialHunterSeedFind[] {
  const market = inferTrialDeskMarket(marketInput);
  return HUNTER_CATALOG[market.vertical].slice(0, 7).map((row) => ({
    seedKey: row.seedKey,
    placeId: `trial-seed-${row.seedKey}`,
    name: seedBusinessName(row.name),
    formattedAddress: seedAddress(market),
    primaryType: row.primaryType,
    searchQuery: seedSearchQuery(market),
  }));
}

export function getTrialProspectSeeds(marketInput: TrialDeskMarketInput = {}): TrialProspectSeed[] {
  const market = inferTrialDeskMarket(marketInput);
  const area = trialMarketAreaLabel(market);
  return PROSPECT_CATALOG[market.vertical].slice(0, 3).map((row, index) => {
    const name = seedBusinessName(row.name);
    const contactName = row.contactName ?? "Alex Rivera";
    const daysUntilDue = index === 0 ? 0 : index === 1 ? 1 : null;
    const nextAction = daysUntilDue == null
      ? `Call ${contactName} at ${row.name} when you are ready. Atlas has not contacted them.`
      : `Review, then you send to ${contactName} at ${row.name}. Atlas has not emailed, called, or texted anyone.`;
    return {
      seedKey: row.seedKey,
      name,
      contactName,
      contactEmail: `desk+trial-${row.seedKey}@example.invalid`,
      daysUntilDue,
      nextAction,
      researchSummary: [
        `${row.name} looks like a local ${market.serviceQuery} shop in ${area}.`,
        "Atlas has not called, emailed, or texted anyone. The owner approves any send.",
      ].join(" "),
      fitReason: `Local ${market.serviceQuery} name for the Prospects board. Atlas has not contacted them.`,
      hunterPlaceId: `trial-seed-accepted-${row.seedKey}`,
      primaryType: row.primaryType,
    };
  });
}

export function getTrialClientSeeds(marketInput: TrialDeskMarketInput = {}): TrialClientSeed[] {
  const market = inferTrialDeskMarket(marketInput);
  const area = trialMarketAreaLabel(market);
  const row = CLIENT_CATALOG[market.vertical];
  const name = seedBusinessName(row.name);
  const contactName = row.contactName ?? "Dana Whitfield";
  return [
    {
      seedKey: row.seedKey,
      name,
      contactName,
      contactEmail: `desk+trial-${row.seedKey}@example.invalid`,
      nextAction: `No further outreach. ${contactName} at ${row.name} already booked.`,
      researchSummary: [
        `${row.name} booked ${market.serviceQuery} in ${area} after an owner-approved follow-up.`,
        "Atlas did not close this automatically. The owner marks real wins.",
      ].join(" "),
      fitReason: `Won ${market.serviceQuery} account so Clients is not empty. Atlas has not contacted them.`,
      note: `Owner marked ${row.name} won after they booked. Atlas did not call, email, or text anyone.`,
      hunterPlaceId: `trial-seed-won-${row.seedKey}`,
      primaryType: row.primaryType,
    },
  ];
}

export function trialHunterSeedPlaceIds(marketInput: TrialDeskMarketInput = {}) {
  return getTrialHunterSeedFinds(marketInput).map((find) => find.placeId);
}

export function getTrialLionsDenSeed(marketInput: TrialDeskMarketInput = {}): TrialLionsDenSeed {
  const market = inferTrialDeskMarket(marketInput);
  const prospects = getTrialProspectSeeds(market);
  return {
    hunterFinds: getTrialHunterSeedFinds(market),
    prospects,
    followUps: prospects.filter((row) => row.daysUntilDue != null),
    clients: getTrialClientSeeds(market),
    micahSlots: getTrialMicahSeedSlots(market),
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

export function assertTrialDeskSeedIsSafe(seed = getTrialLionsDenSeed()) {
  if (seed.hunterFinds.length < 5 || seed.hunterFinds.length > 8) {
    throw new Error("Trial seed should be a denser HUNTER review pile (5–8 local business rows).");
  }
  if (seed.prospects.length < 2 || seed.prospects.length > 3) {
    throw new Error("Trial seed should include 2–3 Accept-ready prospects.");
  }
  if (seed.followUps.length < 1 || seed.followUps.length > 2) {
    throw new Error("Trial seed should include 1–2 follow-up drafts.");
  }
  if (seed.clients.length !== 1) {
    throw new Error("Trial seed should include exactly one closed client win.");
  }
  if (seed.micahSlots.length !== 7) {
    throw new Error("Trial seed must include one MICAH week card for each weekday.");
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
    if (/\bSAMPLE\b/.test(`${find.name} ${find.formattedAddress} ${find.searchQuery}`)) {
      throw new Error(`HUNTER trial find must look like a local shop, not SAMPLE: ${find.name}`);
    }
    if (/not a real location/i.test(find.formattedAddress)) {
      throw new Error(`HUNTER trial address must look local, not a fake-location disclaimer: ${find.name}`);
    }
    if (!find.placeId.startsWith("trial-seed-")) {
      throw new Error(`HUNTER trial place_id must be namespaced: ${find.placeId}`);
    }
  }

  for (const prospect of seed.prospects) {
    if (/\bSAMPLE\b/.test(`${prospect.name} ${prospect.nextAction} ${prospect.researchSummary}`)) {
      throw new Error(`Prospect trial row must look like a local shop, not SAMPLE: ${prospect.name}`);
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

  for (const client of seed.clients) {
    if (/\bSAMPLE\b/.test(`${client.name} ${client.nextAction} ${client.note} ${client.researchSummary}`)) {
      throw new Error(`Closed-client trial row must look like a local win, not SAMPLE: ${client.name}`);
    }
    if (!/@example\.invalid$/.test(client.contactEmail)) {
      throw new Error(`Closed-client trial email must be clearly fake: ${client.contactEmail}`);
    }
    if (!/has not (called|emailed|contacted)|did not call, email, or text/i.test(`${client.researchSummary} ${client.note} ${client.fitReason}`)) {
      throw new Error(`Closed-client trial row must stay do-not-contact: ${client.name}`);
    }
    if (!/did not close this automatically|owner marks real wins|owner-approved follow-up/i.test(client.researchSummary)) {
      throw new Error(`Closed-client trial row must stay an owner-marked win: ${client.name}`);
    }
    if (!client.hunterPlaceId.startsWith("trial-seed-won-")) {
      throw new Error(`Won trial hunter place_id must be namespaced: ${client.hunterPlaceId}`);
    }
    if (/auto-?send|already sent|was sent/i.test(`${client.nextAction} ${client.note}`)) {
      throw new Error(`Closed-client trial row must not auto-send: ${client.name}`);
    }
  }

  for (const slot of seed.micahSlots) {
    if (/\bSAMPLE\b/.test(`${slot.title} ${slot.caption} ${slot.imageSvg}`)) {
      throw new Error(`MICAH trial slot must look like a real day-card, not SAMPLE: ${slot.title}`);
    }
    if (!/did not post|not posted|nothing is scheduled/i.test(slot.caption)) {
      throw new Error(`MICAH trial slot must stay gallery-only: ${slot.title}`);
    }
    if (/placeholder/i.test(`${slot.headline} ${slot.caption}`)) {
      throw new Error(`MICAH trial slot must be real copy, not a placeholder: ${slot.title}`);
    }
    if (!slot.dayLabel || !slot.callToAction.trim()) {
      throw new Error(`MICAH trial slot needs a day label and CTA: ${slot.title}`);
    }
    if (/atlas-logo|atlas-lion|sis custom creations/i.test(slot.imageSvg)) {
      throw new Error(`MICAH trial slot must not stamp the AFE lion or SIS chrome: ${slot.title}`);
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
  return deskDateInDays(daysUntilDue);
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
    .select("id, name, stage, metadata")
    .eq("organization_id", organization!.id);
  if (opportunityRead.error) {
    throw new Error(opportunityRead.error.message);
  }
  const existingOpportunities = (opportunityRead.data ?? []) as Array<{
    id?: string;
    name?: string;
    stage?: string;
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
  const missingClients = alreadyHasDeskData ? [] : seed.clients;
  const missingMicah = alreadyHasDeskData ? [] : seed.micahSlots.filter((item) => !existingSlots.has(item.slot));

  if (
    missingHunter.length === 0 &&
    missingProspects.length === 0 &&
    missingClients.length === 0 &&
    missingMicah.length === 0
  ) {
    return {
      status: "already_seeded" as const,
      organizationId: organization!.id,
      hunterCount: existingHunter.filter((row) => String(row.place_id ?? "").startsWith("trial-seed-")).length,
      prospectCount: existingOpportunities.filter(
        (row) => row.metadata?.trial_seed === true && row.stage !== "won",
      ).length,
      clientCount: existingOpportunities.filter(
        (row) => row.metadata?.trial_seed === true && row.stage === "won",
      ).length,
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
      business_status: "OPERATIONAL",
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

  if (missingProspects.length > 0 || missingClients.length > 0) {
    const opportunityRows = [
      ...missingProspects.map((prospect) => ({
        organization_id: organization!.id,
        name: prospect.name,
        opportunity_type: "customer",
        stage: prospect.daysUntilDue == null ? "ready_for_follow_up" : "follow_up_queued",
        fit_score: 0,
        owner_role: "client",
        source_label: "Desk seed — no outreach",
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
          demo_labeled: false,
          no_outreach_sent: true,
          accepted_for_calling: true,
          owner_approval_required: true,
          no_auto_send: true,
          formatted_address: seedAddress(seed.market),
          primary_type: prospect.primaryType,
          business_status: "OPERATIONAL",
        },
      })),
      ...missingClients.map((wonClient) => ({
        organization_id: organization!.id,
        name: wonClient.name,
        opportunity_type: "customer",
        stage: "won",
        fit_score: 0,
        owner_role: "client",
        source_label: "Closed win — no outreach",
        source_url: `https://example.invalid/trial/${wonClient.seedKey}`,
        contact_name: wonClient.contactName,
        contact_email: wonClient.contactEmail,
        contact_phone: null,
        contact_social: null,
        research_summary: wonClient.researchSummary,
        fit_reason: wonClient.fitReason,
        next_action: wonClient.nextAction,
        next_action_due: null,
        metadata: {
          source: TRIAL_DESK_SEED_KIND,
          trial_seed: true,
          seed_key: wonClient.seedKey,
          demo_labeled: false,
          no_outreach_sent: true,
          accepted_for_calling: true,
          owner_approval_required: true,
          no_auto_send: true,
          closed_win: true,
          formatted_address: seedAddress(seed.market),
          primary_type: wonClient.primaryType,
          business_status: "OPERATIONAL",
        },
      })),
    ];
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

    const acceptedHunterRows = [...missingProspects, ...missingClients].flatMap((row) => {
      const opportunityId = opportunityIdByName.get(row.name);
      if (!opportunityId) return [];
      return [
        {
          organization_id: organization!.id,
          place_id: row.hunterPlaceId,
          name: row.name,
          formatted_address: seedAddress(seed.market),
          google_maps_url: null,
          website_url: null,
          primary_type: row.primaryType,
          business_status: "OPERATIONAL",
          search_query: `${row.name} — ${seedSearchQuery(seed.market)}`,
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
          summary: "Accepted into Prospects. Atlas has not contacted anyone.",
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
            body: "Draft only. Owner reviews and sends. Atlas did not send this.",
          });
          if (followUp.error) throw new Error(followUp.error.message);
        }
      }
    }

    for (const wonClient of missingClients) {
      const opportunityId = opportunityIdByName.get(wonClient.name);
      if (!opportunityId) continue;
      const existingCreated = await client
        .from("organization_opportunity_events")
        .select("id")
        .eq("opportunity_id", opportunityId)
        .eq("event_type", "created");
      if (existingCreated.error) {
        throw new Error(existingCreated.error.message);
      }
      if (((existingCreated.data ?? []) as unknown[]).length === 0) {
        const created = await client.from("organization_opportunity_events").insert({
          opportunity_id: opportunityId,
          organization_id: organization!.id,
          event_type: "created",
          actor_role: "hunter",
          summary: "Accepted into Prospects. Atlas has not contacted anyone.",
          body: wonClient.researchSummary,
        });
        if (created.error) throw new Error(created.error.message);
      }
      const existingWon = await client
        .from("organization_opportunity_events")
        .select("id")
        .eq("opportunity_id", opportunityId)
        .eq("event_type", "won");
      if (existingWon.error) {
        throw new Error(existingWon.error.message);
      }
      if (((existingWon.data ?? []) as unknown[]).length === 0) {
        const won = await client.from("organization_opportunity_events").insert({
          opportunity_id: opportunityId,
          organization_id: organization!.id,
          event_type: "won",
          actor_role: "client",
          summary: "Closed win. Owner marked this booked. Atlas did not contact anyone.",
          body: wonClient.researchSummary,
        });
        if (won.error) throw new Error(won.error.message);
      }
      const existingNote = await client
        .from("organization_opportunity_events")
        .select("id")
        .eq("opportunity_id", opportunityId)
        .eq("event_type", "note_added");
      if (existingNote.error) {
        throw new Error(existingNote.error.message);
      }
      if (((existingNote.data ?? []) as unknown[]).length === 0) {
        const note = await client.from("organization_opportunity_events").insert({
          opportunity_id: opportunityId,
          organization_id: organization!.id,
          event_type: "note_added",
          actor_role: "client",
          summary: wonClient.note,
          body: "Activity note. Owner records the win. Atlas did not contact anyone.",
        });
        if (note.error) throw new Error(note.error.message);
      }
    }
  }

  if (missingMicah.length > 0) {
    const draftDate = isoDateFromToday(0);
    const draftRows = missingMicah.map((item) => ({
      organization_id: organization!.id,
      draft_date: draftDate,
      slot: item.slot,
      campaign: "This week's cards",
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
        day_label: item.dayLabel,
        micah_demeanor: "straight",
        faith_language: false,
        demo_labeled: false,
        company_name: seed.market.businessName,
        instagram_caption: item.instagramCaption,
        linkedin_caption: item.linkedinCaption,
        kingdom_cta: item.callToAction,
        no_live_post: true,
        no_scheduler: true,
        no_atlas_logo: true,
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
            note: "MICAH week pack. Gallery draft only. Atlas did not post this.",
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
    clientCount: seed.clients.length,
    followUpCount: seed.followUps.length,
    micahCount: slots.length,
    wroteProspects: missingProspects.length > 0,
    wroteClients: missingClients.length > 0,
  };
}
