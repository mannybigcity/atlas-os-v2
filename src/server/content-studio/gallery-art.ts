import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isSisOrganization } from "../../lib/client-portal/identity.ts";
import {
  MICAH_GOLD,
  MICAH_NAVY,
  MICAH_STARTER_DAYS,
  isMicahBrandDraft,
  normalizeBrandColor,
} from "../../lib/lions-den/micah-starter-week.ts";
import {
  assembleKingdomCaption,
  gradeKingdomCaption,
  kingdomCaptionParts,
  kingdomHashtags,
} from "./kingdom-social.ts";

const ATLAS_LOGO_PATH = join(process.cwd(), "public/brand/atlas-logo.png");
const NAVY = MICAH_NAVY;
const GOLD = MICAH_GOLD;
const CARD_TEXT_WIDTH = 840;
const SVG_CHROME_TEXT = /^(ATLAS|DRAFT\b|Download and post yourself|DAY \d)/i;

const AFE_DEMO_COMPANIES = [
  { name: "ABC Plumbing", hook: "crew hats and shop pride" },
  { name: "123 Catering", hook: "tasting night and Friday fish fry" },
  { name: "XYZ Electric", hook: "same-week installs done right" },
] as const;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function clipDraftText(value: string, max: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function clipCaptionText(value: string, max: number) {
  const trimmed = value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

export function readOfficialAtlasLogoDataUri() {
  try {
    const bytes = readFileSync(ATLAS_LOGO_PATH);
    if (!bytes.length) return null;
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function galleryLogoForMicahDesk(input: {
  demoDesk?: boolean;
  brandLogo?: string | null;
}) {
  if (input.brandLogo?.startsWith("data:image/")) return input.brandLogo;
  if (input.demoDesk) return readOfficialAtlasLogoDataUri();
  return null;
}

export function isConcatenatedDemoCompanyCopy(value: string) {
  const hits = AFE_DEMO_COMPANIES.filter((company) => value.includes(company.name)).length;
  return hits >= 2;
}

function isGenericWeekTheme(value: string) {
  return /^(?:(?:make|create|design|draft|write)\s+(?:a|an|the)\s+)?(?:week|7[- ]day(?:s)?)\s+of\s+posts$/i.test(
    value.replace(/\s+/g, " ").trim(),
  );
}

function promptOccasion(source: string) {
  const cleaned = source.replace(/^answer:\s*/i, "").replace(/\s+/g, " ").trim();
  const occasion = cleaned.match(/\b(?:for|about)\s+(.+)$/i)?.[1]?.trim();
  if (
    occasion &&
    occasion.length >= 2 &&
    occasion.length <= 72 &&
    !isConcatenatedDemoCompanyCopy(occasion) &&
    !isGenericWeekTheme(occasion)
  ) {
    return occasion;
  }
  const stripped =
    cleaned
      .replace(/^(make|create|design|draft|write)\s+(a|an|the)\s+/i, "")
      .trim() || cleaned;
  if (isConcatenatedDemoCompanyCopy(stripped) || isGenericWeekTheme(stripped)) {
    return "";
  }
  return stripped;
}

function headlineFromPrompt(source: string) {
  return promptOccasion(source);
}

export function wrapMicahCardLines(text: string, maxChars: number, maxLines: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || maxChars < 1 || maxLines < 1) return [];
  const pair = normalized.split(" · ");
  if (
    pair.length === 2 &&
    maxLines >= 2 &&
    pair[0] &&
    pair[1] &&
    pair[0].length <= maxChars &&
    pair[1].length <= maxChars
  ) {
    return [pair[0], pair[1]];
  }
  const lines: string[] = [];
  let current = "";

  const flushLongToken = (word: string) => {
    let rest = word;
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    current = rest;
  };

  for (const word of normalized.split(" ")) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      flushLongToken(word);
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const overflow = lines.slice(maxLines).join(" ");
  kept[maxLines - 1] = clipDraftText(`${kept[maxLines - 1]} ${overflow}`.trim(), maxChars);
  return kept;
}

function maxCharsForFont(fontSize: number, emWidth: number) {
  return Math.max(10, Math.floor(CARD_TEXT_WIDTH / (fontSize * emWidth)));
}

export function fitMicahCardHeadline(text: string) {
  const clipped = clipDraftText(text, 72);
  const options = [
    { fontSize: 54, em: 0.64, maxLines: 2 },
    { fontSize: 46, em: 0.64, maxLines: 2 },
    { fontSize: 40, em: 0.62, maxLines: 3 },
    { fontSize: 36, em: 0.62, maxLines: 3 },
  ] as const;
  for (const option of options) {
    const maxChars = maxCharsForFont(option.fontSize, option.em);
    const needed = wrapMicahCardLines(clipped, maxChars, 99);
    if (needed.length <= option.maxLines || option === options[options.length - 1]) {
      return {
        lines: wrapMicahCardLines(clipped, maxChars, option.maxLines),
        fontSize: option.fontSize,
        lineHeight: Math.round(option.fontSize * 1.16),
      };
    }
  }
  return { lines: wrapMicahCardLines(clipped, 22, 3), fontSize: 36, lineHeight: 42 };
}

export function fitMicahCardSupporting(text: string) {
  const clipped = clipDraftText(text, 90);
  const options = [
    { fontSize: 28, em: 0.74, maxLines: 2 },
    { fontSize: 24, em: 0.7, maxLines: 3 },
  ] as const;
  for (const option of options) {
    const maxChars = maxCharsForFont(option.fontSize, option.em);
    const needed = wrapMicahCardLines(clipped, maxChars, 99);
    if (needed.length <= option.maxLines || option === options[options.length - 1]) {
      return {
        lines: wrapMicahCardLines(clipped, maxChars, option.maxLines),
        fontSize: option.fontSize,
        lineHeight: Math.round(option.fontSize * 1.25),
      };
    }
  }
  return { lines: wrapMicahCardLines(clipped, 36, 3), fontSize: 24, lineHeight: 30 };
}

function svgWrappedText(input: {
  x: number;
  y: number;
  fill: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  lines: string[];
  lineHeight: number;
}) {
  const lines = input.lines.length ? input.lines : [""];
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : input.lineHeight;
      return `<tspan x="${input.x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");
  const weight = input.fontWeight ? ` font-weight="${input.fontWeight}"` : "";
  return `<text x="${input.x}" y="${input.y}" fill="${input.fill}" font-size="${input.fontSize}" font-family="${input.fontFamily}"${weight} text-anchor="middle">${tspans}</text>`;
}

export function hireableMicahCardHeadline(input: {
  headline: string;
  demoDesk?: boolean;
  companyName?: string;
  theme?: string;
}) {
  const headline = input.headline.replace(/\s+/g, " ").trim();
  if (!input.demoDesk || !isConcatenatedDemoCompanyCopy(headline)) {
    return clipDraftText(headline, 72);
  }
  const company = String(input.companyName ?? "")
    .replace(" (DEMO)", "")
    .trim();
  const theme = String(input.theme ?? "").trim();
  if (theme && company) return clipDraftText(`${theme} · ${company}`, 72);
  if (company) return clipDraftText(company, 72);
  return clipDraftText(theme || "This week", 72);
}

export function micahSvgTextRuns(svg: string) {
  const runs: string[] = [];
  for (const block of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
    const inner = block[1];
    const tspans = [...inner.matchAll(/<tspan\b[^>]*>([^<]*)<\/tspan>/g)];
    if (tspans.length > 0) {
      for (const span of tspans) {
        runs.push(
          span[1]
            .replaceAll("&quot;", '"')
            .replaceAll("&gt;", ">")
            .replaceAll("&lt;", "<")
            .replaceAll("&amp;", "&"),
        );
      }
    } else {
      runs.push(
        inner
          .replaceAll("&quot;", '"')
          .replaceAll("&gt;", ">")
          .replaceAll("&lt;", "<")
          .replaceAll("&amp;", "&"),
      );
    }
  }
  return runs.map((run) => run.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function micahSvgNeedsRefit(svg: string) {
  if (!svg.includes("<svg")) return true;
  const long = micahSvgTextRuns(svg).filter(
    (run) => run.length > 26 && !SVG_CHROME_TEXT.test(run),
  );
  if (long.length === 0) return false;
  return !svg.includes("<tspan") || long.some((run) => run.length > 42);
}

export function buildMicahDraftCopy(prompt: string, answer?: string | null) {
  const source = (answer || prompt).replace(/\s+/g, " ").trim();
  const headline = clipDraftText(headlineFromPrompt(source), 72) || "Client draft";
  const title = clipDraftText(`MICAH draft: ${headline}`, 140);
  const supportingText = clipDraftText(
    "Navy and gold Atlas draft. Download the file and post it yourself.",
    90,
  );
  const caption = clipDraftText(
    [
      headline,
      "",
      supportingText,
      "",
      "Draft only. Download this file and post it yourself. Atlas did not publish to Facebook or Instagram.",
    ].join("\n"),
    2100,
  );
  return { title, headline, supportingText, caption };
}

export function buildMicahDraftSvg(input: {
  headline: string;
  supportingText: string;
  logoDataUri?: string | null;
  dayLabel?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const navy = normalizeBrandColor(input.primaryColor, NAVY);
  const gold = normalizeBrandColor(input.secondaryColor, GOLD);
  const headlineFit = fitMicahCardHeadline(input.headline);
  const supportingFit = fitMicahCardSupporting(input.supportingText);
  const dayLabel = input.dayLabel
    ? escapeXml(clipDraftText(input.dayLabel, 40))
    : "";
  const logo = input.logoDataUri
    ? `<image href="${input.logoDataUri}" x="390" y="${dayLabel ? "110" : "70"}" width="300" height="300" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const dayY = "150";
  const atlasY = input.logoDataUri ? (dayLabel ? "500" : "460") : dayLabel ? "400" : "360";
  const headY = input.logoDataUri ? (dayLabel ? "600" : "560") : dayLabel ? "500" : "460";
  const supportY = Math.min(
    900,
    Number(headY) + Math.max(0, headlineFit.lines.length - 1) * headlineFit.lineHeight + 72,
  );
  const dayText = dayLabel
    ? `<text x="540" y="${dayY}" fill="${gold}" font-size="26" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="4">${dayLabel}</text>`
    : "";
  const headlineText = svgWrappedText({
    x: 540,
    y: Number(headY),
    fill: "#ffffff",
    fontSize: headlineFit.fontSize,
    fontFamily: "Georgia,Times,serif",
    fontWeight: "700",
    lines: headlineFit.lines,
    lineHeight: headlineFit.lineHeight,
  });
  const supportingText = svgWrappedText({
    x: 540,
    y: supportY,
    fill: "#d8c27a",
    fontSize: supportingFit.fontSize,
    fontFamily: "Arial,sans-serif",
    lines: supportingFit.lines,
    lineHeight: supportingFit.lineHeight,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" overflow="hidden"><rect width="1080" height="1080" fill="${navy}"/><rect x="48" y="48" width="984" height="984" fill="none" stroke="${gold}" stroke-width="10"/><rect x="72" y="72" width="936" height="936" fill="none" stroke="${gold}" stroke-width="2"/>${logo}${dayText}<text x="540" y="${atlasY}" fill="${gold}" font-size="28" font-family="Georgia,Times,serif" text-anchor="middle" letter-spacing="6">ATLAS</text>${headlineText}${supportingText}<text x="540" y="980" fill="${gold}" font-size="22" font-family="Arial,sans-serif" text-anchor="middle">DRAFT — download and post yourself. Not published.</text></svg>`;
}

export const MICAH_DEMEANORS = [
  "motivational",
  "friendly_local",
  "comical",
  "straight",
  "faith",
] as const;

export type MicahDemeanor = (typeof MICAH_DEMEANORS)[number];

export const MICAH_WEEK_DAYS = MICAH_STARTER_DAYS.map((item) => ({
  day: item.day,
  weekday: item.weekday,
  theme: item.theme,
}));

export function isMicahDemeanor(value: unknown): value is MicahDemeanor {
  return MICAH_DEMEANORS.includes(value as MicahDemeanor);
}

export function parseMicahDemeanor(prompt: string): MicahDemeanor | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return null;
  if (isMicahDemeanor(normalized)) return normalized;
  if (/\bfaith\b|\bchristian\b|\bgospel\b|\bchurch\b|\bblessed\b/.test(normalized)) {
    return "faith";
  }
  if (/\bcomical\b|\bfunny\b|\bjoke\b|\bhumor/.test(normalized)) return "comical";
  if (/\bmotivational\b|\bmotivate/.test(normalized)) return "motivational";
  if (/\bfriendly(?:\/|\s|-)?local\b|\bfriendly\b|\bneighbor/.test(normalized)) {
    return "friendly_local";
  }
  if (/\bstraight\b|\bdirect\b/.test(normalized)) return "straight";
  return null;
}

export function resolveMicahDemeanor(input: {
  prompt: string;
  stored?: MicahDemeanor | null;
  demoDesk?: boolean;
}): { demeanor: MicahDemeanor | null; blockedFaithOnDemo: boolean } {
  const parsed = parseMicahDemeanor(input.prompt);
  const next = parsed ?? input.stored ?? null;
  if (input.demoDesk && next === "faith") {
    return { demeanor: null, blockedFaithOnDemo: true };
  }
  return { demeanor: next, blockedFaithOnDemo: false };
}

export function demeanorAskMessage(input: {
  demoDesk?: boolean;
  blockedFaithOnDemo?: boolean;
}) {
  const options = input.demoDesk
    ? "Motivational, Friendly/local, Comical, or Straight"
    : "Motivational, Friendly/local, Comical, Straight, or Faith (only if you want faith)";
  const faithNote = input.blockedFaithOnDemo
    ? "Faith is not used on this desk. "
    : "";
  return `${faithNote}Pick a voice for this week's MICAH pack: ${options}. Atlas will remember it for this workspace. Nothing is posted to Facebook or Instagram.`;
}

export function captionForClipboard(caption: string) {
  return caption
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function parseMicahGalleryCaptionEdit(value: unknown) {
  const caption = clipCaptionText(String(value ?? ""), 2200);
  if (caption.length < 10) return null;
  if (/\b(auto[-\s]?post|schedule this post|blotato|blacktwist)\b/i.test(caption)) {
    return null;
  }
  return caption;
}

export function canShowMicahGalleryEdit(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization) return false;
  return !isSisOrganization(organization);
}

export function buildMicahGalleryCaptionUpdate(input: {
  metadata: Record<string, unknown>;
  caption: unknown;
  status?: string | null;
  editedAt?: string;
}): {
  caption: string;
  status: string;
  metadata: Record<string, unknown>;
} | null {
  const caption = parseMicahGalleryCaptionEdit(input.caption);
  if (!caption) return null;

  const currentStatus = String(input.status ?? "ready_for_review");
  return {
    caption,
    status: currentStatus === "published" ? "ready_for_review" : currentStatus,
    metadata: {
      ...input.metadata,
      owner_edited_at: input.editedAt ?? new Date().toISOString(),
      no_live_post: true,
      no_scheduler: true,
    },
  };
}

export type MicahWeekCard = {
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
  cta: string;
  imageSvg: string;
  companyName: string;
  demoLabeled: boolean;
  gradePass: boolean;
};

export function buildMicahWeekPack(input: {
  prompt: string;
  demeanor: MicahDemeanor;
  demoDesk?: boolean;
  logoDataUri?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  weekKey?: string;
}): MicahWeekCard[] {
  const occasion = promptOccasion(input.prompt);
  const theme = clipDraftText(occasion, 72) || "This week";
  const weekKey = input.weekKey || "week";
  const logoDataUri = input.logoDataUri ?? null;
  const primaryColor = normalizeBrandColor(input.primaryColor, NAVY);
  const secondaryColor = normalizeBrandColor(input.secondaryColor, GOLD);
  const demeanor =
    input.demoDesk && input.demeanor === "faith" ? "straight" : input.demeanor;

  return MICAH_WEEK_DAYS.map((item, index) => {
    const company = input.demoDesk
      ? AFE_DEMO_COMPANIES[index % AFE_DEMO_COMPANIES.length]
      : { name: "", hook: theme };
    const dayLabel = `DAY ${item.day} · ${item.theme.toUpperCase()}`;
    const companyName = company.name.replace(" (DEMO)", "");
    const headline = input.demoDesk
      ? clipDraftText(
          occasion ? `${occasion} · ${companyName}` : `${item.theme} · ${companyName}`,
          72,
        )
      : clipDraftText(`${item.theme} · ${theme}`, 72);
    const supportingText = clipDraftText(
      input.demoDesk
        ? `${company.hook}. Download and post it yourself.`
        : "Navy and gold Atlas draft. Download the file and post it yourself.",
      90,
    );
    const parts = kingdomCaptionParts({
      demeanor,
      weekday: item.weekday,
      headline,
      companyName: company.name,
      hookDetail: company.hook,
    });
    const tags = kingdomHashtags({
      day: item.day,
      demoLabeled: Boolean(input.demoDesk),
    });
    const demoLabel = input.demoDesk
      ? `Sample draft for ${company.name}. Download and post it yourself.`
      : null;
    const caption = clipCaptionText(
      assembleKingdomCaption({
        ...parts,
        hashtags: tags.facebook,
        demoLabel,
      }),
      2100,
    );
    const instagramCaption = clipCaptionText(
      assembleKingdomCaption({
        ...parts,
        hashtags: tags.instagram,
        demoLabel,
      }),
      2100,
    );
    const linkedinCaption = clipCaptionText(
      assembleKingdomCaption({
        ...parts,
        hashtags: tags.linkedin,
        demoLabel,
      }),
      2100,
    );
    const title = clipDraftText(
      input.demoDesk
        ? `Day ${item.day} · ${item.weekday} · ${company.name}`
        : `Day ${item.day} · ${item.weekday} · ${theme}`,
      140,
    );
    const grade = gradeKingdomCaption({
      caption,
      instagramCaption,
      linkedinCaption,
      demoLabeled: Boolean(input.demoDesk),
    });
    return {
      day: item.day,
      weekday: item.weekday,
      dayLabel,
      slot: clipDraftText(`${weekKey}-d${item.day}`, 80),
      title,
      headline,
      supportingText,
      caption,
      instagramCaption,
      linkedinCaption,
      cta: parts.cta,
      companyName: company.name,
      demoLabeled: Boolean(input.demoDesk),
      gradePass: grade.pass,
      theme: item.theme,
      imageSvg: buildMicahDraftSvg({
        headline,
        supportingText,
        logoDataUri,
        dayLabel,
        primaryColor,
        secondaryColor,
      }),
    };
  });
}

export function selectMicahWeekGallery(
  drafts: Array<{
    id: string;
    title: string;
    headline: string;
    caption: string;
    supportingText: string | null;
    imageSvg: string | null;
    imageUrl: string | null;
    metadata: Record<string, unknown>;
  }>,
  options: { demoDesk: boolean; logoDataUri?: string | null },
): Array<MicahWeekCard & { id: string | null }> {
  const visible = drafts.filter((draft) => !isMicahBrandDraft(draft.metadata));
  const week = visible
    .filter((draft) => draft.metadata?.week_pack === true)
    .sort(
      (left, right) =>
        Number(left.metadata.week_day ?? 0) - Number(right.metadata.week_day ?? 0),
    );

  const toCard = (
    draft: (typeof drafts)[number],
    index: number,
  ): MicahWeekCard & { id: string } => {
    const day = Number(draft.metadata.week_day ?? index + 1);
    const starter = MICAH_WEEK_DAYS[Math.max(0, Math.min(6, day - 1))];
    const weekday = starter?.weekday ?? "Monday";
    const theme = String(draft.metadata.week_theme ?? starter?.theme ?? weekday);
    const dayLabel = `DAY ${day} · ${theme.toUpperCase()}`;
    const headline = hireableMicahCardHeadline({
      headline: draft.headline,
      demoDesk: options.demoDesk,
      companyName: String(draft.metadata.company_name ?? ""),
      theme,
    });
    const supportingText =
      draft.supportingText || "Download this draft and post it yourself.";
    const shouldRefit = !draft.imageSvg || options.demoDesk;
    const imageSvg = shouldRefit
      ? buildMicahDraftSvg({
          headline,
          supportingText,
          logoDataUri: options.logoDataUri,
          dayLabel,
          primaryColor: String(draft.metadata.primary_color ?? ""),
          secondaryColor: String(draft.metadata.secondary_color ?? ""),
        })
      : draft.imageSvg;
    return {
      id: draft.id,
      day,
      weekday,
      theme,
      dayLabel,
      slot: `week-d${day}`,
      title: draft.title,
      headline,
      supportingText,
      caption: draft.caption,
      instagramCaption: String(draft.metadata.instagram_caption ?? ""),
      linkedinCaption: String(draft.metadata.linkedin_caption ?? ""),
      cta: String(draft.metadata.kingdom_cta ?? ""),
      imageSvg,
      companyName: String(draft.metadata.company_name ?? ""),
      demoLabeled: Boolean(draft.metadata.demo_labeled),
      gradePass: draft.metadata.kingdom_grade !== "fail",
    };
  };

  if (week.length > 0) {
    return week.slice(0, 7).map(toCard);
  }

  if (options.demoDesk) {
    return buildMicahWeekPack({
      prompt: "Make a week of posts",
      demeanor: "straight",
      demoDesk: true,
      logoDataUri: options.logoDataUri,
      weekKey: "demo-week",
    }).map((card) => ({ ...card, id: null }));
  }

  return visible.slice(0, 7).map(toCard);
}

export function slotForMicahPrompt(prompt: string) {
  const stamp = Date.now().toString(36);
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return clipDraftText(`chat-${slug || "draft"}-${stamp}`, 80);
}
