/**
 * Extra fields on a prospect or client record. Pure: no I/O.
 *
 * Both record tables (organization_opportunities, organization_sis_customers)
 * have a jsonb `metadata` column, so the same profile lives under one key on
 * either and no migration is needed.
 */

export const CLIENT_PROFILE_KEY = "client_profile";

export const PREFERRED_CONTACTS = ["call", "text", "whatsapp", "email"] as const;
export type PreferredContact = (typeof PREFERRED_CONTACTS)[number];

export type ClientProfile = {
  address: string;
  preferredContact: PreferredContact | "";
  service: string;
  referredBy: string;
  bestTime: string;
  tags: string;
};

export const EMPTY_CLIENT_PROFILE: ClientProfile = {
  address: "",
  preferredContact: "",
  service: "",
  referredBy: "",
  bestTime: "",
  tags: "",
};

const LIMITS: Record<keyof ClientProfile, number> = {
  address: 300,
  preferredContact: 12,
  service: 200,
  referredBy: 160,
  bestTime: 120,
  tags: 200,
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function readClientProfile(metadata: unknown): ClientProfile {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? ((metadata as Record<string, unknown>)[CLIENT_PROFILE_KEY] as Record<string, unknown> | undefined)
      : undefined;
  if (!record || typeof record !== "object") return { ...EMPTY_CLIENT_PROFILE };
  const preferred = clean(record.preferredContact, LIMITS.preferredContact);
  return {
    address: clean(record.address, LIMITS.address),
    preferredContact: (PREFERRED_CONTACTS as readonly string[]).includes(preferred) ? (preferred as PreferredContact) : "",
    service: clean(record.service, LIMITS.service),
    referredBy: clean(record.referredBy, LIMITS.referredBy),
    bestTime: clean(record.bestTime, LIMITS.bestTime),
    tags: clean(record.tags, LIMITS.tags),
  };
}

export function clientProfileFromForm(read: (name: string) => unknown): ClientProfile {
  return readClientProfile({ [CLIENT_PROFILE_KEY]: {
    address: read("address"),
    preferredContact: read("preferredContact"),
    service: read("service"),
    referredBy: read("referredBy"),
    bestTime: read("bestTime"),
    tags: read("tags"),
  } });
}

/** Returns a new metadata object with the profile written under its key. */
export function withClientProfile(metadata: unknown, profile: ClientProfile): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? { ...(metadata as Record<string, unknown>) } : {};
  return { ...base, [CLIENT_PROFILE_KEY]: { ...profile } };
}

export function preferredContactLabel(value: PreferredContact | "", spanish: boolean) {
  switch (value) {
    case "call":
      return spanish ? "Llamada" : "Call";
    case "text":
      return spanish ? "Mensaje de texto" : "Text";
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return spanish ? "Correo" : "Email";
    default:
      return spanish ? "Sin preferencia" : "No preference";
  }
}

export function clientProfileFieldLabels(spanish: boolean): Record<keyof ClientProfile, string> {
  return {
    address: spanish ? "Dirección" : "Address",
    preferredContact: spanish ? "Cómo prefiere que le contacten" : "How they like to be reached",
    service: spanish ? "Qué hacemos para ellos" : "What we do for them",
    referredBy: spanish ? "Quién los refirió" : "Referred by",
    bestTime: spanish ? "Mejor hora para llamar" : "Best time to call",
    tags: spanish ? "Etiquetas (separadas por coma)" : "Tags (comma separated)",
  };
}

/** Lines worth showing at a glance; empty fields are left out. */
export function clientProfileSummary(profile: ClientProfile, spanish: boolean) {
  const labels = clientProfileFieldLabels(spanish);
  const lines: Array<{ label: string; value: string }> = [];
  if (profile.service) lines.push({ label: labels.service, value: profile.service });
  if (profile.preferredContact) lines.push({ label: labels.preferredContact, value: preferredContactLabel(profile.preferredContact, spanish) });
  if (profile.bestTime) lines.push({ label: labels.bestTime, value: profile.bestTime });
  if (profile.address) lines.push({ label: labels.address, value: profile.address });
  if (profile.referredBy) lines.push({ label: labels.referredBy, value: profile.referredBy });
  if (profile.tags) lines.push({ label: labels.tags.replace(/ \(.*\)$/, ""), value: profile.tags });
  return lines;
}
