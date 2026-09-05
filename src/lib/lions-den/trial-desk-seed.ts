import { MICAH_STARTER_DAYS } from "./micah-starter-week.ts";
import { isExcludedTrialInboxOrganization } from "./trial-inbox.ts";
import {
  isAfeCrmDemoOrganization,
  isSisOrganization,
} from "../client-portal/identity.ts";

export const TRIAL_DESK_SEED_KIND = "afe_trial_lions_den_seed";
export const TRIAL_DESK_SEED_WEEK_KEY = "trial-seed-week";

export type TrialHunterSeedFind = {
  seedKey: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  primaryType: string;
  searchQuery: string;
};

export type TrialMicahSeedSlot = {
  day: number;
  weekday: string;
  theme: string;
  slot: string;
  title: string;
  headline: string;
  supportingText: string;
  caption: string;
  callToAction: string;
  imageSvg: string;
};

export type TrialDeskOrganization = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

export type TrialDeskSeedClient = {
  from: (table: string) => any;
};

export function getTrialHunterSeedFinds(): TrialHunterSeedFind[] {
  return [
    {
      seedKey: "harbor-lane-auto",
      placeId: "trial-seed-harbor-lane-auto",
      name: "Harbor Lane Auto Detail · SAMPLE",
      formattedAddress: "SAMPLE address — not a real location. Do not visit or contact.",
      primaryType: "car_detailing",
      searchQuery: "SAMPLE trial review pile — no live Places search",
    },
    {
      seedKey: "pinecrest-lawn",
      placeId: "trial-seed-pinecrest-lawn",
      name: "Pinecrest Lawn Care · SAMPLE",
      formattedAddress: "SAMPLE address — not a real location. Do not visit or contact.",
      primaryType: "lawn_care_service",
      searchQuery: "SAMPLE trial review pile — no live Places search",
    },
    {
      seedKey: "midtown-print",
      placeId: "trial-seed-midtown-print",
      name: "Midtown Print Shop · SAMPLE",
      formattedAddress: "SAMPLE address — not a real location. Do not visit or contact.",
      primaryType: "printing_shop",
      searchQuery: "SAMPLE trial review pile — no live Places search",
    },
  ];
}

export function trialHunterSeedPlaceIds() {
  return getTrialHunterSeedFinds().map((find) => find.placeId);
}

export function getTrialMicahSeedSlots(): TrialMicahSeedSlot[] {
  return MICAH_STARTER_DAYS.map((item) => {
    const slot = `${TRIAL_DESK_SEED_WEEK_KEY}-d${item.day}`;
    const title = `SAMPLE · Day ${item.day} · ${item.weekday}`;
    const headline = `${item.theme} · SAMPLE placeholder`;
    const supportingText = "Gallery placeholder. Download and post it yourself.";
    const caption = [
      "SAMPLE gallery placeholder.",
      `${item.weekday} ${item.theme} is a draft slot only. Copy or download when you are ready.`,
      "Atlas did not post this to Facebook or Instagram. Nothing is scheduled.",
      "#SampleDraft",
    ].join("\n\n");
    return {
      day: item.day,
      weekday: item.weekday,
      theme: item.theme,
      slot,
      title,
      headline,
      supportingText,
      caption,
      callToAction: "Download this draft. Do not expect Atlas to post it.",
      imageSvg: trialMicahPlaceholderSvg(headline, item.theme),
    };
  });
}

export function trialMicahSeedSlots() {
  return getTrialMicahSeedSlots().map((item) => item.slot);
}

export function getTrialLionsDenSeed() {
  return {
    hunterFinds: getTrialHunterSeedFinds(),
    micahSlots: getTrialMicahSeedSlots(),
  };
}

export function trialDeskSeedWriteTables() {
  return ["organization_hunter_review_items", "organization_content_drafts", "organization_content_draft_events"] as const;
}

function trialMicahPlaceholderSvg(headline: string, theme: string) {
  const safeHeadline = escapeXml(headline);
  const safeTheme = escapeXml(theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="160" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">SAMPLE DRAFT</text><text x="80" y="280" fill="#d8c27a" font-size="28" font-family="Arial,sans-serif">${safeTheme}</text><text x="80" y="420" fill="#ffffff" font-size="52" font-family="Arial,sans-serif">${safeHeadline}</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Download and post yourself. Atlas did not post this.</text></svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function assertTrialDeskSeedIsSafe(seed = getTrialLionsDenSeed()) {
  if (seed.hunterFinds.length < 2 || seed.hunterFinds.length > 5) {
    throw new Error("Trial seed should be a small HUNTER review pile.");
  }
  if (seed.micahSlots.length !== 7) {
    throw new Error("Trial seed must include one MICAH placeholder for each weekday.");
  }

  const blob = JSON.stringify(seed);
  if (/\b(?:contact_)?phone|\(\s*555\s*\)|\+1[\s-]?\d/i.test(blob)) {
    throw new Error("Trial seed must not invent phone numbers.");
  }
  if (/organization_opportunities|sis_lions_den|sis custom creations|afe-crm-demo/i.test(blob)) {
    throw new Error("Trial seed must not mention Prospects, SIS, or the sample desk.");
  }
  if (/\bfaith\b/i.test(blob)) {
    throw new Error("Trial seed must not default Faith language.");
  }

  for (const find of seed.hunterFinds) {
    if (!/\bSAMPLE\b/.test(find.name) || find.searchQuery.indexOf("SAMPLE") < 0) {
      throw new Error(`HUNTER trial find must be labeled SAMPLE: ${find.name}`);
    }
    if (!find.placeId.startsWith("trial-seed-")) {
      throw new Error(`HUNTER trial place_id must be namespaced: ${find.placeId}`);
    }
  }

  for (const slot of seed.micahSlots) {
    if (!/\bSAMPLE\b/.test(slot.title) || !/\bSAMPLE\b/.test(slot.caption)) {
      throw new Error(`MICAH trial slot must be labeled SAMPLE: ${slot.title}`);
    }
    if (!/did not post|not posted|nothing is scheduled/i.test(slot.caption)) {
      throw new Error(`MICAH trial slot must stay gallery-only: ${slot.title}`);
    }
  }
}

export function canSeedTrialLionsDenDesk(input: {
  organization?: TrialDeskOrganization | null;
  hasTrialProfile?: boolean;
}) {
  const organization = input.organization;
  if (!organization?.id) return false;
  if (input.hasTrialProfile === false) return false;
  if (isSisOrganization(organization) || isAfeCrmDemoOrganization(organization)) return false;
  if (isExcludedTrialInboxOrganization(organization)) return false;
  return true;
}

function isoDateFromToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readOrganization(
  client: TrialDeskSeedClient,
  organizationId: string,
): Promise<TrialDeskOrganization | null> {
  const result = await client.from("organizations").select("id, name, slug").eq("id", organizationId).maybeSingle();
  if (result?.error) {
    throw new Error(result.error.message);
  }
  const row = result?.data as TrialDeskOrganization | null | undefined;
  return row?.id ? row : null;
}

export async function applyTrialLionsDenSeed(
  client: TrialDeskSeedClient,
  input: {
    organizationId: string;
    userId?: string | null;
    organization?: TrialDeskOrganization | null;
    hasTrialProfile?: boolean;
  },
) {
  assertTrialDeskSeedIsSafe();

  const organization =
    input.organization?.id === input.organizationId
      ? input.organization
      : await readOrganization(client, input.organizationId);

  if (
    !canSeedTrialLionsDenDesk({
      organization,
      hasTrialProfile: input.hasTrialProfile,
    })
  ) {
    return { status: "skipped" as const, reason: "not_eligible" };
  }

  const seed = getTrialLionsDenSeed();
  const placeIds = trialHunterSeedPlaceIds();
  const slots = trialMicahSeedSlots();

  const hunterRead = await client
    .from("organization_hunter_review_items")
    .select("id, place_id, status, accepted_opportunity_id")
    .eq("organization_id", organization!.id);
  if (hunterRead.error) {
    throw new Error(hunterRead.error.message);
  }
  const existingHunter = (hunterRead.data ?? []) as Array<{
    place_id?: string;
    status?: string;
    accepted_opportunity_id?: string | null;
  }>;
  const existingPlaceIds = new Set(existingHunter.map((row) => String(row.place_id ?? "")));
  const hasOwnHunter = existingHunter.some((row) => !placeIds.includes(String(row.place_id ?? "")));

  const draftRead = await client
    .from("organization_content_drafts")
    .select("id, slot, metadata")
    .eq("organization_id", organization!.id);
  if (draftRead.error) {
    throw new Error(draftRead.error.message);
  }
  const existingDrafts = (draftRead.data ?? []) as Array<{
    slot?: string;
    metadata?: Record<string, unknown> | null;
  }>;
  const existingSlots = new Set(
    existingDrafts
      .filter((row) => row.metadata?.trial_seed === true || String(row.slot ?? "").startsWith(`${TRIAL_DESK_SEED_WEEK_KEY}-`))
      .map((row) => String(row.slot ?? "")),
  );
  const hasOwnWeek = existingDrafts.some((row) => {
    const metadata = row.metadata ?? {};
    return metadata.week_pack === true && metadata.trial_seed !== true;
  });

  const missingHunter = hasOwnHunter
    ? []
    : seed.hunterFinds.filter((find) => !existingPlaceIds.has(find.placeId));
  const missingMicah = hasOwnWeek ? [] : seed.micahSlots.filter((item) => !existingSlots.has(item.slot));

  if (missingHunter.length === 0 && missingMicah.length === 0) {
    return {
      status: "already_seeded" as const,
      organizationId: organization!.id,
      hunterCount: existingHunter.filter((row) => placeIds.includes(String(row.place_id ?? ""))).length,
      micahCount: existingSlots.size,
    };
  }

  if (missingHunter.length > 0) {
    const hunterRows = missingHunter.map((find) => ({
      organization_id: organization!.id,
      place_id: find.placeId,
      name: find.name,
      formatted_address: find.formattedAddress,
      google_maps_url: null,
      website_url: null,
      primary_type: find.primaryType,
      business_status: "SAMPLE",
      search_query: find.searchQuery,
      status: "pending",
      accepted_opportunity_id: null,
      created_by: input.userId || null,
    }));
    const hunterWrite = await client
      .from("organization_hunter_review_items")
      .upsert(hunterRows, { onConflict: "organization_id,place_id" });
    if (hunterWrite.error) {
      throw new Error(hunterWrite.error.message);
    }
  }

  if (missingMicah.length > 0) {
    const draftDate = isoDateFromToday();
    const draftRows = missingMicah.map((item) => ({
      organization_id: organization!.id,
      draft_date: draftDate,
      slot: item.slot,
      campaign: "SAMPLE week placeholders",
      title: item.title,
      headline: item.headline,
      supporting_text: item.supportingText,
      caption: item.caption,
      call_to_action: item.callToAction,
      platforms: ["facebook", "instagram", "linkedin"],
      visual_style: "atlas_branded",
      image_svg: item.imageSvg,
      status: "ready_for_review",
      generated_by: "micah",
      generation_source: "manual",
      metadata: {
        source: TRIAL_DESK_SEED_KIND,
        trial_seed: true,
        week_pack: true,
        week_day: item.day,
        weekday: item.weekday,
        week_theme: item.theme,
        micah_demeanor: "straight",
        faith_language: false,
        demo_labeled: true,
        company_name: "",
        no_live_post: true,
        no_scheduler: true,
        requested_by: input.userId || null,
      },
    }));
    const draftWrite = await client
      .from("organization_content_drafts")
      .upsert(draftRows, { onConflict: "organization_id,draft_date,slot" });
    if (draftWrite.error) {
      throw new Error(draftWrite.error.message);
    }

    const refreshed = await client
      .from("organization_content_drafts")
      .select("id, slot")
      .eq("organization_id", organization!.id);
    if (!refreshed.error) {
      const inserted = ((refreshed.data ?? []) as Array<{ id: string; slot: string }>).filter((row) =>
        missingMicah.some((item) => item.slot === row.slot),
      );
      if (inserted.length > 0) {
        await client.from("organization_content_draft_events").insert(
          inserted.map((row) => ({
            draft_id: row.id,
            organization_id: organization!.id,
            event_type: "created",
            note: "SAMPLE MICAH week placeholder. Gallery draft only. Atlas did not post this.",
            actor_user_id: input.userId || null,
            actor_label: "MICAH",
          })),
        );
      }
    }
  }

  if (
    existingHunter.some(
      (row) => placeIds.includes(String(row.place_id ?? "")) && row.status === "accepted" && row.accepted_opportunity_id,
    )
  ) {
    // Owner already accepted a seed find. Do not write or rewrite Prospects.
  }

  return {
    status: "applied" as const,
    organizationId: organization!.id,
    hunterCount: placeIds.length,
    micahCount: slots.length,
    wroteProspects: false,
  };
}
