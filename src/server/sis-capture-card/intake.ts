const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SisCaptureCardInput = {
  requestId: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  websiteDomain: string | null;
  socialMedia: string | null;
  consentToContact: true;
  sourceUrl: string | null;
  fingerprintSeed: string;
};

export type SisCaptureCardValidationFailure = {
  requestId: string | null;
  issues: string[];
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWebsite(
  value: string | null | undefined,
  options: { allowLocalHost?: boolean } = {},
) {
  const trimmed = asTrimmedString(value);

  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);

    if (!hostname.includes(".") && !(options.allowLocalHost && isLocalHost)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeWebsiteDomain(website: string | null) {
  if (!website) {
    return null;
  }

  try {
    const url = new URL(website);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeContactEmail(value: string | null | undefined) {
  const trimmed = asTrimmedString(value).toLowerCase();

  if (!trimmed) {
    return null;
  }

  return emailPattern.test(trimmed) ? trimmed : null;
}

export function normalizeContactPhone(value: string | null | undefined) {
  const trimmed = asTrimmedString(value);

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^0-9]/g, "");

  if (digits.length < 7 || digits.length > 20) {
    return null;
  }

  return trimmed;
}

export function normalizeOptionalText(
  value: string | null | undefined,
) {
  const trimmed = asTrimmedString(value);

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function buildCaptureFingerprintSeed(input: {
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteDomain: string | null;
  socialMedia: string | null;
}) {
  return [
    input.businessName.toLowerCase(),
    input.contactEmail ?? "",
    (input.contactPhone ?? "").replace(/[^0-9]/g, ""),
    input.websiteDomain ?? "",
    input.socialMedia ?? "",
  ].join("|");
}

export function parseSisCaptureCardInput(
  raw: unknown,
  requestIdOverride?: string | null,
): { ok: true; value: SisCaptureCardInput } | { ok: false; failure: SisCaptureCardValidationFailure } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      failure: {
        requestId: null,
        issues: ["request_body_must_be_a_json_object"],
      },
    };
  }

  const body = raw as Record<string, unknown>;
  const requestId = asTrimmedString(requestIdOverride ?? body.requestId);
  const businessName = asTrimmedString(body.businessName);
  const contactName = normalizeOptionalText(body.contactName as string | null | undefined);
  const contactEmail = normalizeContactEmail(body.contactEmail as string | null | undefined);
  const contactPhone = normalizeContactPhone(body.contactPhone as string | null | undefined);
  const website = normalizeWebsite(body.website as string | null | undefined);
  const websiteDomain = normalizeWebsiteDomain(website);
  const socialMedia = normalizeOptionalText(body.socialMedia as string | null | undefined);
  const sourceUrl = normalizeWebsite(body.sourceUrl as string | null | undefined, {
    allowLocalHost: true,
  });
  const consentToContact = body.consentToContact === true;

  const issues: string[] = [];

  if (!requestId || !requestIdPattern.test(requestId)) {
    issues.push("request_id_is_required");
  }

  if (businessName.length < 2 || businessName.length > 250) {
    issues.push("business_name_is_required");
  }

  if (contactName !== null && contactName.length < 2) {
    issues.push("contact_name_is_too_short");
  }

  if (contactName !== null && contactName.length > 200) {
    issues.push("contact_name_is_too_long");
  }

  if (body.contactEmail !== undefined && contactEmail === null && asTrimmedString(body.contactEmail)) {
    issues.push("contact_email_is_invalid");
  }

  if (body.contactPhone !== undefined && contactPhone === null && asTrimmedString(body.contactPhone)) {
    issues.push("contact_phone_is_invalid");
  }

  if (body.website !== undefined && website === null && asTrimmedString(body.website)) {
    issues.push("website_is_invalid");
  }

  if (body.sourceUrl !== undefined && sourceUrl === null && asTrimmedString(body.sourceUrl)) {
    issues.push("source_url_is_invalid");
  }

  if (socialMedia !== null && socialMedia.length < 3) {
    issues.push("social_media_is_too_short");
  }

  if (socialMedia !== null && socialMedia.length > 1500) {
    issues.push("social_media_is_too_long");
  }

  if (!consentToContact) {
    issues.push("consent_to_contact_is_required");
  }

  if (!contactEmail && !contactPhone && !website && !socialMedia) {
    issues.push("at_least_one_contact_route_is_required");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      failure: {
        requestId: requestId || null,
        issues,
      },
    };
  }

  return {
    ok: true,
    value: {
      requestId,
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      website,
      websiteDomain,
      socialMedia,
      consentToContact: true,
      sourceUrl,
      fingerprintSeed: buildCaptureFingerprintSeed({
        businessName,
        contactEmail,
        contactPhone,
        websiteDomain,
        socialMedia,
      }),
    },
  };
}
