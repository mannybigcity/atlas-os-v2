import { readRuntimeEnv } from "../../lib/env.ts";

const HUNTER_DOMAIN_SEARCH_URL = "https://api.hunter.io/v2/domain-search";

export type HunterDomainEnrichment = {
  email: string | null;
  phone: string | null;
  /** Null when the payload did not include company social fields. */
  hasSocialProfile: boolean | null;
};

export function hunterApiKey() {
  return readRuntimeEnv("HUNTER_API_KEY");
}

function asEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null;
  return text;
}

function asPhone(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.replace(/\D/g, "").length < 7) return null;
  return text;
}

const SOCIAL_KEYS = ["facebook", "instagram", "linkedin", "twitter", "youtube"] as const;

export function parseHunterDomainSearch(payload: unknown): HunterDomainEnrichment | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const emails = Array.isArray(record.emails) ? record.emails : [];
  let email: string | null = null;
  let phone = asPhone(record.phone_number);
  for (const item of emails) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    email = email ?? asEmail(row.value);
    phone = phone ?? asPhone(row.phone_number);
  }
  const present = SOCIAL_KEYS.filter((key) => key in record);
  const hasSocialProfile =
    present.length === 0
      ? null
      : SOCIAL_KEYS.some((key) => typeof record[key] === "string" && String(record[key]).trim().length > 0);
  if (!email && !phone && hasSocialProfile == null) return null;
  return { email, phone, hasSocialProfile };
}

/**
 * Optional Hunter.io domain search. Returns null when HUNTER_API_KEY is unset
 * or the call fails. Does not send email or place a call.
 */
export async function enrichHunterDomain(
  domain: string,
  options: { fetchImplementation?: typeof fetch; signal?: AbortSignal } = {},
): Promise<HunterDomainEnrichment | null> {
  const apiKey = hunterApiKey();
  const host = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!apiKey || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) || host.includes("..")) return null;
  const url = new URL(HUNTER_DOMAIN_SEARCH_URL);
  url.searchParams.set("domain", host);
  url.searchParams.set("limit", "1");
  url.searchParams.set("api_key", apiKey);
  try {
    const response = await (options.fetchImplementation ?? fetch)(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: options.signal ?? AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    return parseHunterDomainSearch(await response.json());
  } catch {
    return null;
  }
}
