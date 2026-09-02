import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildMicahDraftCopy,
  buildMicahDraftSvg,
  clipDraftText,
  readOfficialAtlasLogoDataUri,
  slotForMicahPrompt,
} from "./gallery-art.ts";

export type MicahGalleryDraftInput = {
  organizationId: string;
  userId: string;
  prompt: string;
  headline?: string | null;
  caption?: string | null;
  title?: string | null;
};

export type MicahGalleryDraftResult = {
  status: "success" | "error";
  draftId: string | null;
  title: string;
  headline: string;
  caption: string;
  message: string;
};

async function writeMicahDraft(
  row: Record<string, unknown>,
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
      .insert(row)
      .select("id")
      .single();
    if (error || !data?.id) continue;
    await client.from("organization_content_draft_events").insert({
      ...event,
      draft_id: data.id,
    });
    return String(data.id);
  }

  return null;
}

export async function createMicahGalleryDraft(
  input: MicahGalleryDraftInput,
): Promise<MicahGalleryDraftResult> {
  const copy = buildMicahDraftCopy(input.prompt, input.caption ?? input.headline);
  const headline = clipDraftText(input.headline || copy.headline, 120);
  const title = clipDraftText(input.title || copy.title, 160);
  const caption = clipDraftText(input.caption || copy.caption, 2200);
  const supportingText = clipDraftText(
    copy.supportingText || input.prompt,
    240,
  ) || "Client request";
  const imageSvg = buildMicahDraftSvg({
    headline,
    supportingText,
    logoDataUri: readOfficialAtlasLogoDataUri(),
  });
  const today = new Date().toISOString().slice(0, 10);
  const slot = slotForMicahPrompt(input.prompt);
  const row = {
    organization_id: input.organizationId,
    draft_date: today,
    slot,
    campaign: "Talk to Atlas",
    title,
    headline,
    supporting_text: supportingText,
    caption,
    call_to_action: "Download this draft and post it yourself.",
    platforms: ["instagram", "facebook"],
    visual_style: "atlas_branded",
    image_svg: imageSvg,
    status: "ready_for_review",
    generated_by: "micah",
    generation_source: "manual",
    metadata: {
      source: "atlas_chat",
      no_live_post: true,
      requested_by: input.userId,
    },
  };

  try {
    const draftId = await writeMicahDraft(row, {
      organization_id: input.organizationId,
      event_type: "created",
      note: "MICAH prepared this draft from Talk to Atlas. It was not published.",
      actor_user_id: input.userId,
      actor_label: "MICAH",
    });
    if (!draftId) {
      return {
        status: "error",
        draftId: null,
        title,
        headline,
        caption,
        message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
      };
    }

    revalidatePath("/client/micah");
    revalidatePath("/client");

    return {
      status: "success",
      draftId,
      title,
      headline,
      caption,
      message: `MICAH saved a downloadable draft in the gallery: ${title}. Nothing was posted to Facebook or Instagram. Open MICAH to download it and post it yourself.`,
    };
  } catch {
    return {
      status: "error",
      draftId: null,
      title,
      headline,
      caption,
      message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
    };
  }
}
