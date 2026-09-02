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

export function buildMicahDraftCopy(prompt: string, answer?: string | null) {
  const source = (answer || prompt).replace(/\s+/g, " ").trim();
  const headline = clipDraftText(source.replace(/^answer:\s*/i, ""), 72) || "Client draft";
  const title = clipDraftText(`MICAH draft: ${headline}`, 140);
  const captionBase = clipDraftText(source, 900);
  const caption = `${captionBase}\n\nDraft only. Download this file and post it yourself. Atlas did not publish to Facebook or Instagram.`;
  return { title, headline, caption: clipDraftText(caption, 2100) };
}

export function buildMicahDraftSvg(input: {
  headline: string;
  supportingText: string;
  logoDataUri?: string | null;
}) {
  const headline = escapeXml(clipDraftText(input.headline, 72));
  const supporting = escapeXml(clipDraftText(input.supportingText, 90));
  const logo = input.logoDataUri
    ? `<image href="${input.logoDataUri}" x="390" y="70" width="300" height="300" preserveAspectRatio="xMidYMid meet"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${NAVY}"/><rect x="48" y="48" width="984" height="984" fill="none" stroke="${GOLD}" stroke-width="10"/><rect x="72" y="72" width="936" height="936" fill="none" stroke="${GOLD}" stroke-width="2"/>${logo}<text x="540" y="${input.logoDataUri ? "460" : "360"}" fill="${GOLD}" font-size="28" font-family="Georgia,Times,serif" text-anchor="middle" letter-spacing="6">ATLAS</text><text x="540" y="${input.logoDataUri ? "560" : "460"}" fill="#ffffff" font-size="54" font-family="Georgia,Times,serif" font-weight="700" text-anchor="middle">${headline}</text><text x="540" y="${input.logoDataUri ? "640" : "540"}" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif" text-anchor="middle">${supporting}</text><text x="540" y="980" fill="${GOLD}" font-size="22" font-family="Arial,sans-serif" text-anchor="middle">DRAFT — download and post yourself. Not published.</text></svg>`;
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
