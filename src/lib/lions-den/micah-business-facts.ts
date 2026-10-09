import { isHttpWebsiteUrl } from "./website-email.ts";

export type MicahBusinessFacts = {
  businessName: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website: string;
  services: string[];
  offer: string;
};

const SKIP_SERVICE = /^(n\/a|na|none|no|test|tbd|services?|our services|what we (do|offer))$/i;

export function cleanFactText(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseMicahServiceList(value: unknown) {
  const parts = String(value ?? "")
    .split(/[\n,;•|]+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 2 && part.length <= 80 && !SKIP_SERVICE.test(part));
  const unique: string[] = [];
  for (const part of parts) {
    if (unique.some((item) => item.toLowerCase() === part.toLowerCase())) continue;
    unique.push(part);
    if (unique.length >= 8) break;
  }
  return unique;
}

export function normalizeFactPhone(value: unknown) {
  const raw = cleanFactText(value, 40);
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return raw;
}

export function normalizeFactWebsite(value: unknown) {
  return isHttpWebsiteUrl(cleanFactText(value, 300)) ?? "";
}

export function displayWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function emptyMicahBusinessFacts(): MicahBusinessFacts {
  return {
    businessName: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    website: "",
    services: [],
    offer: "",
  };
}

export function micahFactsReady(facts: Pick<MicahBusinessFacts, "businessName" | "services" | "offer">) {
  return Boolean(facts.businessName.trim() && (facts.services.length > 0 || facts.offer.trim()));
}

export function micahAreaLabel(facts: Pick<MicahBusinessFacts, "city" | "state" | "zipCode">) {
  if (facts.city && facts.state) return `${facts.city}, ${facts.state}`;
  if (facts.city) return facts.city;
  if (facts.zipCode.trim()) return facts.zipCode.trim();
  return "";
}

const NAV_LABEL =
  /^(home|about|about us|contact|contact us|menu|cart|login|log in|sign in|sign up|blog|faq|faqs|gallery|photos|privacy|privacy policy|terms|terms of service|services|our services|book now|call now|learn more|read more|shop|store)$/i;

export function htmlToVisibleText(html: string) {
  const source = String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const withBreaks = source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|tr|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ");
  const text = withBreaks
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function metaContent(html: string, key: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`,
    "i",
  );
  const match = html.match(pattern);
  return cleanFactText(match?.[1] || match?.[2] || "", 400);
}

function listItems(html: string) {
  const items: string[] = [];
  for (const match of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = cleanFactText(match[1].replace(/<[^>]+>/g, " "), 80);
    if (!text || NAV_LABEL.test(text)) continue;
    if (text.length < 3 || text.length > 60) continue;
    if (/[.!?]/.test(text) && text.length > 48) continue;
    items.push(text);
  }
  return items;
}

function headingItems(html: string) {
  const items: string[] = [];
  for (const match of html.matchAll(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/gi)) {
    const text = cleanFactText(match[1].replace(/<[^>]+>/g, " "), 80);
    if (!text || NAV_LABEL.test(text) || text.length < 3 || text.length > 48) continue;
    items.push(text);
  }
  return items;
}

function phrasesFromBlurb(value: string) {
  return value
    .split(/[•|·,/]|(?:\s+and\s+)/i)
    .map((part) =>
      cleanFactText(part, 60)
        .replace(/\s+in\s+[A-Z][A-Za-z\s]+$/, "")
        .replace(/[.,]+$/, "")
        .trim(),
    )
    .filter(
      (part) =>
        part.length >= 3 &&
        part.length <= 48 &&
        !NAV_LABEL.test(part) &&
        !/^welcome\b/i.test(part) &&
        !/^(tx|texas|[a-z]{2})$/i.test(part),
    );
}

const PHONE_PATTERN = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;

export function extractFactsFromWebsiteHtml(html: string, fallbackName = ""): Partial<MicahBusinessFacts> {
  const source = String(html ?? "");
  const title = cleanFactText(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "", 160);
  const description = metaContent(source, "description") || metaContent(source, "og:description");
  const services = parseMicahServiceList(
    [...listItems(source), ...headingItems(source), ...phrasesFromBlurb(description), ...phrasesFromBlurb(title)].join(
      "\n",
    ),
  ).filter((item) => item.toLowerCase() !== fallbackName.trim().toLowerCase());
  const phone = normalizeFactPhone(source.match(PHONE_PATTERN)?.[0] ?? "");
  const visible = htmlToVisibleText(source);
  const cityMatch = visible.match(
    /\b((?:[A-Z][a-z]+\s+){0,2}[A-Z][a-z]+),\s*(TX|Texas|[A-Z]{2})\b/,
  );
  const leadingWord = /^(serving|call|from|near|our|visit|in|at)$/i;
  const cityWords = (cityMatch?.[1] ?? "").split(/\s+/).filter(Boolean);
  while (cityWords.length > 1 && leadingWord.test(cityWords[0] ?? "")) cityWords.shift();
  const city = cityWords.join(" ");
  const stateRaw = cityMatch?.[2] ?? "";
  const state = /^texas$/i.test(stateRaw) ? "TX" : stateRaw.toUpperCase().slice(0, 2);
  const priceLine = visible
    .split(/\n+/)
    .map((line) => cleanFactText(line.replace(/^•\s*/, ""), 140))
    .find((line) => /\$\s?\d/.test(line) && line.length >= 4 && line.length <= 140);
  return {
    services,
    phone,
    city,
    state,
    offer: priceLine ?? "",
  };
}

function pageHas(pageText: string, phrase: string) {
  const needle = phrase.replace(/\s+/g, " ").trim().toLowerCase();
  if (needle.length < 3) return false;
  return pageText.toLowerCase().includes(needle);
}

/** Drop anything the model (or a heuristic) did not actually find on the page. */
export function retainPageSupportedFacts(
  pageText: string,
  candidate: Partial<MicahBusinessFacts>,
): Partial<MicahBusinessFacts> {
  const page = String(pageText ?? "");
  const services = (candidate.services ?? []).filter((service) => pageHas(page, service));
  const phoneDigits = String(candidate.phone ?? "").replace(/\D/g, "").slice(-10);
  const phoneOk =
    phoneDigits.length === 10 && page.replace(/\D/g, "").includes(phoneDigits)
      ? normalizeFactPhone(candidate.phone)
      : "";
  const city = candidate.city && pageHas(page, candidate.city) ? cleanFactText(candidate.city, 80) : "";
  const state = city && candidate.state ? cleanFactText(candidate.state, 2).toUpperCase() : "";
  const offer = candidate.offer && pageHas(page, candidate.offer) ? cleanFactText(candidate.offer, 160) : "";
  return {
    services: parseMicahServiceList(services.join("\n")),
    phone: phoneOk,
    city,
    state,
    offer,
  };
}

export function isPublicWebsiteUrl(value: string | null | undefined) {
  const href = normalizeFactWebsite(value);
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".invalid") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return null;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
  return url.toString();
}
