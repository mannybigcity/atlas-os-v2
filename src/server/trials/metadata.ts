export function cleanTrialMetadataValue(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function extractTrialMetadata(metadata: Record<string, unknown>) {
  const fullName = cleanTrialMetadataValue(metadata.full_name ?? metadata.fullName, 160);
  const businessName = cleanTrialMetadataValue(metadata.business_name ?? metadata.businessName, 200);
  const email = cleanTrialMetadataValue(metadata.email, 320).toLowerCase();
  const phone = cleanTrialMetadataValue(metadata.phone, 40);
  const businessType = cleanTrialMetadataValue(metadata.business_type ?? metadata.businessType, 100);
  const primaryGrowthGoal = cleanTrialMetadataValue(
    metadata.primary_growth_goal ?? metadata.primaryGrowthGoal,
    1000,
  );

  return {
    fullName,
    businessName,
    email,
    phone,
    businessType,
    primaryGrowthGoal,
  };
}

export function isTrialSignupMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || metadata.sample_desk === true) {
    return false;
  }

  const extracted = extractTrialMetadata(metadata);
  const hasTrialConsent =
    Boolean(metadata.terms_accepted_at) ||
    Boolean(metadata.termsAcceptedAt) ||
    Boolean(metadata.privacy_accepted_at) ||
    Boolean(metadata.privacyAcceptedAt);

  return Boolean(
    extracted.businessName &&
      (extracted.businessType || extracted.primaryGrowthGoal || hasTrialConsent),
  );
}

export function isTrialConfirmationRequest(input: {
  type?: string | null;
  next?: string | null;
}) {
  const type = String(input.type ?? "").trim().toLowerCase();
  if (type === "email" || type === "signup") {
    return true;
  }

  const next = String(input.next ?? "").trim();
  if (!next) {
    return false;
  }

  if (next === "/starter") {
    return true;
  }

  const path = next.split("?")[0];
  return path === "/client" || path.startsWith("/client/");
}
