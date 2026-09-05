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

export type TrialInboxStatus =
  | "signed_up"
  | "confirmed"
  | "first_login"
  | "in_den"
  | "upgraded"
  | "expired"
  | "abandoned";

export const TRIAL_INBOX_RULE = {
  source:
    "Derived from organizations + owner organization_memberships + Auth. No trial_inbox table. atlas_trial_profiles is optional enrichment only.",
  include:
    "AFE trial workspaces (not SIS, not sample, not operator) with an owner membership whose trial start is within the last 7 days or whose trial end is still in the future. Start is organizations.created_at, or atlas_trial_profiles.trial_started_at when that row exists. End is trial_ends_at when present, otherwise start + 7 days. Upgraded (linked billing) orgs are excluded from this queue.",
  exclude: [
    "SIS Custom Creations / sis-diy organizations",
    "Sample desk afe-crm-demo",
    "AFE operator desk atlas-for-entrepreneurs",
    "QTime",
    "Founder mailbox and @atlasforentrepreneurs.com identities",
    "Sample-desk login email",
    "Linked paid workspaces (status upgraded)",
    "Rows without an organization slug (cannot open previewOrg)",
  ],
  status: {
    upgraded: "Organization has a linked atlas_billing_entitlements row",
    abandoned: "Past start + 7 days, email never confirmed, and no sign-in",
    expired: "Past start + 7 days and not upgraded",
    first_login: "Signed in within 24 hours of start, still inside the trial window",
    in_den: "Signed in more than 24 hours after start, still inside the trial window",
    confirmed: "Auth email_confirmed_at is set and there is no sign-in yet",
    signed_up: "Workspace exists and email is not confirmed yet",
  },
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
  lastSignInAt?: string | null;
  upgraded?: boolean;
};

export type TrialInboxRow = {
  userId: string;
  companyName: string;
  ownerName: string | null;
  email: string | null;
  startedAt: string;
  endsAt: string;
  daysRemaining: number;
  emailConfirmedAt: string | null;
  status: TrialInboxStatus;
  organizationId: string;
  organizationSlug: string;
  previewHref: string;
};

export function trialInboxWindowStart(now: Date, days = TRIAL_INBOX_WINDOW_DAYS) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function trialStartAt(input: {
  trialStartedAt?: string | null;
  organizationCreatedAt?: string | null;
}) {
  return input.organizationCreatedAt || input.trialStartedAt || "";
}

export function trialEndAt(input: {
  startedAt: string;
  trialEndsAt?: string | null;
}) {
  if (input.trialEndsAt) return input.trialEndsAt;
  const started = parseTimestamp(input.startedAt);
  if (started === null) return "";
  return new Date(started + TRIAL_INBOX_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function trialDaysRemaining(endsAt: string, now: Date) {
  const ends = parseTimestamp(endsAt);
  if (ends === null) return 0;
  return Math.max(0, Math.ceil((ends - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function isInsideTrialInboxWindow(input: {
  now: Date;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  organizationCreatedAt?: string | null;
}) {
  const startedAt = trialStartAt(input);
  const endsAt = trialEndAt({ startedAt, trialEndsAt: input.trialEndsAt });
  const nowMs = input.now.getTime();
  const windowStart = trialInboxWindowStart(input.now).getTime();
  const started = parseTimestamp(startedAt);
  const ends = parseTimestamp(endsAt);

  const startedRecently = started !== null && started >= windowStart && started <= nowMs + 60_000;
  const stillActive = ends !== null && ends >= nowMs;
  return startedRecently || stillActive;
}

export function computeTrialInboxStatus(input: {
  now: Date;
  startedAt: string;
  endsAt?: string | null;
  emailConfirmedAt?: string | null;
  lastSignInAt?: string | null;
  upgraded?: boolean;
}): TrialInboxStatus {
  if (input.upgraded) return "upgraded";

  const started = parseTimestamp(input.startedAt);
  const ends = parseTimestamp(input.endsAt) ?? (started !== null
    ? started + TRIAL_INBOX_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : null);
  const pastEnd = ends !== null && input.now.getTime() > ends;
  const confirmed = Boolean(input.emailConfirmedAt);
  const signedInAt = parseTimestamp(input.lastSignInAt);

  if (pastEnd && !confirmed && signedInAt === null) return "abandoned";
  if (pastEnd) return "expired";
  if (signedInAt !== null) {
    const earlyVisit = started !== null && signedInAt - started < 24 * 60 * 60 * 1000;
    return earlyVisit ? "first_login" : "in_den";
  }
  if (confirmed) return "confirmed";
  return "signed_up";
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

export function trialInboxStatusLabel(status: TrialInboxStatus, spanish = false) {
  const labels: Record<TrialInboxStatus, { en: string; es: string }> = {
    signed_up: { en: "Signed up", es: "Registrado" },
    confirmed: { en: "Email confirmed", es: "Correo confirmado" },
    first_login: { en: "First login", es: "Primer acceso" },
    in_den: { en: "In the Den", es: "En The Lion’s Den" },
    upgraded: { en: "Upgraded", es: "Mejorado" },
    expired: { en: "Trial ended", es: "Prueba terminada" },
    abandoned: { en: "No confirm", es: "Sin confirmar" },
  };
  return spanish ? labels[status].es : labels[status].en;
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

    const startedAt = trialStartAt({
      organizationCreatedAt: candidate.organizationCreatedAt,
      trialStartedAt: candidate.trialStartedAt,
    });
    if (!startedAt) continue;

    const endsAt = trialEndAt({
      startedAt,
      trialEndsAt: candidate.trialEndsAt,
    });
    if (
      !isInsideTrialInboxWindow({
        now,
        trialStartedAt: candidate.trialStartedAt,
        trialEndsAt: endsAt,
        organizationCreatedAt: candidate.organizationCreatedAt,
      })
    ) {
      continue;
    }

    const status = computeTrialInboxStatus({
      now,
      startedAt,
      endsAt,
      emailConfirmedAt: candidate.emailConfirmedAt,
      lastSignInAt: candidate.lastSignInAt,
      upgraded: candidate.upgraded,
    });
    if (status === "upgraded") continue;

    const companyName = cleanDisplay(candidate.organizationName) || slug;
    const key = slug.toLowerCase();
    const existing = rows.get(key);
    const row: TrialInboxRow = {
      userId: candidate.userId,
      companyName,
      ownerName: cleanDisplay(candidate.ownerName),
      email: normalizeLoginEmail(candidate.email) || null,
      startedAt,
      endsAt,
      daysRemaining: trialDaysRemaining(endsAt, now),
      emailConfirmedAt: candidate.emailConfirmedAt ?? null,
      status,
      organizationId: String(candidate.organizationId ?? ""),
      organizationSlug: slug,
      previewHref: trialInboxPreviewHref(slug),
    };

    if (!existing || (parseTimestamp(row.startedAt) ?? 0) >= (parseTimestamp(existing.startedAt) ?? 0)) {
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
