import { MICAH_STARTER_DAYS } from "./micah-starter-week.ts";
import {
  displayWebsite,
  micahAreaLabel,
  micahFactsReady,
  type MicahBusinessFacts,
} from "./micah-business-facts.ts";
import { buildMicahDraftSvg } from "../../server/content-studio/gallery-art.ts";
import {
  assembleKingdomCaption,
  gradeKingdomCaption,
} from "../../server/content-studio/kingdom-social.ts";

export type MicahBusinessCard = {
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

const SKIP_TAG_WORD = new Set([
  "llc",
  "inc",
  "co",
  "company",
  "the",
  "and",
  "of",
  "a",
  "for",
  "tx",
]);

function clip(value: string, max: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function collapseRepeatedWords(value: string) {
  return value.replace(/\b([A-Za-z]{3,})(\s+\1\b)+/gi, "$1");
}

function tagFrom(value: string) {
  const compact = value.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length < 3) return "";
  return `#${compact.slice(0, 24)}`;
}

function hashtagPool(facts: MicahBusinessFacts) {
  const words = [
    facts.city,
    facts.state && facts.city ? `${facts.city}${facts.state}` : "",
    ...facts.services,
    ...facts.businessName.split(/\s+/),
    "ThisWeek",
    "OwnerRun",
    "BookLocal",
    "MainStreet",
    "LocalOwner",
    "ShopLocal",
    "SmallBusiness",
    "Neighborhood",
    "WeekAhead",
    "OwnerDesk",
  ];
  const tags: string[] = [];
  for (const word of words) {
    if (SKIP_TAG_WORD.has(word.trim().toLowerCase())) continue;
    const tag = tagFrom(word);
    if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase())) continue;
    tags.push(tag);
  }
  return tags;
}

function takeTags(pool: string[], start: number, count: number) {
  const picked: string[] = [];
  for (let offset = 0; picked.length < count && offset < pool.length; offset += 1) {
    const tag = pool[(start + offset) % pool.length];
    if (!tag || picked.some((item) => item.toLowerCase() === tag.toLowerCase())) continue;
    picked.push(tag);
  }
  return picked;
}

function contactLine(facts: MicahBusinessFacts) {
  if (facts.phone) return `Call ${facts.phone}.`;
  if (facts.website) return `See ${displayWebsite(facts.website)}.`;
  return `Ask ${facts.businessName} directly.`;
}

type Beat = { headline: string; detail: string; cta: string };

function beatsFor(facts: MicahBusinessFacts): Beat[] {
  const area = micahAreaLabel(facts);
  const who = facts.businessName.trim();
  const cta = contactLine(facts);
  const beats: Beat[] = [];
  for (const service of facts.services) {
    beats.push({
      headline: collapseRepeatedWords(area ? `${service} in ${area}` : service),
      detail: who,
      cta,
    });
  }
  if (facts.offer.trim()) {
    beats.push({
      headline: collapseRepeatedWords(facts.offer.trim()),
      detail: who,
      cta,
    });
  }
  if (area) {
    const listed = facts.services.slice(0, 3).join(", ");
    beats.push({
      headline: `Serving ${area}`,
      detail: listed || who,
      cta,
    });
  }
  if (facts.phone) {
    beats.push({
      headline: facts.phone,
      detail: area ? `${who} · ${area}` : who,
      cta: facts.website ? `See ${displayWebsite(facts.website)}.` : `Call ${facts.phone}.`,
    });
  }
  if (facts.website) {
    beats.push({
      headline: displayWebsite(facts.website),
      detail: who,
      cta,
    });
  }
  return beats;
}

export function buildMicahCardsFromFacts(
  facts: MicahBusinessFacts,
  colors?: { primaryColor?: string | null; secondaryColor?: string | null },
): MicahBusinessCard[] | null {
  if (!micahFactsReady(facts)) return null;
  const beats = beatsFor(facts);
  if (beats.length === 0) return null;
  const pool = hashtagPool(facts);
  const draftNote = `Draft for ${facts.businessName}. Atlas did not post this.`;

  const cards = MICAH_STARTER_DAYS.map((day, index) => {
    const beat = beats[index % beats.length]!;
    const dayLabel = `DAY ${day.day} · ${day.theme.toUpperCase()}`;
    const headline = clip(beat.headline, 90);
    const supportingText = clip(beat.detail, 90);
    const hook = clip(headline, 180);
    const sameName = beat.detail.trim().toLowerCase() === facts.businessName.trim().toLowerCase();
    const payoff = clip(
      sameName ? `${facts.businessName} — ${headline}.` : `${facts.businessName}. ${beat.detail}.`,
      220,
    );
    const cta = clip(beat.cta, 180);
    const facebook = takeTags(pool, index, 2);
    const instagram = takeTags(pool, index + 2, 4);
    const linkedin = takeTags(pool, index + 6, 3);
    const caption = assembleKingdomCaption({
      demoLabel: draftNote,
      hook,
      payoff,
      cta,
      hashtags: facebook,
    });
    const instagramCaption = assembleKingdomCaption({
      demoLabel: draftNote,
      hook,
      payoff,
      cta,
      hashtags: instagram,
    });
    const linkedinCaption = assembleKingdomCaption({
      demoLabel: draftNote,
      hook,
      payoff,
      cta,
      hashtags: linkedin,
    });
    return {
      day: day.day,
      weekday: day.weekday,
      theme: day.theme,
      dayLabel,
      slot: `business-week-d${day.day}`,
      title: clip(`Day ${day.day} · ${day.weekday} · ${headline}`, 160),
      headline,
      supportingText,
      caption,
      instagramCaption,
      linkedinCaption,
      callToAction: cta,
      imageSvg: buildMicahDraftSvg({
        headline,
        supportingText,
        dayLabel,
        primaryColor: colors?.primaryColor,
        secondaryColor: colors?.secondaryColor,
      }),
    };
  });

  const graded = cards.every(
    (card) =>
      gradeKingdomCaption({
        caption: card.caption,
        instagramCaption: card.instagramCaption,
        linkedinCaption: card.linkedinCaption,
      }).pass,
  );
  return graded ? cards : null;
}
