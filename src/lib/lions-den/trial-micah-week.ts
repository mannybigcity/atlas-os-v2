import { MICAH_STARTER_DAYS } from "./micah-starter-week.ts";
import {
  inferTrialDeskMarket,
  trialMarketAreaLabel,
  type TrialDeskMarket,
  type TrialDeskMarketInput,
  type TrialDeskVertical,
} from "./trial-desk-market.ts";

export const TRIAL_MICAH_WEEK_KEY = "trial-seed-week";

export type TrialMicahSeedSlot = {
  day: number;
  weekday: string;
  theme: string;
  dayLabel: string;
  slot: string;
  title: string;
  headline: string;
  supportingText: string;
  caption: string;
  instagramCaption: string;
  linkedinCaption: string;
  callToAction: string;
  imageSvg: string;
};

type VerticalVoice = {
  proof: string;
  tip: string;
  lesson: string;
  throwback: string;
  offer: string;
  neighbor: string;
  rest: string;
  book: string;
  facebook: readonly [string, string, string];
  instagram: readonly [string, string, string, string];
  linkedin: readonly [string, string, string];
};

const VERTICAL_VOICE: Record<TrialDeskVertical, VerticalVoice> = {
  pest: {
    proof: "quiet rooms after a real treatment",
    tip: "don't wait for the second ant trail",
    lesson: "busy is not treated. Treated is quiet",
    throwback: "last summer's nest vs this week's clean eave",
    offer: "same-week pest check",
    neighbor: "the neighbor who texted a swarm instead of a review",
    rest: "bait loaded, Sunday off the ringer",
    book: "book this week's pest check",
    facebook: ["#PestCheck", "#QuietHouse", "#LocalPest"],
    instagram: ["#HoustonHomes", "#PestControl", "#OwnerRun", "#TreatThisWeek"],
    linkedin: ["#HomeService", "#LocalBusiness", "#OwnerOperated"],
  },
  maintenance: {
    proof: "the punch list that actually closed",
    tip: "fix the leak before it becomes a ceiling",
    lesson: "callbacks cost more than doing it once",
    throwback: "the first van vs yesterday's job photos",
    offer: "same-week maintenance visit",
    neighbor: "the property manager who sent the next building",
    rest: "tools staged, Sunday left alone",
    book: "book this week's maintenance window",
    facebook: ["#HomeFix", "#LocalCrew", "#SameWeek"],
    instagram: ["#HandymanLife", "#OwnerRun", "#JobSite", "#FixItRight"],
    linkedin: ["#Facilities", "#LocalContractor", "#ServiceBusiness"],
  },
  hvac: {
    proof: "cool air on the first pass",
    tip: "change the filter before the weekend heat",
    lesson: "a noisy unit is a bill, not a personality",
    throwback: "the attic before vs the install after",
    offer: "same-week cooling check",
    neighbor: "the street that called before the heat wave",
    rest: "filters staged, Sunday off the ladder",
    book: "book this week's HVAC check",
    facebook: ["#CoolingCheck", "#LocalHVAC", "#SameWeek"],
    instagram: ["#AirAndHeat", "#OwnerRun", "#JobSiteReady", "#FilterChange"],
    linkedin: ["#HVAC", "#LocalContractor", "#FieldService"],
  },
  cleaning: {
    proof: "the kitchen that looked rented, then lived-in",
    tip: "clear the sink tonight so tomorrow is faster",
    lesson: "spotless is a system, not a scramble",
    throwback: "move-in day vs this week's reset",
    offer: "same-week deep clean",
    neighbor: "the family who sent the next house on the block",
    rest: "kits packed, Sunday not a shift",
    book: "book this week's clean",
    facebook: ["#DeepClean", "#LocalMaids", "#ThisWeek"],
    instagram: ["#CleanHome", "#OwnerRun", "#ResetDay", "#LocalCrew"],
    linkedin: ["#Janitorial", "#LocalService", "#SmallBusiness"],
  },
  lawn: {
    proof: "edges that make the whole block look finished",
    tip: "mow high in the heat, not scalped",
    lesson: "a yellow lawn is a schedule, not bad luck",
    throwback: "March mud vs this week's sharp edge",
    offer: "same-week lawn visit",
    neighbor: "the HOA board that noticed the corners",
    rest: "blades sharp, Sunday off the mower",
    book: "book this week's lawn visit",
    facebook: ["#LawnCare", "#SharpEdges", "#LocalYards"],
    instagram: ["#YardWork", "#OwnerRun", "#MowDay", "#CurbAppeal"],
    linkedin: ["#Landscaping", "#LocalBusiness", "#OwnerOperated"],
  },
  contractor: {
    proof: "the punch list signed on site",
    tip: "photo the problem before you quote it",
    lesson: "scope creep is unpaid overtime",
    throwback: "demo morning vs walkthrough night",
    offer: "same-week service call",
    neighbor: "the house that sent the next driveway",
    rest: "truck loaded, Sunday not a change order",
    book: "book this week's service call",
    facebook: ["#HomeService", "#LocalTrade", "#ThisWeek"],
    instagram: ["#JobSite", "#OwnerRun", "#TradeWork", "#DoneRight"],
    linkedin: ["#Contractor", "#LocalBusiness", "#FieldTrade"],
  },
  professional: {
    proof: "books that match the bank before tax season",
    tip: "send the receipt the day you spend it",
    lesson: "busy is not booked if the file is a mess",
    throwback: "last year's scramble vs this week's folder",
    offer: "same-week books review",
    neighbor: "the owner who sent the next shop on the street",
    rest: "files closed, Sunday off the inbox",
    book: "book this week's review",
    facebook: ["#LocalBooks", "#OwnerDesk", "#ThisWeek"],
    instagram: ["#SmallBusiness", "#OwnerRun", "#BackOffice", "#BooksInOrder"],
    linkedin: ["#Accounting", "#LocalAdvisor", "#OwnerOperated"],
  },
  retail: {
    proof: "the shelf that actually moved this week",
    tip: "put the bestseller where the door hits first",
    lesson: "foot traffic is not a sale until you ask",
    throwback: "opening week vs this Friday's table",
    offer: "this week's in-store pickup",
    neighbor: "the regular who brought the next neighbor in",
    rest: "stock faced, Sunday not a restock shift",
    book: "stop in this week for the featured item",
    facebook: ["#ShopLocal", "#ThisWeek", "#MainStreet"],
    instagram: ["#LocalShop", "#OwnerRun", "#PickupToday", "#NeighborhoodStore"],
    linkedin: ["#Retail", "#SmallBusiness", "#LocalShop"],
  },
  other: {
    proof: "the job you can show, not just describe",
    tip: "name the next step in the first line",
    lesson: "busy is not booked",
    throwback: "first week vs yesterday's work",
    offer: "this week's featured service",
    neighbor: "the customer who sent the next one",
    rest: "Monday loaded, Sunday off the ringer",
    book: "call to book this week",
    facebook: ["#LocalBusiness", "#ThisWeek", "#OwnerRun"],
    instagram: ["#MainStreet", "#NeighborhoodShop", "#BookThisWeek", "#LocalOwner"],
    linkedin: ["#SmallBusiness", "#LocalService", "#OwnerOperated"],
  },
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clip(value: string, max: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function cityHashtag(city: string) {
  const compact = city.replace(/[^A-Za-z0-9]+/g, "");
  return compact ? `#${compact.slice(0, 24)}` : "#LocalShop";
}

export function trialMicahAudiencePrefill(market: TrialDeskMarket) {
  const area = trialMarketAreaLabel(market);
  return `Neighbors in ${area} who need ${market.serviceQuery} and should call or book this week.`;
}

export function trialMicahOfferPrefill(market: TrialDeskMarket) {
  const area = trialMarketAreaLabel(market);
  const voice = VERTICAL_VOICE[market.vertical];
  return `${voice.offer[0].toUpperCase()}${voice.offer.slice(1)} for ${area}.`;
}

export function trialMicahBrandPrefill(market: TrialDeskMarket) {
  if (!market.city.trim()) {
    return {
      organizationName: market.businessName,
      city: "",
      audience: "",
      weeklyOffer: "",
    };
  }
  return {
    organizationName: market.businessName,
    city: market.city,
    audience: trialMicahAudiencePrefill(market),
    weeklyOffer: trialMicahOfferPrefill(market),
  };
}

function trialMicahCardSvg(input: {
  dayLabel: string;
  headline: string;
  supportingText: string;
  shopLine: string;
}) {
  const dayLabel = escapeXml(clip(input.dayLabel, 40));
  const headline = escapeXml(clip(input.headline, 72));
  const supporting = escapeXml(clip(input.supportingText, 90));
  const shopLine = escapeXml(clip(input.shopLine, 48));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><rect x="48" y="48" width="984" height="984" fill="none" stroke="#f5b932" stroke-width="10"/><rect x="72" y="72" width="936" height="936" fill="none" stroke="#f5b932" stroke-width="2"/><text x="540" y="160" fill="#f5b932" font-size="26" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="4">${dayLabel}</text><text x="540" y="250" fill="#fff8e6" font-size="22" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="3">SAMPLE DRAFT</text><text x="540" y="430" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif" text-anchor="middle">${shopLine}</text><text x="540" y="560" fill="#ffffff" font-size="48" font-family="Georgia,Times,serif" font-weight="700" text-anchor="middle">${headline}</text><text x="540" y="660" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif" text-anchor="middle">${supporting}</text><text x="540" y="980" fill="#f5b932" font-size="22" font-family="Arial,sans-serif" text-anchor="middle">DRAFT — download and post yourself. Not published.</text></svg>`;
}

function captionBlocks(input: {
  sampleLine: string;
  hook: string;
  payoff: string;
  cta: string;
  hashtags: readonly string[];
}) {
  return [input.sampleLine, input.hook, input.payoff, input.cta, input.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");
}

export function getTrialMicahSeedSlots(marketInput: TrialDeskMarketInput = {}): TrialMicahSeedSlot[] {
  const market = inferTrialDeskMarket(marketInput);
  const area = trialMarketAreaLabel(market);
  const voice = VERTICAL_VOICE[market.vertical];
  const who = market.businessName.trim() || "this shop";
  const city = market.city.trim() || "town";
  const shopLine = clip(who, 48);
  const sampleLine = `SAMPLE draft for ${who} in ${area}. Atlas did not post this. Download and post it yourself.`;
  const cityTag = cityHashtag(market.city);
  const facebook = [...voice.facebook.slice(0, 2), cityTag === voice.facebook[0] ? "#ThisWeek" : cityTag].slice(0, 3);
  const instagram = voice.instagram;
  const linkedin = voice.linkedin;

  const days: Array<{ headline: string; supporting: string; hook: string; payoff: string; cta: string }> = [
    {
      headline: `Win Monday with ${voice.offer}`,
      supporting: `${voice.proof}. Copy and post it yourself.`,
      hook: `Monday in ${city} is won before 9am.`,
      payoff: `${who} puts ${voice.proof} on the calendar — not a quote graphic.`,
      cta: `Call to ${voice.book}.`,
    },
    {
      headline: clip(`${voice.tip[0].toUpperCase()}${voice.tip.slice(1)}`, 72),
      supporting: "One tip. One screenshot. Then they call.",
      hook: `Tip Tuesday from ${who}.`,
      payoff: `${voice.tip[0].toUpperCase()}${voice.tip.slice(1)}. That is the whole post.`,
      cta: `Save this, then ${voice.book}.`,
    },
    {
      headline: clip(`${voice.lesson[0].toUpperCase()}${voice.lesson.slice(1)}`, 72),
      supporting: "The expensive lesson, given away midweek.",
      hook: `Midweek truth for ${city} owners.`,
      payoff: `${voice.lesson}. ${who} already paid for that scar.`,
      cta: `If that is you this week, ${voice.book}.`,
    },
    {
      headline: clip(`${voice.throwback[0].toUpperCase()}${voice.throwback.slice(1)}`, 72),
      supporting: "Proof, not nostalgia.",
      hook: `Throwback is a before/after, not a memory.`,
      payoff: `${voice.throwback}. ${who} still works this zip code.`,
      cta: `Want that result? ${voice.book[0].toUpperCase()}${voice.book.slice(1)}.`,
    },
    {
      headline: clip(`${voice.offer[0].toUpperCase()}${voice.offer.slice(1)}`, 72),
      supporting: "Name the offer. Name the next 48 hours.",
      hook: `Friday traffic is impulse. ${who} made the ask clear.`,
      payoff: `${voice.offer} in ${area} — this week, not “sometime.”`,
      cta: `Call today to ${voice.book}.`,
    },
    {
      headline: clip(`Thank ${voice.neighbor}`, 72),
      supporting: "Local pride, then one soft ask.",
      hook: `Saturday in ${city} is faces, not funnels.`,
      payoff: `${who} shouts out ${voice.neighbor}.`,
      cta: `Need the same help? ${voice.book[0].toUpperCase()}${voice.book.slice(1)}.`,
    },
    {
      headline: clip(`${voice.rest[0].toUpperCase()}${voice.rest.slice(1)}`, 72),
      supporting: "Shut it down tonight. Load Monday.",
      hook: `Sunday is reset, not another shift.`,
      payoff: `${who} closes with ${voice.rest}.`,
      cta: `When Monday opens, ${voice.book}.`,
    },
  ];

  return MICAH_STARTER_DAYS.map((item, index) => {
    const copy = days[index]!;
    const slot = `${TRIAL_MICAH_WEEK_KEY}-d${item.day}`;
    const dayLabel = `DAY ${item.day} · ${item.theme.toUpperCase()}`;
    const title = clip(`SAMPLE · Day ${item.day} · ${item.weekday} · ${copy.headline}`, 160);
    const caption = captionBlocks({
      sampleLine,
      hook: copy.hook,
      payoff: copy.payoff,
      cta: copy.cta,
      hashtags: facebook,
    });
    const instagramCaption = captionBlocks({
      sampleLine,
      hook: copy.hook,
      payoff: copy.payoff,
      cta: copy.cta,
      hashtags: instagram,
    });
    const linkedinCaption = captionBlocks({
      sampleLine,
      hook: copy.hook,
      payoff: copy.payoff,
      cta: copy.cta,
      hashtags: linkedin,
    });
    return {
      day: item.day,
      weekday: item.weekday,
      theme: item.theme,
      dayLabel,
      slot,
      title,
      headline: clip(copy.headline, 120),
      supportingText: clip(copy.supporting, 240),
      caption,
      instagramCaption,
      linkedinCaption,
      callToAction: clip(copy.cta, 240),
      imageSvg: trialMicahCardSvg({
        dayLabel,
        headline: copy.headline,
        supportingText: copy.supporting,
        shopLine,
      }),
    };
  });
}

export function trialMicahSeedSlots(marketInput: TrialDeskMarketInput = {}) {
  return getTrialMicahSeedSlots(marketInput).map((item) => item.slot);
}
