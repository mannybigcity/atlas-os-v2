import { createHash, randomBytes } from "node:crypto";
import { isAfeOperatorDeskOrganization, isSisOrganization } from "../../lib/client-portal/identity.ts";

export const SIGNSCOUT_INGEST_PATH = "/api/signscout/ingest";
export const SIGNSCOUT_PRIVACY_PATH = "/signscout/privacy";
export const SIGNSCOUT_MIGRATION = "supabase/migrations/20260925183000_signscout_hunter_ingest.sql";
export const SIGNSCOUT_PHOTO_BUCKET = "signscout-photos";
export const SIGNSCOUT_PHOTO_MAX_BYTES = 3_500_000;
export const SIGNSCOUT_BODY_MAX_BYTES = 6_000_000;
export const SIGNSCOUT_TOKEN_HOURLY_LIMIT = 60;
export const SIGNSCOUT_IP_HOURLY_LIMIT = 120;
export const SIGNSCOUT_RATE_WINDOW_MS = 60 * 60 * 1000;
export const SIGNSCOUT_ACTIVE_TOKEN_CAP = 20;

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type SignScoutPhotoType = keyof typeof PHOTO_TYPES;

export type SignScoutOrganization = {
  id: string;
  name: string | null;
  slug: string | null;
};

export type SignScoutTokenRecord = {
  id: string;
  organizationId: string;
  revokedAt: string | null;
  organization: SignScoutOrganization;
};

export type SignScoutPhoto = {
  contentType: SignScoutPhotoType;
  bytes: Buffer;
  sha256: string;
};

export type SignScoutLead = {
  id: string;
  companyName: string;
  trade: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  license: string | null;
  city: string | null;
  notes: string;
  callNote: string;
  rawText: string;
  lat: number | null;
  lng: number | null;
  photo: SignScoutPhoto | null;
};

export type SignScoutReviewInsert = {
  organization_id: string;
  place_id: string;
  name: string;
  formatted_address: string | null;
  google_maps_url: string | null;
  website_url: string | null;
  phone: string | null;
  primary_type: string | null;
  business_status: null;
  search_query: string;
  status: "pending";
  created_by: null;
  source: "signscout";
  notes: string | null;
  contact_email: string | null;
  latitude: number | null;
  longitude: number | null;
  idempotency_key: string;
  body_fingerprint: string;
};

export function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSignScoutDeviceToken() {
  const token = `ss_${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: sha256Hex(token) };
}

export function readBearerToken(header: string | null) {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1] ?? "";
  if (token.length < 20 || token.length > 200) return null;
  if (!/^[\x21-\x7E]+$/.test(token)) return null;
  return token;
}

export function signScoutCorsAllowed(origin: string, extraOrigins: readonly string[] = []) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "capacitor:" && url.hostname === "localhost") return true;
  if ((url.protocol === "https:" || url.protocol === "http:") && localHost) return true;
  if (url.protocol !== "https:") return false;
  if (origin.includes("*")) return false;
  return extraOrigins.some((allowed) => allowed === origin);
}

export function signScoutExtraOrigins(env: {
  webOrigins?: string | null;
  signScoutUrl?: string | null;
} = {}) {
  const fromList = String(env.webOrigins ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const fromUrl = httpsOrigin(env.signScoutUrl);
  const origins = [...fromList, ...(fromUrl ? [fromUrl] : [])];
  return origins.filter((origin) => {
    if (origin === "*" || origin.includes("*")) return false;
    try {
      const url = new URL(origin);
      return url.protocol === "https:" && url.origin === origin;
    } catch {
      return false;
    }
  });
}

function httpsOrigin(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function authorizeSignScoutToken(record: SignScoutTokenRecord | null) {
  if (!record || record.revokedAt) {
    return { ok: false as const, status: 401 as const, error: "unauthorized" as const };
  }
  if (
    isSisOrganization(record.organization) ||
    !isAfeOperatorDeskOrganization(record.organization)
  ) {
    return { ok: false as const, status: 403 as const, error: "forbidden" as const };
  }
  return { ok: true as const, record };
}

export function parseSignScoutIngestBody(raw: unknown, idempotencyHeader: string | null) {
  const issues: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false as const, issues: ["body"] };
  }
  const body = raw as Record<string, unknown>;
  if (body.source !== "signscout") issues.push("source");

  const sentAt = typeof body.sentAt === "string" ? body.sentAt.trim() : "";
  const sentAtTime = Date.parse(sentAt);
  const now = Date.now();
  if (!sentAt || sentAt.length > 40 || Number.isNaN(sentAtTime)) {
    issues.push("sentAt");
  } else if (sentAtTime > now + 24 * 60 * 60 * 1000 || sentAtTime < Date.UTC(2024, 0, 1)) {
    issues.push("sentAt");
  }

  const leadRaw = body.lead;
  if (!leadRaw || typeof leadRaw !== "object" || Array.isArray(leadRaw)) {
    issues.push("lead");
    return { ok: false as const, issues };
  }
  const lead = leadRaw as Record<string, unknown>;
  const id = typeof lead.id === "string" ? lead.id.trim() : "";
  const headerKey = idempotencyHeader?.trim() ?? "";
  if (!IDEMPOTENCY_KEY.test(id) || !IDEMPOTENCY_KEY.test(headerKey) || id !== headerKey) {
    issues.push("idempotencyKey");
  }

  const companyNameResult = boundedText(lead.companyName, 1, 250);
  if (companyNameResult.invalid) issues.push("companyName");
  const companyName = companyNameResult.value;

  const phone = optionalText(lead.phone, 80);
  if (phone.invalid) issues.push("phone");
  else if (phone.value && phone.value.replace(/\D/g, "").length < 7) issues.push("phone");

  const website = optionalWebsite(lead.website);
  if (website.invalid) issues.push("website");

  const email = optionalEmail(lead.email);
  if (email.invalid) issues.push("email");

  const trade = optionalText(lead.trade, 120);
  if (trade.invalid) issues.push("trade");

  const license = optionalText(lead.license, 80);
  if (license.invalid) issues.push("license");

  const city = optionalText(lead.city, 120);
  if (city.invalid) issues.push("city");

  const notes = requiredBounded(lead.notes, 2000, true);
  if (notes.invalid) issues.push("notes");
  const callNote = requiredBounded(lead.callNote, 1000, true);
  if (callNote.invalid) issues.push("callNote");
  const rawText = requiredBounded(lead.rawText, 4000, true);
  if (rawText.invalid) issues.push("rawText");

  const coords = optionalCoords(lead.lat, lead.lng);
  if (coords.invalid) {
    issues.push(...coords.issues);
  }

  if (lead.capturedAt !== undefined && lead.capturedAt !== null && typeof lead.capturedAt !== "number") {
    issues.push("capturedAt");
  } else if (typeof lead.capturedAt === "number" && !Number.isFinite(lead.capturedAt)) {
    issues.push("capturedAt");
  }

  if (lead.status !== undefined && lead.status !== null) {
    if (typeof lead.status !== "string" || lead.status.trim().length > 40) issues.push("status");
  }

  const photo = parsePhoto(lead.photo);
  if (photo.invalid) issues.push(...photo.issues);

  if (issues.length || !companyName) {
    return { ok: false as const, issues: unique(issues.length ? issues : ["companyName"]) };
  }

  const value: SignScoutLead = {
    id,
    companyName,
    trade: trade.value,
    phone: phone.value,
    website: website.value,
    email: email.value,
    license: license.value,
    city: city.value,
    notes: notes.value ?? "",
    callNote: callNote.value ?? "",
    rawText: rawText.value ?? "",
    lat: coords.lat,
    lng: coords.lng,
    photo: photo.value,
  };

  return { ok: true as const, value, fingerprint: signScoutBodyFingerprint(value) };
}

export function signScoutBodyFingerprint(lead: SignScoutLead) {
  return sha256Hex(
    JSON.stringify({
      callNote: lead.callNote,
      city: lead.city,
      companyName: lead.companyName,
      email: lead.email,
      id: lead.id,
      lat: lead.lat,
      license: lead.license,
      lng: lead.lng,
      notes: lead.notes,
      phone: lead.phone,
      photoSha256: lead.photo?.sha256 ?? null,
      rawText: lead.rawText,
      trade: lead.trade,
      website: lead.website,
    }),
  );
}

export function buildSignScoutNotes(lead: SignScoutLead) {
  const parts = [
    lead.trade ? `Trade: ${lead.trade}` : "",
    lead.license ? `License: ${lead.license}` : "",
    lead.city ? `City: ${lead.city}` : "",
    lead.email ? `Email: ${lead.email}` : "",
    lead.notes.trim() ? lead.notes.trim() : "",
    lead.callNote.trim() ? `Call note: ${lead.callNote.trim()}` : "",
    lead.rawText.trim() ? `Sign text:\n${lead.rawText.trim()}` : "",
  ].filter(Boolean);
  const joined = parts.join("\n\n").trim();
  if (!joined) return null;
  return joined.slice(0, 4000);
}

export function buildSignScoutReviewInsert(input: {
  organizationId: string;
  lead: SignScoutLead;
  fingerprint: string;
}): SignScoutReviewInsert {
  const { lead } = input;
  const searchQuery = (lead.city ? `SignScout · ${lead.city}` : "SignScout").slice(0, 1000);
  const mapsUrl =
    lead.lat !== null && lead.lng !== null
      ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}`
      : null;
  return {
    organization_id: input.organizationId,
    place_id: `signscout:${lead.id}`.slice(0, 256),
    name: lead.companyName.slice(0, 250),
    formatted_address: lead.city?.slice(0, 500) ?? null,
    google_maps_url: mapsUrl,
    website_url: lead.website,
    phone: lead.phone,
    primary_type: lead.trade?.slice(0, 120) ?? null,
    business_status: null,
    search_query: searchQuery,
    status: "pending",
    created_by: null,
    source: "signscout",
    notes: buildSignScoutNotes(lead),
    contact_email: lead.email,
    latitude: lead.lat,
    longitude: lead.lng,
    idempotency_key: lead.id,
    body_fingerprint: input.fingerprint,
  };
}

export function signScoutPhotoExtension(contentType: SignScoutPhotoType) {
  return PHOTO_TYPES[contentType];
}

export function signScoutPhotoPath(organizationId: string, reviewItemId: string, contentType: SignScoutPhotoType) {
  return `${organizationId}/${reviewItemId}.${signScoutPhotoExtension(contentType)}`;
}

function boundedText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return { invalid: true, value: "" };
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return { invalid: true, value: "" };
  return { invalid: false, value: trimmed };
}

function optionalText(value: unknown, max: number) {
  if (value === undefined || value === null || value === "") return { invalid: false, value: null as string | null };
  if (typeof value !== "string") return { invalid: true, value: null as string | null };
  const trimmed = value.trim();
  if (!trimmed) return { invalid: false, value: null as string | null };
  if (trimmed.length > max) return { invalid: true, value: null as string | null };
  return { invalid: false, value: trimmed };
}

function requiredBounded(value: unknown, max: number, allowEmpty: boolean) {
  if (value === undefined || value === null) {
    return allowEmpty
      ? { invalid: false, value: "" }
      : { invalid: true, value: "" };
  }
  if (typeof value !== "string") return { invalid: true, value: "" };
  if (value.length > max) return { invalid: true, value: "" };
  return { invalid: false, value };
}

function optionalWebsite(value: unknown) {
  const parsed = optionalText(value, 2000);
  if (parsed.invalid || !parsed.value) return parsed;
  try {
    const url = new URL(parsed.value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return { invalid: true, value: null };
    if (parsed.value.length < 8) return { invalid: true, value: null };
    return { invalid: false, value: parsed.value };
  } catch {
    return { invalid: true, value: null };
  }
}

function optionalEmail(value: unknown) {
  const parsed = optionalText(value, 254);
  if (parsed.invalid || !parsed.value) return parsed;
  const email = parsed.value.toLowerCase();
  if (!EMAIL.test(email) || email.length < 3) return { invalid: true, value: null };
  return { invalid: false, value: email };
}

function optionalCoords(lat: unknown, lng: unknown) {
  const latMissing = lat === undefined || lat === null || lat === "";
  const lngMissing = lng === undefined || lng === null || lng === "";
  if (latMissing && lngMissing) {
    return { invalid: false, lat: null as number | null, lng: null as number | null, issues: [] as string[] };
  }
  if (latMissing || lngMissing) {
    return {
      invalid: true,
      lat: null as number | null,
      lng: null as number | null,
      issues: [latMissing ? "lat" : "lng"],
    };
  }
  const issues: string[] = [];
  const latitude = typeof lat === "number" ? lat : Number.NaN;
  const longitude = typeof lng === "number" ? lng : Number.NaN;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) issues.push("lat");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) issues.push("lng");
  if (issues.length) return { invalid: true, lat: null as number | null, lng: null as number | null, issues };
  return {
    invalid: false,
    lat: Math.round(latitude * 1e6) / 1e6,
    lng: Math.round(longitude * 1e6) / 1e6,
    issues,
  };
}

function parsePhoto(value: unknown):
  | { invalid: false; value: SignScoutPhoto | null; issues: string[] }
  | { invalid: true; value: null; issues: string[] } {
  if (value === undefined || value === null) return { invalid: false, value: null, issues: [] };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { invalid: true, value: null, issues: ["photo"] };
  }
  const photo = value as Record<string, unknown>;
  const contentType = photo.contentType === "image/jpg" ? "image/jpeg" : photo.contentType;
  if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/webp") {
    return { invalid: true, value: null, issues: ["photo.contentType"] };
  }
  if (typeof photo.dataBase64 !== "string" || photo.dataBase64.includes("data:")) {
    return { invalid: true, value: null, issues: ["photo.dataBase64"] };
  }
  const encoded = photo.dataBase64.replace(/\s/g, "");
  if (!encoded || encoded.length > 4_800_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return { invalid: true, value: null, issues: ["photo.dataBase64"] };
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > SIGNSCOUT_PHOTO_MAX_BYTES) {
    return { invalid: true, value: null, issues: ["photo.size"] };
  }
  if (!photoMagicMatches(contentType, bytes)) {
    return { invalid: true, value: null, issues: ["photo.contentType"] };
  }
  return {
    invalid: false,
    value: { contentType, bytes, sha256: sha256Hex(bytes) },
    issues: [],
  };
}

function photoMagicMatches(contentType: SignScoutPhotoType, bytes: Buffer) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}
