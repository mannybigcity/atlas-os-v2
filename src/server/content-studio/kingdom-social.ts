const BANNED_VOICE =
  /\b(synerg(?:y|ize|istic)|thought[-\s]?leaders?|hustle(?:[-\s]?bro)?|grindset|rise and grind|grind|10x|crush it|level up|lock in|boss babe|girlboss|value bomb|building in public|personal brand|disrupt(?:ion|or)?s?|game[-\s]?changers?|content creators?|influencers?|no days off|blotato|blacktwist|auto[-\s]?posts?)\b/i;

const AUTO_POST =
  /\b(auto[-\s]?post|schedule this post|queue this post|blotato|blacktwist)\b/i;

export function extractHashtags(text: string) {
  return [...text.matchAll(/#[A-Za-z0-9_]+/g)].map((match) => match[0]);
}

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "").toLowerCase();
}

export function sameHashtagSet(left: string[], right: string[]) {
  const a = [...new Set(left.map(normalizeTag))].sort().join(",");
  const b = [...new Set(right.map(normalizeTag))].sort().join(",");
  return a.length > 0 && a === b;
}

export function assembleKingdomCaption(input: {
  hook: string;
  payoff: string;
  cta: string;
  hashtags: string[];
  demoLabel?: string | null;
}) {
  const blocks = [
    input.demoLabel?.trim() || null,
    input.hook.trim(),
    input.payoff.trim(),
    input.cta.trim(),
    input.hashtags.join(" ").trim(),
  ].filter((block): block is string => Boolean(block));
  return blocks.join("\n\n");
}

export function captionBodyBlocks(caption: string) {
  const blocks = caption
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const textBlocks = blocks.filter((block) => !/^#/.test(block));
  if (textBlocks[0] && /^DEMO\b/i.test(textBlocks[0])) {
    textBlocks.shift();
  }
  return textBlocks;
}

export type KingdomGrade = {
  pass: boolean;
  score: number;
  reasons: string[];
  facebookHashtags: string[];
  instagramHashtags: string[];
  linkedinHashtags: string[];
};

function gradeHashtagCount(
  label: string,
  tags: string[],
  min: number,
  max: number,
  reasons: string[],
) {
  if (tags.length < min || tags.length > max) {
    reasons.push(`${label} needs ${min}–${max} hashtags.`);
  }
}

export function gradeKingdomCaption(input: {
  caption: string;
  instagramCaption?: string | null;
  linkedinCaption?: string | null;
  demoLabeled?: boolean;
}): KingdomGrade {
  const reasons: string[] = [];
  const facebookHashtags = extractHashtags(input.caption);
  const instagramHashtags = extractHashtags(input.instagramCaption ?? "");
  const linkedinHashtags = extractHashtags(input.linkedinCaption ?? "");
  const body = captionBodyBlocks(input.caption);

  if (body.length !== 3) {
    reasons.push("Caption must be hook, payoff, then one CTA.");
  }
  if (input.demoLabeled && !/\bDEMO\b/.test(input.caption)) {
    reasons.push("DEMO drafts must keep the DEMO label.");
  }
  if (BANNED_VOICE.test(input.caption) || BANNED_VOICE.test(input.instagramCaption ?? "") || BANNED_VOICE.test(input.linkedinCaption ?? "")) {
    reasons.push("Drop synergy, thought-leader, hustle-bro, and generic creator voice.");
  }
  if (AUTO_POST.test(input.caption) || AUTO_POST.test(input.instagramCaption ?? "") || AUTO_POST.test(input.linkedinCaption ?? "")) {
    reasons.push("Nothing auto-posts. No scheduler, Blotato, or BlackTwist.");
  }

  gradeHashtagCount("Facebook", facebookHashtags, 1, 3, reasons);
  if (input.instagramCaption) {
    gradeHashtagCount("Instagram", instagramHashtags, 3, 5, reasons);
    if (sameHashtagSet(facebookHashtags, instagramHashtags)) {
      reasons.push("Instagram cannot clone the Facebook hashtag set.");
    }
  }
  if (input.linkedinCaption) {
    gradeHashtagCount("LinkedIn", linkedinHashtags, 3, 5, reasons);
    if (sameHashtagSet(facebookHashtags, linkedinHashtags)) {
      reasons.push("LinkedIn cannot clone the Facebook hashtag set.");
    }
    if (input.instagramCaption && sameHashtagSet(instagramHashtags, linkedinHashtags)) {
      reasons.push("LinkedIn cannot clone the Instagram hashtag set.");
    }
  }

  const score = Math.max(0, 100 - reasons.length * 20);
  return {
    pass: reasons.length === 0,
    score,
    reasons,
    facebookHashtags,
    instagramHashtags,
    linkedinHashtags,
  };
}

export function gradeKingdomWeek(
  cards: Array<{
    day: number;
    caption: string;
    instagramCaption?: string | null;
    linkedinCaption?: string | null;
    demoLabeled?: boolean;
  }>,
) {
  const failedDays: number[] = [];
  const reasons: string[] = [];
  for (const card of cards) {
    const grade = gradeKingdomCaption(card);
    if (!grade.pass) {
      failedDays.push(card.day);
      reasons.push(`Day ${card.day}: ${grade.reasons.join(" ")}`);
    }
  }
  return {
    pass: failedDays.length === 0 && cards.length === 7,
    failedDays,
    reasons,
  };
}

const FACEBOOK_TAGS = [
  ["#CrewHats", "#ABCPlumbing"],
  ["#TastingNight", "#Catering123"],
  ["#SameWeek", "#XYZElectric"],
  ["#ShopPride", "#LocalPlumber"],
  ["#FishFryFriday", "#LocalCatering"],
  ["#InstallDay", "#LocalElectric"],
  ["#WeekWrap", "#LocalDesk"],
] as const;

const INSTAGRAM_TAGS = [
  ["#HoustonTrades", "#Workwear", "#LocalCrew", "#ShopFloor"],
  ["#FridaySupper", "#NeighborhoodTable", "#TasteTest", "#CateringNight"],
  ["#FieldService", "#WireWork", "#JobSiteReady", "#LocalElectrician"],
  ["#CrewWeek", "#ShopReady", "#PipeWork", "#LocalFix"],
  ["#HometownTable", "#FridayPlate", "#LocalKitchen", "#EventNight"],
  ["#PanelDay", "#SafeInstall", "#TradeWeek", "#LocalPower"],
  ["#DeskWeek", "#LocalWork", "#OwnerRun", "#ThisWeek"],
] as const;

const LINKEDIN_TAGS = [
  ["#SmallBusiness", "#TradesWork", "#LocalService"],
  ["#Hospitality", "#LocalEvents", "#ServiceBusiness"],
  ["#ElectricalWork", "#LocalContractor", "#FieldTrade"],
  ["#HomeService", "#LocalCompany", "#OwnerOperated"],
  ["#CateringBusiness", "#LocalHospitality", "#CommunityTable"],
  ["#ElectricalContractor", "#JobSite", "#LocalTrade"],
  ["#MainStreet", "#LocalOwner", "#ServiceWork"],
] as const;

function withDemoTag(tags: readonly string[], demoLabeled: boolean, max: number) {
  const next = demoLabeled ? ["#DEMO", ...tags] : [...tags];
  return [...new Set(next)].slice(0, max);
}

export function kingdomHashtags(input: {
  day: number;
  demoLabeled?: boolean;
}) {
  const index = Math.max(0, Math.min(6, input.day - 1));
  const facebook = withDemoTag(FACEBOOK_TAGS[index], Boolean(input.demoLabeled), 3);
  const instagram = withDemoTag(INSTAGRAM_TAGS[index], false, 5);
  const linkedin = withDemoTag(LINKEDIN_TAGS[index], false, 5);
  return { facebook, instagram, linkedin };
}

export function kingdomCaptionParts(input: {
  demeanor: "motivational" | "friendly_local" | "comical" | "straight" | "faith";
  weekday: string;
  headline: string;
  companyName: string;
  hookDetail: string;
}) {
  const who = input.companyName || "your business";
  const detail = input.hookDetail || input.headline;
  switch (input.demeanor) {
    case "motivational":
      return {
        hook: `${input.weekday} is here. ${who} can use it.`,
        payoff: `${input.headline}. ${detail}.`,
        cta: "Call or stop in if you want this done this week.",
      };
    case "friendly_local":
      return {
        hook: `Hey neighbors — ${input.weekday} with ${who}.`,
        payoff: `${input.headline}. ${detail}.`,
        cta: "Come see us if this is your week.",
      };
    case "comical":
      return {
        hook: `Nobody asked for a boring ${input.weekday} post.`,
        payoff: `${input.headline}. ${who} kept it simple: ${detail}.`,
        cta: "If you need this, call. If you don't, enjoy the quiet.",
      };
    case "faith":
      return {
        hook: `Grateful for ${input.weekday}.`,
        payoff: `${input.headline}. ${who} is here if you need us.`,
        cta: "Reach out if this week's work is yours.",
      };
    default:
      return {
        hook: `${input.headline}.`,
        payoff: `${who} can handle it this week. ${detail}.`,
        cta: "Call or stop in to book it.",
      };
  }
}
