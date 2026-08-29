const SAFE_NAME_PATTERN = /[^\p{L}\p{N}&.'’\- ]/gu;

function cleanOrganizationName(value: string) {
  return value
    .replace(SAFE_NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function isSisCustomCreations(organizationName: string | null | undefined) {
  return /^sis custom creations$/i.test(String(organizationName ?? "").trim());
}

export function isQTimeProductions(organizationName: string | null | undefined) {
  return /^qtime productions$/i.test(String(organizationName ?? "").trim());
}

export const SIS_CUSTOM_CREATIONS_SLUG = "sis-custom-creations";

export function isQTimeWorkspaceSlug(slug: string | null | undefined) {
  return slug === "qtime-productions";
}

export function isSisWorkspaceSlug(slug: string | null | undefined) {
  return slug === SIS_CUSTOM_CREATIONS_SLUG;
}

export function getClientPortalName(organizationName: string | null | undefined) {
  const name = cleanOrganizationName(String(organizationName ?? ""));

  if (!name || isSisCustomCreations(name)) {
    return "The Lion’s Den";
  }

  if (isQTimeProductions(name)) {
    return "Q’s Lion’s Den";
  }

  const identity = name.split(" ")[0] ?? name;
  return `${identity}’s Lion’s Den`;
}
