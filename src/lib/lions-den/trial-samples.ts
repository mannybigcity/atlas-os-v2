export const TRIAL_SAMPLE_PLACE_PREFIX = "trial-seed-";

type MetadataCarrier = { metadata?: Record<string, unknown> | null };

export function isTrialSampleMetadata(metadata: Record<string, unknown> | null | undefined) {
  return metadata?.trial_seed === true;
}

export function isTrialSampleOpportunity(opportunity: MetadataCarrier & { sourceUrl?: string | null }) {
  if (isTrialSampleMetadata(opportunity.metadata)) return true;
  return /^https:\/\/example\.invalid\/trial\//i.test(String(opportunity.sourceUrl ?? ""));
}

export function isTrialSampleHunterItem(item: { placeId?: string | null }) {
  return String(item.placeId ?? "").startsWith(TRIAL_SAMPLE_PLACE_PREFIX);
}

export function isTrialSampleDraft(draft: MetadataCarrier) {
  return isTrialSampleMetadata(draft.metadata);
}

export function countRealHunterFinds(items: Array<{ placeId?: string | null }>) {
  return items.filter((item) => !isTrialSampleHunterItem(item)).length;
}

export function countRealProspects(opportunities: Array<MetadataCarrier & { sourceUrl?: string | null }>) {
  return opportunities.filter((item) => !isTrialSampleOpportunity(item)).length;
}

export function hasTrialSamples(input: {
  opportunities?: Array<MetadataCarrier & { sourceUrl?: string | null }>;
  hunterItems?: Array<{ placeId?: string | null }>;
  drafts?: MetadataCarrier[];
}) {
  return (
    (input.opportunities ?? []).some(isTrialSampleOpportunity) ||
    (input.hunterItems ?? []).some(isTrialSampleHunterItem) ||
    (input.drafts ?? []).some(isTrialSampleDraft)
  );
}

export function trialSampleCopy(spanish: boolean) {
  if (spanish) {
    return {
      badge: "EJEMPLO",
      bannerTitle: "Estos registros son ejemplos.",
      bannerBody:
        "Los pusimos para que veas cómo funciona el escritorio. Los negocios, teléfonos y correos no son reales. Bórralos cuando quieras trabajar con tus propios prospectos.",
      clear: "Borrar ejemplos",
      clearConfirm: "¿Borrar todos los registros de ejemplo? Tus propios prospectos y tarjetas se conservan.",
      cleared: "Ejemplos borrados. El escritorio ahora solo muestra tu trabajo.",
    };
  }
  return {
    badge: "SAMPLE",
    bannerTitle: "These records are samples.",
    bannerBody:
      "We added them so you can see how the desk works. The businesses, phone numbers, and emails are not real. Clear them whenever you are ready to work your own prospects.",
    clear: "Clear samples",
    clearConfirm: "Clear every sample record? Your own prospects and cards stay.",
    cleared: "Samples cleared. The desk now shows only your work.",
  };
}
