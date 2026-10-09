import {
  isAfeClientDeskOrganization,
  isAfeOperatorDeskOrganization,
  isQTimeWorkspaceSlug,
  isSisOrganization,
} from "../client-portal/identity.ts";

export const CLIENT_VIEW_PARAM = "clientView";
export const CLIENT_VIEW_WITHHELD = "Withheld";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN =
  /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
const STREET_PATTERN =
  /\b\d{1,6}\s+[A-Za-z0-9.'’-]+(?:\s+[A-Za-z0-9.'’-]+){0,5}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|parkway|pkwy|highway|hwy|circle|cir)\b\.?/gi;
const SECRET_PATTERN = /\b(?:password|passwd|api[_-]?key|secret|token|credential)\s*[:=]\s*\S+/gi;

const BLANK_KEYS = new Set([
  "email",
  "contactemail",
  "fromemail",
  "toemail",
  "replyto",
  "owneremail",
  "cc",
  "bcc",
  "phone",
  "contactphone",
  "nationalphonenumber",
  "internationalphonenumber",
  "mobile",
  "tel",
  "formattedaddress",
  "street",
  "streetaddress",
  "addressline1",
  "address1",
  "address",
  "postalcode",
  "googlemapsurl",
  "paypal",
  "paypalemail",
  "paylink",
  "paymentlink",
  "paymentmethod",
  "cardlast4",
  "last4",
  "invoicetotal",
  "paymenttotal",
  "clientsecret",
  "stripecustomerid",
  "stripeaccount",
  "password",
  "secret",
  "apikey",
  "token",
  "accesstoken",
  "refreshtoken",
  "credential",
  "credentials",
  "authorization",
]);

const MESSAGE_KEYS = new Set([
  "body",
  "message",
  "messagebody",
  "emailbody",
  "smsbody",
  "textbody",
  "htmlbody",
]);

const SKIP_STRING_KEYS = new Set([
  "id",
  "organizationid",
  "slug",
  "status",
  "stage",
  "opportunitytype",
  "ownerrole",
  "eventtype",
  "actorrole",
  "createdat",
  "updatedat",
  "nextactiondue",
  "imageurl",
  "imagedownloadurl",
  "imagefilename",
  "imagesvg",
  "weekday",
  "day",
  "href",
  "openhref",
  "previewhref",
  "placeid",
  "googleplaceid",
  "draftid",
  "recordid",
  "userid",
  "role",
  "kind",
  "lane",
  "primarytype",
  "businesstype",
  "source",
  "notetype",
  "attention",
  "currency",
  "planslug",
  "photostoragepath",
  "photourl",
]);

export type ClientViewDeskKind = "client" | "trial";

export type ClientViewDeskInput = {
  id: string;
  name: string;
  slug?: string | null;
  createdAt?: string | null;
};

export type ClientViewDeskRow = {
  id: string;
  name: string;
  slug: string;
  kind: ClientViewDeskKind;
  createdAt: string;
  openHref: string;
};

export function isClientViewFlag(value: unknown) {
  return String(value ?? "").trim() === "1";
}

export function canSeeClientViewNav(input: {
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

export function isClientViewDesk(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization?.slug) return false;
  if (isSisOrganization(organization) || isQTimeWorkspaceSlug(organization.slug)) return false;
  if (isAfeOperatorDeskOrganization(organization)) return false;
  return isAfeClientDeskOrganization(organization);
}

export function clientViewOpenHref(slug: string) {
  return `/client?previewOrg=${encodeURIComponent(slug)}&${CLIENT_VIEW_PARAM}=1`;
}

export function clientViewListHref() {
  return "/client/client-view";
}

export function selectClientViewDesks(
  organizations: ClientViewDeskInput[],
  linkedBillingIds: ReadonlySet<string>,
): ClientViewDeskRow[] {
  return organizations
    .filter((organization) => isClientViewDesk(organization))
    .map((organization) => {
      const slug = String(organization.slug ?? "").trim();
      return {
        id: organization.id,
        name: organization.name.trim() || slug,
        slug,
        kind: linkedBillingIds.has(organization.id) ? "client" : "trial",
        createdAt: String(organization.createdAt ?? ""),
        openHref: clientViewOpenHref(slug),
      } satisfies ClientViewDeskRow;
    })
    .filter((row) => SLUG.test(row.slug))
    .sort((left, right) => {
      const byDate = right.createdAt.localeCompare(left.createdAt);
      if (byDate !== 0) return byDate;
      return left.name.localeCompare(right.name);
    });
}

export function rememberClientView(
  params: URLSearchParams,
  source: { get(name: string): unknown },
) {
  if (isClientViewFlag(source.get(CLIENT_VIEW_PARAM))) {
    params.set(CLIENT_VIEW_PARAM, "1");
  }
}

export function scrubClientViewText(value: string) {
  return value
    .replace(EMAIL_PATTERN, CLIENT_VIEW_WITHHELD)
    .replace(PHONE_PATTERN, CLIENT_VIEW_WITHHELD)
    .replace(STREET_PATTERN, CLIENT_VIEW_WITHHELD)
    .replace(SECRET_PATTERN, CLIENT_VIEW_WITHHELD);
}

export function clientViewTextHasPrivateContact(value: string) {
  return scrubClientViewText(value) !== value;
}

export function redactClientViewValue<T>(value: T): T {
  return redactNode(value) as T;
}

export function forClientView<T>(enabled: boolean, value: T): T {
  if (!enabled || value == null) return value;
  return redactClientViewValue(value);
}

function normalizeKey(key: string) {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function isMapsUrl(value: string) {
  return /google\.[^/\s]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo/i.test(value);
}

function isPaymentUrl(value: string) {
  return /(?:^https?:\/\/)?(?:[\w.-]+\.)?(?:stripe\.com|paypal\.com|paypal\.me)\b/i.test(value.trim());
}

function isMailOrCredentialUrl(value: string) {
  const trimmed = value.trim();
  return /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed) || isMapsUrl(trimmed) || isPaymentUrl(trimmed);
}

function redactNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactNode(item));
  if (!value || typeof value !== "object") return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    next[key] = redactField(key, child);
  }
  return next;
}

function redactField(key: string, value: unknown): unknown {
  const norm = normalizeKey(key);
  if (BLANK_KEYS.has(norm)) return blankValue(value);
  if (value && typeof value === "object") return redactNode(value);
  if (typeof value !== "string") return value;
  if (SKIP_STRING_KEYS.has(norm)) return value;
  if (norm === "websiteurl" || norm === "sourceurl") {
    return isMailOrCredentialUrl(value) ? null : value;
  }
  if (MESSAGE_KEYS.has(norm)) {
    return clientViewTextHasPrivateContact(value) ? CLIENT_VIEW_WITHHELD : value;
  }
  if (isMailOrCredentialUrl(value) && value.trim().length < 500) return null;
  return scrubClientViewText(value);
}

function blankValue(value: unknown) {
  if (typeof value === "string") return null;
  if (typeof value === "number") return null;
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") return redactNode(value);
  return null;
}
