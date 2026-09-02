import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function createMicahGalleryDraft(
  input: MicahGalleryDraftInput,
): Promise<MicahGalleryDraftResult> {
  const copy = buildMicahDraftCopy(input.prompt, input.caption ?? input.headline);
  const headline = clipDraftText(input.headline || copy.headline, 120);
  const title = clipDraftText(input.title || copy.title, 160);
  const caption = clipDraftText(input.caption || copy.caption, 2200);
  const supportingText = clipDraftText(input.prompt, 240) || "Client request";
  const imageSvg = buildMicahDraftSvg({
    headline,
    supportingText,
    logoDataUri: readOfficialAtlasLogoDataUri(),
  });
  const today = new Date().toISOString().slice(0, 10);
  const slot = slotForMicahPrompt(input.prompt);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("organization_content_drafts")
      .insert({
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
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return {
        status: "error",
        draftId: null,
        title,
        headline,
        caption,
        message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
      };
    }

    await supabase.from("organization_content_draft_events").insert({
      draft_id: data.id,
      organization_id: input.organizationId,
      event_type: "created",
      note: "MICAH prepared this draft from Talk to Atlas. It was not published.",
      actor_user_id: input.userId,
      actor_label: "MICAH",
    });

    revalidatePath("/client/micah");
    revalidatePath("/client");

    return {
      status: "success",
      draftId: data.id as string,
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
