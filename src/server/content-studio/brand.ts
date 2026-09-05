import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  brandKitFromMetadata,
  defaultMicahBrandKit,
  isMicahBrandDraft,
  MICAH_GOLD,
  MICAH_NAVY,
  normalizeBrandColor,
  parseSocialHandle,
  type MicahBrandKit,
} from "../../lib/lions-den/micah-starter-week.ts";
import { isMicahDemeanor, type MicahDemeanor } from "./gallery-art.ts";

export const MICAH_BRAND_SLOT = "brand-kit";
export const MICAH_BRAND_DATE = "2000-01-01";

type DraftLike = {
  metadata?: Record<string, unknown> | null;
  imageUrl?: string | null;
  image_url?: string | null;
};

export function brandKitFromDrafts(drafts: DraftLike[] | null | undefined): MicahBrandKit {
  const row = (drafts ?? []).find((draft) => isMicahBrandDraft(draft.metadata ?? null));
  return (
    brandKitFromMetadata(
      row?.metadata ?? null,
      row?.imageUrl ?? row?.image_url ?? null,
    ) ?? defaultMicahBrandKit()
  );
}

async function brandClients() {
  const clients: Array<
    Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
  > = [];
  try {
    clients.push(await createClient());
  } catch {
    // Session client is optional when service-role can read/write.
  }
  try {
    clients.push(createAdminClient());
  } catch {
    // Service-role is optional when the session can already read/write.
  }
  return clients;
}

export async function readMicahBrandKit(organizationId: string): Promise<MicahBrandKit> {
  for (const client of await brandClients()) {
    try {
      const { data, error } = await client
        .from("organization_content_drafts")
        .select("metadata, image_url")
        .eq("organization_id", organizationId)
        .eq("slot", MICAH_BRAND_SLOT)
        .eq("draft_date", MICAH_BRAND_DATE)
        .maybeSingle();
      if (error || !data) continue;
      return brandKitFromDrafts([
        {
          metadata: (data as { metadata?: Record<string, unknown> }).metadata ?? {},
          image_url: (data as { image_url?: string | null }).image_url ?? null,
        },
      ]);
    } catch {
      // Try the next reader.
    }
  }
  return defaultMicahBrandKit();
}

export async function writeMicahBrandKit(input: {
  organizationId: string;
  userId: string;
  kit: MicahBrandKit;
}): Promise<{ status: "success" | "error"; message: string; kit: MicahBrandKit }> {
  const demeanor = isMicahDemeanor(input.kit.demeanor) ? input.kit.demeanor : null;
  const kit: MicahBrandKit = {
    ...input.kit,
    demeanor,
    faithLanguage: Boolean(input.kit.faithLanguage),
    primaryColor: normalizeBrandColor(input.kit.primaryColor, MICAH_NAVY),
    secondaryColor: normalizeBrandColor(input.kit.secondaryColor, MICAH_GOLD),
    facebook: parseSocialHandle(input.kit.facebook),
    instagram: parseSocialHandle(input.kit.instagram),
    linkedin: parseSocialHandle(input.kit.linkedin),
    tiktok: parseSocialHandle(input.kit.tiktok),
  };
  const row = {
    organization_id: input.organizationId,
    draft_date: MICAH_BRAND_DATE,
    slot: MICAH_BRAND_SLOT,
    campaign: "Brand setup",
    title: "MICAH brand kit",
    headline: "Brand setup",
    supporting_text: "Brand setup stored only. Copy/Download. Never auto-post.",
    caption:
      "Stored brand setup for this workspace. MICAH does not post, schedule, scrape, or log in.",
    call_to_action: "Keep drafts in the gallery.",
    platforms: ["facebook", "instagram", "linkedin"],
    visual_style: "atlas_branded",
    image_url: kit.logoDataUri,
    status: "archived",
    generated_by: "micah",
    generation_source: "manual",
    metadata: {
      brand_setup: true,
      micah_demeanor: demeanor,
      faith_language: kit.faithLanguage,
      business_name: kit.businessName,
      city: kit.city,
      audience: kit.audience,
      weekly_offer: kit.weeklyOffer,
      navy_gold_ok: kit.navyGoldOk,
      primary_color: kit.primaryColor,
      secondary_color: kit.secondaryColor,
      brand_photo: kit.brandPhotoDataUri,
      facebook: kit.facebook,
      instagram: kit.instagram,
      linkedin: kit.linkedin,
      tiktok: kit.tiktok,
      no_live_post: true,
      no_scheduler: true,
      no_scrape: true,
      requested_by: input.userId,
    },
  };

  for (const client of await brandClients()) {
    const { error } = await client
      .from("organization_content_drafts")
      .upsert(row, { onConflict: "organization_id,draft_date,slot" });
    if (!error) {
      return {
        status: "success",
        message: "Brand setup saved for this workspace. Nothing was posted.",
        kit,
      };
    }
  }

  return {
    status: "error",
    message: "MICAH could not save brand setup. Try again from this page.",
    kit,
  };
}

export function demeanorFromBrand(kit: MicahBrandKit): MicahDemeanor | null {
  if (kit.faithLanguage) return "faith";
  return isMicahDemeanor(kit.demeanor) ? kit.demeanor : null;
}
