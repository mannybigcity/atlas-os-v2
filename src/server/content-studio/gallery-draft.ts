import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { demeanorFromBrand, readMicahBrandKit } from "./brand.ts";
import {
  buildMicahWeekPack,
  clipCaptionText,
  clipDraftText,
  isMicahDemeanor,
  readOfficialAtlasLogoDataUri,
  type MicahDemeanor,
} from "./gallery-art.ts";
import { gradeKingdomCaption, gradeKingdomWeek } from "./kingdom-social.ts";
import { focusDayFromMicahPrompt } from "../../lib/lions-den/micah-starter-week.ts";

export type MicahGalleryDraftInput = {
  organizationId: string;
  userId: string;
  prompt: string;
  demeanor: MicahDemeanor;
  demoDesk?: boolean;
  headline?: string | null;
  caption?: string | null;
  title?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoDataUri?: string | null;
  focusDay?: number | null;
};

export type MicahGalleryDraftResult = {
  status: "success" | "error";
  draftId: string | null;
  draftIds: string[];
  title: string;
  headline: string;
  caption: string;
  count: number;
  message: string;
};

async function writeMicahWeekRows(
  rows: Record<string, unknown>[],
  event: Record<string, unknown>,
) {
  const writers: Array<
    Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
  > = [await createClient()];
  try {
    writers.push(createAdminClient());
  } catch {
    // Service-role is optional. Super-admins can insert through the user session.
  }

  for (const client of writers) {
    const { data, error } = await client
      .from("organization_content_drafts")
      .upsert(rows, { onConflict: "organization_id,draft_date,slot" })
      .select("id");
    if (error || !data?.length) continue;
    const ids = data.map((row) => String((row as { id: string }).id));
    await client.from("organization_content_draft_events").insert(
      ids.map((draftId) => ({
        ...event,
        draft_id: draftId,
      })),
    );
    return ids;
  }

  return null;
}

export async function readMicahDemeanor(
  organizationId: string,
): Promise<MicahDemeanor | null> {
  const fromBrand = demeanorFromBrand(await readMicahBrandKit(organizationId));
  if (fromBrand) return fromBrand;

  const readers: Array<
    Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
  > = [await createClient()];
  try {
    readers.push(createAdminClient());
  } catch {
    // Service-role is optional for members who can already read their drafts.
  }

  for (const client of readers) {
    try {
      const { data, error } = await client
        .from("organization_content_drafts")
        .select("metadata")
        .eq("organization_id", organizationId)
        .contains("metadata", { week_pack: true })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) continue;
      const value = (data as { metadata?: { micah_demeanor?: unknown } }).metadata
        ?.micah_demeanor;
      if (isMicahDemeanor(value)) return value;
    } catch {
      // Try the next reader.
    }
  }

  return null;
}

export async function createMicahGalleryDraft(
  input: MicahGalleryDraftInput,
): Promise<MicahGalleryDraftResult> {
  const brand = await readMicahBrandKit(input.organizationId);
  const logoDataUri =
    input.logoDataUri ||
    brand.logoDataUri ||
    readOfficialAtlasLogoDataUri();
  const pack = buildMicahWeekPack({
    prompt: input.prompt,
    demeanor: input.demeanor,
    demoDesk: input.demoDesk,
    logoDataUri,
    primaryColor: input.primaryColor || brand.primaryColor,
    secondaryColor: input.secondaryColor || brand.secondaryColor,
    weekKey: `week-${new Date().toISOString().slice(0, 10)}`,
  });
  const requestedFocus =
    input.focusDay === undefined
      ? focusDayFromMicahPrompt(input.prompt)
      : input.focusDay;
  const focusDay =
    typeof requestedFocus === "number" &&
    Number.isInteger(requestedFocus) &&
    requestedFocus >= 1 &&
    requestedFocus <= 7
      ? requestedFocus
      : null;
  const cards = focusDay ? pack.filter((card) => card.day === focusDay) : pack;
  const first = cards[0];
  const title = clipDraftText(input.title || first?.title || "MICAH week pack", 160);
  const headline = clipDraftText(input.headline || first?.headline || "This week", 120);
  const caption = clipCaptionText(input.caption || first?.caption || "", 2200);
  const grade =
    cards.length === 7
      ? gradeKingdomWeek(cards)
      : {
          pass:
            cards.length > 0 &&
            cards.every((card) =>
              gradeKingdomCaption({
                caption: card.caption,
                instagramCaption: card.instagramCaption,
                linkedinCaption: card.linkedinCaption,
                demoLabeled: card.demoLabeled,
              }).pass,
            ),
        };
  if (!grade.pass) {
    return {
      status: "error",
      draftId: null,
      draftIds: [],
      title,
      headline,
      caption,
      count: 0,
      message:
        "MICAH held the week pack. Captions must be hook, payoff, and one CTA before they reach the gallery. Nothing was posted.",
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const rows = cards.map((card) => ({
    organization_id: input.organizationId,
    draft_date: today,
    slot: card.slot,
    campaign: "Week pack",
    title: card.title,
    headline: card.headline,
    supporting_text: card.supportingText,
    caption: card.caption,
    call_to_action: clipDraftText(card.cta, 240),
    platforms: ["facebook", "instagram", "linkedin"],
    visual_style: "atlas_branded",
    image_svg: card.imageSvg,
    status: "ready_for_review",
    generated_by: "micah",
    generation_source: "manual",
    metadata: {
      source: "atlas_chat",
      week_pack: true,
      week_day: card.day,
      weekday: card.weekday,
      week_theme: card.theme,
      primary_color: input.primaryColor || brand.primaryColor,
      secondary_color: input.secondaryColor || brand.secondaryColor,
      micah_demeanor: input.demeanor,
      company_name: card.companyName,
      demo_labeled: card.demoLabeled,
      instagram_caption: card.instagramCaption,
      linkedin_caption: card.linkedinCaption,
      kingdom_cta: card.cta,
      kingdom_grade: "pass",
      no_live_post: true,
      no_scheduler: true,
      requested_by: input.userId,
    },
  }));

  try {
    const draftIds = await writeMicahWeekRows(rows, {
      organization_id: input.organizationId,
      event_type: "created",
      note: focusDay
        ? `MICAH prepared ${first?.theme ?? "a day-card"} from Talk to Atlas. It was not published.`
        : "MICAH prepared a 7-day week pack from Talk to Atlas. It was not published.",
      actor_user_id: input.userId,
      actor_label: "MICAH",
    });
    if (!draftIds?.length) {
      return {
        status: "error",
        draftId: null,
        draftIds: [],
        title,
        headline,
        caption,
        count: 0,
        message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
      };
    }

    revalidatePath("/client/micah");
    revalidatePath("/client");

    return {
      status: "success",
      draftId: draftIds[0] ?? null,
      draftIds,
      title,
      headline,
      caption,
      count: draftIds.length,
      message:
        draftIds.length === 1
          ? `MICAH saved ${first?.theme ?? "this day-card"} in the gallery (1 downloadable card). Nothing was posted to Facebook or Instagram. Copy the caption and download the file from the gallery.`
          : `MICAH saved a 7-day week pack in the gallery (${draftIds.length} downloadable cards). Nothing was posted to Facebook or Instagram. Copy captions and download the files from the gallery.`,
    };
  } catch {
    return {
      status: "error",
      draftId: null,
      draftIds: [],
      title,
      headline,
      caption,
      count: 0,
      message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
    };
  }
}
