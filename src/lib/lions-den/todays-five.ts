import { deskDayKey } from "../desk-time.ts";
import type { OrganizationOpportunity } from "../../server/opportunities/queries.ts";
import { prospectBelongsOnCallsToMake } from "./calls-to-make.ts";
import {
  isMissingWebsite,
  isSocialWebsiteUrl,
} from "../../server/hunter/filters.ts";
import { prospectPlacesCard } from "./prospect-places.ts";
import { isTrialSampleOpportunity } from "./trial-samples.ts";

/**
 * Morning shortlist for the AFE desk.
 *
 * Hypothesis: a business Google lists with no standalone site (or only a
 * social profile as its "website") is still reachable by phone. Places does
 * not return Facebook / Instagram / TikTok fields, so "no social" means we
 * cannot see a social profile — either the website is blank, or Hunter.io
 * (when configured) reports none. A thin listing has no standalone site and
 * no email. A stale listing has been sitting uncalled, or Google marks it
 * temporarily closed.
 *
 * Already-contacted rows stay on Calls to make's exclusion rule. Permanently
 * closed listings are skipped. Nothing here dials or emails.
 */
export const TODAYS_FIVE_LIMIT = 5;
export const TODAYS_FIVE_PLACES_LOOKUP_CAP = 8;
export const TODAYS_FIVE_STALE_DAYS = 21;
export const TODAYS_FIVE_CACHE_VERSION = 1;

export const TODAYS_FIVE_REASONS = [
  "no_website",
  "no_social",
  "weak_social",
  "thin_footprint",
  "stale_listing",
] as const;

export type TodaysFiveReason = (typeof TODAYS_FIVE_REASONS)[number];

const REASON_WEIGHT: Record<TodaysFiveReason, number> = {
  no_website: 40,
  no_social: 24,
  weak_social: 18,
  thin_footprint: 12,
  stale_listing: 8,
};

export type TodaysFiveRow = {
  id: string;
  name: string;
  phone: string;
  phoneHref: string;
  reasons: TodaysFiveReason[];
  score: number;
  hunterEmail: string | null;
};

export type TodaysFiveCache = {
  version: typeof TODAYS_FIVE_CACHE_VERSION;
  deskDate: string;
  rows: TodaysFiveRow[];
  poolSize: number;
  queueSize: number;
  placesChecked: boolean;
  hunterChecked: boolean;
};

export type TodaysFiveDesk = TodaysFiveCache & {
  loggedOff: number;
  skippedSamples: number;
};

export type PlaceFootprint = {
  websiteUrl: string | null;
  /** False when the Places response omitted website (Pro field mask). */
  websiteKnown: boolean;
  businessStatus: string | null;
};

export type TodaysFiveHunterEnrichment = {
  email: string | null;
  hasSocialProfile: boolean | null;
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const REASON_LABELS: Record<TodaysFiveReason, [string, string]> = {
  no_website: ["No website", "Sin sitio web"],
  no_social: ["No social", "Sin redes"],
  weak_social: ["Weak social", "Redes débiles"],
  thin_footprint: ["Thin listing", "Huella escasa"],
  stale_listing: ["Stale listing", "Ficha vieja"],
};

export function formatTodaysFiveReason(reason: TodaysFiveReason, spanish = false) {
  const pair = REASON_LABELS[reason];
  return spanish ? pair[1] : pair[0];
}

export function daysBetweenDeskDates(earlier: string, later: string) {
  const left = DATE_ONLY.exec(earlier);
  const right = DATE_ONLY.exec(later);
  if (!left || !right) return null;
  const from = Date.UTC(Number(left[1]), Number(left[2]) - 1, Number(left[3]));
  const to = Date.UTC(Number(right[1]), Number(right[2]) - 1, Number(right[3]));
  return Math.round((to - from) / 86_400_000);
}

function statusOf(prospect: OrganizationOpportunity) {
  return String(prospect.metadata?.business_status ?? "").trim().toUpperCase();
}

function websiteOf(prospect: OrganizationOpportunity) {
  return prospectPlacesCard(prospect).website;
}

export function standaloneWebsiteDomain(websiteUrl: string | null | undefined) {
  const text = websiteUrl?.trim();
  if (!text || isMissingWebsite({ websiteUrl: text }) || isSocialWebsiteUrl(text)) return null;
  try {
    return new URL(text).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Enterprise Places details include phone and website together. A Pro-only
 * fallback omits both, so a null website is not proof the listing has none.
 */
export function placeFootprintFromDetails(
  place: {
    websiteUrl?: string | null;
    nationalPhoneNumber?: string | null;
    internationalPhoneNumber?: string | null;
    businessStatus?: string | null;
  } | null,
): PlaceFootprint | null {
  if (!place) return null;
  const publishedPhone = Boolean(
    place.nationalPhoneNumber?.trim() || place.internationalPhoneNumber?.trim(),
  );
  return {
    websiteUrl: place.websiteUrl?.trim() || null,
    websiteKnown: Boolean(place.websiteUrl?.trim()) || publishedPhone,
    businessStatus: place.businessStatus?.trim() || null,
  };
}

export function mergePlaceFootprint(
  prospect: OrganizationOpportunity,
  footprint: PlaceFootprint | null,
): OrganizationOpportunity {
  if (!footprint) return prospect;
  const currentWebsite = websiteOf(prospect);
  const websiteUrl = footprint.websiteKnown ? footprint.websiteUrl : currentWebsite;
  const businessStatus = footprint.businessStatus ?? (statusOf(prospect) || null);
  if (websiteUrl === currentWebsite && (businessStatus ?? "") === statusOf(prospect)) {
    return prospect;
  }
  return {
    ...prospect,
    contactSocial: websiteUrl,
    metadata: {
      ...prospect.metadata,
      website_url: websiteUrl,
      business_status: businessStatus,
    },
  };
}

function reasonsFor(prospect: OrganizationOpportunity, deskDate: string, timeZone?: string): TodaysFiveReason[] {
  const websiteUrl = websiteOf(prospect);
  const missingWebsite = isMissingWebsite({ websiteUrl });
  const socialOnly = !missingWebsite && isSocialWebsiteUrl(websiteUrl);
  const standalone = !missingWebsite && !socialOnly;
  const reasons: TodaysFiveReason[] = [];
  if (missingWebsite) {
    reasons.push("no_website");
    reasons.push("no_social");
  } else if (socialOnly) {
    reasons.push("weak_social");
  }
  if (!standalone && !prospect.contactEmail?.trim()) reasons.push("thin_footprint");

  const created = deskDayKey(prospect.createdAt, timeZone);
  const age = created ? daysBetweenDeskDates(created, deskDate) : null;
  const sitting = age != null && age >= TODAYS_FIVE_STALE_DAYS && !standalone;
  if (statusOf(prospect) === "CLOSED_TEMPORARILY" || sitting) reasons.push("stale_listing");
  return reasons;
}

function scoreReasons(reasons: TodaysFiveReason[]) {
  return reasons.reduce((sum, reason) => sum + REASON_WEIGHT[reason], 0);
}

type Ranked = {
  prospect: OrganizationOpportunity;
  row: TodaysFiveRow;
  placeId: string | null;
  websiteUrl: string | null;
};

function onMorningQueue(prospect: OrganizationOpportunity) {
  if (isTrialSampleOpportunity(prospect)) return false;
  if (!prospectBelongsOnCallsToMake(prospect)) return false;
  if (statusOf(prospect) === "CLOSED_PERMANENTLY") return false;
  return true;
}

function rankOne(prospect: OrganizationOpportunity, deskDate: string, timeZone?: string): Ranked | null {
  if (!onMorningQueue(prospect)) return null;
  const reasons = reasonsFor(prospect, deskDate, timeZone);
  if (reasons.length === 0) return null;
  const card = prospectPlacesCard(prospect);
  if (!card.phone || !card.phoneHref) return null;
  return {
    prospect,
    placeId: card.placeId,
    websiteUrl: card.website,
    row: {
      id: prospect.id,
      name: prospect.name,
      phone: card.phone,
      phoneHref: card.phoneHref,
      reasons,
      score: scoreReasons(reasons),
      hunterEmail: null,
    },
  };
}

function compareRanked(left: Ranked, right: Ranked) {
  if (right.row.score !== left.row.score) return right.row.score - left.row.score;
  const created = left.prospect.createdAt.localeCompare(right.prospect.createdAt);
  if (created !== 0) return created;
  const name = left.prospect.name.localeCompare(right.prospect.name);
  if (name !== 0) return name;
  return left.prospect.id.localeCompare(right.prospect.id);
}

export function rankTodaysFiveProspects(
  prospects: OrganizationOpportunity[],
  deskDate: string,
  timeZone?: string,
) {
  const queueSize = prospects.filter(onMorningQueue).length;
  const ranked = prospects
    .map((prospect) => rankOne(prospect, deskDate, timeZone))
    .filter((item): item is Ranked => item !== null)
    .sort(compareRanked);
  return { queueSize, ranked };
}

function isReason(value: unknown): value is TodaysFiveReason {
  return (TODAYS_FIVE_REASONS as readonly string[]).includes(String(value));
}

function parseRow(value: unknown): TodaysFiveRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const phone = typeof row.phone === "string" ? row.phone.trim() : "";
  const phoneHref = typeof row.phoneHref === "string" ? row.phoneHref.trim() : "";
  if (!id || !name || !phone || !phoneHref.startsWith("tel:")) return null;
  if (!Array.isArray(row.reasons) || typeof row.score !== "number") return null;
  const reasons = row.reasons.filter(isReason);
  if (reasons.length === 0) return null;
  const hunterEmail = typeof row.hunterEmail === "string" && row.hunterEmail.includes("@")
    ? row.hunterEmail.trim().toLowerCase()
    : null;
  return { id, name, phone, phoneHref, reasons, score: row.score, hunterEmail };
}

export function parseTodaysFiveCache(value: unknown): TodaysFiveCache | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const cache = value as Record<string, unknown>;
  if (cache.version !== TODAYS_FIVE_CACHE_VERSION) return null;
  if (typeof cache.deskDate !== "string" || !DATE_ONLY.test(cache.deskDate)) return null;
  if (!Array.isArray(cache.rows) || typeof cache.poolSize !== "number" || typeof cache.queueSize !== "number") {
    return null;
  }
  const rows = cache.rows.map(parseRow).filter((row): row is TodaysFiveRow => row !== null);
  return {
    version: TODAYS_FIVE_CACHE_VERSION,
    deskDate: cache.deskDate,
    rows,
    poolSize: cache.poolSize,
    queueSize: cache.queueSize,
    placesChecked: cache.placesChecked === true,
    hunterChecked: cache.hunterChecked === true,
  };
}

export function todaysFiveCacheIsCurrent(cache: TodaysFiveCache | null, deskDate: string) {
  return Boolean(cache && cache.deskDate === deskDate);
}

function applyHunter(row: TodaysFiveRow, enrichment: TodaysFiveHunterEnrichment | null) {
  if (!enrichment) return row;
  const reasons = [...row.reasons];
  if (
    enrichment.hasSocialProfile === false &&
    !reasons.includes("no_social") &&
    !reasons.includes("weak_social")
  ) {
    reasons.push("no_social");
  }
  const email = enrichment.email?.trim().toLowerCase() || null;
  return {
    ...row,
    reasons,
    score: scoreReasons(reasons),
    hunterEmail: email && email.includes("@") ? email : row.hunterEmail,
  };
}

export async function assembleTodaysFive(input: {
  prospects: OrganizationOpportunity[];
  deskDate: string;
  cached: TodaysFiveCache | null;
  timeZone?: string;
  lookupPlace?: (placeId: string) => Promise<PlaceFootprint | null>;
  enrichDomain?: (domain: string) => Promise<TodaysFiveHunterEnrichment | null>;
}): Promise<{ snapshot: TodaysFiveCache; reusedCache: boolean; placeLookups: number; hunterLookups: number }> {
  if (todaysFiveCacheIsCurrent(input.cached, input.deskDate)) {
    return {
      snapshot: input.cached as TodaysFiveCache,
      reusedCache: true,
      placeLookups: 0,
      hunterLookups: 0,
    };
  }

  const first = rankTodaysFiveProspects(input.prospects, input.deskDate, input.timeZone);
  const overrides = new Map<string, OrganizationOpportunity>();
  let placeLookups = 0;
  let placesChecked = false;
  if (input.lookupPlace) {
    const lookupPlace = input.lookupPlace;
    const targets: Array<{ id: string; placeId: string }> = [];
    for (const item of first.ranked) {
      if (targets.length >= TODAYS_FIVE_PLACES_LOOKUP_CAP) break;
      if (item.placeId) targets.push({ id: item.prospect.id, placeId: item.placeId });
    }
    let nextTarget = 0;
    async function lookupWorker() {
      while (nextTarget < targets.length) {
        const target = targets[nextTarget];
        nextTarget += 1;
        if (!target) break;
        placeLookups += 1;
        try {
          const footprint = await lookupPlace(target.placeId);
          placesChecked = true;
          const original = input.prospects.find((prospect) => prospect.id === target.id);
          if (original && footprint) overrides.set(target.id, mergePlaceFootprint(original, footprint));
        } catch {
          // One listing failing does not sink the morning list.
        }
      }
    }
    const workers = Math.min(4, targets.length);
    if (workers > 0) await Promise.all(Array.from({ length: workers }, () => lookupWorker()));
  }

  const merged = input.prospects.map((prospect) => overrides.get(prospect.id) ?? prospect);
  const second = rankTodaysFiveProspects(merged, input.deskDate, input.timeZone);
  let rows = second.ranked.slice(0, TODAYS_FIVE_LIMIT).map((item) => item.row);
  let hunterLookups = 0;
  let hunterChecked = false;
  if (input.enrichDomain) {
    const next: TodaysFiveRow[] = [];
    for (const item of second.ranked.slice(0, TODAYS_FIVE_LIMIT)) {
      const domain = standaloneWebsiteDomain(item.websiteUrl);
      if (!domain) {
        next.push(item.row);
        continue;
      }
      hunterLookups += 1;
      try {
        const enrichment = await input.enrichDomain(domain);
        if (enrichment) hunterChecked = true;
        next.push(applyHunter(item.row, enrichment));
      } catch {
        next.push(item.row);
      }
    }
    rows = next;
  }

  return {
    reusedCache: false,
    placeLookups,
    hunterLookups,
    snapshot: {
      version: TODAYS_FIVE_CACHE_VERSION,
      deskDate: input.deskDate,
      rows,
      poolSize: second.ranked.length,
      queueSize: second.queueSize,
      placesChecked,
      hunterChecked,
    },
  };
}

export function presentTodaysFive(
  snapshot: TodaysFiveCache,
  prospects: OrganizationOpportunity[],
): TodaysFiveDesk {
  const byId = new Map(prospects.map((prospect) => [prospect.id, prospect]));
  const rows: TodaysFiveRow[] = [];
  let loggedOff = 0;
  for (const row of snapshot.rows) {
    const prospect = byId.get(row.id);
    if (!prospect || !prospectBelongsOnCallsToMake(prospect) || isTrialSampleOpportunity(prospect)) {
      loggedOff += 1;
      continue;
    }
    const card = prospectPlacesCard(prospect);
    if (!card.phone || !card.phoneHref) {
      loggedOff += 1;
      continue;
    }
    rows.push({
      ...row,
      name: prospect.name,
      phone: card.phone,
      phoneHref: card.phoneHref,
    });
  }
  const skippedSamples = prospects.filter(
    (prospect) => isTrialSampleOpportunity(prospect) && prospectBelongsOnCallsToMake(prospect),
  ).length;
  return { ...snapshot, rows, loggedOff, skippedSamples };
}

export function todaysFiveNotes(input: {
  rowCount: number;
  poolSize: number;
  queueSize: number;
  loggedOff: number;
  skippedSamples?: number;
  placesChecked: boolean;
  hunterChecked: boolean;
  spanish: boolean;
}) {
  const spanish = input.spanish;
  const skippedSamples = input.skippedSamples ?? 0;
  let situation: string;
  if (input.rowCount === 0 && input.loggedOff > 0) {
    situation = spanish
      ? "Los de esta mañana ya quedaron registrados. Los próximos cinco salen mañana para no repetir Places."
      : "This morning’s list is already logged. The next five waits until tomorrow so Places runs once.";
  } else if (input.rowCount === 0 && input.queueSize === 0 && skippedSamples > 0) {
    situation = spanish
      ? "Los ejemplos no entran en Los 5 de hoy. Bórralos o acepta un hallazgo real de HUNTER con teléfono."
      : "Sample records stay off Today’s 5. Clear them, or accept a real HUNTER find that has a phone.";
  } else if (input.rowCount === 0 && input.queueSize === 0) {
    situation = spanish
      ? "Nadie por llamar con teléfono. Los 5 de hoy aparecen cuando Llamadas por hacer tenga a quién marcar."
      : "No uncalled prospects with a phone yet. Today’s 5 appears when Calls to make has someone to dial.";
  } else if (input.rowCount === 0) {
    situation = spanish
      ? "Los que faltan por llamar ya tienen sitio web. Los 5 de hoy esperan una ficha más delgada."
      : "Uncalled prospects already have a website. Today’s 5 waits for a thinner listing.";
  } else if (input.loggedOff > 0 && input.rowCount < TODAYS_FIVE_LIMIT) {
    situation = spanish
      ? `${input.loggedOff} de esta mañana ya salieron de Llamadas por hacer. Los reemplazos esperan hasta mañana.`
      : `${input.loggedOff} from this morning already left Calls to make. Replacements wait until tomorrow.`;
  } else if (input.rowCount < TODAYS_FIVE_LIMIT) {
    const count = input.poolSize;
    situation = spanish
      ? `Solo hay ${count} prospecto${count === 1 ? "" : "s"} fácil${count === 1 ? "" : "es"} de alcanzar por teléfono esta mañana.`
      : `Only ${count} phone-reachable prospect${count === 1 ? "" : "s"} this morning.`;
  } else {
    situation = spanish
      ? "Cinco para esta mañana. La lista no se vuelve a armar hasta mañana."
      : "Five for this morning. The list stays put until tomorrow.";
  }

  const footnotes = [
    input.placesChecked
      ? spanish
        ? "Google Places revisó sitio y redes esta mañana."
        : "Google Places checked website and social gaps this morning."
      : spanish
        ? "Ordenado con la ficha del prospecto. Google Places no se consultó esta mañana."
        : "Ranked from the prospect card. Google Places was not checked this morning.",
    input.hunterChecked
      ? spanish
        ? "Hunter buscó un correo público donde había sitio web. No se envió nada."
        : "Hunter looked for a public email where a real website was listed. Nothing was sent."
      : null,
    spanish
      ? "Tú marcas. Atlas no llama, no escribe y no manda SMS."
      : "You dial. Atlas does not call, email, or text.",
  ].filter((line): line is string => Boolean(line));

  return { situation, footnotes };
}
