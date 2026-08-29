const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "atlas",
  "checkout",
  "client",
  "login",
  "qtime-productions",
  "sis-custom-creations",
  "sis-diy-big-complete-showcase",
  "success",
]);

export type PaidWorkspaceProvisioningStatus = "pending" | "linked" | "suspended" | "failed";

export function normalizeCheckoutEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() || null;
}

export function isUsableCheckoutEmail(value: string | null | undefined) {
  const email = normalizeCheckoutEmail(value);
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export function provisioningStatusForCheckoutEmail(email: string | null | undefined): PaidWorkspaceProvisioningStatus {
  return isUsableCheckoutEmail(email) ? "pending" : "failed";
}

export function workspaceNameFromCheckout(input: {
  businessName?: string | null;
  customerName?: string | null;
  email?: string | null;
}) {
  const businessName = cleanName(input.businessName);
  if (businessName) return businessName;

  const customerName = cleanName(input.customerName);
  if (customerName) return customerName;

  const localPart = String(input.email ?? "")
    .split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim();
  const fromEmail = cleanName(localPart);
  return fromEmail ? `${fromEmail} workspace` : "Atlas workspace";
}

export function workspaceSlugFromIdentity(input: {
  name: string;
  email?: string | null;
  uniqueness?: string | null;
}) {
  const fromName = slugify(input.name);
  const fromEmail = slugify(String(input.email ?? "").split("@")[0] ?? "");
  const base = avoidReservedSlug(fromName || fromEmail || "atlas-workspace");
  const suffix = slugify(input.uniqueness ?? "").slice(-6);
  return suffix ? `${base.slice(0, 56)}-${suffix}` : base.slice(0, 63);
}

export function nextWorkspaceSlugCandidate(slug: string, attempt: number) {
  if (attempt <= 0) return slug.slice(0, 63);
  const suffix = `-${attempt + 1}`;
  return `${slug.slice(0, Math.max(1, 63 - suffix.length))}${suffix}`;
}

function cleanName(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}&.'’\- ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function avoidReservedSlug(slug: string) {
  return RESERVED_WORKSPACE_SLUGS.has(slug) ? `${slug}-workspace` : slug;
}
