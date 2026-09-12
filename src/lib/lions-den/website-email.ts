const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const MAILTO_PATTERN = /mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;

const REJECTED_HOSTS = new Set([
  "example.com",
  "example.org",
  "sentry.io",
  "wixpress.com",
  "squarespace.com",
  "cloudflare.com",
  "google.com",
  "gstatic.com",
  "schema.org",
]);

const REJECTED_LOCAL = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
]);

const PREFERRED_LOCAL = ["info", "contact", "hello", "office", "sales", "admin", "support"];

export function normalizeWebsiteEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [local, host] = email.split("@");
  if (!local || !host) return null;
  if (REJECTED_HOSTS.has(host)) return null;
  if (REJECTED_LOCAL.has(local)) return null;
  if (local.startsWith("noreply") || local.includes("no-reply")) return null;
  return email;
}

export function extractBusinessEmails(html: string) {
  const found = new Set<string>();
  const source = String(html ?? "");
  for (const match of source.matchAll(MAILTO_PATTERN)) {
    const email = normalizeWebsiteEmail(match[1]);
    if (email) found.add(email);
  }
  for (const match of source.matchAll(EMAIL_PATTERN)) {
    const email = normalizeWebsiteEmail(match[0]);
    if (email) found.add(email);
  }
  return [...found];
}

export function pickBestBusinessEmail(emails: string[]) {
  const cleaned = emails
    .map((email) => normalizeWebsiteEmail(email))
    .filter((email): email is string => Boolean(email));
  if (cleaned.length === 0) return null;
  const preferred = cleaned.find((email) => {
    const local = email.split("@")[0] ?? "";
    return PREFERRED_LOCAL.includes(local);
  });
  return preferred ?? cleaned[0] ?? null;
}

export function isHttpWebsiteUrl(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
