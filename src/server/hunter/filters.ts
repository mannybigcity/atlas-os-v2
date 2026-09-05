export type HunterSearchFilters = {
  missingWebsite: boolean;
  weakSocial: boolean;
};

export const emptyHunterSearchFilters: HunterSearchFilters = {
  missingWebsite: false,
  weakSocial: false,
};

/**
 * Hosts Places sometimes returns as websiteUri when the business has no
 * standalone site. Places has no Facebook / Instagram / TikTok fields.
 */
export const HUNTER_SOCIAL_WEBSITE_HOSTS = [
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "instagr.am",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "threads.net",
] as const;

export function hunterFiltersActive(filters: HunterSearchFilters) {
  return filters.missingWebsite || filters.weakSocial;
}

function isChecked(value: FormDataEntryValue | null) {
  if (value == null) return false;
  const text = String(value).trim().toLowerCase();
  return text === "on" || text === "yes" || text === "true" || text === "1";
}

export function parseHunterSearchFilters(formData: FormData): HunterSearchFilters {
  return {
    missingWebsite: isChecked(formData.get("missingWebsite")),
    weakSocial: isChecked(formData.get("weakSocial")),
  };
}

export function isMissingWebsite(place: { websiteUrl?: string | null }) {
  return !place.websiteUrl?.trim();
}

function hostnameFromWebsite(websiteUrl: string | null | undefined) {
  const text = websiteUrl?.trim();
  if (!text) return null;
  try {
    return new URL(text).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isSocialWebsiteUrl(websiteUrl: string | null | undefined) {
  const host = hostnameFromWebsite(websiteUrl);
  if (!host) return false;
  return HUNTER_SOCIAL_WEBSITE_HOSTS.some(
    (social) => host === social || host.endsWith(`.${social}`),
  );
}

export function isMissingOrWeakSocial(place: { websiteUrl?: string | null }) {
  return isMissingWebsite(place) || isSocialWebsiteUrl(place.websiteUrl);
}

export function placeMatchesHunterFilters(
  place: { websiteUrl?: string | null },
  filters: HunterSearchFilters,
) {
  if (!hunterFiltersActive(filters)) return true;
  // Selected filters are a union of gap types. Checking both does not hide
  // Facebook-only listings that "No website" alone would exclude.
  if (filters.missingWebsite && isMissingWebsite(place)) return true;
  if (filters.weakSocial && isMissingOrWeakSocial(place)) return true;
  return false;
}

export function applyHunterSearchFilters<T extends { websiteUrl?: string | null }>(
  places: T[],
  filters: HunterSearchFilters,
): T[] {
  if (!hunterFiltersActive(filters)) return places;
  return places.filter((place) => placeMatchesHunterFilters(place, filters));
}

export type HunterGapLabel = "no_website" | "social_only";

export function hunterGapLabels(place: { websiteUrl?: string | null }): HunterGapLabel[] {
  if (isMissingWebsite(place)) return ["no_website"];
  if (isSocialWebsiteUrl(place.websiteUrl)) return ["social_only"];
  return [];
}

export function formatHunterGapLabel(label: HunterGapLabel, spanish: boolean) {
  if (label === "no_website") return spanish ? "Sin sitio web" : "No website";
  return spanish ? "Solo redes" : "Social page only";
}

export function hunterFilterWords(filters: HunterSearchFilters, spanish = false) {
  const words = [
    filters.missingWebsite ? (spanish ? "sin sitio web" : "no website") : null,
    filters.weakSocial ? (spanish ? "redes débiles" : "weak social") : null,
  ].filter((word): word is string => Boolean(word));
  return words.join(spanish ? " / " : " / ");
}

export function formatHunterSearchCountMessage(input: {
  rawCount: number;
  keptCount: number;
  filters: HunterSearchFilters;
}) {
  const resultWord = input.keptCount === 1 ? "result" : "results";
  if (!hunterFiltersActive(input.filters) || input.rawCount === input.keptCount) {
    return `${input.keptCount} Google Maps ${resultWord}.`;
  }

  const labels = hunterFilterWords(input.filters);
  if (input.keptCount === 0) {
    const listingWord = input.rawCount === 1 ? "listing" : "listings";
    return `Google Maps returned ${input.rawCount} ${listingWord}. None matched ${labels}. Atlas can only see the website Google lists — it does not receive Facebook or Instagram fields, and it does not invent a website or phone. Turn the filters off to see the full list.`;
  }

  return `${input.keptCount} Google Maps ${resultWord}, narrowed from ${input.rawCount} (${labels}).`;
}
