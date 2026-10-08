import { revalidatePath } from "next/cache";
import { isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  MICAH_GALLERY_IMAGE_BUCKET,
  applyMicahGalleryImageChange,
  micahGalleryImageActionResult,
  micahGalleryImageActorDecision,
  resolveMicahGalleryImageSource,
} from "./gallery-image.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GalleryImageCard = {
  id: string | null;
  day: number;
  weekday: string;
  imageUrl: string | null;
};

export async function attachMicahGalleryImageUrls<T extends GalleryImageCard>(
  organizationId: string,
  cards: T[],
): Promise<
  Array<
    T & {
      imageUrl: string | null;
      imageDownloadUrl: string | null;
      imageFileName: string | null;
      hasGalleryImage: boolean;
    }
  >
> {
  const plans = cards.map((card) => ({
    card,
    source: resolveMicahGalleryImageSource({
      imageUrl: card.imageUrl,
      organizationId,
      draftId: card.id,
      day: card.day,
      weekday: card.weekday,
    }),
  }));

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  if (plans.some((item) => item.source.kind === "storage")) {
    try {
      const client = await createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      supabase = user ? client : null;
    } catch {
      supabase = null;
    }
  }

  return Promise.all(
    plans.map(async ({ card, source }) => {
      if (source.kind === "https") {
        return {
          ...card,
          imageUrl: source.href,
          imageDownloadUrl: source.href,
          imageFileName: source.downloadName,
          hasGalleryImage: true,
        };
      }
      if (source.kind !== "storage" || !supabase) {
        return {
          ...card,
          imageUrl: null,
          imageDownloadUrl: null,
          imageFileName: null,
          hasGalleryImage: source.kind === "storage",
        };
      }

      const display = await supabase.storage
        .from(source.bucket)
        .createSignedUrl(source.objectPath, source.expiresIn);
      const download = await supabase.storage.from(source.bucket).createSignedUrl(
        source.objectPath,
        source.expiresIn,
        { download: source.downloadName },
      );
      const imageUrl = display.data?.signedUrl ?? null;
      const imageDownloadUrl = download.data?.signedUrl ?? imageUrl;
      if (!imageUrl) {
        return {
          ...card,
          imageUrl: null,
          imageDownloadUrl: null,
          imageFileName: null,
          hasGalleryImage: true,
        };
      }
      return {
        ...card,
        imageUrl,
        imageDownloadUrl,
        imageFileName: source.downloadName,
        hasGalleryImage: true,
      };
    }),
  );
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

/**
 * Super-admin upload/replace/remove. Writes image_url only and never changes status.
 * Storage uses the signed-in user so crm-files RLS applies.
 */
export async function persistMicahGalleryImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actor = micahGalleryImageActorDecision({
    signedIn: Boolean(user),
    isSuperAdmin: Boolean(user && isSuperAdminEmail(user.email)),
  });
  if (actor !== "allow") return micahGalleryImageActionResult(actor);

  const organizationId = field(formData, "organizationId");
  const draftId = field(formData, "draftId");
  const intent = field(formData, "intent") || "upload";
  const uploaded = formData.get("file");
  const file = typeof File !== "undefined" && uploaded instanceof File ? uploaded : null;
  const bytes = file ? new Uint8Array(await file.arrayBuffer()) : undefined;

  const result = await applyMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent,
    organizationId,
    draftId,
    file: file ? { name: file.name, type: file.type, size: file.size, bytes } : null,
    loadDraft: async () => {
      if (!uuidPattern.test(organizationId) || !uuidPattern.test(draftId)) return null;
      const { data, error } = await supabase
        .from("organization_content_drafts")
        .select("id, image_url")
        .eq("id", draftId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error || !data) return null;
      return { imageUrl: (data as { image_url?: string | null }).image_url ?? null };
    },
    upload: async (objectPath, body, contentType) => {
      const { error } = await supabase.storage.from(MICAH_GALLERY_IMAGE_BUCKET).upload(objectPath, body, {
        contentType,
        upsert: true,
      });
      return { error: error?.message ?? null };
    },
    remove: async (objectPath) => {
      const { error } = await supabase.storage.from(MICAH_GALLERY_IMAGE_BUCKET).remove([objectPath]);
      return { error: error?.message ?? null };
    },
    saveImageUrl: async (imageUrl) => {
      const { data, error } = await supabase
        .from("organization_content_drafts")
        .update({ image_url: imageUrl })
        .eq("id", draftId)
        .eq("organization_id", organizationId)
        .select("image_url")
        .maybeSingle();
      if (error || !data) return { error: error?.message ?? "not_updated" };
      const written = (data as { image_url?: string | null }).image_url ?? null;
      if (written !== imageUrl) return { error: "not_updated" };
      return { error: null };
    },
  });

  if (result.status === "success") {
    revalidatePath("/client/micah");
    revalidatePath("/client");
  }
  return result;
}
