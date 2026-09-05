import {
  FOUNDER_MAILBOX_EMAIL,
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isForbiddenSampleDeskLoginEmail,
  isFounderMailboxEmail,
  isQTimeWorkspaceSlug,
  isSampleDeskLoginEmail,
  isSisOrganization,
  normalizeLoginEmail,
} from "../client-portal/identity.ts";

export const TRIAL_INBOX_WINDOW_DAYS = 7;
export const TRIAL_INBOX_PROOF_SLUG = "bright-path-cleaning-2ead43";

export const TRIAL_INBOX_RULE = {
  include:
    "AFE trial workspaces whose owner has an atlas_trial_profiles row and whose trial_started_at is within the last 7 days or whose trial_ends_at is still in the future. There is no processed flag yet; this window is the human-approval queue.",
  exclude: [
    "SIS Custom Creations / sis-diy organizations",
    "Sample desk afe-crm-demo",
    "AFE operator desk atlas-for-entrepreneurs",
    "QTime",
    "Founder mailbox and @atlasforentrepreneurs.com identities",
    "Sample-desk login email",
    "Rows without an organization slug (cannot open previewOrg)",
  ],
} as const;

export type TrialInboxCandidate = {
  userId: string;
  ownerName?: string | null;
  email?: string | null;
  businessName?: string | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationCreatedAt?: string | null;
  membershipRole?: string | null;
  emailConfirmedAt?: string | null;
};

export type TrialInboxRow = {
  userId: string;
  companyName: string;
  ownerName: string | null;
  email: string | null;
  startedAt: string;
  emailConfirmedAt: string | null;
  organizationId: string;
  organizationSlug: string;
  previewHref: string;
};

export function trialInboxWindowStart(now: Date, days = TRIAL_INBOX_WINDOW_DAYS) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function isInsideTrialInboxWindow(input: {
  now: Date;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  organizationCreatedAt?: string | null;
}) {
  const nowMs = input.now.getTime();
  const windowStart = trialInboxWindowStart(input.now).getTime();
  const started = parseTimestamp(input.trialStartedAt) ?? parseTimestamp(input.organizationCreatedAt);
  const ends = parseTimestamp(input.trialEndsAt);

  const startedRecently = started !== null && started >= windowStart && started <= nowMs + 60_000;
  const stillActive = ends !== null && ends >= nowMs;
  return startedRecently || stillActive;
}

export function isExcludedTrialInboxEmail(email?: string | null) {
  const value = normalizeLoginEmail(email);
  if (!value) return false;
  if (isFounderMailboxEmail(value) || value === FOUNDER_MAILBOX_EMAIL) return true;
  if (isForbiddenSampleDeskLoginEmail(value)) return true;
  if (isSampleDeskLoginEmail(value)) return true;
  return false;
}

export function isExcludedTrialInboxOrganization(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (!organization) return true;
  if (isSisOrganization(organization)) return true;
  if (isAfeCrmDemoOrganization(organization)) return true;
  if (isAfeOperatorDeskOrganization(organization)) return true;
  if (isQTimeWorkspaceSlug(organization.slug)) return true;
  return false;
}

export function canSeeTrialInboxNav(input: {
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

export function trialInboxNavLabel(count: number, spanish = false) {
  const base = spanish ? "Prueba 7 días" : "7 Day Trial";
  return `${base} (${count})`;
}

export function trialInboxPreviewHref(slug: string) {
  return `/client?previewOrg=${encodeURIComponent(slug)}`;
}

export function selectTrialInboxRows(
  candidates: TrialInboxCandidate[],
  now = new Date(),
): TrialInboxRow[] {
  const rows = new Map<string, TrialInboxRow>();

  for (const candidate of candidates) {
    const slug = String(candidate.organizationSlug ?? "").trim();
    if (!slug) continue;
    if (isExcludedTrialInboxEmail(candidate.email)) continue;
    if (
      isExcludedTrialInboxOrganization({
        name: candidate.organizationName,
        slug,
      })
    ) {
      continue;
    }
    if (
      !isInsideTrialInboxWindow({
        now,
        trialStartedAt: candidate.trialStartedAt,
        trialEndsAt: candidate.trialEndsAt,
        organizationCreatedAt: candidate.organizationCreatedAt,
      })
    ) {
      continue;
    }

    const startedAt =
      candidate.trialStartedAt ||
      candidate.organizationCreatedAt ||
      "";
    if (!startedAt) continue;

    const companyName =
      cleanDisplay(candidate.businessName) ||
      cleanDisplay(candidate.organizationName) ||
      slug;
    const key = slug.toLowerCase();
    const existing = rows.get(key);
    const row: TrialInboxRow = {
      userId: candidate.userId,
      companyName,
      ownerName: cleanDisplay(candidate.ownerName),
      email: normalizeLoginEmail(candidate.email) || null,
      startedAt,
      emailConfirmedAt: candidate.emailConfirmedAt ?? null,
      organizationId: String(candidate.organizationId ?? ""),
      organizationSlug: slug,
      previewHref: trialInboxPreviewHref(slug),
    };

    if (!existing || parseTimestamp(row.startedAt)! >= parseTimestamp(existing.startedAt)!) {
      rows.set(key, row);
    }
  }

  return [...rows.values()].sort((left, right) => {
    const rightStarted = parseTimestamp(right.startedAt) ?? 0;
    const leftStarted = parseTimestamp(left.startedAt) ?? 0;
    return rightStarted - leftStarted;
  });
}

function parseTimestamp(value?: string | null) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function cleanDisplay(value?: string | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}
