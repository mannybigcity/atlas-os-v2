import { isAfeOperatorDeskOrganization } from "../client-portal/identity.ts";

// CoS sets NEXT_PUBLIC_SIGNSCOUT_URL in Netlify to the live SignScout Vercel
// URL after that app deploys. Leave empty until then. Never hardcode a
// placeholder domain.
export const SIGNSCOUT_URL_ENV = "NEXT_PUBLIC_SIGNSCOUT_URL";

export function canSeeSignScoutNav(input: {
  isSuperAdmin: boolean;
  isClientPreview: boolean;
  organization?: { name?: string | null; slug?: string | null } | null;
}) {
  return (
    Boolean(input.isSuperAdmin) &&
    !input.isClientPreview &&
    isAfeOperatorDeskOrganization(input.organization)
  );
}

export function getSignScoutUrl(raw = process.env.NEXT_PUBLIC_SIGNSCOUT_URL) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function signScoutNavLabel() {
  return "SignScout";
}

export function signScoutUnsetHint(spanish = false) {
  return spanish ? "URL aún no configurada" : "URL not set yet";
}
