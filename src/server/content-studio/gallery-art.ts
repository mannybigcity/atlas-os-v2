import { readFileSync } from "node:fs";
import { join } from "node:path";

const ATLAS_LOGO_PATH = join(process.cwd(), "public/brand/atlas-logo.png");
const NAVY = "#071b42";
const GOLD = "#f5b932";

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

export function readOfficialAtlasLogoDataUri() {
  try {
    const bytes = readFileSync(ATLAS_LOGO_PATH);
    if (!bytes.length) return null;
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function headlineFromPrompt(source: string) {
  const cleaned = source.replace(/^answer:\s*/i, "").replace(/\s+/g, " ").trim();
  const occasion = cleaned.match(/\b(?:for|about)\s+(.+)$/i)?.[1]?.trim();
  if (occasion && occasion.length >= 2 && occasion.length <= 72) return occasion;
  return (
    cleaned
      .replace(/^(make|create|design|draft|write)\s+(a|an|the)\s+/i, "")
      .trim() || cleaned
  );
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
}) {
  const headline = escapeXml(clipDraftText(input.headline, 72));
  const supporting = escapeXml(clipDraftText(input.supportingText, 90));
  const dayLabel = input.dayLabel
    ? escapeXml(clipDraftText(input.dayLabel, 28))
    : "";
  const logo = input.logoDataUri
    ? `<image href="${input.logoDataUri}" x="390" y="${dayLabel ? "110" : "70"}" width="300" height="300" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const dayY = "150";
  const atlasY = input.logoDataUri ? (dayLabel ? "500" : "460") : dayLabel ? "400" : "360";
  const headY = input.logoDataUri ? (dayLabel ? "600" : "560") : dayLabel ? "500" : "460";
  const supportY = input.logoDataUri ? (dayLabel ? "680" : "640") : dayLabel ? "580" : "540";
  const dayText = dayLabel
    ? `<text x="540" y="${dayY}" fill="${GOLD}" font-size="26" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" letter-spacing="4">${dayLabel}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${NAVY}"/><rect x="48" y="48" width="984" height="984" fill="none" stroke="${GOLD}" stroke-width="10"/><rect x="72" y="72" width="936" height="936" fill="none" stroke="${GOLD}" stroke-width="2"/>${logo}${dayText}<text x="540" y="${atlasY}" fill="${GOLD}" font-size="28" font-family="Georgia,Times,serif" text-anchor="middle" letter-spacing="6">ATLAS</text><text x="540" y="${headY}" fill="#ffffff" font-size="54" font-family="Georgia,Times,serif" font-weight="700" text-anchor="middle">${headline}</text><text x="540" y="${supportY}" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif" text-anchor="middle">${supporting}</text><text x="540" y="980" fill="${GOLD}" font-size="22" font-family="Arial,sans-serif" text-anchor="middle">DRAFT — download and post yourself. Not published.</text></svg>`;
}

export const MICAH_DEMEANORS = [
  "motivational",
  "friendly_local",
  "comical",
  "straight",
  "faith",
] as const;

export type MicahDemeanor = (typeof MICAH_DEMEANORS)[number];

export const MICAH_WEEK_DAYS = [
  { day: 1, weekday: "Monday" },
  { day: 2, weekday: "Tuesday" },
  { day: 3, weekday: "Wednesday" },
  { day: 4, weekday: "Thursday" },
  { day: 5, weekday: "Friday" },
  { day: 6, weekday: "Saturday" },
  { day: 7, weekday: "Sunday" },
] as const;

const AFE_DEMO_COMPANIES = [
  { name: "ABC Plumbing (DEMO)", hook: "crew hats and shop pride" },
  { name: "123 Catering (DEMO)", hook: "tasting night and Friday fish fry" },
  { name: "XYZ Electric (DEMO)", hook: "same-week installs done right" },
] as const;

export function isMicahDemeanor(value: unknown): value is MicahDemeanor {
  return MICAH_DEMEANORS.includes(value as MicahDemeanor);
}

export function parseMicahDemeanor(prompt: string): MicahDemeanor | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return null;
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
    ? "Faith is not used on the DEMO desk. "
    : "";
  return `${faithNote}Pick a voice for this week's MICAH pack: ${options}. Atlas will remember it for this workspace. Nothing is posted to Facebook or Instagram.`;
}

export function captionForClipboard(caption: string) {
  return caption.replace(/\s+/g, " ").trim();
}

function captionVoice(demeanor: MicahDemeanor, headline: string, company: string) {
  const who = company || "your business";
  switch (demeanor) {
    case "motivational":
      return `Show up this week. ${headline} — ${who} is ready.`;
    case "friendly_local":
      return `Hey neighbors — ${headline}. ${who} would love to see you.`;
    case "comical":
      return `Nobody asked for a boring post. ${headline}. ${who} kept it simple.`;
    case "faith":
      return `Grateful for this week. ${headline}. ${who} is here if you need us.`;
    default:
      return `${headline}. ${who}.`;
  }
}

export type MicahWeekCard = {
  day: number;
  weekday: string;
  dayLabel: string;
  slot: string;
  title: string;
  headline: string;
  supportingText: string;
  caption: string;
  imageSvg: string;
  companyName: string;
  demoLabeled: boolean;
};

export function buildMicahWeekPack(input: {
  prompt: string;
  demeanor: MicahDemeanor;
  demoDesk?: boolean;
  logoDataUri?: string | null;
  weekKey?: string;
}): MicahWeekCard[] {
  const theme = clipDraftText(headlineFromPrompt(input.prompt), 72) || "This week";
  const weekKey = input.weekKey || "week";
  const logoDataUri = input.logoDataUri ?? null;

  return MICAH_WEEK_DAYS.map((item, index) => {
    const company = input.demoDesk
      ? AFE_DEMO_COMPANIES[index % AFE_DEMO_COMPANIES.length]
      : { name: "", hook: theme };
    const dayLabel = `DAY ${item.day} · ${item.weekday.toUpperCase()}`;
    const headline = input.demoDesk
      ? clipDraftText(`${theme} · ${company.name.replace(" (DEMO)", "")}`, 72)
      : clipDraftText(`${theme} · ${item.weekday}`, 72);
    const supportingText = clipDraftText(
      input.demoDesk
        ? `DEMO · ${company.hook}. Download and post it yourself.`
        : "Navy and gold Atlas draft. Download the file and post it yourself.",
      90,
    );
    const caption = clipDraftText(
      [
        captionVoice(input.demeanor, headline, company.name),
        "",
        input.demoDesk ? `DEMO draft for ${company.name}. Keep the DEMO label.` : supportingText,
        "",
        "Draft only. Download this file and post it yourself. Atlas did not publish to Facebook or Instagram.",
      ].join("\n"),
      2100,
    );
    const title = clipDraftText(
      input.demoDesk
        ? `Day ${item.day} · ${item.weekday} · ${company.name}`
        : `Day ${item.day} · ${item.weekday} · ${theme}`,
      140,
    );
    return {
      day: item.day,
      weekday: item.weekday,
      dayLabel,
      slot: clipDraftText(`${weekKey}-d${item.day}`, 80),
      title,
      headline,
      supportingText,
      caption,
      companyName: company.name,
      demoLabeled: Boolean(input.demoDesk),
      imageSvg: buildMicahDraftSvg({
        headline,
        supportingText,
        logoDataUri,
        dayLabel,
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
  const week = drafts
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
    const weekday = MICAH_WEEK_DAYS[Math.max(0, Math.min(6, day - 1))]?.weekday ?? "Monday";
    const dayLabel = `DAY ${day} · ${weekday.toUpperCase()}`;
    const imageSvg =
      draft.imageSvg ||
      buildMicahDraftSvg({
        headline: draft.headline,
        supportingText: draft.supportingText || draft.caption,
        logoDataUri: options.logoDataUri,
        dayLabel,
      });
    return {
      id: draft.id,
      day,
      weekday,
      dayLabel,
      slot: `week-d${day}`,
      title: draft.title,
      headline: draft.headline,
      supportingText: draft.supportingText || "Download this draft and post it yourself.",
      caption: draft.caption,
      imageSvg,
      companyName: String(draft.metadata.company_name ?? ""),
      demoLabeled: Boolean(draft.metadata.demo_labeled),
    };
  };

  if (week.length > 0) {
    return week.slice(0, 7).map(toCard);
  }

  if (options.demoDesk) {
    return buildMicahWeekPack({
      prompt: "Week of DEMO desk posts for ABC Plumbing, 123 Catering, and XYZ Electric",
      demeanor: "straight",
      demoDesk: true,
      logoDataUri: options.logoDataUri,
      weekKey: "demo-week",
    }).map((card) => ({ ...card, id: null }));
  }

  return drafts.slice(0, 7).map(toCard);
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
