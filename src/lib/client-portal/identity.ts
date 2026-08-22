const SAFE_NAME_PATTERN = /[^\p{L}\p{N}&.'’\- ]/gu;

function cleanOrganizationName(value: string) {
  return value
    .replace(SAFE_NAME_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function getClientPortalName(organizationName: string | null | undefined) {
  const name = cleanOrganizationName(String(organizationName ?? ""));

  if (!name) {
    return "Your Lion’s Den";
  }

  if (/^qtime productions$/i.test(name)) {
    return "Q’s Lion’s Den";
  }

  const identity = /^sis custom creations$/i.test(name)
    ? "SIS Custom Creations CRM"
    : name.split(" ")[0] ?? name;
  return `${identity}’s Lion’s Den`;
}

